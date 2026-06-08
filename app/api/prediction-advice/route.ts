import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getTeamById } from "@/lib/mock-data";
import { getUserFromSession, sessionCookieName } from "@/lib/server-auth";

type OfficialKnockoutMatch = {
  id: string;
  stage?: string;
  matchdayLabel?: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeSlotLabel?: string | null;
  awaySlotLabel?: string | null;
  status?: string;
};

type AdviceRequestBody = {
  adviceMode?: "head-to-head";
  advisorHomeTeamId?: string;
  advisorAwayTeamId?: string;
  openAiApiKey?: string;
  adviceWeights?: Partial<
    Record<
      "teamStrength" | "recentForm" | "headToHead" | "lineupTactics" | "motivationStakes",
      number
    >
  >;
  groupName?: string;
  activeMode?: "pre-world-cup" | "official-knockout";
  selectedGroupId?: string;
  selectedGroup?: string;
  groupScores?: unknown;
  standings?: unknown;
  bracketWinners?: unknown;
  champion?: string | null;
  officialKnockoutMatches?: OfficialKnockoutMatch[];
};

const adviceWeightLabels: Record<
  "teamStrength" | "recentForm" | "headToHead" | "lineupTactics" | "motivationStakes",
  string
> = {
  teamStrength: "Team strength",
  recentForm: "Recent form",
  headToHead: "Head-to-head in past 5 years",
  lineupTactics: "Lineup and tactics",
  motivationStakes: "Motivation and stakes",
};

function getNormalizedAdviceWeights(body: AdviceRequestBody) {
  const rawWeights = body.adviceWeights ?? {};
  const baseWeights = {
    teamStrength: Number(rawWeights.teamStrength ?? 35),
    recentForm: Number(rawWeights.recentForm ?? 25),
    headToHead: Number(rawWeights.headToHead ?? 15),
    lineupTactics: Number(rawWeights.lineupTactics ?? 15),
    motivationStakes: Number(rawWeights.motivationStakes ?? 10),
  };
  const sanitized = Object.fromEntries(
    Object.entries(baseWeights).map(([key, value]) => [key, Number.isFinite(value) ? Math.max(0, value) : 0]),
  ) as Record<keyof typeof baseWeights, number>;
  const total = Object.values(sanitized).reduce((sum, value) => sum + value, 0) || 1;

  return Object.fromEntries(
    Object.entries(sanitized).map(([key, value]) => [key, Math.round((value / total) * 100)]),
  ) as Record<keyof typeof baseWeights, number>;
}

function getAdviceWeightTotal(body: AdviceRequestBody) {
  const rawWeights = body.adviceWeights ?? {};

  return [
    rawWeights.teamStrength ?? 0,
    rawWeights.recentForm ?? 0,
    rawWeights.headToHead ?? 0,
    rawWeights.lineupTactics ?? 0,
    rawWeights.motivationStakes ?? 0,
  ].reduce((sum, value) => {
    const parsed = Number(value);
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
}

function buildWeightSummary(weights: ReturnType<typeof getNormalizedAdviceWeights>) {
  return (Object.keys(weights) as Array<keyof typeof weights>)
    .sort((a, b) => weights[b] - weights[a])
    .map((key) => `${adviceWeightLabels[key]} ${weights[key]}%`)
    .join(", ");
}

function getHeadToHeadFactorScores(homeTeam: NonNullable<ReturnType<typeof getTeamById>>, awayTeam: NonNullable<ReturnType<typeof getTeamById>>) {
  const strengthBase = clampScore(
    50 + (awayTeam.fifaRank - homeTeam.fifaRank) * 1.35,
  );
  const recentFormBase = clampScore(
    50 +
      (awayTeam.tournamentSeed - homeTeam.tournamentSeed) * 1.05 +
      normalizedPairSignal(homeTeam.id, awayTeam.id, "form") * 14,
  );
  const headToHeadBase = clampScore(
    50 + normalizedPairSignal(homeTeam.id, awayTeam.id, "head-to-head") * 26,
  );
  const lineupTacticsBase = clampScore(
    50 +
      (getConfederationStrength(homeTeam.confederation) -
        getConfederationStrength(awayTeam.confederation)) *
        0.75 +
      normalizedPairSignal(homeTeam.id, awayTeam.id, "tactics") * 12,
  );
  const motivationBase = clampScore(
    50 +
      (getHostSignal(homeTeam.id) - getHostSignal(awayTeam.id)) +
      normalizedPairSignal(homeTeam.id, awayTeam.id, "stakes") * 12,
  );

  return {
    teamStrength: strengthBase,
    recentForm: recentFormBase,
    headToHead: headToHeadBase,
    lineupTactics: lineupTacticsBase,
    motivationStakes: motivationBase,
  };
}

function getWeightedTeamEdge(
  factorScores: ReturnType<typeof getHeadToHeadFactorScores>,
  weights: ReturnType<typeof getNormalizedAdviceWeights>,
) {
  return (
    (factorScores.teamStrength - 50) * (weights.teamStrength / 100) +
    (factorScores.recentForm - 50) * (weights.recentForm / 100) +
    (factorScores.headToHead - 50) * (weights.headToHead / 100) +
    (factorScores.lineupTactics - 50) * (weights.lineupTactics / 100) +
    (factorScores.motivationStakes - 50) * (weights.motivationStakes / 100)
  );
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if ("output_text" in payload && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const output = "output" in payload ? (payload as { output?: unknown }).output : undefined;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item)) {
        return [];
      }

      const content = (item as { content?: unknown }).content;

      if (!Array.isArray(content)) {
        return [];
      }

      return content
        .map((contentItem) => {
          if (!contentItem || typeof contentItem !== "object" || !("text" in contentItem)) {
            return "";
          }

          return String((contentItem as { text?: unknown }).text ?? "");
        })
        .filter(Boolean);
    })
    .join("\n")
    .trim();
}

