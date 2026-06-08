import { Team } from "@/types/world-cup";

interface TeamBadgeProps {
  team?: Team;
  align?: "left" | "right";
  showCode?: boolean;
}

export function TeamBadge({ team, align = "left", showCode = false }: TeamBadgeProps) {
  if (!team) {
    return <span className="team-badge">TBD</span>;
  }

  return (
    <span className={`team-badge ${align === "right" ? "team-badge-right" : ""}`}>
      <img
        className="team-flag"
        src={`https://flagcdn.com/w40/${team.flagCode}.png`}
        srcSet={`https://flagcdn.com/w40/${team.flagCode}.png 1x, https://flagcdn.com/w80/${team.flagCode}.png 2x`}
        width="24"
        height="18"
        alt={`${team.name} flag`}
        loading="lazy"
      />
      <span className="team-badge-name">{team.name}</span>
      {showCode ? <span className="team-badge-code">{team.code}</span> : null}
    </span>
  );
}
