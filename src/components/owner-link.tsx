import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { connection } from "next/server";
import { isOwnerUser } from "@/lib/access";

// 관리자에게만 '접근 관리' 링크를 보여준다.
export async function OwnerLink() {
  // 접근 확인은 시각(Date.now)에 의존하는 캐시를 쓰므로, 프리렌더가 아니라 요청 시점에 실행한다.
  await connection();
  const { userId } = await auth();
  if (!userId || !(await isOwnerUser(userId))) return null;
  return (
    <Link
      href="/access"
      className="text-sm text-stone-500 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      접근 관리
    </Link>
  );
}
