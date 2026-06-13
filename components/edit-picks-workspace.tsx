"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { TeamBadge } from "@/components/team-badge";
import { readStoredGroups } from "@/lib/group-storage";
import {
  formatKickoff,
  getMatchesByStage,
  getMatchesForGroup,
  getTeamById,
  teams,
  tournamentGroups,
} from "@/lib/mock-data";
import {
  knockoutPointValues,
  predictionDeadline,
} from "@/lib/scoring";
import { Match, PredictionScoringMode } from "@/types/world-cup";

const knockoutStages = [
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Final",
] as const;

const bracketStageLabel: Record<(typeof knockoutStages)[number], string> = {
  "Round of 32": "Round of 32",
  "Round of 16": "Round of 16",
  Quarterfinal: "Quarterfinals",
  Semifinal: "Semifinals",
  Final: "Final",
};

const bracketMatchOrder: Record<(typeof knockoutStages)[number], string[]> = {
  "Round of 32": [
    "m74",
    "m77",
    "m73",
    "m75",
    "m83",
    "m84",
    "m81",
    "m82",
    "m76",
    "m78",
    "m79",
    "m80",
    "m86",
    "m88",
    "m85",
    "m87",
  ],
  "Round of 16": ["m89", "m90", "m93", "m94", "m91", "m92", "m95", "m96"],
  Quarterfinal: ["m97", "m98", "m99", "m100"],
  Semifinal: ["m101", "m102"],
  Final: ["m104"],
};

type GroupRankings = Record<string, string[]>;
type MatchScores = Record<string, { home: string; away: string }>;
type BracketWinners = Record<string, string>;
type BracketOutcomes = {
  winners: BracketWinners;
  runnerUps: BracketWinners;
};
type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";
type AdviceStatus = "idle" | "loading" | "ready" | "error";
type PredictionWorkspaceMode = "pre-world-cup" | "official-knockout";
type AdviceMode = "head-to-head";
type AdviceWeights = Record<
  "teamStrength" | "recentForm" | "headToHead" | "lineupTactics" | "motivationStakes",
  number
>;
type PredictionDraftData = {
  version?: number;
  selectedGroupId?: string;
  groupScores?: MatchScores;
  bracketScores?: MatchScores;
  bracketWinners?: BracketWinners;
  liveKnockoutScores?: MatchScores;
  liveKnockoutWinners?: BracketWinners;
};
type OfficialKnockoutMatch = {
  id: string;
  stage: (typeof knockoutStages)[number];
  matchdayLabel: string;
  kickoff: string;
  venue: string;
  city: string;
  homeSlotLabel: string | null;
  awaySlotLabel: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  status: "scheduled" | "live" | "final";
  sourceUpdatedAt: string | null;
};
type ComputedStanding = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

interface EditPicksWorkspaceProps {
  groupId: string;
  groupName: string;
  scoringMode: PredictionScoringMode;
  viewedMemberId?: string;
}

const adviceWeightLabels: Record<keyof AdviceWeights, string> = {
  teamStrength: "Team strength",
  recentForm: "Recent form",
  headToHead: "Head-to-head in past 5 years",
  lineupTactics: "Lineup and tactics",
  motivationStakes: "Motivation and stakes",
};

const defaultAdviceWeights: AdviceWeights = {
  teamStrength: 35,
  recentForm: 25,
  headToHead: 15,
  lineupTactics: 15,
  motivationStakes: 10,
};

function getGroupIdFromSlot(slotLabel?: string) {
  const match = slotLabel?.match(/Group ([A-L])/);
  return match?.[1].toLowerCase();
}

function getWinnerMatchIdFromSlot(slotLabel?: string) {
  const match = slotLabel?.match(/Winner match (\d+)/i);
  return match ? `m${match[1]}` : undefined;
}

