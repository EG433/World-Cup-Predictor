import { GroupStandingsTable } from "@/components/group-standings-table";
import { standingsByGroup, tournamentGroups } from "@/lib/mock-data";
import type { GroupStanding } from "@/types/world-cup";

interface AllGroupsStandingsProps {
  standings?: Record<string, GroupStanding[]>;
}

export function AllGroupsStandings({ standings = standingsByGroup }: AllGroupsStandingsProps) {
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
          <GroupStandingsTable rows={standings[group.id] ?? standingsByGroup[group.id]} compact />
        </section>
      ))}
    </div>
  );
}
