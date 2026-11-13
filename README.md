# 교육전문직을 준비 (EDUKING)

교육전문직(장학사·교육연구사) 선발시험을 준비하는 교사를 위한 **개인 학습 대시보드**입니다.
교육 뉴스를 모아 읽고, 과제와 현안을 기록·채점받고, 면접 문항을 뽑아 연습하는 것을 한 화면에서 할 수 있습니다.
로그인한 사람만 쓸 수 있고, 허용된 이메일만 들어올 수 있습니다. 화면 문구는 모두 한국어입니다.

> 기능 요구사항은 [`PRD.md`](PRD.md), 화면 구성·스타일은 [`ui.md`](ui.md), 구현 구조와 PRD와 달라진 점은 [`CLAUDE.md`](CLAUDE.md)에 정리되어 있습니다.

## 주요 기능

| 영역 | 내용 |
|---|---|
| **오늘의 목표** | 매일 반복되거나 기간이 있는 목표를 만들고 달성 체크. 과제·수정 제출·현안 작성 건수는 자동으로 집계되고, 연속 달성일을 보여 줍니다. |
| **시험일 D-day** | 시험일을 저장하면 D-day와 달력이 표시됩니다. |
| **교육계 주요 뉴스** | RSS에서 지난 24시간 기사를 가져와 중복을 걸러 저장하고, Claude가 한국어 요약과 카테고리를 붙입니다. 카테고리 추가·수정·삭제·필터, 매일 아침 자동 수집을 지원합니다. |
| **과제 제출 / 과제 수정 제출** | PDF를 올리고 채점 기준표를 고르면 Claude가 항목별로 채점하고 피드백합니다. 원본 PDF 보관, 다시 채점, 점수 추이 그래프를 제공합니다. |
| **현안 정리** | 10개 항목을 모두 채워야 저장되는 게시판. 작성·수정·삭제·검색, Claude의 검토와 면접 예상 질문, Notion 저장을 지원합니다. |
| **면접 준비 자판기** | 자료(텍스트·PDF)를 넣고 버튼을 누르면 면접 문항이 나오고, 답변을 쓰면 Claude가 채점합니다. 채점 기준을 직접 만들 수 있습니다. |
| **접근 관리** | 관리자가 앱 안에서 로그인 가능한 이메일을 추가·삭제합니다. |
| **백업** | 모든 기록을 JSON 파일로 내려받습니다. |

## 기술 스택

