"use client";

import clsx from "clsx";
import type { TranscriptionStatusValue } from "@/lib/constants/transcription";

type Props = {
  status: TranscriptionStatusValue;
};

const STATUS_STYLES: Record<TranscriptionStatusValue, string> = {
  PENDING: "bg-slate-700 text-slate-100",
  UPLOADING: "bg-blue-600/80 text-white",
  PROCESSING: "bg-indigo-600/80 text-white",
  COMPLETED: "bg-emerald-600/80 text-white",
  FAILED: "bg-rose-600/80 text-white",
  CANCELLED: "bg-amber-500/80 text-white",
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
