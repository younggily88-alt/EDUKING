# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Next.js App Router project (`src/app/`, Tailwind CSS v4, TypeScript, ESLint 9). **`PRD.md` (Korean) is the source of truth** for what to build — read it before implementing features. Done so far: Clerk auth wiring, Drizzle schema + generated migration. Not yet built: the dashboard UI (`src/app/page.tsx` is still the default template), API routes, news pipeline, Notion save. Installed but not yet used in code: `@anthropic-ai/sdk` (news summarize/classify), `rss-parser` (RSS fetch), `@modelcontextprotocol/sdk` (Notion MCP client).

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

- **Auth**: `src/proxy.ts` runs `clerkMiddleware`; every route except `/sign-in(.*)` calls `auth.protect()`, and the matcher also covers `/api` and `/trpc`. `ClerkProvider` is in `src/app/layout.tsx`. Sign-up must be restricted to the owner in the Clerk dashboard (single-user app).
- **DB**: `src/db/schema.ts` (Drizzle, PostgreSQL) → `src/db/index.ts` exports `db` using the Neon HTTP driver (`@neondatabase/serverless`). `drizzle.config.ts` loads `DATABASE_URL` from `.env.local` via dotenv; migrations output to `drizzle/`.
- **Env vars** in `.env.local`: Clerk keys, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NOTION_TOKEN`. Never commit or print them.
- **Neon MCP** server is registered in the user's local Claude config for this project (needs OAuth via `/mcp`).

## Product constraints from the PRD

Single-user, login-required learning dashboard for a teacher preparing for 교육전문직; one screen with four sections: **뉴스 / 과제 업로드 / 과제 수정 및 보완 / 현안 정리**. Dense naver.com-style card layout; UI text is Korean.

- **News pipeline**: "뉴스 가져오기" fetches RSS (한국교육신문, 전남광주교육통, news1 via Google News RSS), ~10 items per source, processed **per article** with UI progress to fit Vercel time limits. Claude returns a Korean summary + category; only summary and original link are stored (never full text). No URL de-duplication — repeated fetches intentionally create new cards (`news.original_url` has no unique constraint).
- **Categories** are user-managed (defaults: 정책, 교원, 학생생활, 교육과정, 지역교육, 평가; defaults are not seeded yet). Deleting one sets `news.category_id` to null ("미분류"); renames propagate.
- **현안 정리** has 10 required fields (`issue_notes`, all NOT NULL); the UI disables save until all are filled **and** the server must re-validate (including empty strings).
- **과제 수정 및 보완** (`assignment_revisions`) may optionally link to an original (`assignment_id`, set null on delete). Both assignment boards are text-only.
- **Notion save** uses Notion MCP, which needs server-side Notion OAuth — design this first. Target Notion location is undecided.
