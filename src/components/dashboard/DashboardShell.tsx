"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ApiKeySummary, ApiListResponse, ProviderModels, Transcription } from "@/lib/api/types";
import {
  TRANSCRIPTION_PROVIDERS,
  type TranscriptionProviderValue,
} from "@/lib/constants/transcription";
import { UploadCard } from "./UploadCard";
import { TranscriptionTable } from "./TranscriptionTable";
import { ApiKeyManager } from "./ApiKeyManager";

const FIVE_SECONDS = 5000;

async function fetchTranscriptions() {
  const response = await apiFetch<ApiListResponse<Transcription[]>>("/api/transcriptions");
  return response.data;
}

async function fetchProviders() {
  const response = await apiFetch<ApiListResponse<ProviderModels[]>>("/api/settings/providers");
  return response.data;
}

async function fetchApiKeys() {
  const response = await apiFetch<ApiListResponse<ApiKeySummary[]>>("/api/settings/keys");
  return response.data;
}

async function createTranscription(payload: {
  audioAssetId: string;
  provider: TranscriptionProviderValue;
  model?: string;
  prompt?: string;
  language?: string;
  diarize: boolean;
}) {
  const response = await apiFetch<{ data: Transcription }>("/api/transcriptions", {
    method: "POST",
    body: JSON.stringify({
      audioAssetId: payload.audioAssetId,
      provider: payload.provider,
      model: payload.model,
      customPrompt: payload.prompt,
      language: payload.language,
      diarize: payload.diarize,
    }),
  });
  return response.data;
}

export function DashboardShell() {
  const queryClient = useQueryClient();

  const providersQuery = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  const apiKeysQuery = useQuery({
    queryKey: ["apiKeys"],
    queryFn: fetchApiKeys,
  });

  const transcriptionsQuery = useQuery({
    queryKey: ["transcriptions"],
    queryFn: fetchTranscriptions,
    refetchInterval: FIVE_SECONDS,
  });

  const createMutation = useMutation({
    mutationFn: createTranscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
    },
  });

  const providerHasKey = useMemo(() => {
    const map = TRANSCRIPTION_PROVIDERS.reduce<Record<TranscriptionProviderValue, boolean>>((acc, provider) => {
      acc[provider] = false;
      return acc;
    }, {} as Record<TranscriptionProviderValue, boolean>);
    (apiKeysQuery.data ?? []).forEach((item) => {
      map[item.provider] = true;
    });
    return map;
  }, [apiKeysQuery.data]);

  const handleRequestTranscription = useCallback(
    async (payload: {
      audioAssetId: string;
      provider: TranscriptionProviderValue;
      model?: string;
      prompt?: string;
      language?: string;
      diarize: boolean;
    }) => {
      await createMutation.mutateAsync(payload);
    },
    [createMutation],
  );

  const providers = providersQuery.data ??
    TRANSCRIPTION_PROVIDERS.map((provider) => ({
      provider,
      models:
        provider === "DEEPGRAM"
          ? ["nova-3-general", "nova-3-meeting"]
          : provider === "ELEVENLABS"
            ? ["scribe_v1"]
            : ["whisper-1"],
    }));

  return (
    <div className="flex flex-col gap-8">
      <UploadCard
        providers={providers}
        providerHasKey={providerHasKey}
        onRequestTranscription={handleRequestTranscription}
      />

      <TranscriptionTable
        items={transcriptionsQuery.data ?? []}
        isLoading={transcriptionsQuery.isLoading || transcriptionsQuery.isRefetching}
      />

      <ApiKeyManager
        items={apiKeysQuery.data ?? []}
        isLoading={apiKeysQuery.isLoading || apiKeysQuery.isRefetching}
      />
    </div>
  );
}
