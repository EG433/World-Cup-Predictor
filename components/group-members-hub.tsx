"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getTeamById } from "@/lib/mock-data";
import type { FriendPool } from "@/types/world-cup";

interface GroupMembersHubProps {
  groupId: string;
  initialPool?: FriendPool | null;
}

function groupNameFromId(groupId: string) {
  return groupId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function GroupMembersHub({ groupId, initialPool }: GroupMembersHubProps) {
  const [databasePool, setDatabasePool] = useState<FriendPool | null>(null);

  useEffect(() => {
    async function loadGroupMembers() {
      const groupResponse = await fetch(`/api/groups/${encodeURIComponent(groupId)}`, {
        credentials: "include",
      });
      const groupData = (await groupResponse.json()) as { group: FriendPool | null };
      setDatabasePool(groupData.group);
    }

    void loadGroupMembers();

    function handleWindowFocus() {
      void loadGroupMembers();
    }

    window.addEventListener("focus", handleWindowFocus);
    const refreshInterval = window.setInterval(() => {
      void loadGroupMembers();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.clearInterval(refreshInterval);
    };
  }, [groupId]);

  const pool = databasePool ?? initialPool;
  const members = pool?.members ?? [];

  if (!pool) {
    return (
      <section className="section-card">
        <div className="section-card-copy">
          <p className="eyebrow">Group members</p>
          <div>
            <h1>{groupNameFromId(groupId)}</h1>
            <p className="muted-text">
              This group is not available in this browser yet. Join or create it from the groups page.
            </p>
          </div>
        </div>
        <Link href="/groups" className="secondary-button">
          Back to groups
        </Link>
      </section>
    );
  }

  return (
    <div className="section-stack">
      <section className="page-intro">
        <p className="eyebrow">Group members</p>
        <h1>{pool.name}</h1>
        <p>
          View everyone currently in this prediction group, their supported team, and their pick
          progress.
        </p>
      </section>

      <section className="section-card group-members-detail-card">
        <div className="member-preview-header">
          <span className="group-card-label">Members</span>
          <span>
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>

        <div className="member-score-list group-members-detail-list">
          {members.map((member) => {
            const team = getTeamById(member.supportedTeamId);

            return (
              <article key={member.id} className="member-score-row group-member-detail-row">
                <div>
                  <strong>{member.username}</strong>
                  <span>{team ? `Supports ${team.name}` : "Supported team not chosen"}</span>
                </div>
                <div className="group-member-status">
                  <span>{member.predictionStatus}</span>
                  <strong>{member.points ?? 0} pts</strong>
                </div>
                <Link
                  href={`/groups/${pool.id}/predictions?memberId=${encodeURIComponent(member.id)}`}
                  className="secondary-button"
                >
                  View picks
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <div className="page-actions">
        <Link href={`/groups/${pool.id}/predictions`} className="primary-button">
          Edit picks
        </Link>
        <Link href="/groups" className="secondary-button">
          Back to groups
        </Link>
      </div>
    </div>
  );
}
