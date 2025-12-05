"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AudioPlayer } from "@/components/transcription/AudioPlayer";
import { SegmentList } from "@/components/transcription/SegmentList";
import { SpeakerList } from "@/components/transcription/SpeakerList";
import { apiFetch } from "@/lib/api/client";
import type {
  ApiSingleResponse,
  Speaker,
  TranscriptionDetail,
} from "@/lib/api/types";
import { providerLabel } from "@/lib/constants/transcription";
import { formatTimestamp } from "@/lib/format/time";

const REFRESH_INTERVAL = 5000;

function shouldRefetch(status: string) {
  return ["PENDING", "UPLOADING", "PROCESSING"].includes(status);
}

async function fetchTranscriptionDetailRequest(id: string) {
  const response = await apiFetch<ApiSingleResponse<TranscriptionDetail>>(`/api/transcriptions/${id}`);
  return response.data;
}

async function renameSpeakerRequest(
  transcriptionId: string,
  speakerId: string,
  displayName: string,
) {
  const response = await apiFetch<{ data: Speaker }>(
    `/api/transcriptions/${transcriptionId}/speakers/${speakerId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ displayName }),
    },
  );
  return response.data;
}

async function updateMetadataRequest(
  transcriptionId: string,
  payload: { title?: string | null; customPrompt?: string | null },
) {
  const response = await apiFetch<ApiSingleResponse<TranscriptionDetail>>(
    `/api/transcriptions/${transcriptionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

type Props = {
  transcription: TranscriptionDetail;
};

export function TranscriptionDetailShell({ transcription: initialTranscription }: Props) {
  const queryClient = useQueryClient();
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const audioSeekRef = useRef<(ms: number) => void>();
  const [formState, setFormState] = useState({
    title: initialTranscription.title ?? "",
    customPrompt: initialTranscription.customPrompt ?? "",
  });

  const detailQuery = useQuery({
    queryKey: ["transcription", initialTranscription.id],
    queryFn: () => fetchTranscriptionDetailRequest(initialTranscription.id),
    initialData: initialTranscription,
    refetchInterval: (data) => (data && shouldRefetch(data.status) ? REFRESH_INTERVAL : false),
  });

  const transcription = detailQuery.data;

  useEffect(() => {
    const nextTitle = transcription.title ?? "";
    const nextPrompt = transcription.customPrompt ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormState((prev) =>
      prev.title === nextTitle && prev.customPrompt === nextPrompt
        ? prev
        : { title: nextTitle, customPrompt: nextPrompt },
    );
  }, [transcription.title, transcription.customPrompt]);

  const renameSpeakerMutation = useMutation({
    mutationFn: ({ speakerId, displayName }: { speakerId: string; displayName: string }) =>
      renameSpeakerRequest(transcription.id, speakerId, displayName),
    onSuccess: (updatedSpeaker) => {
      queryClient.setQueryData<TranscriptionDetail>(
        ["transcription", transcription.id],
        (prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            speakers: prev.speakers.map((speaker) =>
              speaker.id === updatedSpeaker.id
                ? { ...speaker, displayName: updatedSpeaker.displayName }
                : speaker,
            ),
          };
        },
      );
    },
  });

  const updateMetadataMutation = useMutation({
    mutationFn: (payload: { title?: string | null; customPrompt?: string | null }) =>
      updateMetadataRequest(transcription.id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["transcription", transcription.id], updated);
    },
  });

  const handleRenameSpeaker = async (speakerId: string, displayName: string) => {
    await renameSpeakerMutation.mutateAsync({ speakerId, displayName });
  };

  const handleMetadataSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await updateMetadataMutation.mutateAsync({
      title: formState.title,
      customPrompt: formState.customPrompt,
    });
  };

  const segments = useMemo(() => transcription.segments ?? [], [transcription.segments]);
  const speakers = useMemo(() => transcription.speakers ?? [], [transcription.speakers]);

  const speakerMap = useMemo(() => {
    return speakers.reduce<Record<string, Speaker>>((acc, speaker) => {
      acc[speaker.id] = speaker;
      return acc;
    }, {});
  }, [speakers]);

  const segmentCounts = useMemo(() => {
    return segments.reduce<Record<string, number>>((acc, segment) => {
      if (segment.speakerId) {
        acc[segment.speakerId] = (acc[segment.speakerId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [segments]);

  const durationLabel = formatTimestamp((transcription.durationSeconds ?? 0) * 1000);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <form onSubmit={handleMetadataSubmit} className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Titre</label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Prompt personnalisé
                </label>
                <textarea
                  value={formState.customPrompt}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, customPrompt: event.target.value }))
                  }
                  rows={4}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="Conserve ton prompt ou note des ajustements pour rasage futur."
                />
              </div>
              <button
                type="submit"
                className={clsx(
                  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition",
                  updateMetadataMutation.isLoading
                    ? "bg-slate-700 text-slate-300"
                    : "bg-indigo-500 text-white hover:bg-indigo-400",
                )}
                disabled={updateMetadataMutation.isLoading}
              >
                {updateMetadataMutation.isLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
              {updateMetadataMutation.isError && (
                <p className="text-xs text-rose-400">Erreur pendant la mise à jour.</p>
              )}
            </form>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <StatusBadge status={transcription.status} />
              <span>{providerLabel(transcription.provider)}</span>
              {transcription.model && <span>• {transcription.model}</span>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Durée</span>
              <span className="text-slate-100">{durationLabel}</span>
              <span>Langue</span>
              <span className="text-slate-100">{transcription.language ?? "n/a"}</span>
              <span>Créée</span>
              <span className="text-slate-100">
                {new Date(transcription.createdAt).toLocaleString("fr-FR")}
              </span>
              {transcription.completedAt && (
                <>
                  <span>Terminée</span>
                  <span className="text-slate-100">
                    {new Date(transcription.completedAt).toLocaleString("fr-FR")}
                  </span>
                </>
              )}
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <a
                href={`/api/transcriptions/${transcription.id}/export?format=txt`}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-indigo-500 hover:text-white"
              >
                Export .txt
              </a>
              <a
                href={`/api/transcriptions/${transcription.id}/export?format=docx`}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-indigo-500 hover:text-white"
              >
                Export .docx
              </a>
            </div>
          </div>
        </div>
      </section>

      {transcription.audioAsset ? (
        <AudioPlayer
          key={transcription.audioAsset.id}
          audioUrl={transcription.audioAsset.fileUrl}
          onTimeUpdate={setCurrentTimeMs}
          onReady={(handle) => {
            audioSeekRef.current = handle.seekTo;
          }}
        />
      ) : (
        <section className="rounded-xl border border-amber-600/40 bg-amber-900/30 p-4 text-sm text-amber-100">
          Aucun fichier audio disponible pour cette transcription.
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <SpeakerList
          speakers={speakers}
          activeSpeakerId={activeSpeakerId}
          onSelectSpeaker={setActiveSpeakerId}
          onRename={handleRenameSpeaker}
          segmentCounts={segmentCounts}
        />
        <SegmentList
          segments={segments}
          speakers={speakerMap}
          activeSpeakerId={activeSpeakerId}
          currentTimeMs={currentTimeMs}
          onSeek={(ms) => audioSeekRef.current?.(ms)}
        />
      </div>
    </div>
  );
}
