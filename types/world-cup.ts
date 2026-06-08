export type MatchStage =
  | "Group Stage"
  | "Round of 32"
  | "Round of 16"
  | "Quarterfinal"
  | "Semifinal"
  | "Third Place"
  | "Final";

export type Confederation =
  | "AFC"
  | "CAF"
  | "CONCACAF"
  | "CONMEBOL"
  | "OFC"
  | "UEFA";

export interface Team {
  id: string;
  name: string;
  code: string;
  flagCode: string;
  fifaRank: number;
  tournamentSeed: number;
  confederation: Confederation;
}

export interface TournamentGroup {
  id: string;
  label: string;
  teamIds: string[];
}

export interface Match {
  id: string;
  stage: MatchStage;
  matchdayLabel: string;
  kickoff: string;
  venue: string;
  city: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeSlotLabel?: string;
  awaySlotLabel?: string;
  groupId?: string;
}

export interface GroupStanding {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalDifference: number;
  points: number;
}

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  username: string;
  supportedTeamId: string;
}

export interface PoolMember {
  id: string;
  displayName: string;
  username: string;
  supportedTeamId: string;
  predictionStatus: "Not started" | "In progress" | "Submitted";
  points?: number;
}

export interface FriendPool {
  id: string;
  name: string;
  inviteCode: string;
  scoringMode: PredictionScoringMode;
  privacy: "public" | "private";
  maxBracketsPerPlayer: number;
  allowJoinAfterLock: boolean;
  members: PoolMember[];
}

export interface NavigationLink {
  href: string;
  label: string;
}

export type PredictionScoringMode = "traditional" | "upset";

export type MatchOutcome = "home" | "draw" | "away";

export interface GroupMatchPrediction {
  matchId: string;
  predictedOutcome: MatchOutcome;
}

export interface CompletedGroupMatchResult {
  matchId: string;
  actualOutcome: MatchOutcome;
}

export interface GroupRankPrediction {
  groupId: string;
  rankedTeamIds: string[];
}

export interface CompletedGroupRanking {
  groupId: string;
  rankedTeamIds: string[];
}

export interface KnockoutPrediction {
  matchId: string;
  predictedWinnerTeamId: string;
}

export interface CompletedKnockoutResult {
  matchId: string;
  winnerTeamId: string;
  loserTeamId: string;
}

export interface PredictionScoreBreakdown {
  traditionalPoints: number;
  upsetBonusPoints: number;
  totalPoints: number;
}
