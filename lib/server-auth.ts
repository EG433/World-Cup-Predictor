import { pbkdf2, randomBytes, timingSafeEqual, createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);
const dataDirectory = path.join(process.cwd(), ".data");
const usersFile = path.join(dataDirectory, "users.json");
const sessionsFile = path.join(dataDirectory, "sessions.json");

const passwordIterations = 600_000;
const passwordKeyLength = 32;
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export const sessionCookieName = "wc_session";

export interface SafeUser {
  id: string;
  username: string;
  supportedTeamId: string;
}

interface StoredUser extends SafeUser {
  normalizedUsername: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

interface StoredSession {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

type QueryablePool = {
  query<T = Record<string, unknown>>(
    queryText: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
};

let postgresPool: QueryablePool | null = null;
let authTablesEnsured: Promise<void> | null = null;

function readEnvValueFromFile(key: string, filePath: string) {
  if (!existsSync(filePath)) {
    return "";
  }

  const fileContents = readFileSync(filePath, "utf-8");

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || !line.startsWith(`${key}=`)) {
      continue;
    }

    const value = line.slice(key.length + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1).trim();
    }

    return value;
  }

  return "";
}

function getConfiguredDatabaseUrl() {
  const envValue = process.env.DATABASE_URL?.trim();

  if (envValue) {
    return envValue;
  }

  const envLocalValue = readEnvValueFromFile("DATABASE_URL", path.join(process.cwd(), ".env.local"));

  if (envLocalValue) {
    return envLocalValue;
  }

  return readEnvValueFromFile("DATABASE_URL", path.join(process.cwd(), ".env"));
}

function shouldUsePostgres() {
  return Boolean(getConfiguredDatabaseUrl());
}

export async function getPostgresPool() {
  const databaseUrl = getConfiguredDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!postgresPool) {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<{ Pool: new (config: { connectionString: string }) => QueryablePool }>;

    try {
      const { Pool } = await dynamicImport("pg");
      postgresPool = new Pool({
        connectionString: databaseUrl,
      });
    } catch {
      throw new Error("Postgres driver is missing. Run `npm install pg @types/pg`.");
    }
  }

  return postgresPool;
}

