import { getMatchesForGroup, getTeamById, matches, tournamentGroups } from "@/lib/mock-data";
import {
  correctAwayGoalsPoints,
  correctHomeGoalsPoints,
  correctResultPoints,
  correctTopTwoSwappedBonus,
  exactGroupOrderBonus,
  exactScoreBonusPoints,
  groupRankingPositionPoints,
  getUpsetBonusFromRankingGap,
  knockoutPointValues,
} from "@/lib/scoring";

type MatchScore = { home: string; away: string };
type MatchScores = Record<string, MatchScore>;
type BracketWinners = Record<string, string>;

export type MatchResultRow = {
  match_id: string;
  status: "scheduled" | "live" | "final";
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
};

export type PredictionPointsSummary = {
  selectionOnePoints: number;
  selectionTwoPoints: number;
  totalPoints: number;
};

type PredictionDraftData = {
  groupScores?: MatchScores;
  bracketWinners?: BracketWinners;
  liveKnockoutScores?: MatchScores;
  liveKnockoutWinners?: BracketWinners;
};

type Standing = {
  teamId: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

function parseScore(score?: MatchScore) {
  const home = Number(score?.home);
  const away = Number(score?.away);

  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return null;
  }

  return { home, away };
}

function getOutcome(home: number, away: number) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function resultMapFromRows(resultRows: MatchResultRow[]) {
  return new Map(
    resultRows
      .filter(
        (row) =>
          row.status === "final" &&
          typeof row.home_score === "number" &&
          typeof row.away_score === "number",
      )
      .map((row) => [row.match_id, row]),
  );
}

function computeStandingsFromScores(groupId: string, scores: MatchScores) {
  const group = tournamentGroups.find((entry) => entry.id === groupId);

  if (!group) {
    return [];
  }

  const standings = new Map<string, Standing>(
    group.teamIds.map((teamId) => [
      teamId,
      { teamId, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 },
    ]),
  );

  for (const match of getMatchesForGroup(groupId)) {
    if (!match.homeTeamId || !match.awayTeamId) continue;
    const score = parseScore(scores[match.id]);
    if (!score) continue;

    const home = standings.get(match.homeTeamId);
    const away = standings.get(match.awayTeamId);
    if (!home || !away) continue;

    home.goalsFor += score.home;
    home.goalsAgainst += score.away;
    away.goalsFor += score.away;
    away.goalsAgainst += score.home;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (score.home > score.away) {
      home.points += 3;
    } else if (score.away > score.home) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  return Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamId.localeCompare(b.teamId);
  });
}

function getActualGroupScores(resultRows: MatchResultRow[]) {
  return Object.fromEntries(
    resultRows
      .filter(
        (row) =>
          row.status === "final" &&
          typeof row.home_score === "number" &&
          typeof row.away_score === "number",
      )
      .map((row) => [
        row.match_id,
        { home: String(row.home_score), away: String(row.away_score) },
      ]),
  ) as MatchScores;
}

function getUpsetBonusForResult(matchId: string, winnerTeamId?: string | null) {
  if (!winnerTeamId) {
    return 0;
  }

  const match = matches.find((entry) => entry.id === matchId);
  const homeTeam = getTeamById(match?.homeTeamId ?? "");
  const awayTeam = getTeamById(match?.awayTeamId ?? "");
  const winner = getTeamById(winnerTeamId);
  const loser =
    winnerTeamId === homeTeam?.id ? awayTeam : winnerTeamId === awayTeam?.id ? homeTeam : undefined;

  if (!winner || !loser) {
    return 0;
  }

  return winner.fifaRank > loser.fifaRank
    ? getUpsetBonusFromRankingGap(winner.fifaRank, loser.fifaRank)
    : 0;
}

function getPredictedWinnerFromScore(
  predictedScore: { home: number; away: number } | null,
  result: MatchResultRow,
) {
  if (!predictedScore || predictedScore.home === predictedScore.away) {
    return undefined;
  }

  if (!result.home_team_id || !result.away_team_id) {
    return undefined;
  }

  return predictedScore.home > predictedScore.away ? result.home_team_id : result.away_team_id;
}

function getActualKnockoutWinnerFromScore(result: MatchResultRow) {
  if (
    typeof result.home_score !== "number" ||
    typeof result.away_score !== "number" ||
    !result.home_team_id ||
    !result.away_team_id
  ) {
    return undefined;
  }

  if (result.home_score === result.away_score) {
    return undefined;
  }

  return result.home_score > result.away_score ? result.home_team_id : result.away_team_id;
}

