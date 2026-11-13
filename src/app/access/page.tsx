import { asc } from "drizzle-orm";
import { connection } from "next/server";
import { AccessManager } from "@/components/access-manager";
import { HistoryShell } from "@/components/dashboard/submission-history";
import { Card } from "@/components/dashboard/ui";
import { db } from "@/db";
import { allowedUsers } from "@/db/schema";
import { allowedEmails, assertOwner } from "@/lib/access";

export const metadata = { title: "접근 관리 · 교육전문직을 준비" };

async function AccessAdmin() {
  await connection(); // 요청마다 최신 목록을 조회
  await assertOwner(); // 관리자(환경 변수 ALLOWED_EMAILS)만 볼 수 있다
  const members = await db.select().from(allowedUsers).orderBy(asc(allowedUsers.id));
  const owners = [...allowedEmails()];

  return (
    <div className="space-y-6">
      <Card title="접근 관리">
        <p className="mb-4 text-sm leading-relaxed text-stone-600">
          여기에 추가한 이메일의 구글 계정으로 로그인하면 이 대시보드를 쓸 수 있어요. 추가한 사람은 <b>멤버</b>로,
          모든 기록을 함께 보고 고칠 수 있고 이 화면은 열 수 없어요. 반영까지 최대 1분 걸려요.
        </p>
        <AccessManager members={members} />
      </Card>

      <Card title="관리자 (기본 허용)">
        <p className="mb-3 text-sm text-stone-600">
          서버 설정(환경 변수 <code>ALLOWED_EMAILS</code>)에 등록된 이메일이에요. 항상 들어올 수 있고, 이 화면에서는
          바꿀 수 없어요.
        </p>
        {owners.length === 0 ? (
          <p className="text-sm text-red-600">등록된 관리자가 없어요. ALLOWED_EMAILS를 설정해 주세요.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {owners.map((e) => (
              <li key={e} className="rounded-lg bg-brand-50/60 px-3 py-2">
                {e}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs leading-relaxed text-stone-500">
        참고: Clerk 대시보드에서 가입 제한(허용 목록)을 켜 두었다면, 새로 추가한 이메일도 Clerk에서 가입할 수 있게
        허용해야 로그인할 수 있어요.
      </p>
    </div>
  );
}

export default function AccessPage() {
  return (
    <HistoryShell>
      <AccessAdmin />
    </HistoryShell>
  );
}
