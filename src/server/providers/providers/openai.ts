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
  mapOpenAIResponse,
  type OpenAIResponse,
} from "@/server/providers/mappers/openai";

async function getApiKey(userId: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: TranscriptionProvider.OPENAI,
      },
    },
  });

  if (!apiKey) {
    throw new Error("Clé OpenAI non configurée");
  }

  return decryptSecret(apiKey.encrypted, apiKey.nonce);
}

async function callWhisper(
  userId: string,
  payload: ProviderTranscriptionPayload,
): Promise<TranscriptionResult> {
  const apiKey = await getApiKey(userId);

  const res = await fetch(`${serverEnv.OPENAI_API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: payload.fileUrl,
      model: payload.model ?? "whisper-1",
      prompt: payload.prompt,
      response_format: "verbose_json",
      temperature: 0,
      language: payload.language,
      diarization: true,
      ...payload.additionalConfig,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur OpenAI Whisper (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  return mapOpenAIResponse(data as OpenAIResponse);
}

export const openaiProvider: TranscriptionProviderAdapter = {
  id: TranscriptionProvider.OPENAI,
  async listModels() {
    return ["gpt-4o-transcribe", "whisper-1"];
  },
  async transcribe(payload) {
    return callWhisper(payload.userId, payload);
  },
};
