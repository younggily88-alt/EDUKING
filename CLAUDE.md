# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

The repo is a fresh `create-next-app` scaffold (Next.js App Router, `src/app/`, Tailwind CSS v4, TypeScript, ESLint 9). `src/app/page.tsx` is still the default template. **`PRD.md` (Korean) is the source of truth** for what to build — read it before implementing features. Nothing from the PRD (auth, DB, API routes) exists yet.

## Commands

```bash
npm run dev     # dev server at http://localhost:3000
npm run build   # production build
npm run lint    # eslint (flat config, eslint.config.mjs)
```

No test framework is configured. Not a git repository yet.

## Product summary (from PRD.md)

A single-user, login-required learning dashboard for a teacher preparing for 교육전문직. One dashboard screen with four sections: **뉴스 / 과제 업로드 / 과제 수정 및 보완 / 현안 정리**. UI should be dense card/panel layout modeled on naver.com. UI text is Korean.

Planned stack: Clerk (auth, sign-up restricted to the owner), Neon Postgres + Drizzle ORM, Claude API (translate/summarize/classify news), Notion MCP server (the "Notion 저장" button), deployed on Vercel.

## Architecture constraints worth knowing

- **Everything is protected**: all pages and API routes require login.
- **News pipeline**: "뉴스 가져오기" fetches RSS (한국교육신문, 전남광주교육통, and news1 via Google News RSS), ~10 items per source, processes **per-article** with progress shown in the UI to stay within Vercel serverless time limits. Claude returns a Korean summary + category; only the summary and original link are stored (never full article text). No URL de-duplication — repeated fetches intentionally create new cards.
- **Categories** are user-managed (defaults: 정책, 교원, 학생생활, 교육과정, 지역교육, 평가). Deleting one sets its news to "미분류" (`category_id` nullable); renames propagate.
- **현안 정리** form has 10 required fields; save is disabled until all are filled **and** the server re-validates.
- **과제 수정 및 보완** entries may optionally link to an original 과제 (`assignment_id` nullable). Both assignment boards are text-only (no file attachments).
- **Notion save** uses Notion MCP, which needs server-side Notion OAuth — design this first when implementing it. Target Notion location is still undecided.
- Secrets (Clerk, Neon, Claude, Notion) go in `.env`, never committed.
- Data model draft: `categories`, `news`, `assignments`, `assignment_revisions`, `issue_notes` (see PRD §6).
