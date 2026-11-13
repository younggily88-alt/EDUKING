"use client";

import { useState, useTransition } from "react";
import { addAllowedEmail, removeAllowedEmail, type AccessResult } from "@/app/access-actions";

type Member = { id: number; email: string; createdAt: Date };

export function AccessManager({ members }: { members: Member[] }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<AccessResult>, onOk: () => void) {
    setMessage(null);
    startTransition(async () => {
      const r = await action();
      if (r.ok) onOk();
      else setMessage({ text: r.error ?? "처리하지 못했어요.", error: true });
    });
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = email.trim();
          run(
            () => addAllowedEmail(value),
            () => {
              setEmail("");
              setMessage({ text: `${value.toLowerCase()} 을(를) 추가했어요. 1분 안에 적용돼요.`, error: false });
            },
          );
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="추가할 이메일 (구글 계정 주소)"
          aria-label="추가할 이메일"
          maxLength={200}
          disabled={pending}
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
        >
          {pending ? "처리 중…" : "추가"}
        </button>
      </form>
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`text-sm ${message.error ? "text-red-600" : "text-stone-500"}`}
        >
          {message.text}
        </p>
      )}

      {members.length === 0 ? (
        <p className="rounded-lg bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          추가한 멤버가 아직 없어요.
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">{m.email}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm(`${m.email} 의 접근을 막을까요? 이미 로그인한 상태여도 1분 안에 들어올 수 없게 돼요.`)) {
                    run(
                      () => removeAllowedEmail(m.id),
                      () => setMessage({ text: "접근을 막았어요.", error: false }),
                    );
                  }
                }}
                className="shrink-0 rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
