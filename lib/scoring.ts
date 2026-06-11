import { getTeamById, matches } from "@/lib/mock-data";
import {
  CompletedGroupMatchResult,
  CompletedGroupRanking,
  CompletedKnockoutResult,
  GroupMatchPrediction,
  GroupRankPrediction,
  KnockoutPrediction,
  Match,
  MatchOutcome,
  MatchStage,
  PredictionScoreBreakdown,
  PredictionScoringMode,
} from "@/types/world-cup";

export const predictionDeadline = "2026-06-16T00:00:00Z";
export const correctResultPoints = 3;
export const correctHomeGoalsPoints = 1;
export const correctAwayGoalsPoints = 1;
export const exactScoreBonusPoints = 2;
export const groupRankingPositionPoints = [2, 2, 1, 1] as const;
export const correctTopTwoSwappedBonus = 1;
export const exactGroupOrderBonus = 2;

export const knockoutPointValues: Partial<Record<MatchStage, number>> = {
  "Round of 32": 2,
  "Round of 16": 3,
  Quarterfinal: 4,
  Semifinal: 5,
  Final: 6,
};

export const correctChampionBonus = 5;
export const upsetBonusMediumGap = 1;
export const upsetBonusLargeGap = 2;

export function getUpsetBonusFromRankingGap(winnerRank: number, loserRank: number) {
  const gap = winnerRank - loserRank;

  if (gap >= 20) {
    return upsetBonusLargeGap;
  }

  if (gap >= 10) {
    return upsetBonusMediumGap;
  }

  return 0;
}

export function getMatchById(matchId: string) {
  return matches.find((match) => match.id === matchId);
}

export function getTraditionalGroupMatchPoints(
  prediction: GroupMatchPrediction,
  result: CompletedGroupMatchResult,
) {
  return prediction.predictedOutcome === result.actualOutcome ? correctResultPoints : 0;
}

export function getTraditionalGroupRankPoints(
  prediction: GroupRankPrediction,
  result: CompletedGroupRanking,
) {
  const positionPoints = prediction.rankedTeamIds.reduce((points, teamId, index) => {
    return points + (result.rankedTeamIds[index] === teamId ? groupRankingPositionPoints[index] ?? 0 : 0);
  }, 0);
  const predictedTopTwo = prediction.rankedTeamIds.slice(0, 2);
  const actualTopTwo = result.rankedTeamIds.slice(0, 2);
  const exactTopTwo =
    predictedTopTwo[0] === actualTopTwo[0] && predictedTopTwo[1] === actualTopTwo[1];
  const swappedTopTwo =
    predictedTopTwo.length === 2 &&
    actualTopTwo.length === 2 &&
    predictedTopTwo[0] === actualTopTwo[1] &&
    predictedTopTwo[1] === actualTopTwo[0];
  const exactGroupOrder =
    prediction.rankedTeamIds.length === result.rankedTeamIds.length &&
    prediction.rankedTeamIds.every((teamId, index) => result.rankedTeamIds[index] === teamId);

  return (
    positionPoints +
    (swappedTopTwo && !exactTopTwo ? correctTopTwoSwappedBonus : 0) +
    (exactGroupOrder ? exactGroupOrderBonus : 0)
  );
}

export function getKnockoutPoints(
  prediction: KnockoutPrediction,
  result: CompletedKnockoutResult,
) {
  const match = getMatchById(prediction.matchId);
  const stagePoints = match ? knockoutPointValues[match.stage] ?? 0 : 0;

  return prediction.predictedWinnerTeamId === result.winnerTeamId ? stagePoints : 0;
}

export function getUpsetBonusForKnockoutMatch(
  prediction: KnockoutPrediction,
  result: CompletedKnockoutResult,
) {
  if (prediction.predictedWinnerTeamId !== result.winnerTeamId) {
    return 0;
  }

  const winner = getTeamById(result.winnerTeamId);
  const loser = getTeamById(result.loserTeamId);

  if (!winner || !loser) {
    return 0;
  }

  return winner.fifaRank > loser.fifaRank
    ? getUpsetBonusFromRankingGap(winner.fifaRank, loser.fifaRank)
    : 0;
}

export function scoreKnockoutPrediction(
  prediction: KnockoutPrediction,
  result: CompletedKnockoutResult,
  mode: PredictionScoringMode,
): PredictionScoreBreakdown {
  const traditionalPoints = getKnockoutPoints(prediction, result);
  const upsetBonusPoints =
    mode === "upset" ? getUpsetBonusForKnockoutMatch(prediction, result) : 0;

  return {
    traditionalPoints,
    upsetBonusPoints,
    totalPoints: traditionalPoints + upsetBonusPoints,
  };
}

export function getUpsetBonusForGroupMatch(
  match: Match,
  predictedOutcome: MatchOutcome,
  actualOutcome: MatchOutcome,
) {
  if (predictedOutcome !== actualOutcome || !match.homeTeamId || !match.awayTeamId) {
    return 0;
  }

  const homeTeam = getTeamById(match.homeTeamId);
  const awayTeam = getTeamById(match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    return 0;
  }

  if (actualOutcome === "draw") {
    return 0;
  }

  const winner = actualOutcome === "home" ? homeTeam : awayTeam;
  const loser = actualOutcome === "home" ? awayTeam : homeTeam;
  const lowerRankedTeamWon = winner.fifaRank > loser.fifaRank;

  return lowerRankedTeamWon
    ? getUpsetBonusFromRankingGap(winner.fifaRank, loser.fifaRank)
    : 0;
}

export function scoreGroupMatchPrediction(
  prediction: GroupMatchPrediction,
  result: CompletedGroupMatchResult,
  mode: PredictionScoringMode,
): PredictionScoreBreakdown {
  const traditionalPoints = getTraditionalGroupMatchPoints(prediction, result);
  const match = getMatchById(prediction.matchId);
  const upsetBonusPoints =
    mode === "upset" && match
      ? getUpsetBonusForGroupMatch(
          match,
          prediction.predictedOutcome,
          result.actualOutcome,
        )
      : 0;

  return {
    traditionalPoints,
    upsetBonusPoints,
    totalPoints: traditionalPoints + upsetBonusPoints,
  };
}
