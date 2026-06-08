import { pbkdf2, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

import { syncOfficialFifaDataIfStale } from "@/lib/fifa-sync";
import { calculatePredictionPoints, MatchResultRow } from "@/lib/live-scoring";
import { getPostgresPool, SafeUser } from "@/lib/server-auth";
import { FriendPool, PredictionScoringMode } from "@/types/world-cup";

const pbkdf2Async = promisify(pbkdf2);
const passwordIterations = 600_000;
const passwordKeyLength = 32;

type GroupPrivacy = "public" | "private";

export type AvailablePredictionGroup = {
  id: string;
  name: string;
  privacy: GroupPrivacy;
  memberCount: number;
};

type GroupRow = {
  id: string;
  name: string;
  scoring_mode: PredictionScoringMode;
  privacy: GroupPrivacy;
  member_id: string | null;
  username: string | null;
  supported_team_id: string | null;
  has_draft: boolean | null;
  prediction_data: unknown | null;
};

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function slugifyGroupName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "group";
}

async function hashPassword(password: string, salt = randomBytes(16).toString("base64")) {
  const hashBuffer = await pbkdf2Async(
    password,
    salt,
    passwordIterations,
    passwordKeyLength,
    "sha256",
  );

  return {
    salt,
    hash: hashBuffer.toString("base64"),
  };
}

async function verifyPassword(password: string, salt: string, storedHash: string) {
  const { hash } = await hashPassword(password, salt);
  const storedHashBuffer = Buffer.from(storedHash, "base64");
  const candidateHashBuffer = Buffer.from(hash, "base64");

  return (
    storedHashBuffer.length === candidateHashBuffer.length &&
    timingSafeEqual(storedHashBuffer, candidateHashBuffer)
  );
}

export async function ensureGroupDatabase() {
  const pool = await getPostgresPool();

  await pool.query("create extension if not exists pgcrypto");
  await pool.query(`
    create table if not exists prediction_groups (
      id uuid primary key default gen_random_uuid(),
      route_group_id text,
      name text not null,
      scoring_mode text not null check (scoring_mode in ('traditional', 'upset')),
      privacy text not null check (privacy in ('public', 'private')),
      password_salt text,
      password_hash text,
      created_by uuid not null references app_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      constraint private_group_password_required check (
        privacy = 'public'
        or (password_salt is not null and password_hash is not null)
      )
    )
  `);
  await pool.query(
    "alter table prediction_groups add column if not exists route_group_id text",
  );
  await pool.query(
    "update prediction_groups set route_group_id = id::text where route_group_id is null",
  );
  await pool.query(
    "create unique index if not exists prediction_groups_route_group_id_idx on prediction_groups(route_group_id)",
  );
  await pool.query(`
    create table if not exists group_members (
      group_id uuid not null references prediction_groups(id) on delete cascade,
      user_id uuid not null references app_users(id) on delete cascade,
      role text not null default 'member' check (role in ('owner', 'member')),
      joined_at timestamptz not null default now(),
      primary key (group_id, user_id)
    )
  `);
  await pool.query(`
    create table if not exists joined_group_records (
      id uuid primary key default gen_random_uuid(),
      route_group_id text not null,
      normalized_username text not null,
      username text not null,
      user_id uuid references app_users(id) on delete set null,
      source text not null default 'join',
      joined_at timestamptz not null default now(),
      unique (route_group_id, normalized_username)
    )
  `);
  await pool.query(`
    update group_members
    set role = 'member'
    from prediction_groups
    where group_members.group_id = prediction_groups.id
      and group_members.user_id <> prediction_groups.created_by
      and group_members.role = 'owner'
  `);
  await pool.query(`
    insert into group_members (group_id, user_id, role)
    select prediction_groups.id, prediction_groups.created_by, 'owner'
    from prediction_groups
    left join group_members
      on group_members.group_id = prediction_groups.id
      and group_members.user_id = prediction_groups.created_by
    where group_members.user_id is null
    on conflict (group_id, user_id) do nothing
  `);
  await pool.query(`
    insert into joined_group_records (
      route_group_id,
      normalized_username,
      username,
      user_id,
      source,
      joined_at
    )
    select
      prediction_groups.route_group_id,
      lower(app_users.username),
      app_users.username,
      app_users.id,
      case
        when prediction_groups.created_by = app_users.id then 'create'
        else 'join'
      end,
      coalesce(group_members.joined_at, prediction_groups.created_at)
    from prediction_groups
    left join group_members on group_members.group_id = prediction_groups.id
    left join app_users on app_users.id = group_members.user_id
    where app_users.id is not null
    on conflict (route_group_id, normalized_username) do update
      set username = excluded.username,
          user_id = coalesce(excluded.user_id, joined_group_records.user_id)
  `);
  await pool.query(`
    create table if not exists prediction_drafts (
      id uuid primary key default gen_random_uuid(),
      route_group_id text not null,
      user_id uuid not null references app_users(id) on delete cascade,
      prediction_data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now(),
      unique (route_group_id, user_id)
    )
  `);
  await pool.query(`
    create table if not exists match_results (
      match_id text primary key,
      status text not null default 'scheduled' check (status in ('scheduled', 'live', 'final')),
      home_team_id text,
      away_team_id text,
      home_score integer,
      away_score integer,
      winner_team_id text,
      source text not null default 'fifa',
      source_updated_at timestamptz,
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists fifa_sync_runs (
      id uuid primary key default gen_random_uuid(),
      source_url text not null,
      status text not null,
      message text,
      checked_at timestamptz not null default now()
    )
  `);

  return pool;
}