- [Next.js](https://nextjs.org) 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4
- 인증: [Clerk](https://clerk.com) (구글 로그인) + 허용 이메일 목록
- DB: [Neon](https://neon.tech) PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- AI: [Anthropic API](https://docs.anthropic.com) (`@anthropic-ai/sdk`) — 뉴스 분류, 채점, 현안 검토, 면접 문항
- 뉴스 수집: `rss-parser`
- 배포: Vercel (매일 자동 수집은 Vercel Cron)

## 시작하기

### 1. 준비물

- Node.js 20 이상
- [Clerk](https://clerk.com) 애플리케이션 (구글 로그인 켜기)
- [Neon](https://neon.tech) 데이터베이스
- [Anthropic API 키](https://console.anthropic.com)
- (선택) Notion 통합 토큰과 저장할 데이터베이스

### 2. 설치

```bash
npm install
```

### 3. 환경 변수

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 채웁니다. **이 파일은 Git에 올라가지 않으며, 절대 공개하면 안 됩니다.**

| 이름 | 필수 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk 공개 키 |
| `CLERK_SECRET_KEY` | ✅ | Clerk 비밀 키 |
| `DATABASE_URL` | ✅ | Neon 연결 주소 |
| `ANTHROPIC_API_KEY` | ✅ | 뉴스 요약·분류, 채점, 현안 검토, 면접 기능에 필요 |
| `ALLOWED_EMAILS` | ✅ | **관리자** 이메일(쉼표로 구분). 비어 있으면 아무도 들어올 수 없습니다. |
| `NOTION_TOKEN` | 선택 | Notion 통합 토큰 (현안을 Notion에 저장할 때) |
| `NOTION_ISSUES_DATABASE_ID` | 선택 | 현안을 저장할 Notion 데이터베이스 ID |
| `CRON_SECRET` | 배포 시 | 자동 뉴스 수집 호출을 인증하는 임의의 긴 문자열 |

### 4. 데이터베이스 준비

```bash
npm run db:migrate   # 마이그레이션 적용
npm run db:seed      # 기본 뉴스 카테고리 넣기 (정책, 교원, 학생생활, 교육과정, 지역교육, 평가)
```

### 5. 실행

```bash
npm run dev          # http://localhost:3000
```

처음 접속하면 구글 로그인 창이 뜹니다. `ALLOWED_EMAILS`에 등록한 계정으로 로그인하세요.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 운영 빌드 / 운영 서버 실행 |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | 타입 검사 |
| `npm run db:generate` | `src/db/schema.ts` 변경으로 마이그레이션 SQL 생성 |
| `npm run db:migrate` | 마이그레이션을 DB에 적용 |
| `npm run db:push` | 마이그레이션 파일 없이 스키마를 DB에 바로 반영 |
| `npm run db:studio` | Drizzle Studio (DB 보기) |
| `npm run db:seed` | 기본 카테고리 입력 |

이 프로젝트에는 테스트 프레임워크가 설정되어 있지 않습니다.

## 폴더 구조

```
src/
  app/                  페이지, 서버 액션(*-actions.ts), API 라우트(api/)
    api/                과제 제출, 자료 업로드, PDF 열람, 자동 수집(cron), 백업
    assignments/ revisions/ issues/ interview/ access/    각 화면
  components/           화면 컴포넌트 (dashboard/, interview/ 등)
  db/                   Drizzle 스키마와 DB 연결
  lib/                  핵심 로직
    access.ts             로그인 허용 판단 (관리자/멤버)
    claude.ts             Claude 호출 공통 헬퍼
    grading.ts            과제 PDF 채점
    interview.ts          면접 문항 생성·답변 채점
    news-feed.ts          뉴스 소스 목록, RSS 읽기
    news-ingest.ts        수집·저장·AI 분류
    notion.ts             Notion 저장
  proxy.ts              Clerk 로그인 + 접근 허용 검사 (Next.js 16의 middleware)
drizzle/                마이그레이션 SQL
vercel.json             매일 뉴스 자동 수집 설정
```

## 접근 제어

- 로그인(Clerk)만으로는 들어올 수 없고, 허용된 이메일이어야 합니다.
  - **관리자**: 환경 변수 `ALLOWED_EMAILS`의 이메일. 항상 허용되며 `/access`(접근 관리)를 열 수 있습니다.
  - **멤버**: 관리자가 `/access`에서 추가한 이메일. 앱은 쓸 수 있지만 접근 관리는 열 수 없습니다.
- 허용된 사람은 **모든 기록을 함께 보고 고칠 수 있습니다.** 사용자별로 데이터가 나뉘지 않습니다.
- Clerk 대시보드에서도 가입 제한(허용 목록)을 켜 두는 것을 권장합니다.

## 배포 (Vercel)

1. 코드를 GitHub에 올리고 Vercel에서 저장소를 가져옵니다(Import). Next.js는 자동 인식됩니다.
2. **Environment Variables**에 위 환경 변수를 모두 등록합니다. `ALLOWED_EMAILS`에는 본인 이메일을 반드시 넣고, `CRON_SECRET`은 새로 정한 값을 넣습니다.
3. 배포합니다. 이후 푸시할 때마다 자동으로 다시 배포됩니다.

알아 둘 점:

- 실제 주소에서 로그인하려면 Clerk를 **운영(Production) 모드**로 바꿔 운영용 키를 써야 합니다. 이때 직접 가진 도메인이 필요할 수 있으니 Clerk 문서를 확인하세요.
- 로컬과 배포 환경이 같은 `DATABASE_URL`을 쓰면 같은 데이터를 함께 봅니다.
- 뉴스 가져오기와 AI 채점은 오래 걸릴 수 있어 일부 페이지의 최대 실행 시간을 늘려 두었습니다. Vercel 요금제의 한도를 확인하세요.
- 매일 오전 6시(한국 시간) 자동 수집은 `vercel.json`의 Cron이 `/api/cron/news`를 호출하며, `CRON_SECRET`으로 인증합니다.

## 뉴스 소스

한국교육신문, 전남광주교육통, 호남교육신문, 남도일보, 에듀프레스, 에듀인뉴스, 뉴스1(Google News RSS 경유)에서 가져옵니다.
소스 목록은 `src/lib/news-feed.ts`의 `NEWS_SOURCES`에서 수정합니다. 일부 매체의 RSS는 갱신이 멈춰 있을 수 있습니다.

## 라이선스와 이용 시 유의

개인 학습용으로 만든 프로젝트입니다. 뉴스는 원문 전문을 저장하지 않고 제목, RSS 요약, 링크만 보관하며, Google News RSS는 개인·비영리 용도로만 사용해야 합니다.
