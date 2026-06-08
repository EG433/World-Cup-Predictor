import { GroupStandingsTable } from "@/components/group-standings-table";
import { standingsByGroup, tournamentGroups } from "@/lib/mock-data";

export function AllGroupsStandings() {
  return (
    <div className="all-groups-grid">
      {tournamentGroups.map((group) => (
        <section key={group.id} className="standings-card">
          <div className="standings-card-header">
            <span className="standings-title">{group.label}</span>
            <span className="standings-arrow" aria-hidden="true">
              ›
            </span>
          </div>
          <GroupStandingsTable rows={standingsByGroup[group.id]} compact />
        </section>
      ))}
    </div>
  );
}
