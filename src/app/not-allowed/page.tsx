import { Show, SignOutButton } from "@clerk/nextjs";
import { Suspense } from "react";

export const metadata = { title: "접근 권한 없음 · 교육전문직 준비 도우미" };

export default function NotAllowedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-brand-900">접근 권한이 없어요</h1>
      <p className="max-w-md text-stone-600">
        이 대시보드는 초대받은 사람만 사용할 수 있어요. 사용하고 싶다면 운영자에게
        로그인에 쓴 이메일 주소를 알려 주세요.
      </p>
      <Suspense fallback={null}>
        <Show when="signed-in">
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
            >
              다른 계정으로 로그인
            </button>
          </SignOutButton>
        </Show>
      </Suspense>
    </main>
  );
}
