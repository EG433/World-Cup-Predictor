# Postgres Setup

Postgres stores real users, sessions, groups, memberships, and predictions. DataGrip is a good GUI for inspecting and managing the same database.

## 1. Create a database

From `psql`:

```sql
create database world_cup_predictor;
```

## 2. Run the schema

```bash
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5432/world_cup_predictor" -f db/schema.sql
```

In DataGrip, you can also open `db/schema.sql` and run it against the `world_cup_predictor` database.

## 3. Configure the app

Create `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/world_cup_predictor
```

## 4. Install the Postgres driver

```bash
npm install pg
npm install -D @types/pg
```

The app keeps using the local `.data` prototype unless `DATABASE_URL` is set. Once `DATABASE_URL` is present and `pg` is installed, auth reads and writes from Postgres.

## 5. Connect with DataGrip

- Host: `localhost`
- Port: `5432`
- Database: `world_cup_predictor`
- User: your Postgres username, often `postgres`
- Password: your Postgres password

Never commit `.env.local`, database passwords, or exported user data.

## 6. Automatic FIFA result sync

The app has a server endpoint for result sync:

```bash
POST /api/sync/fifa
```

The sync tries configured FIFA JSON first, then ESPN's World Cup scoreboard JSON fallback. If FIFA
provides a machine-readable official feed, set it in `.env.local`:

```bash
FIFA_RESULTS_JSON_URL=https://official-fifa-feed.example/matches.json
```

Optional fallback overrides:

```bash
ESPN_SCOREBOARD_URL=https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
EXTRA_RESULTS_JSON_URL=https://another-provider.example/matches.json
```

Then schedule `POST /api/sync/fifa` from your host cron, Vercel Cron, GitHub Actions, or another
scheduler. During the tournament, run it every 5-15 minutes on match days and hourly otherwise.