export function calculatePredictionPointSummary(
  draftData: unknown,
  resultRows: MatchResultRow[],
) : PredictionPointsSummary {
  const prediction = (draftData && typeof draftData === "object" ? draftData : {}) as PredictionDraftData;
  const groupScores = prediction.groupScores ?? {};
  const bracketWinners = prediction.bracketWinners ?? {};
  const liveKnockoutScores = prediction.liveKnockoutScores ?? {};
  const results = resultMapFromRows(resultRows);
  let selectionOnePoints = 0;
  let selectionTwoPoints = 0;

  for (const match of matches.filter((entry) => entry.stage === "Group Stage")) {
    const result = results.get(match.id);
    const predictedScore = parseScore(groupScores[match.id]);

    if (!result || !predictedScore) continue;

    const actualHome = result.home_score as number;
    const actualAway = result.away_score as number;
    const predictedOutcome = getOutcome(predictedScore.home, predictedScore.away);
    const actualOutcome = getOutcome(actualHome, actualAway);

    if (predictedOutcome === actualOutcome) selectionOnePoints += correctResultPoints;
    if (predictedScore.home === actualHome) selectionOnePoints += correctHomeGoalsPoints;
    if (predictedScore.away === actualAway) selectionOnePoints += correctAwayGoalsPoints;
    if (predictedScore.home === actualHome && predictedScore.away === actualAway) {
      selectionOnePoints += exactScoreBonusPoints;
    }

    const predictedWinner =
      predictedOutcome === "home"
        ? match.homeTeamId
        : predictedOutcome === "away"
          ? match.awayTeamId
          : undefined;
    if (predictedOutcome === actualOutcome) {
      selectionOnePoints += getUpsetBonusForResult(match.id, predictedWinner);
    }
  }

  const actualGroupScores = getActualGroupScores(resultRows);
  for (const group of tournamentGroups) {
    const groupMatches = getMatchesForGroup(group.id);
    const groupIsComplete = groupMatches.every((match) => results.has(match.id));

    if (!groupIsComplete) {
      continue;
    }

    const predictedRanking = computeStandingsFromScores(group.id, groupScores).map(
      (standing) => standing.teamId,
    );
    const actualRanking = computeStandingsFromScores(group.id, actualGroupScores).map(
      (standing) => standing.teamId,
    );

    predictedRanking.forEach((teamId, index) => {
      if (actualRanking[index] === teamId) {
        selectionOnePoints += groupRankingPositionPoints[index] ?? 0;
      }
    });

    const predictedTopTwo = predictedRanking.slice(0, 2);
    const actualTopTwo = actualRanking.slice(0, 2);
    const swappedTopTwo =
      predictedTopTwo.length === 2 &&
      actualTopTwo.length === 2 &&
      predictedTopTwo[0] === actualTopTwo[1] &&
      predictedTopTwo[1] === actualTopTwo[0];
    if (swappedTopTwo) {
      selectionOnePoints += correctTopTwoSwappedBonus;
    }

    const exactGroupOrder =
      predictedRanking.length === actualRanking.length &&
      predictedRanking.every((teamId, index) => actualRanking[index] === teamId);
    if (exactGroupOrder) {
      selectionOnePoints += exactGroupOrderBonus;
    }
  }

  for (const match of matches.filter((entry) => entry.stage !== "Group Stage")) {
    const result = results.get(match.id);
    const pickedWinner = bracketWinners[match.id];

    if (!result || !pickedWinner || pickedWinner !== result.winner_team_id) continue;

    selectionOnePoints += knockoutPointValues[match.stage] ?? 0;
    selectionOnePoints += getUpsetBonusForResult(match.id, pickedWinner);
  }

  for (const match of matches.filter(
    (entry) => entry.stage !== "Group Stage" && entry.stage !== "Third Place",
  )) {
    const result = results.get(match.id);
    const predictedScore = parseScore(liveKnockoutScores[match.id]);

    if (!result || !predictedScore) {
      continue;
    }

    const actualHome = result.home_score as number;
    const actualAway = result.away_score as number;
    const predictedWinner = getPredictedWinnerFromScore(predictedScore, result);
    const actualWinner = getActualKnockoutWinnerFromScore(result);

    if (predictedScore.home === actualHome) selectionTwoPoints += correctHomeGoalsPoints;
    if (predictedScore.away === actualAway) selectionTwoPoints += correctAwayGoalsPoints;
    if (predictedScore.home === actualHome && predictedScore.away === actualAway) {
      selectionTwoPoints += exactScoreBonusPoints;
    }

    if (predictedWinner && actualWinner && predictedWinner === actualWinner) {
      selectionTwoPoints += knockoutPointValues[match.stage] ?? 0;
      selectionTwoPoints += getUpsetBonusForResult(match.id, predictedWinner);
    }
  }

  return {
    selectionOnePoints,
    selectionTwoPoints,
    totalPoints: selectionOnePoints + selectionTwoPoints,
  };
}

export function calculatePredictionPoints(
  draftData: unknown,
  resultRows: MatchResultRow[],
) {
  return calculatePredictionPointSummary(draftData, resultRows).totalPoints;
}