async function ensureAuthTables() {
  if (!authTablesEnsured) {
    authTablesEnsured = (async () => {
      const pool = await getPostgresPool();

      await pool.query("create extension if not exists pgcrypto");
      await pool.query(`
        create table if not exists app_users (
          id uuid primary key default gen_random_uuid(),
          username text not null,
          normalized_username text not null unique,
          supported_team_id text not null,
          password_salt text not null,
          password_hash text not null,
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists app_sessions (
          token_hash text primary key,
          user_id uuid not null references app_users(id) on delete cascade,
          expires_at timestamptz not null,
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(
        "create index if not exists app_sessions_user_id_idx on app_sessions(user_id)",
      );
      await pool.query(
        "create index if not exists app_sessions_expires_at_idx on app_sessions(expires_at)",
      );
    })().catch((error) => {
      authTablesEnsured = null;
      throw error;
    });
  }

  await authTablesEnsured;
}

async function ensureDataDirectory() {
  await fs.mkdir(dataDirectory, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const value = await fs.readFile(filePath, "utf-8");
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, value: T) {
  await ensureDataDirectory();
  const tempFile = `${filePath}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(value, null, 2), "utf-8");
  await fs.rename(tempFile, filePath);
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

async function verifyPassword(password: string, user: StoredUser) {
  const { hash } = await hashPassword(password, user.passwordSalt);
  const storedHash = Buffer.from(user.passwordHash, "base64");
  const candidateHash = Buffer.from(hash, "base64");

  return (
    storedHash.length === candidateHash.length &&
    timingSafeEqual(storedHash, candidateHash)
  );
}

function publicUser(user: StoredUser): SafeUser {
  return {
    id: user.id,
    username: user.username,
    supportedTeamId: user.supportedTeamId,
  };
}

function publicUserFromRow(row: {
  id: string;
  username: string;
  supported_team_id: string;
}): SafeUser {
  return {
    id: row.id,
    username: row.username,
    supportedTeamId: row.supported_team_id,
  };
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  };
}

export async function createUser({
  username,
  password,
  supportedTeamId,
}: {
  username: string;
  password: string;
  supportedTeamId: string;
}) {
  const trimmedUsername = username.trim();

  if (!/^[A-Za-z0-9_]{3,24}$/.test(trimmedUsername)) {
    throw new Error("Username must be 3-24 characters and use only letters, numbers, or underscores.");
  }

  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  if (!supportedTeamId) {
    throw new Error("Choose one supported national team.");
  }

  const normalizedUsername = normalizeUsername(trimmedUsername);

  if (shouldUsePostgres()) {
    const pool = await getPostgresPool();
    await ensureAuthTables();
    const passwordRecord = await hashPassword(password);

    try {
      const result = await pool.query<{
        id: string;
        username: string;
        supported_team_id: string;
      }>(
        `insert into app_users (
          username,
          normalized_username,
          supported_team_id,
          password_salt,
          password_hash
        ) values ($1, $2, $3, $4, $5)
        returning id, username, supported_team_id`,
        [
          trimmedUsername,
          normalizedUsername,
          supportedTeamId,
          passwordRecord.salt,
          passwordRecord.hash,
        ],
      );

      return publicUserFromRow(result.rows[0]);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new Error("That username is already taken.");
      }

      throw error;
    }
  }

  const users = await readJsonFile<StoredUser[]>(usersFile, []);

  if (users.some((user) => user.normalizedUsername === normalizedUsername)) {
    throw new Error("That username is already taken.");
  }

  const passwordRecord = await hashPassword(password);
  const user: StoredUser = {
    id: randomBytes(16).toString("hex"),
    username: trimmedUsername,
    normalizedUsername,
    supportedTeamId,
    passwordSalt: passwordRecord.salt,
    passwordHash: passwordRecord.hash,
    createdAt: new Date().toISOString(),
  };

  await writeJsonFile(usersFile, [user, ...users]);

  return publicUser(user);
}

export async function createGuestUser({
  username,
  supportedTeamId,
}: {
  username: string;
  supportedTeamId: string;
}) {
  const generatedPassword = randomBytes(24).toString("base64url");

  return createUser({
    username,
    password: generatedPassword,
    supportedTeamId,
  });
}

export async function loginUser({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  if (shouldUsePostgres()) {
    const pool = await getPostgresPool();
    await ensureAuthTables();
    const result = await pool.query<{
      id: string;
      username: string;
      supported_team_id: string;
      normalized_username: string;
      password_salt: string;
      password_hash: string;
      created_at: string;
    }>(
      `select
        id,
        username,
        supported_team_id,
        normalized_username,
        password_salt,
        password_hash,
        created_at
      from app_users
      where normalized_username = $1`,
      [normalizeUsername(username)],
    );
    const user = result.rows[0];

    if (
      !user ||
      !(await verifyPassword(password, {
        id: user.id,
        username: user.username,
        supportedTeamId: user.supported_team_id,
        normalizedUsername: user.normalized_username,
        passwordSalt: user.password_salt,
        passwordHash: user.password_hash,
        createdAt: user.created_at,
      }))
    ) {
      throw new Error("Invalid username or password.");
    }

    return publicUserFromRow(user);
  }

  const users = await readJsonFile<StoredUser[]>(usersFile, []);
  const normalizedUsername = normalizeUsername(username);
  const user = users.find((entry) => entry.normalizedUsername === normalizedUsername);

  if (!user || !(await verifyPassword(password, user))) {
    throw new Error("Invalid username or password.");
  }

  return publicUser(user);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const session: StoredSession = {
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString(),
  };

  if (shouldUsePostgres()) {
    const pool = await getPostgresPool();
    await ensureAuthTables();
    await pool.query(
      `insert into app_sessions (token_hash, user_id, expires_at)
      values ($1, $2, $3)`,
      [session.tokenHash, session.userId, session.expiresAt],
    );

    return token;
  }

  const sessions = await readJsonFile<StoredSession[]>(sessionsFile, []);

  await writeJsonFile(sessionsFile, [session, ...sessions]);

  return token;
}

export async function getUserFromSession(token?: string) {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  if (shouldUsePostgres()) {
    const pool = await getPostgresPool();
    await ensureAuthTables();
    const result = await pool.query<{
      id: string;
      username: string;
      supported_team_id: string;
    }>(
      `select
        app_users.id,
        app_users.username,
        app_users.supported_team_id
      from app_sessions
      inner join app_users on app_users.id = app_sessions.user_id
      where app_sessions.token_hash = $1
        and app_sessions.expires_at > now()`,
      [tokenHash],
    );

    return result.rows[0] ? publicUserFromRow(result.rows[0]) : null;
  }

  const [sessions, users] = await Promise.all([
    readJsonFile<StoredSession[]>(sessionsFile, []),
    readJsonFile<StoredUser[]>(usersFile, []),
  ]);
  const now = Date.now();
  const session = sessions.find(
    (entry) => entry.tokenHash === tokenHash && new Date(entry.expiresAt).getTime() > now,
  );

  if (!session) {
    return null;
  }

  const user = users.find((entry) => entry.id === session.userId);
  return user ? publicUser(user) : null;
}

export async function deleteSession(token?: string) {
  if (!token) {
    return;
  }

  const tokenHash = hashToken(token);

  if (shouldUsePostgres()) {
    const pool = await getPostgresPool();
    await ensureAuthTables();
    await pool.query("delete from app_sessions where token_hash = $1", [tokenHash]);
    return;
  }

  const sessions = await readJsonFile<StoredSession[]>(sessionsFile, []);
  await writeJsonFile(
    sessionsFile,
    sessions.filter((session) => session.tokenHash !== tokenHash),
  );
}
