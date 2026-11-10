import { Show, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Show when="signed-out">
        <AuthGate />
      </Show>
      <Show when="signed-in">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <span className="font-semibold">교육전문직 학습 대시보드</span>
          <UserButton />
        </header>
        {/* 대시보드 섹션(뉴스/과제/현안)은 이후 단계에서 구현 */}
      </Show>
    </Suspense>
  );
}
