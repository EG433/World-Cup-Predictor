import { matches } from "@/lib/mock-data";
import { Match, MatchStage } from "@/types/world-cup";

const bracketStages = [
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Final",
] as const;

interface BracketViewProps {
  interactive?: boolean;
}

const stageLabel: Record<(typeof bracketStages)[number], string> = {
  "Round of 32": "Round of 32",
  "Round of 16": "Round of 16",
  Quarterfinal: "Quarterfinals",
  Semifinal: "Semifinals",
  Final: "Final",
};

function getStageMatches(stage: MatchStage) {
  return matches.filter((match) => match.stage === stage);
}

function getRowStart(stageIndex: number, slotIndex: number) {
  const spacingByStage = [4, 8, 16, 32, 64];
  const offsetByStage = [1, 3, 7, 15, 31];

  return slotIndex * spacingByStage[stageIndex] + offsetByStage[stageIndex];
}

function getTeamLabel(match: Match, side: "home" | "away") {
  return side === "home"
    ? match.homeSlotLabel ?? "TBD"
    : match.awaySlotLabel ?? "TBD";
}

function BracketMatchCard({
  match,
  stageIndex,
  slotIndex,
  interactive,
}: {
  match: Match;
  stageIndex: number;
  slotIndex: number;
  interactive: boolean;
}) {
  const isFinal = match.stage === "Final";
  const className = `bracket-match-node ${stageIndex > 0 ? "has-left-connector" : ""} ${
    !isFinal ? "has-right-connector" : "is-final-node"
  }`;

  return (
    <article
      className={className}
      style={{
        gridColumn: stageIndex * 2 + 1,
        gridRow: `${getRowStart(stageIndex, slotIndex)} / span 3`,
      }}
    >
      <span className="bracket-match-number">{match.matchdayLabel}</span>
      <div className="bracket-slot-row">
        <span>{getTeamLabel(match, "home")}</span>
        {interactive ? (
          <input
            type="text"
            defaultValue=""
            placeholder="Pick"
            aria-label={`Pick home side for ${match.matchdayLabel}`}
          />
        ) : null}
      </div>
      <div className="bracket-slot-row">
        <span>{getTeamLabel(match, "away")}</span>
        {interactive ? (
          <input
            type="text"
            defaultValue=""
            placeholder="Pick"
            aria-label={`Pick away side for ${match.matchdayLabel}`}
          />
        ) : null}
      </div>
    </article>
  );
}

export function BracketView({ interactive = false }: BracketViewProps) {
  const stageMatches = bracketStages.map((stage) => getStageMatches(stage));
  const thirdPlaceMatch = getStageMatches("Third Place")[0];

  return (
    <div className="bracket-shell" aria-label="World Cup knockout bracket">
      <div className="bracket-stage-labels" aria-hidden="true">
        {bracketStages.map((stage) => (
          <span key={stage}>{stageLabel[stage]}</span>
        ))}
      </div>

      <div className="bracket-tree">
        {stageMatches.flatMap((roundMatches, stageIndex) =>
          roundMatches.map((match, slotIndex) => (
            <BracketMatchCard
              key={match.id}
              match={match}
              stageIndex={stageIndex}
              slotIndex={slotIndex}
              interactive={interactive}
            />
          )),
        )}

        {stageMatches.slice(0, -1).flatMap((roundMatches, stageIndex) =>
          Array.from({ length: Math.ceil(roundMatches.length / 2) }, (_, connectorIndex) => {
            const firstMatchRow = getRowStart(stageIndex, connectorIndex * 2);
            const secondMatchRow = getRowStart(stageIndex, connectorIndex * 2 + 1);

            return (
              <span
                key={`${stageIndex}-${connectorIndex}`}
                className="bracket-connector"
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

      {thirdPlaceMatch ? (
        <aside className="third-place-panel" aria-label="Third place match">
          <span className="bracket-stage-chip">Third place</span>
          <BracketMatchCard
            match={thirdPlaceMatch}
            stageIndex={0}
            slotIndex={0}
            interactive={interactive}
          />
        </aside>
      ) : null}
    </div>
  );
}
