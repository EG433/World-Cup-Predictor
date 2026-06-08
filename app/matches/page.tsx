import { AllGroupsStandings } from "@/components/all-groups-standings";
import { BracketView } from "@/components/bracket-view";
import { DayScheduleBrowser } from "@/components/day-schedule-browser";
import { SectionCard } from "@/components/section-card";
import { fifaScheduleSource, matches, tournamentGroups } from "@/lib/mock-data";

export default function MatchesPage() {
  const groupStageMatches = matches.filter((match) => match.stage === "Group Stage").length;
  const knockoutMatches = matches.length - groupStageMatches;

  return (
    <div className="section-stack">
      <section className="schedule-hero">
        <div>
          <p className="eyebrow">Tournament schedule</p>
          <h1>Follow every matchday.</h1>
          <p>
            Browse fixtures by date, scan the knockout road, and check each group without getting
            buried in one giant list.
          </p>
        </div>
        <div className="schedule-hero-panel" aria-label="Tournament schedule summary">
          <div>
            <span>Total fixtures</span>
            <strong>{matches.length}</strong>
          </div>
          <div>
            <span>Groups</span>
            <strong>{tournamentGroups.length}</strong>
          </div>
          <div>
            <span>Knockout</span>
            <strong>{knockoutMatches}</strong>
          </div>
          <a href={fifaScheduleSource} className="inline-link" target="_blank" rel="noreferrer">
            FIFA source
          </a>
        </div>
      </section>

      <SectionCard
        title="Matchday board"
        eyebrow="Fixtures by date"
        description=""
      >
        <DayScheduleBrowser matches={matches} />
      </SectionCard>

      <SectionCard
        title="Knockout bracket"
        eyebrow="Elimination path"
        description=""
      >
        <BracketView />
      </SectionCard>

      <section className="standings-section">
        <div className="section-card-copy">
          <p className="eyebrow">Groups</p>
          <div>
            <h2>Group standings</h2>
          </div>
        </div>
        <AllGroupsStandings />
      </section>
    </div>
  );
}
