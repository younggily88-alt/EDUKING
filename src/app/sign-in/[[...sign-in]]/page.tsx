import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <Suspense fallback={null}>
        <SignIn />
      </Suspense>
    </main>
  );
}
