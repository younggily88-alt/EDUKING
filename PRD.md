# PRD: 교육전문직 준비 교사용 학습 대시보드

- 작성일: 2026-11-09
- 상태: 기획 확정 (구현 전)
- 사용자: 본인 1명 (개인 전용 앱)

## 1. 개요
교육전문직을 준비하는 교사가 교육 뉴스를 모아 읽고, 과제와 현안 분석을 날짜별로 기록·관리하는 개인 학습 대시보드.
실행하면 반드시 로그인해야 하며, 로그인 후 한 화면(대시보드)에서 네 개 섹션을 본다. UI는 네이버 메인(www.naver.com)처럼 정보 밀도가 높은 카드·패널 레이아웃을 참고한다.

## 2. 기술 스택
| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js (App Router) |
| 로그인 | Clerk |
| DB / ORM | Neon (PostgreSQL), Drizzle ORM |
| 번역·요약·분류 | Claude API |
| Notion 저장 | Notion MCP 서버 |
| 배포 | Vercel |

## 3. 인증
- 모든 페이지·API는 로그인 필수. 비로그인 시 로그인 화면으로 이동.
- 본인만 사용하므로 회원가입을 막고 본인 계정만 허용한다 (Clerk 설정에서 sign-up 제한 / allowlist).

## 4. 대시보드 구성
네 섹션: **뉴스 / 과제 업로드 / 과제 수정 및 보완 / 현안 정리**

## 5. 기능 요구사항

### 5.1 뉴스
**수집**
- '뉴스 가져오기' 버튼을 누르면 RSS에서 기사를 수집한다.
- 소스(RSS):
  | 사이트 | 주소 | 비고 |
  |---|---|---|
  | 한국교육신문 | `https://www.hangyo.com/data/rss/news.xml` | 공식 RSS 2.0 |
  | 전남광주교육통 | `https://www.jngjedu.kr/rss/allArticle.xml` | 공식 RSS 2.0. 섹션별 피드 `S1N1`~`S1N7`, `S2N23`도 있음 |
  | 뉴스1 | `https://news.google.com/rss/search?q=site:news1.kr+교육+when:7d&hl=ko&gl=KR&ceid=KR:ko` | 공식 RSS 없음 → Google News RSS 대안. 개인·비영리 용도 한정. 링크가 Google 중계 주소일 수 있음 |
- 소스당 최근 약 10건으로 제한 (Vercel 실행 시간 제한 대응).
- 기사 단위로 나눠 처리하고 진행 상황을 화면에 표시한다.
- 중복 기사도 가져올 때마다 새 카드로 쌓는다 (URL 기준 중복 제거 없음). 불편하면 URL 기준 덮어쓰기로 변경 가능.

**AI 처리 (Claude API)**
- 한국어로 번역·요약한다.
- 카테고리를 자동 분류한다.
- 원문 전문은 저장하지 않고 요약과 원문 링크만 저장한다.

**카드**
- 표시 항목: 제목, 요약, 출처, 날짜, 카테고리, 원문 링크, 'Notion 저장' 버튼.

**카테고리**
- 기본값: 정책, 교원, 학생생활, 교육과정, 지역교육, 평가.
- 카테고리별 필터로 해당 뉴스만 볼 수 있다.
- 추가, 수정, 삭제가 가능하다.
- 삭제 시 해당 뉴스는 '미분류'로 이동한다. 이름 변경은 기존 뉴스에 반영된다.

**Notion 저장**
- 카드의 'Notion 저장' 버튼으로 선택한 뉴스를 노션에 저장한다.
- Notion MCP 서버를 사용한다. 서버에서 MCP를 호출하려면 Notion OAuth 인증이 필요하므로 구현 시 가장 먼저 설계한다.

### 5.2 과제 업로드
- 그날그날 과제를 올리는 게시판. 글만 작성한다 (파일 첨부 없음).
- 날짜별로 글 작성, 목록, 상세, 수정, 삭제.

### 5.3 과제 수정 및 보완
- 수정한 과제를 올리는 게시판. 글만 작성한다.
- 원본 과제와 연결할 수 있다.
- 글 작성, 목록, 상세, 수정, 삭제.

### 5.4 현안 정리
- 날짜별로 선택한 현안 하나에 대해 작성하는 게시판.
- 입력 항목 (10개, 모두 필수):
  1. 현안명 한 줄 요약
  2. 현황
  3. 문제점
  4. 원인
  5. 정책 동향
  6. 지역특수성
  7. 대안 및 실행 방안
  8. 내 현장 사례
  9. 예상 반론
  10. 키워드
- 10개를 모두 채워야 저장 버튼이 활성화된다. 화면에서 막고, 서버에서도 한 번 더 검증한다.
- 목록, 상세, 수정, 삭제.

## 6. 데이터 모델 초안 (단일 사용자, 로그인은 Clerk 담당)
- `categories`: id, name, created_at
- `news`: id, title, source, original_url, summary_ko, category_id (nullable → 미분류), published_at, fetched_at
- `assignments`: id, date, title, content, created_at, updated_at
- `assignment_revisions`: id, assignment_id (nullable), date, title, content, created_at, updated_at
- `issue_notes`: id, date, title_summary, status_quo, problems, causes, policy_trends, regional_context, solutions, field_case, counterarguments, keywords, created_at, updated_at

## 7. 비기능 요구사항 / 제약
- Vercel 서버리스 실행 시간 제한을 고려해 뉴스 수집·AI 처리는 기사 단위로 분할한다.
- 중복을 허용하므로 Claude API 호출 비용이 가져오기 횟수에 비례해 늘어난다.
- 환경 변수(Clerk, Neon, Claude API, Notion)는 `.env`로 관리하고 저장소에 올리지 않는다.
- 뉴스1은 Google News RSS 약관(개인·비영리)에 따라 본인 전용으로만 사용한다.

## 8. 구현 순서 (제안)
1. Next.js 프로젝트 생성, Clerk 로그인, 전체 보호
2. Neon + Drizzle 스키마와 마이그레이션
3. 뉴스: RSS 수집 → Claude 번역·요약·분류 → 카드 UI, 카테고리 관리
4. 과제 업로드 / 과제 수정 및 보완 게시판
5. 현안 정리 폼 (10개 필수 검증)
6. Notion MCP 연동과 'Notion 저장'
7. 대시보드 UI 다듬기 (네이버 스타일), Vercel 배포

## 9. 열린 항목
- Notion MCP의 OAuth 인증 방식과 저장할 노션 위치(페이지 또는 데이터베이스) 확정.
- 중복 기사 정책 재검토 (현재는 매번 새로 쌓기).
