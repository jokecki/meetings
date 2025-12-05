import { TranscriptionProvider } from "@prisma/client";

export type SegmentResult = {
  speakerKey: string;
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  words?: Array<{
    startMs: number;
    endMs: number;
    text: string;
    confidence?: number;
  }>;
};

export type TranscriptionResult = {
  externalJobId?: string;
  language?: string;
  durationSeconds?: number;
  confidence?: number;
  segments: SegmentResult[];
  speakers: Array<{
    speakerKey: string;
    displayName: string;
  }>;
  metadata?: Record<string, unknown>;
};

export type ProviderTranscriptionPayload = {
  userId: string;
  fileUrl: string;
  model?: string;
  prompt?: string;
  language?: string;
  diarize?: boolean;
  additionalConfig?: Record<string, unknown>;
};

export interface TranscriptionProviderAdapter {
  readonly id: TranscriptionProvider;
  listModels(): Promise<string[]>;
  transcribe(payload: ProviderTranscriptionPayload): Promise<TranscriptionResult>;
}
