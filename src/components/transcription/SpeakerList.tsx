"use client";

import { useEffect, useMemo, useState } from "react";
import type { Speaker } from "@/lib/api/types";

type SpeakerListProps = {
  speakers: Speaker[];
  activeSpeakerId: string | null;
  segmentCounts: Record<string, number>;
  onSelectSpeaker: (speakerId: string | null) => void;
  onRename: (speakerId: string, name: string) => Promise<void>;
};

export function SpeakerList({
  speakers,
  activeSpeakerId,
  segmentCounts,
  onSelectSpeaker,
  onRename,
}: SpeakerListProps) {
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    setEditing(
      speakers.reduce<Record<string, string>>((acc, speaker) => {
        acc[speaker.id] = speaker.displayName;
        return acc;
      }, {}),
    );
  }, [speakers]);

  const sortedSpeakers = useMemo(() => {
    return [...speakers].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [speakers]);

  const handleRename = async (speakerId: string) => {
    const name = editing[speakerId]?.trim();
    if (!name) {
      setErrorId(speakerId);
      return;
    }
    setLoadingId(speakerId);
    setErrorId(null);
    try {
      await onRename(speakerId, name);
    } catch (error) {
      console.error(error);
      setErrorId(speakerId);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Intervenants</h2>
        <button
          type="button"
          onClick={() => onSelectSpeaker(null)}
          className="text-xs text-indigo-300 hover:text-indigo-100"
        >
          Réinitialiser
        </button>
      </div>
      <ul className="space-y-3 text-sm">
        {sortedSpeakers.map((speaker) => {
          const value = editing[speaker.id] ?? "";
          const isActive = speaker.id === activeSpeakerId;
          const segments = segmentCounts[speaker.id] ?? 0;
          return (
            <li
              key={speaker.id}
              className={`rounded-lg border px-3 py-2 ${
                isActive ? "border-indigo-500 bg-indigo-900/40" : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectSpeaker(isActive ? null : speaker.id)}
                className="w-full text-left font-medium text-slate-100"
              >
                {speaker.displayName}
                <span className="ml-2 text-xs text-slate-400">{segments} segment(s)</span>
              </button>
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={value}
                  onChange={(event) =>
                    setEditing((prev) => ({
                      ...prev,
                      [speaker.id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRename(speaker.id)}
                  disabled={loadingId === speaker.id}
                  className="w-full rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {loadingId === speaker.id ? "Enregistrement..." : "Renommer"}
                </button>
                {errorId === speaker.id && (
                  <p className="text-xs text-rose-400">Erreur lors de la mise à jour.</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