function scorelineFromRanks(homeRank: number, awayRank: number) {
  const difference = Math.abs(homeRank - awayRank);

  if (difference <= 4) {
    return { home: 1, away: 1 };
  }

  if (difference <= 12) {
    return homeRank < awayRank ? { home: 2, away: 1 } : { home: 1, away: 2 };
  }

  if (difference <= 24) {
    return homeRank < awayRank ? { home: 2, away: 0 } : { home: 0, away: 2 };
  }

  return homeRank < awayRank ? { home: 3, away: 1 } : { home: 1, away: 3 };
}

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003;
  }

  return hash;
}

function normalizedPairSignal(homeId: string, awayId: string, salt: string) {
  const pairKey = [homeId, awayId].sort().join(":");
  const raw = hashString(`${salt}:${pairKey}`) % 2001;
  const normalized = raw / 1000 - 1;

  return homeId <= awayId ? normalized : -normalized;
}

function getConfederationStrength(confederation?: string) {
  switch (confederation) {
    case "UEFA":
      return 72;
    case "CONMEBOL":
      return 69;
    case "CAF":
      return 59;
    case "CONCACAF":
      return 57;
    case "AFC":
      return 55;
    case "OFC":
      return 48;
    default:
      return 55;
  }
}

function getHostSignal(teamId?: string) {
  if (teamId === "united-states" || teamId === "canada" || teamId === "mexico") {
    return 8;
  }

  return 0;
}

