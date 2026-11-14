"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

// 비로그인 상태로 접속하면 로그인 모달을 자동으로 띄운다.
// 모달을 닫아도 버튼으로 다시 열 수 있다.
export function AuthGate() {
  const { openSignIn, loaded } = useClerk();

  useEffect(() => {
    if (loaded) openSignIn({});
  }, [loaded, openSignIn]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">교육전문직 학습 대시보드</h1>
      <p className="text-zinc-600">로그인 후 이용할 수 있습니다.</p>
      <button
        type="button"
        onClick={() => openSignIn({})}
        className="rounded-md bg-foreground px-5 py-2 text-background"
      >
        로그인
      </button>
    </main>
  );
}
