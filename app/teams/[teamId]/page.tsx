import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchCard } from "@/components/match-card";
import { SectionCard } from "@/components/section-card";
import { getMatchesForTeam, getTeamById, tournamentGroups } from "@/lib/mock-data";

interface TeamPageProps {
  params: Promise<{ teamId: string }>;
}

export function generateStaticParams() {
  return tournamentGroups.flatMap((group) => group.teamIds.map((teamId) => ({ teamId })));
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const team = getTeamById(teamId);

  if (!team) {
    notFound();
  }

  const group = tournamentGroups.find((entry) => entry.teamIds.includes(teamId));
  const matches = getMatchesForTeam(teamId);

  return (
    <div className="section-stack">
      <section className="page-intro">
        <p className="eyebrow">Personalized schedule</p>
        <h1>{team.name}</h1>
        <p>
          Each user can have a team-first page like this after choosing their supported national
          team during sign-up.
        </p>
      </section>

      <div className="helper-banner">
        {team.name} is currently grouped under {group?.label}. This mock page can later expand with
        live standings, results, or chat for supporters.
      </div>

      <SectionCard
        title={`${team.name} fixtures`}
        eyebrow="Team schedule"
        description="This list filters directly from the tournament match dataset."
      >
        <div className="match-grid">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </SectionCard>

      <div className="page-actions">
        <Link href="/matches" className="secondary-button">
          Back to full schedule
        </Link>
        <Link href="/groups" className="primary-button">
          Go to groups
        </Link>
      </div>
    </div>
  );
}
