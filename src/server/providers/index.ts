import { TranscriptionProvider } from "@prisma/client";
import { serverEnv } from "@/env/server";
import { TranscriptionProviderAdapter } from "./types";
import { deepgramProvider } from "./providers/deepgram";
import { elevenLabsProvider } from "./providers/elevenlabs";
import { openaiProvider } from "./providers/openai";

const adapters: Record<TranscriptionProvider, TranscriptionProviderAdapter> = {
  [TranscriptionProvider.DEEPGRAM]: deepgramProvider,
  [TranscriptionProvider.ELEVENLABS]: elevenLabsProvider,
  [TranscriptionProvider.OPENAI]: openaiProvider,
};

export function getProviderAdapter(provider: TranscriptionProvider): TranscriptionProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Fournisseur ${provider} non supporté`);
  }
  return adapter;
}

export function getProviderBaseUrl(provider: TranscriptionProvider) {
  switch (provider) {
    case TranscriptionProvider.DEEPGRAM:
      return serverEnv.DEEPGRAM_API_BASE;
    case TranscriptionProvider.ELEVENLABS:
      return serverEnv.ELEVENLABS_API_BASE;
    case TranscriptionProvider.OPENAI:
      return serverEnv.OPENAI_API_BASE;
    default:
      throw new Error(`Base URL inconnue pour ${provider}`);
  }
}
