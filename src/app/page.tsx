import { Show, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";
import {
  Dashboard,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard";

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
            <UserButton />
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
