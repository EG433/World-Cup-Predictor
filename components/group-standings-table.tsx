import { getTeamById } from "@/lib/mock-data";
import { GroupStanding } from "@/types/world-cup";
import { TeamBadge } from "@/components/team-badge";

interface GroupStandingsTableProps {
  rows: GroupStanding[];
  editable?: boolean;
  compact?: boolean;
}

export function GroupStandingsTable({
  rows,
  editable = false,
  compact = false,
}: GroupStandingsTableProps) {
  return (
    <div className="table-shell">
      <table className={`standings-table ${compact ? "standings-table-compact" : ""}`}>
        <thead>
          <tr>
            {editable ? <th>Pick</th> : null}
            {!editable ? <th></th> : null}
            <th>Team</th>
            <th>MP</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const team = getTeamById(row.teamId);

            return (
              <tr key={row.teamId}>
                {editable ? (
                  <td>
                    <select defaultValue={String(index + 1)} aria-label={`Predicted position for ${team?.name}`}>
                      {[1, 2, 3, 4].map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </td>
                ) : null}
                {!editable ? <td className="standing-rank">{index + 1}</td> : null}
                <td>
                  <TeamBadge team={team} />
                </td>
                <td>{row.played}</td>
                <td>{row.wins}</td>
                <td>{row.draws}</td>
                <td>{row.losses}</td>
                <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td>{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
