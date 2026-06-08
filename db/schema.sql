create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  normalized_username text not null unique,
  supported_team_id text not null,
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,24}$')
);

create table if not exists app_sessions (
  token_hash text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_user_id_idx on app_sessions(user_id);
create index if not exists app_sessions_expires_at_idx on app_sessions(expires_at);

create table if not exists prediction_groups (
  id uuid primary key default gen_random_uuid(),
  route_group_id text not null unique,
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
);

create table if not exists group_members (
  group_id uuid not null references prediction_groups(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references prediction_groups(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  prediction_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists prediction_drafts (
  id uuid primary key default gen_random_uuid(),
  route_group_id text not null,
  user_id uuid not null references app_users(id) on delete cascade,
  prediction_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (route_group_id, user_id)
);

create index if not exists prediction_drafts_user_id_idx on prediction_drafts(user_id);

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
);

create table if not exists fifa_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  status text not null,
  message text,
  checked_at timestamptz not null default now()
);