export async function refreshOfficialResultsIfStale() {
  await ensureGroupDatabase();

  try {
    await syncOfficialFifaDataIfStale({ minimumMinutesBetweenChecks: 24 * 60 });
  } catch {
    // Keep prediction pages usable even when the live score provider is temporarily unavailable.
  }
}

function rowsToPools(rows: GroupRow[], resultRows: MatchResultRow[]) {
  const pools = new Map<string, FriendPool>();

  for (const row of rows) {
    const pool =
      pools.get(row.id) ??
      ({
        id: row.id,
        name: row.name,
        inviteCode: row.id.toUpperCase(),
        scoringMode: row.scoring_mode,
        privacy: row.privacy,
        maxBracketsPerPlayer: 1,
        allowJoinAfterLock: true,
        members: [],
      } satisfies FriendPool);

    if (row.member_id && row.username && row.supported_team_id) {
      pool.members.push({
        id: row.member_id,
        displayName: row.username,
        username: row.username,
        supportedTeamId: row.supported_team_id,
        predictionStatus: row.has_draft ? "In progress" : "Not started",
        points: row.prediction_data ? calculatePredictionPoints(row.prediction_data, resultRows) : 0,
      });
    }

    pools.set(row.id, pool);
  }

  return Array.from(pools.values());
}

async function getPoolsByRouteIds(routeGroupIds: string[]) {
  if (routeGroupIds.length === 0) {
    return [];
  }

  const pool = await ensureGroupDatabase();
  const matchResults = await pool.query<MatchResultRow>("select * from match_results");
  const result = await pool.query<GroupRow>(
    `select
      prediction_groups.route_group_id as id,
      prediction_groups.name,
      prediction_groups.scoring_mode,
      prediction_groups.privacy,
      app_users.id as member_id,
      app_users.username,
      app_users.supported_team_id,
      prediction_drafts.id is not null as has_draft,
      prediction_drafts.prediction_data
    from prediction_groups
    left join group_members on group_members.group_id = prediction_groups.id
    left join app_users on app_users.id = group_members.user_id
    left join prediction_drafts
      on prediction_drafts.route_group_id = prediction_groups.route_group_id
      and prediction_drafts.user_id = app_users.id
    where prediction_groups.route_group_id = any($1)
    order by prediction_groups.created_at desc, group_members.joined_at asc`,
    [routeGroupIds],
  );

  return rowsToPools(result.rows, matchResults.rows);
}

async function recordJoinedGroup({
  routeGroupId,
  user,
  source,
}: {
  routeGroupId: string;
  user: SafeUser;
  source: "create" | "join" | "reconcile";
}) {
  const pool = await ensureGroupDatabase();

  await pool.query(
    `insert into joined_group_records (
      route_group_id,
      normalized_username,
      username,
      user_id,
      source
    ) values ($1, $2, $3, $4, $5)
    on conflict (route_group_id, normalized_username) do update
      set username = excluded.username,
          user_id = excluded.user_id,
          source = excluded.source`,
    [routeGroupId, normalizeUsername(user.username), user.username, user.id, source],
  );
}

async function listRecordedRouteGroupIdsForUser(user: SafeUser) {
  const pool = await ensureGroupDatabase();
  const result = await pool.query<{ route_group_id: string }>(
    `select distinct route_group_id
    from joined_group_records
    where user_id = $1
       or normalized_username = $2
    order by route_group_id asc`,
    [user.id, normalizeUsername(user.username)],
  );

  return result.rows.map((row) => row.route_group_id);
}

export async function listUserPredictionGroups(userId: string) {
  const pool = await ensureGroupDatabase();
  await refreshOfficialResultsIfStale();

  const directMemberships = await pool.query<{ route_group_id: string }>(
    `select distinct prediction_groups.route_group_id
    from prediction_groups
    left join group_members on group_members.group_id = prediction_groups.id
    where prediction_groups.created_by = $1
      or group_members.user_id = $1
    order by prediction_groups.created_at desc`,
    [userId],
  );

  const recordedMemberships = await pool.query<{ route_group_id: string }>(
    `select distinct route_group_id
    from joined_group_records
    where user_id = $1`,
    [userId],
  );

  const routeGroupIds = Array.from(
    new Set(
      [...directMemberships.rows, ...recordedMemberships.rows].map((row) => row.route_group_id),
    ),
  );

  return getPoolsByRouteIds(routeGroupIds);
}

