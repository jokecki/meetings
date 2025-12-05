export const TRANSCRIPTION_PROVIDERS = ["DEEPGRAM", "ELEVENLABS", "OPENAI"] as const;
export type TranscriptionProviderValue = (typeof TRANSCRIPTION_PROVIDERS)[number];

export const TRANSCRIPTION_STATUSES = [
  "PENDING",
  "UPLOADING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type TranscriptionStatusValue = (typeof TRANSCRIPTION_STATUSES)[number];

export function providerLabel(provider: TranscriptionProviderValue) {
  switch (provider) {
    case "DEEPGRAM":
      return "Deepgram";
    case "ELEVENLABS":
      return "ElevenLabs";
    case "OPENAI":
      return "OpenAI";
    default:
      return provider;
  }
}
