import { fifaScheduleSource, matches, teams } from "@/lib/mock-data";
import { getPostgresPool } from "@/lib/server-auth";

export const fifaScoresFixturesSource =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures";
export const espnWorldCupScoreboardSource =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

type ExternalMatchResult = {
  matchId?: string;
  matchNumber?: number;
  status?: "scheduled" | "live" | "final";
  homeTeamId?: string;
  awayTeamId?: string;
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string;
  sourceUpdatedAt?: string;
};

type NormalizedMatchResult = {
  matchId: string;
  status: "scheduled" | "live" | "final";
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  sourceUpdatedAt: string | null;
};

type SyncProvider = {
  name: string;
  priority: number;
  getSourceUrls: () => string[];
  parser: (payload: unknown) => NormalizedMatchResult[];
};

type ProviderResult = {
  providerName: string;
  providerPriority: number;
  result: NormalizedMatchResult;
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  winner?: boolean;
  team?: {
    abbreviation?: string;
    displayName?: string;
    name?: string;
    shortDisplayName?: string;
  };
};

type EspnEvent = {
  date?: string;
  status?: {
    type?: {
      completed?: boolean;
      state?: string;
    };
  };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
  }>;
};

type EspnScoreboardPayload = {
  events?: EspnEvent[];
};