export async function reconcileUserGroupMemberships(user: SafeUser) {
  const trimmedUsername = user.username.trim();

  if (!trimmedUsername) {
    return;
  }

  const pool = await ensureGroupDatabase();
  await pool.query(
    `update group_members
    set role = 'member'
    from prediction_groups
    where group_members.group_id = prediction_groups.id
      and group_members.user_id = $1
      and prediction_groups.created_by <> $1
      and group_members.role = 'owner'`,
    [user.id],
  );
  await pool.query(
    `insert into group_members (group_id, user_id, role)
    select prediction_groups.id, $2, 'member'
    from prediction_groups
    left join group_members on group_members.group_id = prediction_groups.id
    left join app_users as members on members.id = group_members.user_id
    where lower(members.username) = lower($1)
    on conflict (group_id, user_id) do nothing`,
    [trimmedUsername, user.id],
  );
  await pool.query(
    `insert into group_members (group_id, user_id, role)
    select prediction_groups.id, $2, 'owner'
    from prediction_groups
    left join app_users as creators on creators.id = prediction_groups.created_by
    where lower(creators.username) = lower($1)
    on conflict (group_id, user_id) do update
      set role = 'owner'`,
    [trimmedUsername, user.id],
  );
  const recordedRouteGroupIds = await listRecordedRouteGroupIdsForUser(user);

  if (recordedRouteGroupIds.length > 0) {
    await pool.query(
      `insert into group_members (group_id, user_id, role)
      select prediction_groups.id, $2, 'member'
      from prediction_groups
      where prediction_groups.route_group_id = any($1)
      on conflict (group_id, user_id) do nothing`,
      [recordedRouteGroupIds, user.id],
    );
  }

  const allRouteGroupIds = new Set<string>(recordedRouteGroupIds);
  const discoveredGroups = await pool.query<{ route_group_id: string }>(
    `select distinct prediction_groups.route_group_id
    from prediction_groups
    left join app_users as creators on creators.id = prediction_groups.created_by
    left join group_members on group_members.group_id = prediction_groups.id
    left join app_users as members on members.id = group_members.user_id
    where lower(creators.username) = lower($1)
      or lower(members.username) = lower($1)`,
    [trimmedUsername],
  );

  for (const row of discoveredGroups.rows) {
    allRouteGroupIds.add(row.route_group_id);
  }

  await Promise.all(
    Array.from(allRouteGroupIds).map((routeGroupId) =>
      recordJoinedGroup({ routeGroupId, user, source: "reconcile" }),
    ),
  );
}

export async function listUserPredictionGroupsByUsername(username: string) {
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    return [];
  }

  const pool = await ensureGroupDatabase();
  await refreshOfficialResultsIfStale();

  const result = await pool.query<{ route_group_id: string }>(
    `select distinct route_group_id
    from joined_group_records
    where normalized_username = $1
    order by route_group_id asc`,
    [normalizeUsername(trimmedUsername)],
  );

  return getPoolsByRouteIds(result.rows.map((row) => row.route_group_id));
}

export async function getPredictionGroupByRouteId(
  routeGroupId: string,
  { refreshResults = true }: { refreshResults?: boolean } = {},
) {
  if (refreshResults) {
    await refreshOfficialResultsIfStale();
  }

  return (await getPoolsByRouteIds([routeGroupId]))[0] ?? null;
}

export async function createPredictionGroup({
  name,
  scoringMode,
  privacy,
  password,
  user,
  routeGroupId,
}: {
  name: string;
  scoringMode: PredictionScoringMode;
  privacy: GroupPrivacy;
  password?: string;
  user: SafeUser;
  routeGroupId?: string;
}) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Group name is required.");
  }

  if (privacy === "private" && !password?.trim()) {
    throw new Error("Private groups need a password.");
  }

  const pool = await ensureGroupDatabase();
  const passwordRecord =
    privacy === "private" && password ? await hashPassword(password) : undefined;
  const safeRouteGroupId = routeGroupId?.trim() || `${slugifyGroupName(trimmedName)}-${Date.now()}`;
  const result = await pool.query<{ id: string; route_group_id: string }>(
    `insert into prediction_groups (
      route_group_id,
      name,
      scoring_mode,
      privacy,
      password_salt,
      password_hash,
      created_by
    ) values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (route_group_id) do update set route_group_id = excluded.route_group_id
    returning id, route_group_id`,
    [
      safeRouteGroupId,
      trimmedName,
      scoringMode,
      privacy,
      passwordRecord?.salt ?? null,
      passwordRecord?.hash ?? null,
      user.id,
    ],
  );

  await pool.query(
    `insert into group_members (group_id, user_id, role)
    values ($1, $2, 'owner')
    on conflict (group_id, user_id) do nothing`,
    [result.rows[0].id, user.id],
  );
  await recordJoinedGroup({
    routeGroupId: result.rows[0].route_group_id,
    user,
    source: "create",
  });

  return getPredictionGroupByRouteId(result.rows[0].route_group_id, { refreshResults: false });
}

