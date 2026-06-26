import { getMatchesForGroup, matches, tournamentGroups } from "@/lib/mock-data";
import type { GroupStanding, Match, MatchStatus } from "@/types/world-cup";

export type OfficialMatchResultRow = {
  match_id: string;
  status: MatchStatus;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  source_updated_at?: string | null;
  updated_at?: string | null;
};

function isFinalScoreAvailable(result?: OfficialMatchResultRow) {
  return (
    result?.status === "final" &&
    typeof result.home_score === "number" &&
    typeof result.away_score === "number"
  );
}

function getGroupIdFromSlotLabel(slotLabel?: string) {
  const match = slotLabel?.match(/Group ([A-L])/i);
  return match?.[1].toLowerCase();
}

function getWinnerMatchIdFromSlotLabel(slotLabel?: string) {
  const match = slotLabel?.match(/Winner match (\d+)/i);
  return match ? `m${match[1]}` : undefined;
}

function getRunnerUpMatchIdFromSlotLabel(slotLabel?: string) {
  const match = slotLabel?.match(/Runner-up match (\d+)/i);
  return match ? `m${match[1]}` : undefined;
}

function emptyStanding(teamId: string): GroupStanding {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalDifference: 0,
    points: 0,
  };
}

function orderStandings(standings: Map<string, GroupStanding>) {
  return Array.from(standings.values()).sort((first, second) => {
    if (second.points !== first.points) return second.points - first.points;
    if (second.goalDifference !== first.goalDifference) {
      return second.goalDifference - first.goalDifference;
    }
    if (second.wins !== first.wins) return second.wins - first.wins;
    return first.teamId.localeCompare(second.teamId);
  });
}

function buildStandingsByGroup(resultRows: OfficialMatchResultRow[]) {
  const resultsById = new Map(resultRows.map((row) => [row.match_id, row]));

  return Object.fromEntries(
    tournamentGroups.map((group) => {
      const standings = new Map(group.teamIds.map((teamId) => [teamId, emptyStanding(teamId)]));

      for (const match of getMatchesForGroup(group.id)) {
        const result = resultsById.get(match.id);

        if (!match.homeTeamId || !match.awayTeamId || !result || !isFinalScoreAvailable(result)) {
          continue;
        }

        const home = standings.get(match.homeTeamId);
        const away = standings.get(match.awayTeamId);

        if (!home || !away) {
          continue;
        }

        const homeScore = result.home_score as number;
        const awayScore = result.away_score as number;

        home.played += 1;
        away.played += 1;
        home.goalDifference += homeScore - awayScore;
        away.goalDifference += awayScore - homeScore;

        if (homeScore > awayScore) {
          home.wins += 1;
          home.points += 3;
          away.losses += 1;
        } else if (awayScore > homeScore) {
          away.wins += 1;
          away.points += 3;
          home.losses += 1;
        } else {
          home.draws += 1;
          away.draws += 1;
          home.points += 1;
          away.points += 1;
        }
      }

      return [group.id, orderStandings(standings)];
    }),
  ) as Record<string, GroupStanding[]>;
}

function getCompletedGroupRankings(resultRows: OfficialMatchResultRow[]) {
  const standingsByGroup = buildStandingsByGroup(resultRows);
  const resultsById = new Map(resultRows.map((row) => [row.match_id, row]));

  return Object.fromEntries(
    tournamentGroups.flatMap((group) => {
      const isComplete = getMatchesForGroup(group.id).every((match) =>
        isFinalScoreAvailable(resultsById.get(match.id)),
      );

      if (!isComplete) {
        return [];
      }

      return [[group.id, standingsByGroup[group.id].map((standing) => standing.teamId)]];
    }),
  ) as Record<string, string[]>;
}

type ResolvedKnockoutMatch = {
  homeTeamId?: string;
  awayTeamId?: string;
  winnerTeamId: string | null;
  runnerUpTeamId: string | null;
};

function resolveKnownSlotTeamId(
  slotLabel: string | undefined,
  groupRankings: Record<string, string[]>,
  resolvedKnockoutMatches: Map<string, ResolvedKnockoutMatch>,
) {
  if (!slotLabel) {
    return undefined;
  }

  const winnerMatchId = getWinnerMatchIdFromSlotLabel(slotLabel);
  if (winnerMatchId) {
    return resolvedKnockoutMatches.get(winnerMatchId)?.winnerTeamId ?? undefined;
  }

  const runnerUpMatchId = getRunnerUpMatchIdFromSlotLabel(slotLabel);
  if (runnerUpMatchId) {
    return resolvedKnockoutMatches.get(runnerUpMatchId)?.runnerUpTeamId ?? undefined;
  }

  if (slotLabel.toLowerCase().includes("third place")) {
    return undefined;
  }

  const groupId = getGroupIdFromSlotLabel(slotLabel);

  if (!groupId) {
    return undefined;
  }

  const ranking = groupRankings[groupId];

  if (!ranking?.length) {
    return undefined;
  }

  if (slotLabel.toLowerCase().includes("winners")) {
    return ranking[0];
  }

  if (slotLabel.toLowerCase().includes("runners-up")) {
    return ranking[1];
  }

  if (slotLabel.toLowerCase().includes("fourth place")) {
    return ranking[3];
  }

  return undefined;
}

export function computeOfficialStandingsByGroup(resultRows: OfficialMatchResultRow[]) {
  return buildStandingsByGroup(resultRows);
}

export function getOfficialMatchRowsForSchedule(resultRows: OfficialMatchResultRow[]) {
  return mergeMatchesWithOfficialResults(matches, resultRows);
}

export function mergeMatchesWithOfficialResults(
  scheduleMatches: Match[],
  resultRows: OfficialMatchResultRow[],
) {
  const resultsById = new Map(resultRows.map((row) => [row.match_id, row]));
  const completedGroupRankings = getCompletedGroupRankings(resultRows);
  const resolvedKnockoutMatches = new Map<string, ResolvedKnockoutMatch>();

  return scheduleMatches.map((match) => {
    const result = resultsById.get(match.id);
    const homeTeamId =
      result?.home_team_id ??
      match.homeTeamId ??
      resolveKnownSlotTeamId(match.homeSlotLabel, completedGroupRankings, resolvedKnockoutMatches);
    const awayTeamId =
      result?.away_team_id ??
      match.awayTeamId ??
      resolveKnownSlotTeamId(match.awaySlotLabel, completedGroupRankings, resolvedKnockoutMatches);
    const winnerTeamId = result?.winner_team_id ?? null;
    const runnerUpTeamId =
      winnerTeamId && homeTeamId && awayTeamId
        ? winnerTeamId === homeTeamId
          ? awayTeamId
          : winnerTeamId === awayTeamId
            ? homeTeamId
            : null
        : null;

    resolvedKnockoutMatches.set(match.id, {
      homeTeamId,
      awayTeamId,
      winnerTeamId,
      runnerUpTeamId,
    });

    return {
      ...match,
      homeTeamId,
      awayTeamId,
      status: result?.status ?? "scheduled",
      homeScore: result?.home_score ?? null,
      awayScore: result?.away_score ?? null,
      winnerTeamId,
      sourceUpdatedAt: result?.source_updated_at ?? result?.updated_at ?? null,
    } satisfies Match;
  });
}
