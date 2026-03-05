# Daily Tech Drill (MVP)

Auto-pulls tech/startup/AI news → generates 5 MCQs → tracks streak. No essays. Just reps.

**Live:** [https://dailytechquiz.vercel.app/](https://dailytechquiz.vercel.app/) · **Demo:** [imgur.com/a/PalfQXZ](https://i.imgur.com/9pCbVAB.gif)

## Quick start

1. **Install**
   ```bash
   npm install
   ```

2. **Env** (copy `.env.example` → `.env`)
   - `OPENAI_API_KEY` – required for generating quizzes
   - `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` – optional; without these, `/api/generate` still runs but doesn’t persist to DB
   - `CRON_SECRET` – optional; set and send `Authorization: Bearer <CRON_SECRET>` when calling `/api/generate`

3. **Database** (if using Supabase)
   - Create a project at [supabase.com](https://supabase.com)
   - Run the SQL in `supabase/schema.sql` in the SQL editor
   - If you already had tables, run: `alter table quizzes add column if not exists briefing text;`

4. **Run**
   ```bash
   npm run dev
   ```
   - Landing: [http://localhost:3000](http://localhost:3000)
   - Quiz: [http://localhost:3000/today](http://localhost:3000/today)

## Daily pipeline (6am cron)

1. Call `GET /api/generate` with `Authorization: Bearer <CRON_SECRET>` (if `CRON_SECRET` is set).
2. App fetches RSS (TechCrunch, VentureBeat, OpenAI blog) + HN top stories (last 24h), picks top articles, sends summaries to OpenAI, gets 5 MCQs, stores quiz in DB.

**Vercel:** add a cron job in `vercel.json`:

```json
{
  "crons": [{ "path": "/api/generate", "schedule": "0 6 * * *" }]
}
```

And set `CRON_SECRET` in project env; Vercel will send it in the `Authorization` header.

## API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/generate` | GET | Cron-only. Fetches news, generates 5 MCQs, stores in DB. |
| `/api/today` | GET | Returns today’s quiz and questions (404 if none). |
| `/api/submit` | POST | Body: `{ "quizId": "uuid", "score": 0-5 }`. Saves attempt (optional). |

## Stack

- **Frontend:** Next.js (App Router), Tailwind, one page `/today`
- **Backend:** Next API routes
- **DB:** Supabase Postgres (`quizzes`, `questions`, `attempts`)
- **Streak:** localStorage (MVP; no auth)

## Cost

~10–20k tokens/day for 5 summaries + 5 MCQs → well under $1/day with GPT-4o-mini.