function normalizeName(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function teamIdFromProviderTeam(team?: EspnCompetitor["team"]) {
  if (!team) {
    return undefined;
  }

  const abbreviation = team.abbreviation?.toUpperCase();
  const byCode = teams.find((entry) => entry.code.toUpperCase() === abbreviation);

  if (byCode) {
    return byCode.id;
  }

  const providerNames = [
    team.displayName,
    team.name,
    team.shortDisplayName,
  ].map(normalizeName);

  return teams.find((entry) => providerNames.includes(normalizeName(entry.name)))?.id;
}

function formatDateInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function matchIdForTeams({
  homeTeamId,
  awayTeamId,
  eventDate,
}: {
  homeTeamId?: string;
  awayTeamId?: string;
  eventDate?: string;
}) {
  if (!homeTeamId || !awayTeamId) {
    return undefined;
  }

  const eventDay = eventDate ? formatDateInTimeZone(new Date(eventDate), "America/New_York") : undefined;
  const possibleMatches = matches.filter((match) => {
    const sameTeams =
      (match.homeTeamId === homeTeamId && match.awayTeamId === awayTeamId) ||
      (match.homeTeamId === awayTeamId && match.awayTeamId === homeTeamId);

    if (!sameTeams) {
      return false;
    }

    return eventDay ? match.kickoff.slice(0, 10) === eventDay : true;
  });

  return possibleMatches[0]?.id;
}

function parseScore(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeResult(result: ExternalMatchResult) {
  const matchId = result.matchId ?? (result.matchNumber ? `m${result.matchNumber}` : undefined);
  const match = matches.find((entry) => entry.id === matchId);

  if (!matchId || !match) {
    return null;
  }

  return {
    matchId,
    status: result.status ?? "scheduled",
    homeTeamId: result.homeTeamId ?? match.homeTeamId ?? null,
    awayTeamId: result.awayTeamId ?? match.awayTeamId ?? null,
    homeScore: Number.isInteger(result.homeScore) ? result.homeScore : null,
    awayScore: Number.isInteger(result.awayScore) ? result.awayScore : null,
    winnerTeamId: result.winnerTeamId ?? null,
    sourceUpdatedAt: result.sourceUpdatedAt ?? null,
  };
}

function parseConfiguredJsonPayload(payload: unknown) {
  const resultPayload = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "matches" in payload
      ? ((payload as { matches?: ExternalMatchResult[] }).matches ?? [])
      : [];

  return resultPayload
    .map((result) => normalizeResult(result as ExternalMatchResult))
    .filter((result): result is NormalizedMatchResult => Boolean(result));
}

function parseEspnScoreboardPayload(payload: unknown) {
  const events = (payload as EspnScoreboardPayload).events ?? [];

  return events
    .map((event) => {
      const competitors = event.competitions?.[0]?.competitors ?? [];
      const home = competitors.find((competitor) => competitor.homeAway === "home");
      const away = competitors.find((competitor) => competitor.homeAway === "away");
      const homeTeamId = teamIdFromProviderTeam(home?.team);
      const awayTeamId = teamIdFromProviderTeam(away?.team);
      const matchId = matchIdForTeams({
        homeTeamId,
        awayTeamId,
        eventDate: event.date,
      });

      if (!matchId) {
        return null;
      }

      const homeScore = parseScore(home?.score);
      const awayScore = parseScore(away?.score);
      const state = event.status?.type?.state;
      const status =
        event.status?.type?.completed || state === "post"
          ? "final"
          : state === "in"
            ? "live"
            : "scheduled";
      const winnerTeamId =
        status === "final" && homeScore !== null && awayScore !== null
          ? homeScore > awayScore
            ? homeTeamId
            : awayScore > homeScore
              ? awayTeamId
              : null
          : home?.winner
            ? homeTeamId
            : away?.winner
              ? awayTeamId
              : null;

      return {
        matchId,
        status,
        homeTeamId: homeTeamId ?? null,
        awayTeamId: awayTeamId ?? null,
        homeScore,
        awayScore,
        winnerTeamId: winnerTeamId ?? null,
        sourceUpdatedAt: event.date ?? null,
      };
    })
    .filter((result): result is NormalizedMatchResult => Boolean(result));
}

function formatEtDate(date: Date) {
  return formatDateInTimeZone(date, "America/New_York");
}

function getScheduleDatesThroughToday() {
  const todayEt = formatEtDate(new Date());

  return Array.from(
    new Set(
      matches
        .map((match) => match.kickoff.slice(0, 10))
        .filter((matchDate) => matchDate <= todayEt),
    ),
  ).sort();
}

function toEspnDateParam(date: string) {
  return date.replace(/-/g, "");
}

function getEspnScoreboardUrls() {
  const baseUrl = process.env.ESPN_SCOREBOARD_URL || espnWorldCupScoreboardSource;
  const dates = getScheduleDatesThroughToday();

  if (dates.length === 0) {
    return [baseUrl];
  }

  return dates.map((date) => `${baseUrl}?dates=${toEspnDateParam(date)}`);
}

function getStatusRank(status: NormalizedMatchResult["status"]) {
  if (status === "final") return 3;
  if (status === "live") return 2;
  return 1;
}

function getResultCompleteness(result: NormalizedMatchResult) {
  const hasTeams = Boolean(result.homeTeamId && result.awayTeamId);
  const hasScores =
    typeof result.homeScore === "number" &&
    typeof result.awayScore === "number";
  const hasWinner = Boolean(result.winnerTeamId);

  return Number(hasTeams) + Number(hasScores) + Number(hasWinner);
}

function getTimestampValue(value: string | null) {
  if (!value) return 0;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function choosePreferredResult(current: ProviderResult | undefined, incoming: ProviderResult) {
  if (!current) {
    return incoming;
  }

  const currentStatusRank = getStatusRank(current.result.status);
  const incomingStatusRank = getStatusRank(incoming.result.status);

  if (incomingStatusRank !== currentStatusRank) {
    return incomingStatusRank > currentStatusRank ? incoming : current;
  }

  const currentCompleteness = getResultCompleteness(current.result);
  const incomingCompleteness = getResultCompleteness(incoming.result);

  if (incomingCompleteness !== currentCompleteness) {
    return incomingCompleteness > currentCompleteness ? incoming : current;
  }

  if (incoming.providerPriority !== current.providerPriority) {
    return incoming.providerPriority > current.providerPriority ? incoming : current;
  }

  const currentUpdatedAt = getTimestampValue(current.result.sourceUpdatedAt);
  const incomingUpdatedAt = getTimestampValue(incoming.result.sourceUpdatedAt);

  if (incomingUpdatedAt !== currentUpdatedAt) {
    return incomingUpdatedAt > currentUpdatedAt ? incoming : current;
  }

  return current;
}

function getSyncProviders(): SyncProvider[] {
  return [
    ...(process.env.FIFA_RESULTS_JSON_URL
      ? [
          {
            name: "fifa-json",
            priority: 300,
            getSourceUrls: () => [process.env.FIFA_RESULTS_JSON_URL as string],
            parser: parseConfiguredJsonPayload,
          },
        ]
      : []),
    {
      name: "espn",
      priority: 200,
      getSourceUrls: getEspnScoreboardUrls,
      parser: parseEspnScoreboardPayload,
    },
    ...(process.env.EXTRA_RESULTS_JSON_URL
      ? [
          {
            name: "extra-json",
            priority: 100,
            getSourceUrls: () => [process.env.EXTRA_RESULTS_JSON_URL as string],
            parser: parseConfiguredJsonPayload,
          },
        ]
      : []),
  ];
}

async function importResults(results: NormalizedMatchResult[], providerName: string) {
  const pool = await getPostgresPool();
  let importedCount = 0;

  for (const result of results) {
    await pool.query(
      `insert into match_results (
        match_id,
        status,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        winner_team_id,
        source,
        source_updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      on conflict (match_id)
      do update set
        status = excluded.status,
        home_team_id = excluded.home_team_id,
        away_team_id = excluded.away_team_id,
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        winner_team_id = excluded.winner_team_id,
        source = excluded.source,
        source_updated_at = excluded.source_updated_at,
        updated_at = now()`,
      [
        result.matchId,
        result.status,
        result.homeTeamId,
        result.awayTeamId,
        result.homeScore,
        result.awayScore,
        result.winnerTeamId,
        providerName,
        result.sourceUpdatedAt,
      ],
    );
    importedCount += 1;
  }

  return importedCount;
}

export async function syncOfficialFifaData() {
  const pool = await getPostgresPool();
  const providers = getSyncProviders();
  const attemptedSources: string[] = [];
  const providerMessages: string[] = [];
  const bestResults = new Map<string, ProviderResult>();

  for (const provider of providers) {
    const sourceUrls = provider.getSourceUrls();
    const providerResults = new Map<string, NormalizedMatchResult>();
    const providerErrors: string[] = [];

    for (const sourceUrl of sourceUrls) {
      attemptedSources.push(`${provider.name}: ${sourceUrl}`);

      try {
        const response = await fetch(sourceUrl, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`${provider.name} responded with ${response.status}.`);
        }

        const payload = await response.json();
        const results = provider.parser(payload);

        for (const result of results) {
          providerResults.set(result.matchId, result);
          bestResults.set(
            result.matchId,
            choosePreferredResult(bestResults.get(result.matchId), {
              providerName: provider.name,
              providerPriority: provider.priority,
              result,
            }),
          );
        }
      } catch (error) {
        providerErrors.push(error instanceof Error ? error.message : `Could not sync ${provider.name}.`);
      }
    }

    if (providerResults.size > 0) {
      providerMessages.push(`${provider.name}: ${providerResults.size} matches`);

      await pool.query(
        `insert into fifa_sync_runs (source_url, status, message)
        values ($1, $2, $3)`,
        [
          sourceUrls[0] ?? provider.name,
          "checked",
          `Fetched ${providerResults.size} match result updates from ${provider.name}.`,
        ],
      );
    }

    if (providerErrors.length > 0 && providerResults.size === 0) {
      const message = providerErrors.join(" | ");
      await pool.query(
        `insert into fifa_sync_runs (source_url, status, message)
        values ($1, 'error', $2)`,
        [sourceUrls[0] ?? provider.name, message],
      );
    }
  }

  if (bestResults.size > 0) {
    const importedCount = await importResults(
      Array.from(bestResults.values()).map((entry) => entry.result),
      "multi-source",
    );
    const message = `Imported ${importedCount} total match result updates. ${providerMessages.join(
      " | ",
    )}`;

    return {
      importedCount,
      sourceUrl: attemptedSources[0] ?? fifaScoresFixturesSource,
      provider: providers.map((provider) => provider.name).join(", "),
      attemptedSources,
      scheduleSource: fifaScheduleSource,
      message,
    };
  }

  const fallbackMessage = `No configured results provider returned importable data. Attempted: ${attemptedSources.join(
    " | ",
  )}`;
  await pool.query(
    `insert into fifa_sync_runs (source_url, status, message)
    values ($1, 'error', $2)`,
    [fifaScoresFixturesSource, fallbackMessage],
  );
  throw new Error(fallbackMessage);
}

export async function syncOfficialFifaDataIfStale({
  minimumMinutesBetweenChecks = 10,
}: {
  minimumMinutesBetweenChecks?: number;
} = {}) {
  const pool = await getPostgresPool();
  const lastRun = await pool.query<{ checked_at: Date }>(
    "select checked_at from fifa_sync_runs order by checked_at desc limit 1",
  );
  const lastCheckedAt = lastRun.rows[0]?.checked_at?.getTime();
  const minimumDelayMs = minimumMinutesBetweenChecks * 60 * 1000;

  if (lastCheckedAt && Date.now() - lastCheckedAt < minimumDelayMs) {
    return {
      skipped: true,
      message: "Recent FIFA/ESPN result sync already ran.",
      checkedAt: lastRun.rows[0].checked_at,
    };
  }

  return syncOfficialFifaData();
}