function getRunnerUpMatchIdFromSlot(slotLabel?: string) {
  const match = slotLabel?.match(/Runner-up match (\d+)/i);
  return match ? `m${match[1]}` : undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createFallbackOfficialKnockoutMatches(matchesByStage: Match[][]) {
  return matchesByStage.flat().map(
    (match) =>
      ({
        id: match.id,
        stage: match.stage as (typeof knockoutStages)[number],
        matchdayLabel: match.matchdayLabel,
        kickoff: match.kickoff,
        venue: match.venue,
        city: match.city,
        homeSlotLabel: match.homeSlotLabel ?? null,
        awaySlotLabel: match.awaySlotLabel ?? null,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        winnerTeamId: null,
        status: "scheduled",
        sourceUpdatedAt: null,
      }) satisfies OfficialKnockoutMatch,
  );
}

function resolveSlotTeamId(
  slotLabel: string | undefined,
  rankings: GroupRankings,
  winners: BracketWinners,
  runnerUps: BracketWinners = {},
) {
  if (!slotLabel) {
    return undefined;
  }

  const winnerMatchId = getWinnerMatchIdFromSlot(slotLabel);
  if (winnerMatchId) {
    return winners[winnerMatchId];
  }

  const runnerUpMatchId = getRunnerUpMatchIdFromSlot(slotLabel);
  if (runnerUpMatchId) {
    return runnerUps[runnerUpMatchId];
  }

  const groupId = getGroupIdFromSlot(slotLabel);

  if (!groupId) {
    return undefined;
  }

  if (slotLabel.toLowerCase().includes("winners")) {
    return rankings[groupId]?.[0];
  }

  if (slotLabel.toLowerCase().includes("runners-up")) {
    return rankings[groupId]?.[1];
  }

  if (slotLabel.toLowerCase().includes("third place")) {
    return rankings[groupId]?.[2];
  }

  return undefined;
}

function resolveSlotLabel(
  slotLabel: string | undefined,
  rankings: GroupRankings,
  winners: BracketWinners,
  runnerUps: BracketWinners = {},
) {
  const teamId = resolveSlotTeamId(slotLabel, rankings, winners, runnerUps);
  const team = teamId ? getTeamById(teamId) : undefined;

  return team?.name ?? slotLabel ?? "TBD";
}

function getBracketRowStart(stageIndex: number, slotIndex: number) {
  const spacingByStage = [4, 8, 16, 32, 64];
  const offsetByStage = [1, 3, 7, 15, 31];

  return slotIndex * spacingByStage[stageIndex] + offsetByStage[stageIndex];
}

function getOrderedBracketMatches(stage: (typeof knockoutStages)[number]) {
  const matchesForStage = getMatchesByStage(stage);
  const matchesById = new Map(matchesForStage.map((match) => [match.id, match]));
  const orderedMatches = bracketMatchOrder[stage]
    .map((matchId) => matchesById.get(matchId))
    .filter(Boolean) as Match[];
  const orderedIds = new Set(orderedMatches.map((match) => match.id));

  return [
    ...orderedMatches,
    ...matchesForStage.filter((match) => !orderedIds.has(match.id)),
  ];
}

function getUnresolvedSourceTeamIds(
  slotLabel: string | undefined,
  rankings: GroupRankings,
  winners: BracketWinners,
  runnerUps: BracketWinners,
  knockoutMatches: Match[],
) {
  const sourceMatchId = getWinnerMatchIdFromSlot(slotLabel) ?? getRunnerUpMatchIdFromSlot(slotLabel);
  const sourceMatch = sourceMatchId
    ? knockoutMatches.find((match) => match.id === sourceMatchId)
    : undefined;

  if (
    !sourceMatch ||
    (getWinnerMatchIdFromSlot(slotLabel) && winners[sourceMatch.id]) ||
    (getRunnerUpMatchIdFromSlot(slotLabel) && runnerUps[sourceMatch.id])
  ) {
    return [];
  }

  return [
    resolveSlotTeamId(sourceMatch.homeSlotLabel, rankings, winners, runnerUps),
    resolveSlotTeamId(sourceMatch.awaySlotLabel, rankings, winners, runnerUps),
  ].filter(Boolean) as string[];
}

function computeStandingsForGroup(groupId: string, scores: MatchScores) {
  const group = tournamentGroups.find((entry) => entry.id === groupId);

  if (!group) {
    return [];
  }

  const standings = new Map<string, ComputedStanding>(
    group.teamIds.map((teamId) => [
      teamId,
      {
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ]),
  );

  for (const match of getMatchesForGroup(groupId)) {
    if (!match.homeTeamId || !match.awayTeamId) {
      continue;
    }

    const homeScore = scores[match.id]?.home;
    const awayScore = scores[match.id]?.away;

    if (homeScore === "" || awayScore === "" || homeScore === undefined || awayScore === undefined) {
      continue;
    }

    const homeGoals = Number(homeScore);
    const awayGoals = Number(awayScore);

    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) {
      continue;
    }

    const homeStanding = standings.get(match.homeTeamId);
    const awayStanding = standings.get(match.awayTeamId);

    if (!homeStanding || !awayStanding) {
      continue;
    }

    homeStanding.played += 1;
    awayStanding.played += 1;
    homeStanding.goalsFor += homeGoals;
    homeStanding.goalsAgainst += awayGoals;
    awayStanding.goalsFor += awayGoals;
    awayStanding.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      homeStanding.wins += 1;
      homeStanding.points += 3;
      awayStanding.losses += 1;
    } else if (awayGoals > homeGoals) {
      awayStanding.wins += 1;
      awayStanding.points += 3;
      homeStanding.losses += 1;
    } else {
      homeStanding.draws += 1;
      awayStanding.draws += 1;
      homeStanding.points += 1;
      awayStanding.points += 1;
    }
  }

  return [...standings.values()]
    .map((standing) => ({
      ...standing,
      goalDifference: standing.goalsFor - standing.goalsAgainst,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return getTeamById(a.teamId)?.name.localeCompare(getTeamById(b.teamId)?.name ?? "") ?? 0;
    });
}

function computeBracketOutcomesFromPicks(
  matchesByStage: Match[][],
  rankings: GroupRankings,
  scores: MatchScores,
  manualWinners: BracketWinners,
) {
  const outcomes: BracketOutcomes = {
    winners: {},
    runnerUps: {},
  };

  for (const stageMatches of matchesByStage) {
    for (const match of stageMatches) {
      const homeTeamId = resolveSlotTeamId(
        match.homeSlotLabel,
        rankings,
        outcomes.winners,
        outcomes.runnerUps,
      );
      const awayTeamId = resolveSlotTeamId(
        match.awaySlotLabel,
        rankings,
        outcomes.winners,
        outcomes.runnerUps,
      );
      const homeScore = scores[match.id]?.home;
      const awayScore = scores[match.id]?.away;
      let winnerId = manualWinners[match.id];

      if (!winnerId && homeTeamId && awayTeamId && homeScore !== "" && awayScore !== "") {
        const homeGoals = Number(homeScore);
        const awayGoals = Number(awayScore);

        if (Number.isFinite(homeGoals) && Number.isFinite(awayGoals) && homeGoals !== awayGoals) {
          winnerId = homeGoals > awayGoals ? homeTeamId : awayTeamId;
        }
      }

      if (!winnerId) {
        continue;
      }

      outcomes.winners[match.id] = winnerId;

      if (homeTeamId && awayTeamId) {
        if (winnerId === homeTeamId) {
          outcomes.runnerUps[match.id] = awayTeamId;
        } else if (winnerId === awayTeamId) {
          outcomes.runnerUps[match.id] = homeTeamId;
        }
      }
    }
  }

  return outcomes;
}

export function EditPicksWorkspace({
  groupId,
  groupName,
  scoringMode,
  viewedMemberId,
}: EditPicksWorkspaceProps) {
  const storedGroup = readStoredGroups().find((group) => group.id === groupId);
  const activeGroupName = storedGroup?.name ?? groupName;
  const activeScoringMode = storedGroup?.scoringMode ?? scoringMode;
  const [selectedGroupId, setSelectedGroupId] = useState(tournamentGroups[0].id);
  const [activeMode, setActiveMode] = useState<PredictionWorkspaceMode>("pre-world-cup");
  const [groupScores, setGroupScores] = useState<MatchScores>({});
  const [bracketScores, setBracketScores] = useState<MatchScores>({});
  const [bracketWinners, setBracketWinners] = useState<BracketWinners>({});
  const [liveKnockoutScores, setLiveKnockoutScores] = useState<MatchScores>({});
  const [liveKnockoutWinners, setLiveKnockoutWinners] = useState<BracketWinners>({});
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [adviceStatus, setAdviceStatus] = useState<AdviceStatus>("idle");
  const [adviceText, setAdviceText] = useState("");
  const [adviceError, setAdviceError] = useState("");
  const [userOpenAiApiKey, setUserOpenAiApiKey] = useState("");
  const [adviceMode] = useState<AdviceMode>("head-to-head");
  const [advisorHomeTeamId, setAdvisorHomeTeamId] = useState("france");
  const [advisorAwayTeamId, setAdvisorAwayTeamId] = useState("england");
  const [adviceWeights, setAdviceWeights] = useState<AdviceWeights>(defaultAdviceWeights);
  const knockoutMatchesByStage = useMemo(
    () => knockoutStages.map((stage) => getOrderedBracketMatches(stage)),
    [],
  );
  const thirdPlaceMatch = useMemo(() => getMatchesByStage("Third Place")[0], []);
  const outcomeMatchesByStage = useMemo(
    () => (thirdPlaceMatch ? [...knockoutMatchesByStage, [thirdPlaceMatch]] : knockoutMatchesByStage),
    [knockoutMatchesByStage, thirdPlaceMatch],
  );
  const knockoutMatches = useMemo(() => outcomeMatchesByStage.flat(), [outcomeMatchesByStage]);
  const fallbackOfficialKnockoutMatches = useMemo(
    () => createFallbackOfficialKnockoutMatches(knockoutMatchesByStage),
    [knockoutMatchesByStage],
  );
  const [officialKnockoutMatches, setOfficialKnockoutMatches] = useState<OfficialKnockoutMatch[]>(
    fallbackOfficialKnockoutMatches,
  );
  const [currentUserId, setCurrentUserId] = useState("");
  const [viewedMemberName, setViewedMemberName] = useState("");
  const computedStandings = useMemo(
    () =>
      Object.fromEntries(
        tournamentGroups.map((group) => [group.id, computeStandingsForGroup(group.id, groupScores)]),
      ) as Record<string, ComputedStanding[]>,
    [groupScores],
  );
  const effectiveRankings = useMemo(
    () =>
      Object.fromEntries(
        tournamentGroups.map((group) => [
          group.id,
          computedStandings[group.id].map((standing) => standing.teamId),
        ]),
      ) as GroupRankings,
    [computedStandings],
  );
  const effectiveBracketOutcomes = useMemo(
    () =>
      computeBracketOutcomesFromPicks(
        outcomeMatchesByStage,
        effectiveRankings,
        bracketScores,
        bracketWinners,
      ),
    [bracketScores, bracketWinners, effectiveRankings, outcomeMatchesByStage],
  );
  const effectiveBracketWinners = effectiveBracketOutcomes.winners;
  const effectiveBracketRunnerUps = effectiveBracketOutcomes.runnerUps;
  const championTeam = getTeamById(effectiveBracketWinners.m104 ?? "");
  const officialKnockoutMatchesByStage = useMemo(
    () =>
      knockoutStages.map((stage) => ({
        stage,
        matches: officialKnockoutMatches.filter((match) => match.stage === stage),
      })),
    [officialKnockoutMatches],
  );
  const officialFinalMatch = officialKnockoutMatches.find((match) => match.id === "m104");
  const officialChampionTeam = getTeamById(
    officialFinalMatch ? getLiveKnockoutSelectedWinner(officialFinalMatch) ?? "" : "",
  );
  const preWorldCupDeadlineTime = new Date(predictionDeadline).getTime();
  const preWorldCupLocked = currentTimestamp >= preWorldCupDeadlineTime;
  const isViewingAnotherMember = Boolean(viewedMemberId && viewedMemberId !== currentUserId);
  const preWorldCupInteractionLocked = preWorldCupLocked || isViewingAnotherMember;
  const activeModeLocked =
    activeMode === "pre-world-cup"
      ? preWorldCupInteractionLocked
      : false;
  const selectedGroup = tournamentGroups.find((group) => group.id === selectedGroupId) ?? tournamentGroups[0];
  const advisorHomeTeam = getTeamById(advisorHomeTeamId);
  const advisorAwayTeam = getTeamById(advisorAwayTeamId);
  const adviceWeightTotal = Object.values(adviceWeights).reduce((sum, value) => sum + value, 0);
  const saveButtonLabel =
    isViewingAnotherMember
      ? "Viewing member picks"
      : activeMode === "pre-world-cup"
      ? preWorldCupLocked
        ? "Pre-World Cup picks are locked"
        : saveStatus === "saving"
          ? "Saving pre-World Cup picks..."
          : saveStatus === "loading"
            ? "Loading picks..."
            : "Save pre-World Cup picks"
      : saveStatus === "saving"
        ? "Saving official knockout picks..."
        : saveStatus === "loading"
          ? "Loading picks..."
          : "Save official knockout picks";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadDraft() {
      setSaveStatus("loading");
      setSaveMessage("");

      try {
        const response = await fetch(
          `/api/groups/${encodeURIComponent(groupId)}/predictions${
            viewedMemberId ? `?userId=${encodeURIComponent(viewedMemberId)}` : ""
          }`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          if (isCurrent) {
            setSaveStatus("idle");
          }
          return;
        }

        const data = (await response.json()) as {
          draft: null | { predictionData?: unknown; updatedAt?: string };
          currentUserId?: string;
          viewedMember?: { id: string; username: string };
          officialKnockoutMatches?: OfficialKnockoutMatch[];
        };
        const predictionData = data.draft?.predictionData;

        if (isCurrent) {
          setCurrentUserId(data.currentUserId ?? "");
          setViewedMemberName(data.viewedMember?.username ?? "");
        }

        if (isCurrent && isObjectRecord(predictionData)) {
          if (typeof predictionData.selectedGroupId === "string") {
            setSelectedGroupId(predictionData.selectedGroupId);
          }

          if (isObjectRecord(predictionData.groupScores)) {
            setGroupScores(predictionData.groupScores as MatchScores);
          }

          if (isObjectRecord(predictionData.bracketScores)) {
            setBracketScores(predictionData.bracketScores as MatchScores);
          }

          if (isObjectRecord(predictionData.bracketWinners)) {
            setBracketWinners(predictionData.bracketWinners as BracketWinners);
          }

          if (isObjectRecord(predictionData.liveKnockoutScores)) {
            setLiveKnockoutScores(predictionData.liveKnockoutScores as MatchScores);
          }

          if (isObjectRecord(predictionData.liveKnockoutWinners)) {
            setLiveKnockoutWinners(predictionData.liveKnockoutWinners as BracketWinners);
          }

          setSaveMessage(
            data.draft?.updatedAt
              ? `${data.viewedMember?.id && data.viewedMember.id !== data.currentUserId ? `${data.viewedMember.username}'s` : "Your"} draft loaded from ${new Date(data.draft.updatedAt).toLocaleString()}.`
              : `${data.viewedMember?.id && data.viewedMember.id !== data.currentUserId ? `${data.viewedMember.username}'s` : "Your"} draft loaded.`,
          );
        }

        if (isCurrent) {
          setOfficialKnockoutMatches(
            Array.isArray(data.officialKnockoutMatches) && data.officialKnockoutMatches.length > 0
              ? data.officialKnockoutMatches
              : fallbackOfficialKnockoutMatches,
          );
        }

        if (isCurrent) {
          setSaveStatus("idle");
        }
      } catch {
        if (isCurrent) {
          setSaveStatus("idle");
        }
      }
    }

    void loadDraft();

    return () => {
      isCurrent = false;
    };
  }, [fallbackOfficialKnockoutMatches, groupId, viewedMemberId]);

  async function handleSaveDraft() {
    setSaveStatus("saving");
    setSaveMessage("");

    const predictionData: PredictionDraftData & {
      groupId: string;
      groupName: string;
      scoringMode: PredictionScoringMode;
      savedAt: string;
    } = {
      version: 1,
      groupId,
      groupName: activeGroupName,
      scoringMode: activeScoringMode,
      selectedGroupId,
      groupScores,
      bracketScores,
      bracketWinners,
      liveKnockoutScores,
      liveKnockoutWinners,
      savedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/predictions`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ predictionData }),
      });
      const data = (await response.json()) as { error?: string; updatedAt?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save draft.");
      }

      setSaveStatus("saved");
      setSaveMessage(
        data.updatedAt
          ? `Draft saved to database at ${new Date(data.updatedAt).toLocaleString()}.`
          : "Draft saved to database.",
      );
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(error instanceof Error ? error.message : "Could not save draft.");
    }
  }

  async function handleGetAdvice() {
    if (!userOpenAiApiKey.trim()) {
      setAdviceStatus("error");
      setAdviceError("Enter your own OpenAI API key before getting prediction advice.");
      setAdviceText("");
      return;
    }

    if (!advisorHomeTeamId || !advisorAwayTeamId) {
      setAdviceStatus("error");
      setAdviceError("Choose both national teams first.");
      setAdviceText("");
      return;
    }

    if (advisorHomeTeamId === advisorAwayTeamId) {
      setAdviceStatus("error");
      setAdviceError("Choose two different national teams for the matchup.");
      setAdviceText("");
      return;
    }

    if (adviceWeightTotal !== 100) {
      setAdviceStatus("error");
      setAdviceError("Set the total weight to exactly 100 before getting prediction advice.");
      setAdviceText("");
      return;
    }

    setAdviceStatus("loading");
    setAdviceError("");
    setAdviceText("");

    try {
      const response = await fetch("/api/prediction-advice", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adviceMode,
          advisorHomeTeamId,
          advisorAwayTeamId,
          openAiApiKey: userOpenAiApiKey,
          adviceWeights,
          groupName: activeGroupName,
          activeMode,
          selectedGroupId,
          selectedGroup: selectedGroup.label,
          groupScores,
          standings: computedStandings,
          bracketWinners: Object.fromEntries(
            Object.entries(effectiveBracketWinners).map(([matchId, teamId]) => [
              matchId,
              getTeamById(teamId)?.name ?? teamId,
            ]),
          ),
          champion: championTeam?.name ?? null,
          officialKnockoutMatches,
        }),
      });
      const data = (await response.json()) as { advice?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not generate advice.");
      }

      setAdviceText(data.advice ?? "No advice was generated. Try again.");
      setAdviceStatus("ready");
    } catch (error) {
      setAdviceStatus("error");
      setAdviceError(error instanceof Error ? error.message : "Could not generate advice.");
    }
  }

  function updateScore(
    setter: (value: MatchScores | ((current: MatchScores) => MatchScores)) => void,
    matchId: string,
    side: "home" | "away",
    value: string,
  ) {
    setter((current) => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home ?? "",
        away: current[matchId]?.away ?? "",
        [side]: value,
      },
    }));
  }

  function updateAdviceWeight(key: keyof AdviceWeights, rawValue: string) {
    const parsed = Number(rawValue);
    const nextValue = Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : 0;

    setAdviceWeights((current) => ({
      ...current,
      [key]: nextValue,
    }));
  }

  function getLiveKnockoutSelectedWinner(match: OfficialKnockoutMatch) {
    const manualWinner = liveKnockoutWinners[match.id];

    if (manualWinner) {
      return manualWinner;
    }

    const homeScore = liveKnockoutScores[match.id]?.home;
    const awayScore = liveKnockoutScores[match.id]?.away;

    if (
      homeScore === undefined ||
      awayScore === undefined ||
      homeScore === "" ||
      awayScore === "" ||
      !match.homeTeamId ||
      !match.awayTeamId
    ) {
      return undefined;
    }

    const homeGoals = Number(homeScore);
    const awayGoals = Number(awayScore);

    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals) || homeGoals === awayGoals) {
      return undefined;
    }

    return homeGoals > awayGoals ? match.homeTeamId : match.awayTeamId;
  }

  function isOfficialKnockoutMatchLocked(match: OfficialKnockoutMatch) {
    return currentTimestamp >= new Date(match.kickoff).getTime();
  }

  function renderOfficialKnockoutMatch(match: OfficialKnockoutMatch) {
    const homeTeam = getTeamById(match.homeTeamId ?? "");
    const awayTeam = getTeamById(match.awayTeamId ?? "");
    const selectedWinner = getLiveKnockoutSelectedWinner(match);
    const matchLocked = isOfficialKnockoutMatchLocked(match);
    const interactionLocked = matchLocked || isViewingAnotherMember;
    const actualResultText =
      match.status === "final" &&
      homeTeam &&
      awayTeam &&
      typeof match.homeScore === "number" &&
      typeof match.awayScore === "number"
        ? `Official final: ${homeTeam.name} ${match.homeScore}-${match.awayScore} ${awayTeam.name}`
        : match.status === "live" &&
            typeof match.homeScore === "number" &&
            typeof match.awayScore === "number"
          ? `Live score: ${match.homeScore}-${match.awayScore}`
          : null;

    return (
      <article key={match.id} className="official-knockout-card">
        <div className="official-knockout-card-header">
          <div>
            <span>{formatKickoff(match.kickoff)}</span>
            <strong>{match.venue}</strong>
          </div>
          <span className={`official-knockout-status is-${match.status}`}>{match.status}</span>
        </div>

        <div className="official-knockout-slots">
          <div
            className={`official-knockout-slot ${
              homeTeam && selectedWinner === homeTeam.id ? "is-selected" : ""
            }`}
          >
            <button
              type="button"
              disabled={!homeTeam || interactionLocked}
              onClick={() =>
                homeTeam
                  ? setLiveKnockoutWinners((current) => ({ ...current, [match.id]: homeTeam.id }))
                  : undefined
              }
              aria-pressed={homeTeam ? selectedWinner === homeTeam.id : undefined}
            >
              {homeTeam ? (
                <TeamBadge team={homeTeam} />
              ) : (
                <span>{match.homeSlotLabel ?? "Official team TBD"}</span>
              )}
            </button>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              disabled={interactionLocked}
              value={liveKnockoutScores[match.id]?.home ?? ""}
              onChange={(event) =>
                updateScore(setLiveKnockoutScores, match.id, "home", event.target.value)
              }
              aria-label={`${homeTeam?.name ?? match.homeSlotLabel ?? "Home team"} score`}
            />
          </div>

          <div
            className={`official-knockout-slot ${
              awayTeam && selectedWinner === awayTeam.id ? "is-selected" : ""
            }`}
          >
            <button
              type="button"
              disabled={!awayTeam || interactionLocked}
              onClick={() =>
                awayTeam
                  ? setLiveKnockoutWinners((current) => ({ ...current, [match.id]: awayTeam.id }))
                  : undefined
              }
              aria-pressed={awayTeam ? selectedWinner === awayTeam.id : undefined}
            >
              {awayTeam ? (
                <TeamBadge team={awayTeam} />
              ) : (
                <span>{match.awaySlotLabel ?? "Official team TBD"}</span>
              )}
            </button>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              disabled={interactionLocked}
              value={liveKnockoutScores[match.id]?.away ?? ""}
              onChange={(event) =>
                updateScore(setLiveKnockoutScores, match.id, "away", event.target.value)
              }
              aria-label={`${awayTeam?.name ?? match.awaySlotLabel ?? "Away team"} score`}
            />
          </div>
        </div>

        <div className="official-knockout-card-footer">
          <span>{`Winner points: ${knockoutPointValues[match.stage] ?? 0}`}</span>
          {isViewingAnotherMember ? (
            <span>Read-only member view</span>
          ) : matchLocked ? (
            <span>Locked at kickoff</span>
          ) : (
            <span>Editable until kickoff</span>
          )}
          {actualResultText ? <span>{actualResultText}</span> : null}
        </div>
      </article>
    );
  }

  function renderBracketSlotContent(team: ReturnType<typeof getTeamById>, previewTeamIds: string[], label: string) {
    if (team) {
      return <TeamBadge team={team} />;
    }

    if (previewTeamIds.length > 0) {
      return (
        <span className="prediction-bracket-source-preview">
          {previewTeamIds.map((teamId, index) => {
            const previewTeam = getTeamById(teamId);

            return previewTeam ? (
              <span key={teamId} className="prediction-bracket-preview-team">
                <TeamBadge team={previewTeam} />
                {index < previewTeamIds.length - 1 ? (
                  <span className="prediction-bracket-preview-divider">/</span>
                ) : null}
              </span>
            ) : null;
          })}
        </span>
      );
    }

    return <span>{label}</span>;
  }

  function renderPredictionBracketMatch(match: Match, className = "") {
    const homeTeamId = resolveSlotTeamId(
      match.homeSlotLabel,
      effectiveRankings,
      effectiveBracketWinners,
      effectiveBracketRunnerUps,
    );
    const awayTeamId = resolveSlotTeamId(
      match.awaySlotLabel,
      effectiveRankings,
      effectiveBracketWinners,
      effectiveBracketRunnerUps,
    );
    const homeTeam = homeTeamId ? getTeamById(homeTeamId) : undefined;
    const awayTeam = awayTeamId ? getTeamById(awayTeamId) : undefined;
    const homeLabel = resolveSlotLabel(
      match.homeSlotLabel,
      effectiveRankings,
      effectiveBracketWinners,
      effectiveBracketRunnerUps,
    );
    const awayLabel = resolveSlotLabel(
      match.awaySlotLabel,
      effectiveRankings,
      effectiveBracketWinners,
      effectiveBracketRunnerUps,
    );
    const homePreviewTeamIds = getUnresolvedSourceTeamIds(
      match.homeSlotLabel,
      effectiveRankings,
      effectiveBracketWinners,
      effectiveBracketRunnerUps,
      knockoutMatches,
    );
    const awayPreviewTeamIds = getUnresolvedSourceTeamIds(
      match.awaySlotLabel,
      effectiveRankings,
      effectiveBracketWinners,
      effectiveBracketRunnerUps,
      knockoutMatches,
    );
    const selectedWinner = effectiveBracketWinners[match.id];

    return (
      <article key={match.id} className={`prediction-bracket-node prediction-split-node ${className}`}>
        <div className="prediction-bracket-match-meta">
          <span>{formatKickoff(match.kickoff)}</span>
        </div>
        <div
          className={`prediction-bracket-slot ${
            homeTeamId && selectedWinner === homeTeamId ? "is-selected" : ""
          }`}
        >
          <button
            type="button"
            disabled={!homeTeamId || preWorldCupInteractionLocked}
            onClick={() =>
              homeTeamId
                ? setBracketWinners((current) => ({ ...current, [match.id]: homeTeamId }))
                : undefined
            }
            aria-pressed={homeTeamId ? selectedWinner === homeTeamId : undefined}
          >
            {renderBracketSlotContent(homeTeam, homePreviewTeamIds, homeLabel)}
          </button>
        </div>
        <div
          className={`prediction-bracket-slot ${
            awayTeamId && selectedWinner === awayTeamId ? "is-selected" : ""
          }`}
        >
          <button
            type="button"
            disabled={!awayTeamId || preWorldCupInteractionLocked}
            onClick={() =>
              awayTeamId
                ? setBracketWinners((current) => ({ ...current, [match.id]: awayTeamId }))
                : undefined
            }
            aria-pressed={awayTeamId ? selectedWinner === awayTeamId : undefined}
          >
            {renderBracketSlotContent(awayTeam, awayPreviewTeamIds, awayLabel)}
          </button>
        </div>
      </article>
    );
  }

  function renderThirdPlaceCard(className = "") {
    if (!thirdPlaceMatch) {
      return null;
    }

    return renderPredictionBracketMatch(thirdPlaceMatch, className);
  }

  const leftSplitBracketStages = [
    { label: "Round of 32", matches: knockoutMatchesByStage[0]?.slice(0, 8) ?? [] },
    { label: "Round of 16", matches: knockoutMatchesByStage[1]?.slice(0, 4) ?? [] },
    { label: "Quarterfinals", matches: knockoutMatchesByStage[2]?.slice(0, 2) ?? [] },
    { label: "Semifinals", matches: knockoutMatchesByStage[3]?.slice(0, 1) ?? [] },
  ];
  const rightSplitBracketStages = [
    { label: "Semifinals", matches: knockoutMatchesByStage[3]?.slice(1, 2) ?? [] },
    { label: "Quarterfinals", matches: knockoutMatchesByStage[2]?.slice(2, 4) ?? [] },
    { label: "Round of 16", matches: knockoutMatchesByStage[1]?.slice(4, 8) ?? [] },
    { label: "Round of 32", matches: knockoutMatchesByStage[0]?.slice(8, 16) ?? [] },
  ];
  const finalMatch = knockoutMatchesByStage[4]?.[0];

  return (
    <div className="section-stack">
      <section className="page-intro">
        <p className="eyebrow">{isViewingAnotherMember ? "Member picks" : "Edit picks"}</p>
        <h1>{activeGroupName}: prediction sheet</h1>
        <p>
          {isViewingAnotherMember
            ? `Viewing ${viewedMemberName || "this member"}'s saved predictions in read-only mode.`
            : "Choose between locked-in pre-tournament picks and live official knockout picks. Your total score is the sum of both sections."}
        </p>
      </section>

      {isViewingAnotherMember ? (
        <section className="helper-banner">
          <span>
            You are viewing {viewedMemberName || "this member"}&apos;s picks. Your own predictions will
            not change.
          </span>
          <Link href={`/groups/${groupId}/predictions`} className="secondary-button">
            Back to my picks
          </Link>
        </section>
      ) : null}

      <section className="prediction-mode-selector">
        <button
          type="button"
          className={`prediction-mode-card ${
            activeMode === "pre-world-cup" ? "is-active" : ""
          }`}
          onClick={() => setActiveMode("pre-world-cup")}
        >
          <p className="eyebrow">Selection 1</p>
          <h2>Pre-World Cup prediction</h2>
          <p>
            Group scores, group rankings, and the full tournament bracket before kickoff.
          </p>
          <span>
            {preWorldCupLocked
              ? "Locked after June 16, 2026."
              : "Due before June 16, 2026."}
          </span>
        </button>

        <button
          type="button"
          className={`prediction-mode-card ${
            activeMode === "official-knockout" ? "is-active" : ""
          }`}
          onClick={() => setActiveMode("official-knockout")}
        >
          <p className="eyebrow">Selection 2</p>
          <h2>Official knockout</h2>
          <p>
            Real knockout fixtures that update from official results and lock at each match kickoff.
          </p>
          <span>Updated round by round. Each match locks when the game starts.</span>
        </button>
      </section>

      <ScoringRulesPanel />

      <section className="ai-advice-card">
        <div className="ai-advice-copy">
          <p className="eyebrow">AI prediction advisor</p>
          <h2>Pick two national teams</h2>
          <p className="muted-text">
            Choose any two countries and get a direct matchup prediction with a projected score,
            winner, and short reasoning.
          </p>
        </div>
        <div className="ai-key-panel">
          <label className="ai-advice-field">
            <span>Your OpenAI API key</span>
            <input
              type="password"
              value={userOpenAiApiKey}
              onChange={(event) => setUserOpenAiApiKey(event.target.value)}
              placeholder="Paste your own OpenAI API key"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <p className="muted-text">
            Your key is used only for this advice request and is not saved to our database. You
            must enter your own key to get prediction advice.
          </p>
        </div>
        <div className="ai-weight-panel">
          <div className="ai-weight-panel-copy">
            <h3>Prediction criteria weights</h3>
            <p className="muted-text">
              Set how much each factor should matter. The advisor will normalize the weights
              automatically, but the total must equal 100 before advice can run.
            </p>
          </div>
          <div className="ai-weight-total">
            <span>Total weight</span>
            <strong className={adviceWeightTotal === 100 ? "is-valid" : "is-invalid"}>
              {adviceWeightTotal}
            </strong>
          </div>
          <div className="ai-weight-grid">
            {(Object.keys(adviceWeightLabels) as Array<keyof AdviceWeights>).map((key) => (
              <label key={key} className="ai-weight-card">
                <span>{adviceWeightLabels[key]}</span>
                <div className="ai-weight-inputs">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={adviceWeights[key]}
                    onChange={(event) => updateAdviceWeight(key, event.target.value)}
                    aria-label={`${adviceWeightLabels[key]} weight`}
                  />
                  <div className="ai-weight-number">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={adviceWeights[key]}
                      onChange={(event) => updateAdviceWeight(key, event.target.value)}
                      aria-label={`${adviceWeightLabels[key]} numeric weight`}
                    />
                    <span>%</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="ai-advice-controls">
          <label className="ai-advice-field">
            <span>Team 1</span>
            <select
              value={advisorHomeTeamId}
              onChange={(event) => setAdvisorHomeTeamId(event.target.value)}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ai-advice-field">
            <span>Team 2</span>
            <select
              value={advisorAwayTeamId}
              onChange={(event) => setAdvisorAwayTeamId(event.target.value)}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleGetAdvice()}
            disabled={
              adviceStatus === "loading" ||
              !userOpenAiApiKey.trim() ||
              !advisorHomeTeamId ||
              !advisorAwayTeamId ||
              advisorHomeTeamId === advisorAwayTeamId ||
              adviceWeightTotal !== 100
            }
          >
            {adviceStatus === "loading" ? "Thinking..." : "Get prediction advice"}
          </button>
        </div>
        {advisorHomeTeam && advisorAwayTeam ? (
          <div className="ai-advice-matchup">
            <TeamBadge team={advisorHomeTeam} />
            <span>vs</span>
            <TeamBadge team={advisorAwayTeam} />
          </div>
        ) : null}
        {adviceText ? <p className="ai-advice-output">{adviceText}</p> : null}
        {adviceError ? <p className="form-error">{adviceError}</p> : null}
      </section>

      {activeMode === "pre-world-cup" ? (
        <>
      <section className="section-card">
        <div className="section-card-copy">
          <p className="eyebrow">Step 1</p>
          <div>
            <h2>Group match scores and ranking</h2>
            <p className="muted-text">
              Choose one group, type match scores, and watch the ranking update automatically.
            </p>
            {preWorldCupLocked ? (
              <p className="muted-text">These picks are locked after June 16, 2026.</p>
            ) : null}
          </div>
        </div>

        <div className="group-workspace-toolbar">
          <label>
            Select group
            <select
              disabled={preWorldCupInteractionLocked}
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
            >
              {tournamentGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="focused-group-layout">
          <section className="group-pick-panel">
            <h3>{selectedGroup.label} scores</h3>
            <div className="score-pick-list">
              {getMatchesForGroup(selectedGroup.id).map((match) => {
                const homeTeam = getTeamById(match.homeTeamId ?? "");
                const awayTeam = getTeamById(match.awayTeamId ?? "");

                return (
                  <article key={match.id} className="score-pick-row">
                    <div className="score-match-meta">
                      <span className="muted-text">{formatKickoff(match.kickoff)}</span>
                      <span>{match.venue}</span>
                    </div>
                    <div className="score-team-cell">
                      <TeamBadge team={homeTeam} />
                    </div>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      disabled={preWorldCupInteractionLocked}
                      value={groupScores[match.id]?.home ?? ""}
                      onChange={(event) =>
                        updateScore(setGroupScores, match.id, "home", event.target.value)
                      }
                      aria-label={`${homeTeam?.name} score`}
                    />
                    <span className="score-divider">-</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      disabled={preWorldCupInteractionLocked}
                      value={groupScores[match.id]?.away ?? ""}
                      onChange={(event) =>
                        updateScore(setGroupScores, match.id, "away", event.target.value)
                      }
                      aria-label={`${awayTeam?.name} score`}
                    />
                    <div className="score-team-cell align-right">
                      <TeamBadge team={awayTeam} align="right" />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="ranking-card">
            <h3>{selectedGroup.label} ranking</h3>
            <p className="muted-text">
              Rankings update automatically from scores using 3 points for a win, 1 for a draw, and
              0 for a loss.
            </p>
              <div className="computed-standings-table">
                <div className="computed-standing-header">
                  <span>Rank</span>
                  <span>Team</span>
                  <span>W</span>
                  <span>D</span>
                  <span>L</span>
                  <span>GF</span>
                  <span>GA</span>
                  <span>GD</span>
                  <span>Pts</span>
                </div>
                {computedStandings[selectedGroup.id].map((standing, index) => (
                  <div key={standing.teamId} className="computed-standing-row">
                    <strong>{index + 1}</strong>
                    <TeamBadge team={getTeamById(standing.teamId)} />
                    <span>{standing.wins}</span>
                    <span>{standing.draws}</span>
                    <span>{standing.losses}</span>
                    <span>{standing.goalsFor}</span>
                    <span>{standing.goalsAgainst}</span>
                    <span>
                      {standing.goalDifference > 0
                        ? `+${standing.goalDifference}`
                        : standing.goalDifference}
                    </span>
                    <strong>{standing.points}</strong>
                  </div>
                ))}
              </div>
          </section>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-copy">
          <p className="eyebrow">Step 2</p>
          <div>
            <h2>Knockout bracket picks</h2>
            <p className="muted-text">
              Bracket slots update from your group rankings where possible. Pick scores and winners
              for every knockout match.
            </p>
          </div>
        </div>

        <div className="prediction-split-bracket" aria-label="Knockout prediction bracket">
          <div className="prediction-split-side prediction-split-left">
            {leftSplitBracketStages.map((stage, stageIndex) => (
              <section
                key={stage.label}
                className={`prediction-split-stage prediction-split-stage-${stage.matches.length}`}
              >
                <h3>{stage.label}</h3>
                {stageIndex > 0 ? (
                  <div
                    className={`prediction-match-connectors prediction-match-connectors-${
                      leftSplitBracketStages[stageIndex - 1]?.matches.length ?? stage.matches.length
                    } is-down`}
                    aria-hidden="true"
                  >
                    {Array.from({ length: stage.matches.length }, (_, index) => (
                      <span key={index} />
                    ))}
                  </div>
                ) : null}
                <div className="prediction-split-stage-matches">
                  {stage.matches.map((match) => renderPredictionBracketMatch(match))}
                </div>
              </section>
            ))}
          </div>

          <section className="prediction-split-center">
            {thirdPlaceMatch ? <h3 className="prediction-third-place-heading">Third place</h3> : null}
            <h3 className="prediction-final-heading">Final</h3>
            {renderThirdPlaceCard("prediction-third-place-center-card")}
            {finalMatch ? renderPredictionBracketMatch(finalMatch, "is-final-node") : null}
          </section>

          <div className="prediction-split-side prediction-split-right">
            {rightSplitBracketStages.map((stage, stageIndex) => (
              <section
                key={stage.label}
                className={`prediction-split-stage prediction-split-stage-${stage.matches.length}`}
              >
                <h3>{stage.label}</h3>
                {stageIndex > 0 ? (
                  <div
                    className={`prediction-match-connectors prediction-match-connectors-${stage.matches.length} is-up`}
                    aria-hidden="true"
                  >
                    {Array.from({ length: Math.ceil(stage.matches.length / 2) }, (_, index) => (
                      <span key={index} />
                    ))}
                  </div>
                ) : null}
                <div className="prediction-split-stage-matches">
                  {stage.matches.map((match) => renderPredictionBracketMatch(match))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="prediction-bracket-shell" aria-label="Knockout prediction bracket">
          <div className="prediction-bracket-stage-labels" aria-hidden="true">
            {knockoutStages.map((stage) => (
              <span key={stage}>{bracketStageLabel[stage]}</span>
            ))}
          </div>

          <div className="prediction-bracket-tree">
            {knockoutMatchesByStage.flatMap((roundMatches, stageIndex) =>
              roundMatches.map((match, slotIndex) => {
                const homeTeamId = resolveSlotTeamId(
                  match.homeSlotLabel,
                  effectiveRankings,
                  effectiveBracketWinners,
                  effectiveBracketRunnerUps,
                );
                const awayTeamId = resolveSlotTeamId(
                  match.awaySlotLabel,
                  effectiveRankings,
                  effectiveBracketWinners,
                  effectiveBracketRunnerUps,
                );
                const homeTeam = homeTeamId ? getTeamById(homeTeamId) : undefined;
                const awayTeam = awayTeamId ? getTeamById(awayTeamId) : undefined;
                const homeLabel = resolveSlotLabel(
                  match.homeSlotLabel,
                  effectiveRankings,
                  effectiveBracketWinners,
                  effectiveBracketRunnerUps,
                );
                const awayLabel = resolveSlotLabel(
                  match.awaySlotLabel,
                  effectiveRankings,
                  effectiveBracketWinners,
                  effectiveBracketRunnerUps,
                );
                const homePreviewTeamIds = getUnresolvedSourceTeamIds(
                  match.homeSlotLabel,
                  effectiveRankings,
                  effectiveBracketWinners,
                  effectiveBracketRunnerUps,
                  knockoutMatches,
                );
                const awayPreviewTeamIds = getUnresolvedSourceTeamIds(
                  match.awaySlotLabel,
                  effectiveRankings,
                  effectiveBracketWinners,
                  effectiveBracketRunnerUps,
                  knockoutMatches,
                );
                const selectedWinner = effectiveBracketWinners[match.id];
                const isFinal = match.stage === "Final";

                return (
                  <article
                    key={match.id}
                    className={`prediction-bracket-node ${
                      stageIndex > 0 ? "has-left-connector" : ""
                    } ${!isFinal ? "has-right-connector" : "is-final-node"}`}
                    style={{
                      gridColumn: stageIndex * 2 + 1,
                      gridRow: `${getBracketRowStart(stageIndex, slotIndex)} / span 3`,
                    }}
                  >
                    <div className="prediction-bracket-match-meta">
                      <span>{formatKickoff(match.kickoff)}</span>
                      <span>{match.venue}</span>
                    </div>
                    <div
                      className={`prediction-bracket-slot ${
                        homeTeamId && selectedWinner === homeTeamId ? "is-selected" : ""
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!homeTeamId || preWorldCupInteractionLocked}
                        onClick={() =>
                          homeTeamId
                            ? setBracketWinners((current) => ({ ...current, [match.id]: homeTeamId }))
                            : undefined
                        }
                        aria-pressed={homeTeamId ? selectedWinner === homeTeamId : undefined}
                      >
                        {homeTeam ? (
                          <TeamBadge team={homeTeam} />
                        ) : homePreviewTeamIds.length > 0 ? (
                          <span className="prediction-bracket-source-preview">
                            {homePreviewTeamIds.map((teamId, index) => {
                              const previewTeam = getTeamById(teamId);

                              return previewTeam ? (
                                <span key={teamId} className="prediction-bracket-preview-team">
                                  <TeamBadge team={previewTeam} />
                                  {index < homePreviewTeamIds.length - 1 ? (
                                    <span className="prediction-bracket-preview-divider">/</span>
                                  ) : null}
                                </span>
                              ) : null;
                            })}
                          </span>
                        ) : (
                          <span>{homeLabel}</span>
                        )}
                      </button>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        disabled={preWorldCupInteractionLocked}
                        value={bracketScores[match.id]?.home ?? ""}
                        onChange={(event) =>
                          updateScore(setBracketScores, match.id, "home", event.target.value)
                        }
                        aria-label={`${homeLabel} score`}
                      />
                    </div>
                    <div
                      className={`prediction-bracket-slot ${
                        awayTeamId && selectedWinner === awayTeamId ? "is-selected" : ""
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!awayTeamId || preWorldCupInteractionLocked}
                        onClick={() =>
                          awayTeamId
                            ? setBracketWinners((current) => ({ ...current, [match.id]: awayTeamId }))
                            : undefined
                        }
                        aria-pressed={awayTeamId ? selectedWinner === awayTeamId : undefined}
                      >
                        {awayTeam ? (
                          <TeamBadge team={awayTeam} />
                        ) : awayPreviewTeamIds.length > 0 ? (
                          <span className="prediction-bracket-source-preview">
                            {awayPreviewTeamIds.map((teamId, index) => {
                              const previewTeam = getTeamById(teamId);

                              return previewTeam ? (
                                <span key={teamId} className="prediction-bracket-preview-team">
                                  <TeamBadge team={previewTeam} />
                                  {index < awayPreviewTeamIds.length - 1 ? (
                                    <span className="prediction-bracket-preview-divider">/</span>
                                  ) : null}
                                </span>
                              ) : null;
                            })}
                          </span>
                        ) : (
                          <span>{awayLabel}</span>
                        )}
                      </button>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        disabled={preWorldCupInteractionLocked}
                        value={bracketScores[match.id]?.away ?? ""}
                        onChange={(event) =>
                          updateScore(setBracketScores, match.id, "away", event.target.value)
                        }
                        aria-label={`${awayLabel} score`}
                      />
                    </div>
                  </article>
                );
              }),
            )}

            {knockoutMatchesByStage.slice(0, -1).flatMap((roundMatches, stageIndex) =>
              Array.from({ length: Math.ceil(roundMatches.length / 2) }, (_, connectorIndex) => {
                const firstMatchRow = getBracketRowStart(stageIndex, connectorIndex * 2);
                const secondMatchRow = getBracketRowStart(stageIndex, connectorIndex * 2 + 1);

                return (
                  <span
                    key={`${stageIndex}-${connectorIndex}`}
                    className="prediction-bracket-connector"
                    style={{
                      gridColumn: stageIndex * 2 + 2,
                      gridRow: `${firstMatchRow + 1} / ${secondMatchRow + 2}`,
                    }}
                    aria-hidden="true"
                  />
                );
              }),
            )}
          </div>
        </div>

        <div className="prediction-bracket-side-panels">
          <article className="prediction-champion-card prediction-champion-result-card">
            <p className="eyebrow">Champion</p>
            {championTeam ? (
              <div className="prediction-champion-team">
                <TeamBadge team={championTeam} />
                <span>World Cup winner</span>
              </div>
            ) : (
              <p className="muted-text">Choose or score the final to reveal the champion.</p>
            )}
          </article>
        </div>
      </section>
        </>
      ) : null}

      {activeMode === "official-knockout" ? (
        <section className="section-card">
        <div className="section-card-copy">
          <p className="eyebrow">Official knockout</p>
          <div>
            <h2>Official knockout match picks</h2>
            <p className="muted-text">
              As official knockout matchups are confirmed, predict the score for each real fixture
              and click the team you think will advance. If you predict a draw, still choose the
              advancing team.
            </p>
          </div>
        </div>

        <div className="official-knockout-summary">
          <span>Score bonuses: +1 home goals, +1 away goals, +2 exact score.</span>
          <span>Winner points follow the round value for each knockout match.</span>
        </div>

        <div className="official-knockout-stage-grid">
          {officialKnockoutMatchesByStage.map(({ stage, matches }) => (
            <section key={stage} className="official-knockout-stage-section">
              <div className="official-knockout-stage-header">
                <h3>{bracketStageLabel[stage]}</h3>
                <span>{matches.length} matches</span>
              </div>
              <div className="official-knockout-card-grid">
                {matches.map((match) => renderOfficialKnockoutMatch(match))}
              </div>
            </section>
          ))}
        </div>

        <div className="prediction-bracket-side-panels">
          <article className="prediction-champion-card prediction-champion-result-card">
            <p className="eyebrow">Official champion pick</p>
            {officialChampionTeam ? (
              <div className="prediction-champion-team">
                <TeamBadge team={officialChampionTeam} />
                <span>Knockout match winner bonus ready</span>
              </div>
            ) : (
              <p className="muted-text">Pick the final winner to lock in your champion bonus choice.</p>
            )}
          </article>
        </div>
      </section>
        
      ) : null}

      <div className="page-actions prediction-save-actions">
        {!isViewingAnotherMember ? (
          <button
            type="button"
            className="primary-button"
            onClick={handleSaveDraft}
            disabled={saveStatus === "loading" || saveStatus === "saving" || activeModeLocked}
          >
            {saveButtonLabel}
          </button>
        ) : null}
        {saveMessage ? (
          <p className={saveStatus === "error" ? "form-error" : "form-success"}>{saveMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
