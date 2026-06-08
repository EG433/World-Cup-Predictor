import { FriendPool, PredictionScoringMode } from "@/types/world-cup";

export const createdGroupsStorageKey = "world-cup-created-groups";

export interface StoredGroup {
  id: string;
  name: string;
  scoringMode: PredictionScoringMode;
  privacy: "public" | "private";
  password?: string;
  maxBracketsPerPlayer: number;
  allowJoinAfterLock: boolean;
}

export function readStoredGroups() {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(createdGroupsStorageKey);

  if (!rawValue) {
    return [];
  }

  try {
    return JSON.parse(rawValue) as StoredGroup[];
  } catch {
    return [];
  }
}

export function writeStoredGroup(group: StoredGroup) {
  const currentGroups = readStoredGroups();
  window.localStorage.setItem(
    createdGroupsStorageKey,
    JSON.stringify([group, ...currentGroups]),
  );
}

export function clearStoredGroups() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(createdGroupsStorageKey);
}

export function deleteStoredGroup(groupId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const nextGroups = readStoredGroups().filter((group) => group.id !== groupId);
  window.localStorage.setItem(createdGroupsStorageKey, JSON.stringify(nextGroups));
}

export function storedGroupToFriendPool(group: StoredGroup): FriendPool {
  return {
    id: group.id,
    name: group.name,
    inviteCode: group.id.toUpperCase(),
    scoringMode: group.scoringMode,
    privacy: group.privacy,
    maxBracketsPerPlayer: group.maxBracketsPerPlayer,
    allowJoinAfterLock: group.allowJoinAfterLock,
    members: [
      {
        id: "user-1",
        displayName: "Maya Thompson",
        username: "mayapicks",
        supportedTeamId: "japan",
        predictionStatus: "Not started",
      },
    ],
  };
}
