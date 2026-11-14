# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Next.js App Router project (`src/app/`, Tailwind CSS v4, TypeScript, ESLint 9). **`PRD.md` (Korean) is the source of truth** for what to build — read it before implementing features, but note the deviations listed under "Where the app differs from the PRD" below. Built: Clerk auth, Drizzle schema + migrations, the one-screen dashboard (goals w/ auto-count + streak, exam D-day, news, assignment & revision boards with PDF + Claude grading, issue board with Claude review), RSS news pipeline with Claude summary/category, daily cron, JSON backup. Notion save for issues (see below). **Not built: Notion save for other sections.** `@modelcontextprotocol/sdk` is installed but unused.

**`ui.md` is the UI guide** (layout, green color tokens, section specs, Tailwind conventions) — read it before building or changing any UI.

**`AGENTS.md` warns that this Next.js (16.x) has breaking changes from older versions** — read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Note: the middleware file is `src/proxy.ts`, not `middleware.ts`.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm run lint         # eslint (flat config, eslint.config.mjs)
npx tsc --noEmit     # typecheck
npm run db:generate  # drizzle-kit: SQL migration from src/db/schema.ts -> drizzle/
npm run db:migrate   # apply migrations to Neon
npm run db:push      # push schema directly to Neon (no migration file)
npm run db:studio    # drizzle studio
```

No test framework is configured. Path alias: `@/*` → `src/*`.

## Architecture

- **Auth**: `src/proxy.ts` runs `clerkMiddleware`; every route except `/sign-in(.*)` calls `auth.protect()`, and the matcher also covers `/api` and `/trpc`. `ClerkProvider` is in `src/app/layout.tsx`. Sign-up must be restricted to the owner in the Clerk dashboard (single-user app). **Access is also restricted in code** with two levels: **owners** = verified emails in `ALLOWED_EMAILS` (comma-separated env var, in `.env.local` and Vercel; always allowed and the only ones who can open `/access`), and **members** = emails an owner adds on the `/access` page (`allowed_users` table, no redeploy needed). `src/lib/access.ts` checks the signed-in user's verified Clerk emails against both (1-min cache, fail-closed; nobody listed = nobody admitted). It runs in `src/proxy.ts` (everything except `/sign-in`, `/not-allowed`, `/api/cron`) and again in every server action, API route and data-loading page via `getAllowedUserId()` / `assertAllowed()`. All allowed users share the same data (no per-user scoping).
- **DB**: `src/db/schema.ts` (Drizzle, PostgreSQL) → `src/db/index.ts` exports `db` using the Neon HTTP driver (`@neondatabase/serverless`). `drizzle.config.ts` loads `DATABASE_URL` from `.env.local` via dotenv; migrations output to `drizzle/`.
- **Env vars** in `.env.local`: Clerk keys, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NOTION_TOKEN`. Never commit or print them.
- **Neon MCP** server is registered in the user's local Claude config for this project (needs OAuth via `/mcp`).

## Where the app differs from the PRD

- News de-duplicates by URL (PRD said duplicates are fine).
- Assignment boards take PDFs and are AI-graded (PRD said text-only); revisions reuse the assignment table and have no "link to original" field.
- **면접 준비 자판기** (`/interview`, not in the PRD): the user stores materials (pasted text or PDF ≤4MB → `materials`), picks up to 5, and Claude (`src/lib/interview.ts`) generates interview questions with intent + key points (`interview_questions`); the user types an answer and Claude scores it on a rubric — the built-in 5-criterion/100-point default (`src/lib/interview-config.ts`) or a user-made one (`rubrics` rows with `kind = 'interview'`, picked per question; assignment rubrics are `kind = 'assignment'` and listed separately) with model answer and follow-up (`interview_attempts`, retries allowed). Key points stay hidden until the first attempt. Config constants live in `interview-config.ts` so client components don't pull in the Anthropic SDK.
- Goals can have a date range and can auto-count activity (assignments / revisions / issues); the dashboard shows a consecutive-days streak.
- Env vars also include `NOTION_ISSUES_DATABASE_ID`, `ALLOWED_EMAILS` (who may use the app) and `CRON_SECRET` (cron auth). `ANTHROPIC_API_KEY` is required for news summaries, grading and issue review.

## Product constraints from the PRD

Single-user, login-required learning dashboard for a teacher preparing for 교육전문직; one screen with four sections: **뉴스 / 과제 업로드 / 과제 수정 및 보완 / 현안 정리**. Dense naver.com-style card layout; UI text is Korean.

- **News pipeline**: "뉴스 가져오기" calls the `fetchSourceArticles` server action once per source (`src/lib/news-feed.ts` `NEWS_SOURCES`; UI shows `n/N` progress). `src/lib/news-ingest.ts` fetches the RSS, keeps items from the last 24h (max 30/source), inserts into `articles` **de-duplicated by URL** (unique constraint), then asks Claude (`src/lib/claude.ts`) to write a Korean summary + pick a category for unprocessed rows (`processed_at` null; failed AI runs are retried on the next fetch). Only the RSS snippet/summary and link are stored, never full text. A daily Vercel cron (`vercel.json` → `/api/cron/news`, 06:00 KST) runs the same ingest; it is public in `src/proxy.ts` but authenticates with `CRON_SECRET` — set that env var in Vercel.
- **Categories** are user-managed in the news card (add / rename / delete / filter; defaults 정책, 교원, 학생생활, 교육과정, 지역교육, 평가 are seeded). Deleting one sets `articles.category_id` to null ("미분류"); renames propagate. Uncategorized articles (Claude found no fitting category, or the category was deleted) stay in the DB but are **hidden** from the dashboard (the news query filters `category_id is not null`; there is no 미분류 chip).
- **현안 정리** has 10 required fields (`issue_notes`, all NOT NULL; field list shared in `src/lib/issue-fields.ts`; DB column names are the original ones while on-screen labels differ: `statusQuo`=현황(목표), `solutions`=세부 운영 방안(간략히), `counterarguments`=대책, `causes`=기대효과, which is shown after 대책); the UI disables save until all are filled **and** the server re-validates (including empty strings). Issues form a board (create / edit / delete / search), and each can get a Claude review + interview questions (`ai_feedback`; cleared on edit).
- **과제 제출 / 과제 수정 제출** are the same feature on one table (`assignments`, `kind` = `assignment` | `revision`): the user uploads a PDF (≤4MB), picks a grading rubric (`rubrics`), and Claude (`src/lib/grading.ts`) scores it per criterion; totals are computed server-side. The PDF is kept in `assignment_files` (base64) so it can be viewed and re-graded; score trend charts live on `/assignments` and `/revisions`. The old `assignment_revisions` and `news` tables are unused.
- **Notion save** (issues only, so far) uses the plain Notion REST API instead of the MCP route the PRD described: `src/lib/notion.ts` with an internal-integration `NOTION_TOKEN` and the target database in `NOTION_ISSUES_DATABASE_ID` (the database must be shared with the integration). `saveIssueNoteToNotion` creates one page per issue (columns 현안명 / 작성일 / 키워드 / AI 검토 / 복습 상태 / 앱ID, body = one heading per field + the AI review) and stores `notion_page_id`/`notion_url` on `issue_notes`; saving again updates that page and rewrites its body, keeping the Notion-side 복습 상태. Only columns that exist with the right type are filled.
