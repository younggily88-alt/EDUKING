"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addTextMaterial,
  deleteMaterial,
  generateInterviewQuestions,
} from "@/app/interview-actions";
import { QUESTION_CATEGORIES } from "@/lib/interview-config";

type MaterialRow = {
  id: number;
  title: string;
  kind: string;
  fileName: string | null;
  sizeBytes: number;
};

const MAX_PICK = 5;
const MAX_PDF_BYTES = 4 * 1024 * 1024;

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const secondaryBtn =
  "rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

// 자료함(자료 등록·선택) + 자판기 버튼(문항 뽑기)
export function InterviewMachine({ materials }: { materials: MaterialRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [count, setCount] = useState("3");
  const [focus, setFocus] = useState("");
  const [adding, setAdding] = useState<null | "text" | "pdf">(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState<null | "add" | "gen">(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: number) {
    setMessage(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PICK) {
        setMessage({ text: `한 번에 자료 ${MAX_PICK}개까지 고를 수 있어요.`, error: true });
        return prev;
      }
      return [...prev, id];
    });
  }

  function closeAdd() {
    setAdding(null);
    setTitle("");
    setText("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy("add");
    try {
      if (adding === "text") {
        const r = await addTextMaterial(title, text);
        if (!r.ok) return setMessage({ text: r.error ?? "저장하지 못했어요.", error: true });
      } else if (file) {
        const body = new FormData();
        body.set("title", title.trim());
        body.set("file", file);
        const res = await fetch("/api/materials", { method: "POST", body });
        const data = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
        if (!data?.ok) {
          return setMessage({ text: data?.error ?? "올리지 못했어요.", error: true });
        }
      }
      closeAdd();
      setMessage({ text: "자료를 넣었어요.", error: false });
      router.refresh();
    } catch {
      setMessage({ text: "네트워크 오류로 저장하지 못했어요.", error: true });
    } finally {
      setBusy(null);
    }
  }

  function generate() {
    setMessage(null);
    setBusy("gen");
    startTransition(async () => {
      const r = await generateInterviewQuestions(selected, Number(count), focus || null);
      setBusy(null);
      if (r.ok) {
        setMessage({ text: `문항 ${r.count}개가 나왔어요. 아래에서 답해 보세요!`, error: false });
        router.refresh();
      } else {
        setMessage({ text: r.error ?? "문항을 만들지 못했어요.", error: true });
      }
    });
  }

  const addReady =
    title.trim() && (adding === "text" ? text.trim().length >= 50 : !!file) && busy === null;

  return (
    <div className="space-y-5">
      {/* 자료함 */}
      <section aria-labelledby="mat-h">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 id="mat-h" className="font-semibold text-brand-900">
            1. 자료함 <span className="text-sm font-normal text-stone-500">— 문항을 뽑을 자료를 골라 주세요 (최대 {MAX_PICK}개)</span>
          </h3>
          {adding === null && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding("text")} className={secondaryBtn}>
                + 텍스트 붙여넣기
              </button>
              <button type="button" onClick={() => setAdding("pdf")} className={secondaryBtn}>
                + PDF 올리기
              </button>
            </div>
          )}
        </div>

        {adding !== null && (
          <form onSubmit={addMaterial} className="mb-3 space-y-2 rounded-xl bg-brand-50/60 p-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="자료 제목 (예: 2026 전남교육 기본계획)"
              aria-label="자료 제목"
              disabled={busy !== null}
              className={inputClass}
            />
            {adding === "text" ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                maxLength={40000}
                placeholder="정책 문서, 기사, 내가 정리한 내용 등을 붙여 넣으세요 (50자 이상)"
                aria-label="자료 내용"
                disabled={busy !== null}
                className={inputClass}
              />
            ) : (
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                aria-label="자료 PDF"
                disabled={busy !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX_PDF_BYTES) {
                    setMessage({ text: "PDF는 4MB 이하만 올릴 수 있어요.", error: true });
                    e.target.value = "";
                    setFile(null);
                    return;
                  }
                  setFile(f);
                  if (f && !title.trim()) setTitle(f.name.replace(/\.pdf$/i, ""));
                }}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
              />
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeAdd} disabled={busy !== null} className={secondaryBtn}>
                취소
              </button>
              <button
                type="submit"
                disabled={!addReady}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
              >
                {busy === "add" ? "저장 중…" : "자료 넣기"}
              </button>
            </div>
          </form>
        )}

        {materials.length === 0 ? (
          <p className="rounded-lg bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
            아직 자료가 없어요. 면접 문항의 재료가 될 정책 문서나 기사, 내가 정리한 현안을 넣어 보세요.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {materials.map((m) => {
              const on = selected.includes(m.id);
              return (
                <li
                  key={m.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    on ? "border-brand-500 bg-brand-50" : "border-stone-200"
                  }`}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(m.id)}
                      className="size-4 accent-[var(--color-brand-600)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.title}</span>
                      <span className="block text-xs text-stone-500">
                        {m.kind === "pdf" ? "PDF" : "텍스트"} · {kb(m.sizeBytes)}
                      </span>
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`${m.title} 삭제`}
                    onClick={() => {
                      if (confirm(`'${m.title}' 자료를 삭제할까요? 이미 만든 문항은 그대로 남아요.`)) {
                        setSelected((p) => p.filter((x) => x !== m.id));
                        startTransition(async () => {
                          const r = await deleteMaterial(m.id);
                          if (!r.ok) setMessage({ text: r.error ?? "삭제하지 못했어요.", error: true });
                          else router.refresh();
                        });
                      }
                    }}
                    className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 자판기 버튼 */}
      <section aria-labelledby="gen-h" className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
        <h3 id="gen-h" className="mb-3 font-semibold text-brand-900">
          2. 문항 뽑기
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-stone-600">
            문항 수
            <select
              value={count}
              onChange={(e) => setCount(e.target.value)}
              disabled={busy !== null}
              className="mt-1 block rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-stone-600">
            유형
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              disabled={busy !== null}
              className="mt-1 block rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">골고루 섞기</option>
              {QUESTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={selected.length === 0 || busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          >
            {busy === "gen" && (
              <span
                aria-hidden
                className="size-3.5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"
              />
            )}
            {busy === "gen" ? "문항 만드는 중…" : `🎰 문항 뽑기${selected.length ? ` (자료 ${selected.length}개)` : ""}`}
          </button>
        </div>
        <p
          role={message?.error ? "alert" : "status"}
          className={`mt-3 text-sm ${message?.error ? "text-red-600" : "text-stone-500"}`}
        >
          {busy === "gen"
            ? "자료를 읽고 문항을 만들고 있어요. 최대 1~2분 걸릴 수 있어요."
            : (message?.text ??
              (selected.length === 0 ? "자료를 하나 이상 선택하면 버튼이 켜져요." : ""))}
        </p>
      </section>
    </div>
  );
}
