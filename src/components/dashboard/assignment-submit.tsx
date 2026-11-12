"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RubricOption = { id: number; name: string };

const MAX_BYTES = 4 * 1024 * 1024;

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

export function AssignmentSubmit({
  rubrics,
  kind = "assignment",
}: {
  rubrics: RubricOption[];
  kind?: "assignment" | "revision";
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [rubricId, setRubricId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [grading, setGrading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(
    null,
  );

  const ready = title.trim() && rubricId && file && !grading;

  function onFile(f: File | null) {
    setMessage(null);
    if (f && f.size > MAX_BYTES) {
      setMessage({ text: "PDF는 4MB 이하만 제출할 수 있어요.", error: true });
      if (fileRef.current) fileRef.current.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !file) return;
    setGrading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("title", title.trim());
      body.set("rubricId", rubricId);
      body.set("kind", kind);
      body.set("file", file);
      const res = await fetch("/api/assignments", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; score: number; maxScore: number }
        | { ok: false; error: string }
        | null;
      if (data?.ok) {
        setMessage({
          text: `채점 완료: ${data.score}/${data.maxScore}점`,
          error: false,
        });
        setTitle("");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setMessage({
          text: data?.error ?? "제출하지 못했어요. 잠시 후 다시 시도해 주세요.",
          error: true,
        });
      }
    } catch {
      setMessage({ text: "네트워크 오류로 제출하지 못했어요.", error: true });
    } finally {
      setGrading(false);
    }
  }

  if (rubrics.length === 0) {
    return (
      <p className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-stone-600">
        PDF를 제출하려면 먼저 아래 &apos;채점 기준표 관리&apos;에서 기준표를 만들어
        주세요.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-2 rounded-xl bg-brand-50/60 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="과제 제목"
        aria-label="과제 제목"
        disabled={grading}
        className={inputClass}
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={rubricId}
          onChange={(e) => setRubricId(e.target.value)}
          aria-label="채점 기준표"
          disabled={grading}
          className={`${inputClass} min-w-0 flex-1`}
        >
          <option value="">채점 기준표 선택</option>
          {rubrics.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          aria-label="과제 PDF"
          disabled={grading}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p
          role={message?.error ? "alert" : "status"}
          className={`text-sm ${message?.error ? "text-red-600" : "text-stone-500"}`}
        >
          {grading
            ? "AI가 채점하는 중이에요. 최대 1~2분 걸릴 수 있어요…"
            : (message?.text ?? "PDF 4MB 이하")}
        </p>
        <button
          type="submit"
          disabled={!ready}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
        >
          {grading && (
            <span
              aria-hidden
              className="size-3.5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"
            />
          )}
          {grading ? "채점 중…" : "제출하고 채점"}
        </button>
      </div>
    </form>
  );
}
