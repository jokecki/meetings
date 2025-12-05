"use client";

import { useMemo } from "react";
import type { Segment, Speaker } from "@/lib/api/types";
import { formatTimestamp } from "@/lib/format/time";

type SegmentListProps = {
  segments: Segment[];
  speakers: Record<string, Speaker>;
  activeSpeakerId: string | null;
  currentTimeMs: number;
  onSeek: (ms: number) => void;
};

function isCurrentSegment(segment: Segment, current: number) {
  return current >= segment.startMs && current < segment.endMs;
}

export function SegmentList({ segments, speakers, activeSpeakerId, currentTimeMs, onSeek }: SegmentListProps) {
  const filteredSegments = useMemo(() => {
    if (!activeSpeakerId) {
      return segments;
    }
    return segments.filter((segment) => segment.speakerId === activeSpeakerId);
  }, [segments, activeSpeakerId]);

  if (filteredSegments.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        Aucun segment à afficher.
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Segments</h2>
        <span className="text-xs text-slate-500">{filteredSegments.length} élément(s)</span>
      </header>
      <ul className="space-y-2 text-sm">
        {filteredSegments.map((segment) => {
          const speaker = segment.speakerId ? speakers[segment.speakerId] : undefined;
          const isActive = isCurrentSegment(segment, currentTimeMs);
          return (
            <li
              key={segment.id}
              className={`rounded-lg border px-3 py-2 transition ${
                isActive ? "border-indigo-500 bg-indigo-900/40" : "border-slate-800 bg-slate-950/40 hover:bg-slate-900/60"
              }`}
            >
              <button
                type="button"
                onClick={() => onSeek(segment.startMs)}
                className="flex w-full flex-col gap-1 text-left"
              >
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {speaker?.displayName ?? segment.speakerKey ?? "Intervenant"} • {formatTimestamp(segment.startMs)}
                </span>
                <span className="text-slate-100">{segment.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
