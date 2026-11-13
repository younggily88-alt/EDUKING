import { Show, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";
import { OwnerLink } from "@/components/owner-link";
import {
  Dashboard,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard";

// 뉴스 가져오기·과제 다시 채점 같은 서버 액션이 AI 호출로 오래 걸릴 수 있다.
export const maxDuration = 120;

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Show when="signed-out">
        <AuthGate />
      </Show>
      <Show when="signed-in">
        <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-xl font-bold text-brand-900">
              🌿 교육전문직을 준비
            </span>
            <div className="flex items-center gap-4">
              <Suspense fallback={null}>
                <OwnerLink />
              </Suspense>
              <a
                href="/api/export"
                download
                title="모든 기록을 JSON 파일로 내려받기 (PDF 원본 제외)"
                className="text-sm text-stone-500 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                백업 내려받기
              </a>
              <UserButton />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Suspense fallback={<DashboardSkeleton />}>
            <Dashboard />
          </Suspense>
        </main>
      </Show>
    </Suspense>
  );
}
