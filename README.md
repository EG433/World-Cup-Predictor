# World Cup 2026 Friend Predictor

Starter structure for a private World Cup 2026 prediction site where friends can sign in, choose one supported national team, browse schedules, and submit pool predictions.

## What is included

- Next.js app-router project structure with TypeScript
- Login and sign-up pages
- User dashboard with favorite-team quick access
- Tournament schedule page with match cards, venue, city, and date
- Team-specific schedule pages
- Friend pool hub with member status
- Prediction workspace with:
  - group-stage result picks
  - predicted group rankings from 1 to 4
  - knockout bracket prediction inputs

## Project structure

- `app/`
  - `page.tsx`: landing page
  - `login/page.tsx`: email login starter
  - `signup/page.tsx`: account creation with username + supported team
  - `dashboard/page.tsx`: signed-in home page
  - `matches/page.tsx`: tournament schedule view
  - `teams/[teamId]/page.tsx`: team-only schedule page
  - `groups/[groupId]/page.tsx`: friend pool hub
  - `groups/[groupId]/predictions/page.tsx`: prediction workflow
- `components/`
  - `site-header.tsx`: top navigation
  - `match-card.tsx`: reusable schedule card
  - `group-standings-table.tsx`: standings/prediction table
  - `bracket-view.tsx`: elimination bracket display
  - `prediction-workspace.tsx`: main prediction UI scaffold
- `lib/mock-data.ts`: sample teams, groups, matches, standings, and pool data
- `types/world-cup.ts`: shared app types

## Schedule source

The tournament schedule data is based on FIFA's published World Cup 2026 fixture page:

https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums

The app currently stores official matchups, dates, stadiums, groups, and knockout slot labels. Kickoff times are displayed as TBC until the exact time feed is wired in.

## Suggested next build steps

1. Connect authentication with Supabase Auth or Firebase Auth.
2. Move users, pools, predictions, and schedules into a database.
3. Decide the exact scoring rules and pick deadlines.
4. Replace the sample bracket mapping with your final elimination logic.
5. Add editable prediction saving plus a locked submission state.

See `AUTH_SECURITY.md` for the recommended authentication and data-safety plan.

## Running locally

Once a package manager is available in your environment:

```bash
npm install
npm run dev
```

## Deploy publicly

The easiest production setup for this app is:

- Frontend and API: Vercel
- Database: Neon Postgres
- Optional AI advice: each user can paste their own OpenAI API key in the prediction page

### 1. Put the project in GitHub

Push this folder to a GitHub repository.

### 2. Create a hosted Postgres database

Create a Neon project and copy its connection string.

Use it as `DATABASE_URL`, for example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/world_cup_predictor?sslmode=require
```

### 3. Import the repo into Vercel

- Go to Vercel
- Click `Add New Project`
- Import your GitHub repository
- Keep the framework as `Next.js`

### 4. Add environment variables in Vercel

Add these project environment variables:

```env
DATABASE_URL=your_neon_connection_string
OPENAI_MODEL=gpt-5.5
```

You do not need to store a server-wide `OPENAI_API_KEY` if you want users to bring their own key
for AI prediction advice.

### 5. Deploy

Vercel will run:

```bash
npm run build
npm run start
```

This project is now prepared for that flow.

### 6. Daily results sync

`vercel.json` includes a daily cron job for:

```text
/api/sync/fifa
```

That keeps official match results updating automatically once deployed.

### 7. Add your public domain

After the first deploy, Vercel will give you a public URL like:

```text
https://your-project-name.vercel.app
```

You can also attach your own custom domain inside the Vercel dashboard.

## Notes for production

- This app now auto-creates its auth tables in Postgres on first use.
- Group, session, and prediction data are stored in Postgres, not in localhost-only files, when `DATABASE_URL` is set.
- In production, auth cookies are marked `secure`.
- AI advice can run from a user-provided OpenAI API key entered on the prediction page, so you do not need to publish your own key with the app.
