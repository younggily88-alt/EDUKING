import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAllowedUser } from "@/lib/access";

// "/"는 비로그인 시 로그인 모달만 띄우는 화면(데이터 없음)이라 공개.
// 나머지 모든 페이지와 API는 로그인 필수 (PRD §3).
// /api/cron/*은 로그인 세션이 없는 Vercel Cron이 호출하므로 공개하되,
// 라우트 안에서 CRON_SECRET으로 직접 인증한다.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/not-allowed",
  "/api/cron(.*)",
]);
// 허용 여부 검사에서 제외(무한 리다이렉트 방지)
const isExemptRoute = createRouteMatcher(["/sign-in(.*)", "/not-allowed", "/api/cron(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    const { userId } = await auth();

    // 로그인은 했지만 허용 목록에 없는 사용자는 어느 경로(공개 경로 "/" 포함)도 쓸 수 없다.
    if (userId && !isExemptRoute(req) && !(await isAllowedUser(userId))) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ ok: false, error: "접근 권한이 없어요." }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/not-allowed", req.url));
    }

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
