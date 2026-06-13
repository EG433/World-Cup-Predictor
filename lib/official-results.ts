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

export function mergeMatchesWithOfficialResults(
  scheduleMatches: Match[],
  resultRows: OfficialMatchResultRow[],
) {
  const resultsById = new Map(resultRows.map((row) => [row.match_id, row]));

  return scheduleMatches.map((match) => {
    const result = resultsById.get(match.id);

    return {
      ...match,
      homeTeamId: result?.home_team_id ?? match.homeTeamId,
      awayTeamId: result?.away_team_id ?? match.awayTeamId,
      status: result?.status ?? "scheduled",
      homeScore: result?.home_score ?? null,
      awayScore: result?.away_score ?? null,
      winnerTeamId: result?.winner_team_id ?? null,
      sourceUpdatedAt: result?.source_updated_at ?? result?.updated_at ?? null,
    } satisfies Match;
  });
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

export function computeOfficialStandingsByGroup(resultRows: OfficialMatchResultRow[]) {
  const resultsById = new Map(resultRows.map((row) => [row.match_id, row]));

  return Object.fromEntries(
    tournamentGroups.map((group) => {
      const standings = new Map(group.teamIds.map((teamId) => [teamId, emptyStanding(teamId)]));

      for (const match of getMatchesForGroup(group.id)) {
        const result = resultsById.get(match.id);

        if (!match.homeTeamId || !match.awayTeamId || !isFinalScoreAvailable(result)) {
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

      const ordered = Array.from(standings.values()).sort((first, second) => {
        if (second.points !== first.points) return second.points - first.points;
        if (second.goalDifference !== first.goalDifference) {
          return second.goalDifference - first.goalDifference;
        }
        if (second.wins !== first.wins) return second.wins - first.wins;
        return first.teamId.localeCompare(second.teamId);
      });

      return [group.id, ordered];
    }),
  ) as Record<string, GroupStanding[]>;
}

export function getOfficialMatchRowsForSchedule(resultRows: OfficialMatchResultRow[]) {
  return mergeMatchesWithOfficialResults(matches, resultRows);
}
