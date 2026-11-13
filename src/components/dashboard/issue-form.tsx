"use client";

import { useState, useTransition } from "react";
import { addIssueNote, updateIssueNote } from "@/app/issue-actions";
import { ISSUE_FIELDS, type IssueValues } from "@/lib/issue-fields";

const empty = (): IssueValues =>
  Object.fromEntries(ISSUE_FIELDS.map((f) => [f.key, ""])) as IssueValues;

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

// edit이 있으면 그 현안을 수정하는 폼(바로 열림), 없으면 '+ 새 현안' 버튼으로 열리는 작성 폼.
export function IssueForm({
  edit,
  onClose,
}: {
  edit?: { id: number; values: IssueValues };
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(!!edit);
  const [values, setValues] = useState<IssueValues>(edit?.values ?? empty());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filled = ISSUE_FIELDS.filter((f) => values[f.key].trim()).length;
  const complete = filled === ISSUE_FIELDS.length;

  function close() {
    setOpen(false);
    setError(null);
    onClose?.();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    setError(null);
    startTransition(async () => {
      const result = edit
        ? await updateIssueNote(edit.id, values)
        : await addIssueNote(values);
      if (result.ok) {
        if (!edit) {
          setValues(empty());
          setNotice("현안을 저장했어요.");
        }
        close();
      } else {
        setError(result.error ?? "저장하지 못했어요.");
      }
    });
  }

  if (!open) {
    return (
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setNotice(null);
          }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          + 새 현안
        </button>
        {notice && (
          <p role="status" className="text-sm text-stone-500">
            {notice}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mb-5 space-y-3 rounded-xl bg-brand-50/60 p-4">
      {edit && (
        <p className="text-sm text-stone-500">
          내용을 수정하면 이전 AI 검토 결과는 지워져요. 필요하면 다시 검토해 주세요.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ISSUE_FIELDS.map((f) => (
          <label
            key={f.key}
            className={`block space-y-1 text-sm ${f.long ? "" : "md:col-span-2"}`}
          >
            <span className="font-medium text-stone-700">{f.label}</span>
            {f.long ? (
              <textarea
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                maxLength={f.max}
                rows={4}
                placeholder={f.hint}
                disabled={pending}
                className={inputClass}
              />
            ) : (
              <input
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                maxLength={f.max}
                placeholder={f.hint}
                disabled={pending}
                className={inputClass}
              />
            )}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-stone-500">
          {ISSUE_FIELDS.length}개 중 {filled}개 입력
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={close}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!complete || pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          >
            {pending ? "저장 중…" : edit ? "수정 저장" : "저장"}
          </button>
        </div>
      </div>
    </form>
  );
}
