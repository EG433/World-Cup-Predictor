import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { matches } from "@/lib/mock-data";
import { predictionDeadline } from "@/lib/scoring";
import { getPostgresPool, getUserFromSession, sessionCookieName } from "@/lib/server-auth";
import { refreshOfficialResultsIfStale } from "@/lib/server-groups";

interface PredictionRouteProps {
  params: Promise<{ groupId: string }>;
}

async function getSignedInUser() {
  const cookieStore = await cookies();
  return getUserFromSession(cookieStore.get(sessionCookieName)?.value);
}

async function ensurePredictionDraftsTable() {
  const pool = await getPostgresPool();

  await pool.query(`
    create table if not exists prediction_drafts (
      id uuid primary key default gen_random_uuid(),
      route_group_id text not null,
      user_id uuid not null references app_users(id) on delete cascade,
      prediction_data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now(),
      unique (route_group_id, user_id)
    )
  `);

  await pool.query(
    "create index if not exists prediction_drafts_user_id_idx on prediction_drafts(user_id)",
  );
  await pool.query(`
    create table if not exists match_results (
      match_id text primary key,
      status text not null default 'scheduled' check (status in ('scheduled', 'live', 'final')),
      home_team_id text,
      away_team_id text,
      home_score integer,
      away_score integer,
      winner_team_id text,
      source text not null default 'fifa',
      source_updated_at timestamptz,
      updated_at timestamptz not null default now()
    )
  `);

  return pool;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asScoreMap(value: unknown) {
  return isObjectRecord(value) ? (value as Record<string, unknown>) : {};
}

function mergeMatchScopedValues(
  matchIds: string[],
  lockedMatchIds: Set<string>,
  existingValue: unknown,
  incomingValue: unknown,
) {
  const existingMap = asScoreMap(existingValue);
  const incomingMap = asScoreMap(incomingValue);
  const merged = { ...existingMap };

  for (const matchId of matchIds) {
    if (lockedMatchIds.has(matchId)) {
      continue;
    }

    if (matchId in incomingMap) {
      merged[matchId] = incomingMap[matchId];
    } else {
      delete merged[matchId];
    }
  }

  return merged;
}

export async function GET(_request: Request, { params }: PredictionRouteProps) {
  try {
    const user = await getSignedInUser();

    if (!user) {
      return NextResponse.json({ error: "Log in to load prediction drafts." }, { status: 401 });
    }

    const { groupId } = await params;
    const pool = await ensurePredictionDraftsTable();
    await refreshOfficialResultsIfStale({ minimumMinutesBetweenChecks: 10 });
    const officialKnockoutSeedMatches = matches.filter(
      (match) => match.stage !== "Group Stage" && match.stage !== "Third Place",
    );
    const result = await pool.query<{
      prediction_data: unknown;
      updated_at: string;
    }>(
      `select prediction_data, updated_at
      from prediction_drafts
      where route_group_id = $1 and user_id = $2`,
      [groupId, user.id],
    );
    const officialResults = await pool.query<{
      match_id: string;
      status: "scheduled" | "live" | "final";
      home_team_id: string | null;
      away_team_id: string | null;
      home_score: number | null;
      away_score: number | null;
      winner_team_id: string | null;
      source_updated_at: string | null;
      updated_at: string;
    }>(
      `select
        match_id,
        status,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        winner_team_id,
        source_updated_at,
        updated_at
      from match_results
      where match_id = any($1)`,
      [officialKnockoutSeedMatches.map((match) => match.id)],
    );
    const officialResultsById = new Map(
      officialResults.rows.map((row) => [row.match_id, row]),
    );

    return NextResponse.json({
      draft: result.rows[0]
        ? {
            predictionData: result.rows[0].prediction_data,
            updatedAt: result.rows[0].updated_at,
          }
        : null,
      officialKnockoutMatches: officialKnockoutSeedMatches.map((match) => {
        const officialResult = officialResultsById.get(match.id);

        return {
          id: match.id,
          stage: match.stage,
          matchdayLabel: match.matchdayLabel,
          kickoff: match.kickoff,
          venue: match.venue,
          city: match.city,
          homeSlotLabel: match.homeSlotLabel ?? null,
          awaySlotLabel: match.awaySlotLabel ?? null,
          homeTeamId: officialResult?.home_team_id ?? null,
          awayTeamId: officialResult?.away_team_id ?? null,
          homeScore: officialResult?.home_score ?? null,
          awayScore: officialResult?.away_score ?? null,
          winnerTeamId: officialResult?.winner_team_id ?? null,
          status: officialResult?.status ?? "scheduled",
          sourceUpdatedAt:
            officialResult?.source_updated_at ?? officialResult?.updated_at ?? null,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load prediction draft." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: PredictionRouteProps) {
  try {
    const user = await getSignedInUser();

    if (!user) {
      return NextResponse.json({ error: "Log in to save prediction drafts." }, { status: 401 });
    }

    const body = (await request.json()) as { predictionData?: unknown };

    if (!body.predictionData || typeof body.predictionData !== "object") {
      return NextResponse.json({ error: "Prediction data is missing." }, { status: 400 });
    }

    const { groupId } = await params;
    const pool = await ensurePredictionDraftsTable();
    const existingDraftResult = await pool.query<{ prediction_data: unknown }>(
      `select prediction_data
      from prediction_drafts
      where route_group_id = $1 and user_id = $2`,
      [groupId, user.id],
    );
    const existingPredictionData = isObjectRecord(existingDraftResult.rows[0]?.prediction_data)
      ? (existingDraftResult.rows[0]?.prediction_data as Record<string, unknown>)
      : {};
    const incomingPredictionData = body.predictionData as Record<string, unknown>;
    const preWorldCupLocked = Date.now() >= new Date(predictionDeadline).getTime();
    const officialKnockoutMatches = matches.filter(
      (match) => match.stage !== "Group Stage" && match.stage !== "Third Place",
    );
    const officialKnockoutMatchIds = officialKnockoutMatches.map((match) => match.id);
    const lockedOfficialMatchIds = new Set(
      officialKnockoutMatches
        .filter((match) => Date.now() >= new Date(match.kickoff).getTime())
        .map((match) => match.id),
    );
    const mergedPredictionData: Record<string, unknown> = {
      ...existingPredictionData,
      ...incomingPredictionData,
      liveKnockoutScores: mergeMatchScopedValues(
        officialKnockoutMatchIds,
        lockedOfficialMatchIds,
        existingPredictionData.liveKnockoutScores,
        incomingPredictionData.liveKnockoutScores,
      ),
      liveKnockoutWinners: mergeMatchScopedValues(
        officialKnockoutMatchIds,
        lockedOfficialMatchIds,
        existingPredictionData.liveKnockoutWinners,
        incomingPredictionData.liveKnockoutWinners,
      ),
    };

    if (preWorldCupLocked) {
      mergedPredictionData.selectedGroupId = existingPredictionData.selectedGroupId;
      mergedPredictionData.groupScores = existingPredictionData.groupScores ?? {};
      mergedPredictionData.bracketScores = existingPredictionData.bracketScores ?? {};
      mergedPredictionData.bracketWinners = existingPredictionData.bracketWinners ?? {};
    }

    const result = await pool.query<{ updated_at: string }>(
      `insert into prediction_drafts (route_group_id, user_id, prediction_data)
      values ($1, $2, $3::jsonb)
      on conflict (route_group_id, user_id)
      do update set
        prediction_data = excluded.prediction_data,
        updated_at = now()
      returning updated_at`,
      [groupId, user.id, JSON.stringify(mergedPredictionData)],
    );

    return NextResponse.json({
      saved: true,
      updatedAt: result.rows[0]?.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save prediction draft." },
      { status: 500 },
    );
  }
}