export async function joinPredictionGroupByName({
  name,
  password,
  user,
  routeGroupId,
}: {
  name: string;
  password?: string;
  user: SafeUser;
  routeGroupId?: string;
}) {
  const pool = await ensureGroupDatabase();
  const result = await pool.query<{
    id: string;
    route_group_id: string;
    privacy: GroupPrivacy;
    password_salt: string | null;
    password_hash: string | null;
    already_joined: boolean;
  }>(
    `select
      prediction_groups.id,
      prediction_groups.route_group_id,
      prediction_groups.privacy,
      prediction_groups.password_salt,
      prediction_groups.password_hash,
      exists (
        select 1 from group_members
        where group_members.group_id = prediction_groups.id
          and group_members.user_id = $3
      ) as already_joined
    from prediction_groups
    where (
      ($1 <> '' and prediction_groups.route_group_id = $1)
      or ($1 = '' and lower(prediction_groups.name) = lower($2))
    )
    order by prediction_groups.created_at desc
    limit 1`,
    [routeGroupId?.trim() ?? "", name.trim(), user.id],
  );
  const group = result.rows[0];

  if (!group) {
    throw new Error("No group found with that name.");
  }

  if (
    group.privacy === "private" &&
    (!password ||
      !group.password_salt ||
      !group.password_hash ||
      !(await verifyPassword(password, group.password_salt, group.password_hash)))
  ) {
    throw new Error("That group password is not correct.");
  }

  if (!group.already_joined) {
    await pool.query(
      `insert into group_members (group_id, user_id, role)
      values ($1, $2, 'member')
      on conflict (group_id, user_id) do nothing`,
      [group.id, user.id],
    );
  }
  await recordJoinedGroup({
    routeGroupId: group.route_group_id,
    user,
    source: "join",
  });

  return {
    alreadyJoined: group.already_joined,
    group: await getPredictionGroupByRouteId(group.route_group_id, { refreshResults: false }),
  };
}

export async function deletePredictionGroupForUser({
  routeGroupId,
  userId,
}: {
  routeGroupId: string;
  userId: string;
}) {
  const pool = await ensureGroupDatabase();
  const result = await pool.query<{
    id: string;
    role: "owner" | "member" | null;
    created_by: string;
  }>(
    `select prediction_groups.id, group_members.role, prediction_groups.created_by
    from prediction_groups
    left join group_members on group_members.group_id = prediction_groups.id
      and group_members.user_id = $2
    where prediction_groups.route_group_id = $1
      and (
        prediction_groups.created_by = $2
        or group_members.user_id = $2
      )`,
    [routeGroupId, userId],
  );
  const group = result.rows[0];

  if (!group) {
    throw new Error("You are not a member of this group.");
  }

  if (group.created_by === userId) {
    await pool.query("delete from prediction_drafts where route_group_id = $1", [routeGroupId]);
    await pool.query("delete from joined_group_records where route_group_id = $1", [routeGroupId]);
    await pool.query("delete from prediction_groups where id = $1", [group.id]);
    return { deleted: true, action: "deleted" as const };
  }

  await pool.query(
    `delete from prediction_drafts
    where route_group_id = $1 and user_id = $2`,
    [routeGroupId, userId],
  );
  await pool.query(
    `delete from group_members
    where group_id = $1 and user_id = $2`,
    [group.id, userId],
  );
  await pool.query(
    `delete from joined_group_records
    where route_group_id = $1
      and (
        user_id = $2
        or normalized_username in (
          select lower(username)
          from app_users
          where id = $2
        )
      )`,
    [routeGroupId, userId],
  );

  return { deleted: true, action: "left" as const };
}

export async function listAvailablePredictionGroups() {
  const pool = await ensureGroupDatabase();
  const result = await pool.query<AvailablePredictionGroup>(
    `select
      prediction_groups.route_group_id as id,
      prediction_groups.name,
      prediction_groups.privacy,
      count(group_members.user_id)::int as "memberCount"
    from prediction_groups
    left join group_members on group_members.group_id = prediction_groups.id
    group by prediction_groups.id, prediction_groups.route_group_id, prediction_groups.name, prediction_groups.privacy
    order by prediction_groups.created_at desc, prediction_groups.name asc`,
  );

  return result.rows;
}
