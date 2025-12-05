import { TranscriptionProvider } from "@/generated/prisma";
import { serverEnv } from "@/env/server";
import { decryptSecret } from "@/server/utils/encryption";
import { prisma } from "@/lib/prisma";
import type {
  ProviderTranscriptionPayload,
  TranscriptionProviderAdapter,
  TranscriptionResult,
} from "../types";
import {
  mapElevenLabsResponse,
  type ElevenLabsResponse,
} from "@/server/providers/mappers/elevenlabs";

async function getApiKey(userId: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: TranscriptionProvider.ELEVENLABS,
      },
    },
  });

  if (!apiKey) {
    throw new Error("Clé ElevenLabs non configurée");
  }

  return decryptSecret(apiKey.encrypted, apiKey.nonce);
}

async function callElevenLabs(
  userId: string,
  payload: ProviderTranscriptionPayload,
): Promise<TranscriptionResult> {
  const apiKey = await getApiKey(userId);

  const res = await fetch(`${serverEnv.ELEVENLABS_API_BASE}/v1/speech-to-text/recognize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      diarize: payload.diarize ?? true,
      model_id: payload.model ?? "scribe_v1",
      audio_url: payload.fileUrl,
      language_code: payload.language,
      prompt: payload.prompt,
      ...payload.additionalConfig,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur ElevenLabs (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  return mapElevenLabsResponse(data as ElevenLabsResponse);
}

export const elevenLabsProvider: TranscriptionProviderAdapter = {
  id: TranscriptionProvider.ELEVENLABS,
  async listModels() {
    return ["scribe_v1"];
  },
  async transcribe(payload) {
    return callElevenLabs(payload.userId, payload);
  },
};
