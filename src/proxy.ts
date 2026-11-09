import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 로그인 화면만 공개. 나머지 모든 페이지와 API는 로그인 필수 (PRD §3).
const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  { signInUrl: "/sign-in" },
);

export const config = {
  matcher: [
    // Next.js 내부 파일과 정적 파일은 제외
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // API 라우트는 항상 포함
    "/(api|trpc)(.*)",
  ],
};
