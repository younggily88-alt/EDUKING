"use client";

import { useActionState, useState } from "react";
import { updateExamDate, type ExamDateState } from "@/app/actions";

export function ExamDateEditor({ examDate }: { examDate: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ExamDateState, FormData>(
    async (prev, formData) => {
      const result = await updateExamDate(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    { ok: false },
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {examDate ? "시험일 수정" : "시험일 설정"}
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          name="examDate"
          required
          defaultValue={examDate ?? ""}
          aria-label="시험일"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
        >
          취소
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
