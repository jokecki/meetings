import type { TranscriptionProviderValue, TranscriptionStatusValue } from "@/lib/constants/transcription";

export type ApiListResponse<T> = {
  data: T;
};

export type ApiSingleResponse<T> = {
  data: T;
};

export type ApiKeySummary = {
  id: string;
  provider: TranscriptionProviderValue;
  nickname: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderModels = {
  provider: TranscriptionProviderValue;
  models: string[];
};

export type AudioAsset = {
  id: string;
  userId: string;
  storageProvider: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  checksum: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type WordTiming = {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number | null;
};

export type Segment = {
  id: string;
  transcriptionId: string;
  speakerId: string | null;
  speakerKey: string | null;
  startMs: number;
  endMs: number;
  text: string;
  confidence: number | null;
  words: WordTiming[] | null;
  createdAt: string;
};

export type Speaker = {
  id: string;
  transcriptionId: string;
  speakerKey: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type Transcription = {
  id: string;
  userId: string;
  audioAssetId: string | null;
  title: string | null;
  status: TranscriptionStatusValue;
  provider: TranscriptionProviderValue;
  model: string | null;
  externalJobId: string | null;
  language: string | null;
  durationSeconds: number | null;
  promptUsed: string | null;
  customPrompt: string | null;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  audioAsset?: AudioAsset | null;
  segments?: Segment[];
  speakers?: Speaker[];
};

export type TranscriptionDetail = Transcription & {
  segments: Segment[];
  speakers: Speaker[];
  audioAsset: AudioAsset | null | undefined;
};
