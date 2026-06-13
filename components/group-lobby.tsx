"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { deleteStoredGroup, readStoredGroups } from "@/lib/group-storage";
import { teams } from "@/lib/mock-data";
import { FriendPool } from "@/types/world-cup";

type AvailablePredictionGroup = {
  id: string;
  name: string;
  privacy: "public" | "private";
  memberCount: number;
};

function mergeGroupsById(...groupCollections: FriendPool[][]) {
  const groupsById = new Map<string, FriendPool>();

  for (const collection of groupCollections) {
    for (const group of collection) {
      groupsById.set(group.id, group);
    }
  }

  return Array.from(groupsById.values());
}

export function GroupLobby() {
  const [groups, setGroups] = useState<FriendPool[]>([]);
  const [availableGroups, setAvailableGroups] = useState<AvailablePredictionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [joinUsername, setJoinUsername] = useState("");
  const [joinSupportedTeamId, setJoinSupportedTeamId] = useState("");
  const [selectedAvailableGroupId, setSelectedAvailableGroupId] = useState("");
  const [joinGroupName, setJoinGroupName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingGroupId, setDeletingGroupId] = useState("");
  const hasAlreadyJoined = selectedAvailableGroupId
    ? groups.some((group) => group.id === selectedAvailableGroupId)
    : false;

  async function loadGroupPageData(fallbackGroups: FriendPool[] = []) {
    const [groupsResponse, availableGroupsResponse, authResponse] = await Promise.all([
      fetch("/api/groups", { credentials: "include", cache: "no-store" }),
      fetch("/api/groups/available", { credentials: "include", cache: "no-store" }),
      fetch("/api/auth/me", { credentials: "include", cache: "no-store" }),
    ]);
    const groupsData = (await groupsResponse.json()) as { groups?: FriendPool[] };
    const availableGroupsData = (await availableGroupsResponse.json()) as {
      groups?: AvailablePredictionGroup[];
    };
    const authData = (await authResponse.json()) as {
      user?: { username?: string; supportedTeamId?: string } | null;
    };
    let databaseGroups = groupsData.groups ?? [];
    const localGroupsToMigrate = readStoredGroups().filter(
      (storedGroup) => !databaseGroups.some((group) => group.id === storedGroup.id),
    );

    if (localGroupsToMigrate.length > 0) {
      await Promise.all(
        localGroupsToMigrate.map((storedGroup) =>
          fetch("/api/groups", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
              body: JSON.stringify({
                routeGroupId: storedGroup.id,
                name: storedGroup.name,
                scoringMode: "traditional",
                privacy: storedGroup.privacy,
                password: storedGroup.password,
              }),
          }),
        ),
      );

      const refreshedGroupsResponse = await fetch("/api/groups", {
        credentials: "include",
        cache: "no-store",
      });
      const refreshedGroupsData = (await refreshedGroupsResponse.json()) as {
        groups?: FriendPool[];
      };
      databaseGroups = refreshedGroupsData.groups ?? databaseGroups;
    }

    setGroups(mergeGroupsById(fallbackGroups, databaseGroups));
    setAvailableGroups(availableGroupsData.groups ?? []);
    setIsSignedIn(Boolean(authData.user));
    setJoinUsername(authData.user?.username ?? "");
    setJoinSupportedTeamId(authData.user?.supportedTeamId ?? "");
    setIsLoading(false);
  }

  useEffect(() => {
    void loadGroupPageData();

    function handleAuthChange() {
      void loadGroupPageData();
    }

    function handleWindowFocus() {
      void loadGroupPageData();
    }

    window.addEventListener("auth-change", handleAuthChange);
    window.addEventListener("focus", handleWindowFocus);
    const refreshInterval = window.setInterval(() => {
      void loadGroupPageData();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.clearInterval(refreshInterval);
    };
  }, []);

  async function handleDeleteGroup(pool: FriendPool) {
    const confirmed = window.confirm(
      `Delete ${pool.name}? If you own this group, it will be removed for every member.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteError("");
    setDeletingGroupId(pool.id);

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(pool.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete group.");
      }

      deleteStoredGroup(pool.id);
      setGroups((currentGroups) => currentGroups.filter((group) => group.id !== pool.id));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete group.");
    } finally {
      setDeletingGroupId("");
    }
  }

  return (
    <div className="group-lobby">
      <section className="joined-groups">
        <div className="joined-groups-header">
          <div>
            <p className="eyebrow">My groups</p>
            <h2>Prediction rooms</h2>
            <p className="muted-text">
              Jump into picks, check who joined, or start a new room for another friend circle.
            </p>
          </div>
          <div className="groups-page-actions">
            <Link href="/groups/create" className="primary-button">
              Create new group
            </Link>
            <button
              type="button"
              className="join-existing-button"
              onClick={() => {
                setIsJoinOpen((value) => !value);
                setJoinError("");
                if (isJoinOpen) {
                  setSelectedAvailableGroupId("");
                }
              }}
            >
              Join existing group
            </button>
          </div>
        </div>

        {isJoinOpen ? (
          <form
            className="join-group-panel"
            onSubmit={async (event) => {
              event.preventDefault();
              setJoinError("");

              if (!joinGroupName.trim()) {
                setJoinError("Enter a group name.");
                return;
              }

              if (hasAlreadyJoined) {
                setJoinError("You have already joined this group.");
                return;
              }

              if (!isSignedIn && !joinUsername.trim()) {
                setJoinError("Enter a username before joining a group.");
                return;
              }

              if (!isSignedIn && !joinSupportedTeamId) {
                setJoinError("Choose one national team before joining a group.");
                return;
              }

              const response = await fetch("/api/groups/join", {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: joinGroupName,
                  routeGroupId: selectedAvailableGroupId || undefined,
                  password: joinPassword,
                  username: joinUsername,
                  supportedTeamId: joinSupportedTeamId,
                }),
              });
              const data = (await response.json()) as {
                error?: string;
                alreadyJoined?: boolean;
                group?: FriendPool;
              };

              if (!response.ok || !data.group) {
                setJoinError(data.error ?? "Could not join group.");
                return;
              }

              if (data.alreadyJoined) {
                setJoinError("You have already joined this group.");
                return;
              }

              const nextGroups = mergeGroupsById([data.group as FriendPool], groups);
              setGroups(nextGroups);
              window.dispatchEvent(new Event("auth-change"));
              setJoinGroupName("");
              setSelectedAvailableGroupId("");
              setJoinPassword("");
              if (!isSignedIn) {
                setIsSignedIn(true);
              }
              setIsJoinOpen(false);
              await loadGroupPageData(nextGroups);
            }}
          >
            {!isSignedIn ? (
              <>
                <label>
                  Username
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={joinUsername}
                    onChange={(event) => {
                      setJoinUsername(event.target.value);
                      setJoinError("");
                    }}
                    required
                  />
                </label>

                <label>
                  Supported team
                  <select
                    value={joinSupportedTeamId}
                    onChange={(event) => {
                      setJoinSupportedTeamId(event.target.value);
                      setJoinError("");
                    }}
                    required
                  >
                    <option value="">Choose one national team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <label>
              Group name
              <input
                type="text"
                placeholder="Select or enter group name"
                value={joinGroupName}
                onChange={(event) => {
                  setSelectedAvailableGroupId("");
                  setJoinGroupName(event.target.value);
                  setJoinError("");
                }}
                required
              />
            </label>

            <label>
              Group password
              <input
                type="password"
                placeholder="Only needed for private groups"
                value={joinPassword}
                onChange={(event) => setJoinPassword(event.target.value)}
              />
            </label>

            {availableGroups.length > 0 ? (
              <div className="available-groups-picker">
                <div className="available-groups-header">
                  <span className="group-card-label">Choose a group</span>
                  <span>
                    {availableGroups.length}{" "}
                    {availableGroups.length === 1 ? "group" : "groups"} available
                  </span>
                </div>
                <div className="available-groups-grid">
                  {availableGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      className={`available-group-card ${
                        selectedAvailableGroupId === group.id
                          ? "is-selected"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedAvailableGroupId(group.id);
                        setJoinGroupName(group.name);
                        setJoinError("");
                      }}
                    >
                      <span>{group.privacy}</span>
                      <strong>{group.name}</strong>
                      <small>
                        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {joinError ? <p className="form-error">{joinError}</p> : null}
            {hasAlreadyJoined && !joinError ? (
              <p className="form-success">You have already joined this group.</p>
            ) : null}

            <div className="join-group-actions">
              <button
                type="submit"
                className={hasAlreadyJoined ? "primary-button is-joined" : "primary-button"}
                disabled={hasAlreadyJoined}
              >
                {hasAlreadyJoined ? "Already joined" : "Join group"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setIsJoinOpen(false);
                  setJoinError("");
                  setSelectedAvailableGroupId("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {deleteError ? <p className="form-error">{deleteError}</p> : null}

        {isLoading ? (
          <div className="helper-banner">Loading your groups...</div>
        ) : groups.length === 0 ? (
          <div className="empty-groups-panel">
            <div>
              <h2>No groups yet</h2>
              <p className="muted-text">
                Create your first prediction group and invite friends once the group is ready.
              </p>
            </div>
            <div className="empty-group-actions">
              <Link href="/groups/create" className="primary-button">
                Create new group
              </Link>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setIsJoinOpen(true);
                  setJoinError("");
                }}
              >
                Join existing group
              </button>
            </div>
          </div>
        ) : (
          <div className="joined-group-grid">
            {groups.map((pool) => {
              const sortedMembers = [...pool.members].sort(
                (firstMember, secondMember) =>
                  (secondMember.points ?? 0) - (firstMember.points ?? 0),
              );
              const leader = sortedMembers[0];
              const totalPoints = pool.members.reduce(
                (points, member) => points + (member.points ?? 0),
                0,
              );

              return (
                <article key={pool.id} className="joined-group-card">
                  <div className="joined-card-topline">
                    <div>
                      <span className="group-card-label">Group</span>
                      <h2>{pool.name}</h2>
                    </div>
                    <span className={`group-privacy-pill is-${pool.privacy}`}>
                      {pool.privacy}
                    </span>
                  </div>

                  <div className="joined-card-body">
                    <div className="group-stat-card">
                      <span>Members</span>
                      <strong>{pool.members.length}</strong>
                    </div>
                    <div className="group-stat-card">
                      <span>Leader</span>
                      <strong>{leader?.points ?? 0} pts</strong>
                      <small>{leader?.username ?? "No members yet"}</small>
                    </div>
                    <div className="group-stat-card">
                      <span>Total pool points</span>
                      <strong>{totalPoints}</strong>
                    </div>
                  </div>

                  <div className="group-member-preview">
                    <div className="member-preview-header">
                      <span className="group-card-label">Leaderboard preview</span>
                      <span>
                        {pool.members.length} {pool.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <div className="member-score-list">
                      {sortedMembers.slice(0, 4).map((member, index) => (
                        <div key={member.id} className="member-score-row">
                          <div className="member-name-cell">
                            <span className="member-rank">{index + 1}</span>
                            <div>
                              <strong>{member.username}</strong>
                              <span>{member.predictionStatus}</span>
                            </div>
                          </div>
                          <strong>{member.points ?? 0} pts</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="group-card-actions">
                    <Link href={`/groups/${pool.id}/predictions`} className="primary-button">
                      Edit picks
                    </Link>
                    <Link href={`/groups/${pool.id}`} className="secondary-button">
                      View members
                    </Link>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleDeleteGroup(pool)}
                      disabled={deletingGroupId === pool.id}
                    >
                      {deletingGroupId === pool.id ? "Deleting..." : "Delete group"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
