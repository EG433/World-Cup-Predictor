"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { SafeUser } from "@/lib/server-auth";
import { formatKickoff, matches, tournamentGroups } from "@/lib/mock-data";
import type { FriendPool } from "@/types/world-cup";

export function HomeOverview() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [groups, setGroups] = useState<FriendPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      const [userResponse, groupsResponse] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include", cache: "no-store" }),
        fetch("/api/groups", { credentials: "include", cache: "no-store" }),
      ]);
      const userData = (await userResponse.json()) as { user: SafeUser | null };
      const groupsData = (await groupsResponse.json()) as { groups?: FriendPool[] };

      setUser(userData.user);
      setGroups(groupsData.groups ?? []);
      setIsLoading(false);
    }

    void loadHomeData();

    function handleAuthChange() {
      void loadHomeData();
    }

    function handleWindowFocus() {
      void loadHomeData();
    }

    window.addEventListener("auth-change", handleAuthChange);
    window.addEventListener("focus", handleWindowFocus);
    const refreshInterval = window.setInterval(() => {
      void loadHomeData();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.clearInterval(refreshInterval);
    };
  }, []);

  const visibleGroups = groups.slice(0, 3);
  const totalMembers = groups.reduce((memberCount, group) => memberCount + group.members.length, 0);
  const openingMatch = matches[0];
  const knockoutMatches = matches.filter((match) => match.stage !== "Group Stage").length;
  const hostCities = new Set(matches.map((match) => match.city)).size;
  const heroName =
    user && user.username.length > 14 ? `${user.username.slice(0, 14)}...` : user?.username;

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">World Cup 2026 predictor</p>
          <h1>
            {heroName
              ? `${heroName}, run your own matchday story.`
              : "Build your own World Cup matchday story."}
          </h1>
          <p>
            Set your picks, track every kickoff, stack your friend groups, and turn the 2026 World
            Cup into a proper tournament-night ritual.
          </p>
          <div className="home-hero-meta" aria-label="Tournament atmosphere highlights">
            <div>
              <span>Teams</span>
              <strong>48</strong>
            </div>
            <div>
              <span>Knockout nights</span>
              <strong>{knockoutMatches}</strong>
            </div>
            <div>
              <span>Host cities</span>
              <strong>{hostCities}</strong>
            </div>
          </div>
          <div className="hero-actions">
            <Link href="/groups" className="primary-button">
              Open my groups
            </Link>
            <Link href="/matches" className="secondary-button">
              Explore schedule
            </Link>
          </div>
        </div>

        <div className="home-spotlight-card">
          <span className="home-card-kicker">Matchday spotlight</span>
          <strong>{openingMatch?.matchdayLabel ?? "Match 1"}</strong>
          <p>{openingMatch ? "Mexico vs South Africa" : "Schedule loading"}</p>
          <small>{openingMatch ? formatKickoff(openingMatch.kickoff) : "World Cup 2026"}</small>
          <div className="home-spotlight-meta">
            <span>{openingMatch?.venue ?? "Opening venue"}</span>
            <span>{openingMatch?.city ?? "Host city"}</span>
          </div>
        </div>
      </section>

      <section className="home-overview-grid" aria-label="Prediction overview">
        <article className="home-metric-card">
          <span>Signed in as</span>
          <strong>{isLoading ? "Loading..." : user?.username ?? "Guest"}</strong>
          <p>{user ? "Your saved picks and groups are ready." : "Log in to save predictions."}</p>
        </article>
        <article className="home-metric-card">
          <span>Your groups</span>
          <strong>{isLoading ? "..." : groups.length}</strong>
          <p>{groups.length === 1 ? "1 group joined." : `${groups.length} groups joined.`}</p>
        </article>
        <article className="home-metric-card">
          <span>Friends in pools</span>
          <strong>{isLoading ? "..." : totalMembers}</strong>
          <p>Supporters, rivals, and bragging-rights traffic.</p>
        </article>
        <article className="home-metric-card">
          <span>Tournament map</span>
          <strong>{matches.length}</strong>
          <p>{tournamentGroups.length} groups and one long road to the final.</p>
        </article>
      </section>

      <section className="home-content-grid">
        <article className="home-panel home-groups-panel">
          <div className="home-panel-header">
            <div>
              <p className="eyebrow">My rooms</p>
              <h2>Supporters&apos; rooms</h2>
            </div>
            <Link href="/groups" className="inline-link">
              View all
            </Link>
          </div>

          {visibleGroups.length > 0 ? (
            <div className="home-group-cards">
              {visibleGroups.map((group) => {
                const leader = [...group.members].sort(
                  (firstMember, secondMember) =>
                    (secondMember.points ?? 0) - (firstMember.points ?? 0),
                )[0];

                return (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}/predictions`}
                    className="home-group-card"
                  >
                    <span>{group.privacy}</span>
                    <strong>{group.name}</strong>
                    <small>
                      {group.members.length} {group.members.length === 1 ? "member" : "members"}
                    </small>
                    <p>
                      Leader: {leader?.username ?? "No leader yet"} · {leader?.points ?? 0} pts
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="home-empty-state">
              <h3>No groups yet</h3>
              <p>Create a group or join an existing one to start making picks with friends.</p>
              <div className="hero-actions">
                <Link href="/groups/create" className="primary-button">
                  Create group
                </Link>
                <Link href="/groups" className="secondary-button">
                  Join group
                </Link>
              </div>
            </div>
          )}
        </article>

        <article className="home-panel home-next-panel">
          <p className="eyebrow">Next moves</p>
          <h2>Keep the tournament buzzing.</h2>
          <div className="home-action-list">
            <Link href="/matches">
              <span>01</span>
              <strong>Scan the fixture board</strong>
              <small>Move by matchday and see how the bracket opens up.</small>
            </Link>
            <Link href="/groups">
              <span>02</span>
              <strong>Bring in your rivals</strong>
              <small>Keep your whole friend circle inside one live table.</small>
            </Link>
            <Link href={visibleGroups[0] ? `/groups/${visibleGroups[0].id}/predictions` : "/groups"}>
              <span>03</span>
              <strong>Lock your scoreline calls</strong>
              <small>Save your groups, rankings, and knockout route.</small>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
