import { AllGroupsStandings } from "@/components/all-groups-standings";
import { BracketView } from "@/components/bracket-view";
import { DayScheduleBrowser } from "@/components/day-schedule-browser";
import { SectionCard } from "@/components/section-card";
import {
  computeOfficialStandingsByGroup,
  getOfficialMatchRowsForSchedule,
  type OfficialMatchResultRow,
} from "@/lib/official-results";
import { fifaScheduleSource, matches, tournamentGroups } from "@/lib/mock-data";
import { refreshOfficialResultsIfStale, ensureGroupDatabase } from "@/lib/server-groups";

export const dynamic = "force-dynamic";

async function loadOfficialResults() {
  try {
    await refreshOfficialResultsIfStale({ minimumMinutesBetweenChecks: 0 });
    const pool = await ensureGroupDatabase();
    const result = await pool.query<OfficialMatchResultRow>("select * from match_results");

    return result.rows;
  } catch {
    return [];
  }
}

export default async function MatchesPage() {
  const officialResults = await loadOfficialResults();
  const scheduleMatches = getOfficialMatchRowsForSchedule(officialResults);
  const standings = computeOfficialStandingsByGroup(officialResults);
  const groupStageMatches = matches.filter((match) => match.stage === "Group Stage").length;
  const knockoutMatches = matches.length - groupStageMatches;
  const hostCities = new Set(matches.map((match) => match.city)).size;

  return (
    <div className="section-stack">
      <section className="schedule-hero">
        <div>
          <p className="eyebrow">Tournament schedule</p>
          <h1>Track the tournament like match control.</h1>
          <p>
            Move day by day, read the full fixture board, and follow the knockout route from the
            opening whistle to the last confetti drop.
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
          <div>
            <span>Host cities</span>
            <strong>{hostCities}</strong>
          </div>
          <a href={fifaScheduleSource} className="inline-link" target="_blank" rel="noreferrer">
            FIFA source
          </a>
        </div>
      </section>

      <SectionCard
        title="Match center"
        eyebrow="Fixtures by date"
        description=""
      >
        <DayScheduleBrowser matches={scheduleMatches} />
      </SectionCard>

      <SectionCard
        title="Road to the final"
        eyebrow="Elimination path"
        description=""
      >
        <BracketView />
      </SectionCard>

      <section className="standings-section">
        <div className="section-card-copy">
          <p className="eyebrow">Groups</p>
          <div>
            <h2>Group tables</h2>
          </div>
        </div>
        <AllGroupsStandings standings={standings} />
      </section>
    </div>
  );
}