function buildHeadToHeadAdvice(body: AdviceRequestBody) {
  const homeTeam = body.advisorHomeTeamId ? getTeamById(body.advisorHomeTeamId) : undefined;
  const awayTeam = body.advisorAwayTeamId ? getTeamById(body.advisorAwayTeamId) : undefined;
  const weights = getNormalizedAdviceWeights(body);

  if (!homeTeam || !awayTeam) {
    return "Choose two national teams to get a direct matchup prediction.";
  }

  if (homeTeam.id === awayTeam.id) {
    return "Choose two different national teams to compare.";
  }

  const factorScores = getHeadToHeadFactorScores(homeTeam, awayTeam);
  const weightedEdge = getWeightedTeamEdge(factorScores, weights);
  const predictedWinner =
    weightedEdge >= 0 ? homeTeam : awayTeam;
  const absoluteEdge = Math.abs(weightedEdge);
  const expectedGoals = scorelineFromRanks(homeTeam.fifaRank, awayTeam.fifaRank);
  let homeGoals = expectedGoals.home;
  let awayGoals = expectedGoals.away;

  if (absoluteEdge <= 2) {
    homeGoals = 1;
    awayGoals = 1;
  } else if (absoluteEdge <= 5) {
    if (weightedEdge > 0) {
      homeGoals = 2;
      awayGoals = 1;
    } else {
      homeGoals = 1;
      awayGoals = 2;
    }
  } else if (absoluteEdge <= 9) {
    if (weightedEdge > 0) {
      homeGoals = 2;
      awayGoals = 0;
    } else {
      homeGoals = 0;
      awayGoals = 2;
    }
  } else if (weightedEdge > 0) {
    homeGoals = 3;
    awayGoals = 1;
  } else {
    homeGoals = 1;
    awayGoals = 3;
  }

  const factorBreakdown = (Object.keys(weights) as Array<keyof typeof weights>)
    .sort((a, b) => weights[b] - weights[a])
    .map((key) => {
      const score = factorScores[key];
      const favoredTeam = score > 50 ? homeTeam.name : score < 50 ? awayTeam.name : "Even";

      return `${adviceWeightLabels[key]} ${weights[key]}%: ${favoredTeam}${
        favoredTeam === "Even" ? "" : ` edge (${Math.round(score)}/100)`
      }`;
    });
  const topFactors = (Object.keys(weights) as Array<keyof typeof weights>)
    .sort((a, b) => weights[b] - weights[a])
    .slice(0, 2)
    .map((key) => adviceWeightLabels[key])
    .join(" and ");

  return [
    `${homeTeam.name} vs ${awayTeam.name}`,
    `Suggested score: ${homeTeam.name} ${homeGoals}-${awayGoals} ${awayTeam.name}`,
    `Predicted winner: ${predictedWinner.name}`,
    `Priority weights: ${buildWeightSummary(weights)}`,
    `Factor read: ${factorBreakdown.join(" | ")}`,
    `Reason: ${topFactors} carry the most influence in this setup, so the weighted edge shifts toward ${predictedWinner.name}.`,
  ].join("\n");
}

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Could not generate advice.";
  }

  if ("error" in payload && payload.error && typeof payload.error === "object") {
    const errorObject = payload.error as {
      message?: unknown;
      code?: unknown;
      type?: unknown;
    };

    if (typeof errorObject.message === "string" && errorObject.message.trim()) {
      return errorObject.message;
    }

    if (typeof errorObject.code === "string" && errorObject.code.trim()) {
      return errorObject.code;
    }

    if (typeof errorObject.type === "string" && errorObject.type.trim()) {
      return errorObject.type;
    }
  }

  if ("message" in payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return "Could not generate advice.";
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(sessionCookieName)?.value);

    if (!user) {
      return NextResponse.json({ error: "Log in to get prediction advice." }, { status: 401 });
    }

    const body = (await request.json()) as AdviceRequestBody;
    const adviceWeightTotal = getAdviceWeightTotal(body);
    const requestApiKey = body.openAiApiKey?.trim();
    const model = process.env.OPENAI_MODEL || "gpt-5.5";

    if (body.adviceMode === "head-to-head" && adviceWeightTotal !== 100) {
      return NextResponse.json(
        { error: "Prediction criteria weights must add up to exactly 100." },
        { status: 400 },
      );
    }

    if (!requestApiKey) {
      return NextResponse.json(
        { error: "Enter your own OpenAI API key to get prediction advice." },
        { status: 400 },
      );
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requestApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          tools: [{ type: "web_search" }],
          tool_choice: "required",
          instructions:
            "You are a World Cup prediction assistant. Use web search before answering so the prediction reflects current online information when available. If two national teams are provided, give a direct head-to-head prediction only. Explicitly consider these weighted criteria: team strength, recent form, head-to-head record in the past 5 years, lineup and tactics, and motivation and stakes. Use the user's exact weights to decide which factors matter most. Return a projected score, predicted winner, the weight summary, and a short reason that references the weighted factors. Otherwise produce direct match-by-match prediction suggestions only. Keep the response scannable, practical, and concise.",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify({
                    username: user.username,
                    adviceMode: body.adviceMode,
                    advisorHomeTeamId: body.advisorHomeTeamId,
                    advisorAwayTeamId: body.advisorAwayTeamId,
                    advisorHomeTeamName: body.advisorHomeTeamId
                      ? getTeamById(body.advisorHomeTeamId)?.name
                      : undefined,
                    advisorAwayTeamName: body.advisorAwayTeamId
                      ? getTeamById(body.advisorAwayTeamId)?.name
                      : undefined,
                    adviceWeights: getNormalizedAdviceWeights(body),
                    groupName: body.groupName,
                    activeMode: body.activeMode,
                    selectedGroupId: body.selectedGroupId,
                    selectedGroup: body.selectedGroup,
                    groupScores: body.groupScores,
                    standings: body.standings,
                    bracketWinners: body.bracketWinners,
                    champion: body.champion,
                    officialKnockoutMatches: body.officialKnockoutMatches,
                  }),
                },
              ],
            },
          ],
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: extractErrorMessage(payload) },
          { status: response.status },
        );
      }

      return NextResponse.json({
        advice: extractResponseText(payload) || buildHeadToHeadAdvice(body),
        model,
      });
    } catch {
      return NextResponse.json(
        { error: "Could not reach OpenAI with the provided API key." },
        { status: 502 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate advice." },
      { status: 500 },
    );
  }
}
