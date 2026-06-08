import { getMatchesForGroup, getTeamById, standingsByGroup } from "@/lib/mock-data";

import { GroupStandingsTable } from "@/components/group-standings-table";
import { BracketView } from "@/components/bracket-view";
import { TeamBadge } from "@/components/team-badge";
import { getUpsetBonusForGroupMatch } from "@/lib/scoring";
import { PredictionScoringMode } from "@/types/world-cup";

interface PredictionWorkspaceProps {
  groupId: string;
  scoringMode: PredictionScoringMode;
}

export function PredictionWorkspace({ groupId, scoringMode }: PredictionWorkspaceProps) {
  const groupMatches = getMatchesForGroup(groupId);
  const standings = standingsByGroup[groupId] ?? [];

  return (
    <div className="prediction-layout">
      <section className="section-card">
        <div className="section-card-copy">
          <p className="eyebrow">Step 1</p>
          <div>
            <h2>Choose every group-stage result</h2>
            <p className="muted-text">
              Each match can later support score picks, bonus questions, or locked deadlines.
            </p>
          </div>
        </div>

        <div className="prediction-match-grid">
          {groupMatches.map((match) => {
            const homeTeam = getTeamById(match.homeTeamId ?? "");
            const awayTeam = getTeamById(match.awayTeamId ?? "");
            const drawBonus = getUpsetBonusForGroupMatch(match, "draw", "draw");
            const homeWinBonus = getUpsetBonusForGroupMatch(match, "home", "home");
            const awayWinBonus = getUpsetBonusForGroupMatch(match, "away", "away");

            return (
              <article key={match.id} className="prediction-card">
                <div className="match-card-topline">
                  <span>{match.matchdayLabel}</span>
                  <span>{match.city}</span>
                </div>
                <div className="prediction-versus">
                  <div>
                    <TeamBadge team={homeTeam} />
                    {homeTeam ? (
                      <span className="seed-chip">Seed {homeTeam.tournamentSeed}</span>
                    ) : null}
                  </div>
                  <span className="versus-pill">vs</span>
                  <div>
                    <TeamBadge team={awayTeam} />
                    {awayTeam ? (
                      <span className="seed-chip">Seed {awayTeam.tournamentSeed}</span>
                    ) : null}
                  </div>
                </div>
                <div className="prediction-select-row">
                  <select defaultValue="">
                    <option value="" disabled>
                      Pick result
                    </option>
                    <option value="home">
                      Home win{scoringMode === "upset" && homeWinBonus ? ` (+${homeWinBonus})` : ""}
                    </option>
                    <option value="draw">
                      Draw{scoringMode === "upset" && drawBonus ? ` (+${drawBonus})` : ""}
                    </option>
                    <option value="away">
                      Away win{scoringMode === "upset" && awayWinBonus ? ` (+${awayWinBonus})` : ""}
                    </option>
                  </select>
                  <input type="text" placeholder="Optional score" />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-copy">
          <p className="eyebrow">Step 2</p>
          <div>
            <h2>Predict the group ranking from 1 to 4</h2>
            <p className="muted-text">
              This table is ready for rules like tie-break order, bonus points, and pick locking.
            </p>
          </div>
        </div>
        <GroupStandingsTable rows={standings} editable />
      </section>

      <section className="section-card">
        <div className="section-card-copy">
          <p className="eyebrow">Step 3</p>
          <div>
            <h2>Build your knockout bracket</h2>
            <p className="muted-text">
              The sample bracket uses slot labels now, so we can connect it to real advancement rules later.
            </p>
          </div>
        </div>
        <BracketView interactive />
      </section>
    </div>
  );
}
