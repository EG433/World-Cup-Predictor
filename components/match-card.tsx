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

  return (
    <article className="match-card">
      <div className="match-card-topline">
        <span className="match-stage-pill">{match.stage}</span>
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
        <span className="versus-pill">vs</span>
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
