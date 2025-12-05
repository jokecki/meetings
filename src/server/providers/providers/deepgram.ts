import { TranscriptionProvider } from "@prisma/client";
import { serverEnv } from "@/env/server";
import { decryptSecret } from "@/server/utils/encryption";
import { prisma } from "@/lib/prisma";
import type {
  ProviderTranscriptionPayload,
  TranscriptionProviderAdapter,
  TranscriptionResult,
} from "../types";
import {
  mapDeepgramResponse,
  type DeepgramResponse,
} from "@/server/providers/mappers/deepgram";

async function getApiKey(userId: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: TranscriptionProvider.DEEPGRAM,
      },
    },
  });

  if (!apiKey) {
    throw new Error("Clé Deepgram non configurée");
  }

  const key = await decryptSecret(apiKey.encrypted, apiKey.nonce);
  return key;
}

async function callDeepgram(
  userId: string,
  payload: ProviderTranscriptionPayload,
): Promise<TranscriptionResult> {
  const apiKey = await getApiKey(userId);

  const res = await fetch(`${serverEnv.DEEPGRAM_API_BASE}/v1/listen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify({
      url: payload.fileUrl,
      model: payload.model ?? "nova-3-general",
      diarize: payload.diarize ?? true,
      smart_format: true,
      utterances: true,
      paragraphs: true,
      detect_language: !payload.language,
      language: payload.language,
      prompt: payload.prompt,
      ...payload.additionalConfig,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur Deepgram (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  return mapDeepgramResponse(data as DeepgramResponse);
}

export const deepgramProvider: TranscriptionProviderAdapter = {
  id: TranscriptionProvider.DEEPGRAM,
  async listModels() {
    return ["nova-3-general", "nova-3-meeting", "nova-3-telehealth"];
  },
  async transcribe(payload) {
    if (!payload.userId) {
      throw new Error("userId requis dans le payload");
    }
    return callDeepgram(payload.userId, payload);
  },
};
