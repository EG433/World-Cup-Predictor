import { formatKickoff, getTeamById } from "@/lib/mock-data";
import { Match } from "@/types/world-cup";
import { TeamBadge } from "@/components/team-badge";

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const homeTeam = match.homeTeamId ? getTeamById(match.homeTeamId) : undefined;
  const awayTeam = match.awayTeamId ? getTeamById(match.awayTeamId) : undefined;
  const kickoffLabel = formatKickoff(match.kickoff);
  const hasOfficialScore =
    typeof match.homeScore === "number" && typeof match.awayScore === "number";
  const statusLabel =
    match.status === "final" ? "Final" : match.status === "live" ? "Live" : "Scheduled";

  return (
    <article className="match-card">
      <div className="match-card-topline">
        <span className="match-stage-pill">{match.stage}</span>
        <span className={`match-status-chip is-${match.status ?? "scheduled"}`}>{statusLabel}</span>
      </div>

      <div className="match-card-subline">
        <span>{match.matchdayLabel}</span>
      </div>

      <div className="matchup-row">
        <div className="match-team-block">
          {homeTeam ? (
            <p className="team-name">
              <TeamBadge team={homeTeam} />
            </p>
          ) : (
            <p className="team-name">{match.homeSlotLabel ?? "TBD"}</p>
          )}
          {homeTeam ? <p className="team-meta">{homeTeam.code}</p> : null}
        </div>
        <span className={`versus-pill ${hasOfficialScore ? "has-score" : ""}`}>
          {hasOfficialScore ? `${match.homeScore}-${match.awayScore}` : "vs"}
        </span>
        <div className="match-team-block align-right">
          {awayTeam ? (
            <p className="team-name">
              <TeamBadge team={awayTeam} align="right" />
            </p>
          ) : (
            <p className="team-name">{match.awaySlotLabel ?? "TBD"}</p>
          )}
          {awayTeam ? <p className="team-meta">{awayTeam.code}</p> : null}
        </div>
      </div>

      <div className="match-card-footer">
        <span className="match-date-chip">{kickoffLabel}</span>
        <span className="match-venue-chip">
          {match.venue}, {match.city}
        </span>
      </div>
    </article>
  );
}
