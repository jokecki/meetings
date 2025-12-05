import type { Prisma } from "@prisma/client";
import type {
  AudioAsset as ApiAudioAsset,
  Segment as ApiSegment,
  Speaker as ApiSpeaker,
  TranscriptionDetail,
  WordTiming,
} from "@/lib/api/types";

const DEFAULT_LOCALE_STRING = "";

type PrismaTranscriptionDetail = Prisma.TranscriptionGetPayload<{
  include: {
    audioAsset: true;
    speakers: true;
    segments: true;
  };
}>;

function formatDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function parseWordTimings(value: unknown): WordTiming[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const entries: WordTiming[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const record = item as Record<string, unknown>;
    const textCandidate =
      typeof record.text === "string"
        ? record.text
        : typeof record.word === "string"
          ? record.word
          : undefined;
    const start = safeNumber(record.startMs ?? record.start);
    const end = safeNumber(record.endMs ?? record.end);
    if (textCandidate && start !== null && end !== null) {
      entries.push({
        text: textCandidate,
        startMs: start,
        endMs: end,
        confidence: safeNumber(record.confidence),
      });
    }
  });
  return entries.length > 0 ? entries : null;
}

function serializeAudioAsset(asset: PrismaTranscriptionDetail["audioAsset"]): ApiAudioAsset | null {
  if (!asset) {
    return null;
  }
  return {
    id: asset.id,
    userId: asset.userId,
    storageProvider: asset.storageProvider,
    fileUrl: asset.fileUrl,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    durationSeconds: asset.durationSeconds,
    checksum: asset.checksum,
    expiresAt: formatDate(asset.expiresAt),
    createdAt: formatDate(asset.createdAt) ?? DEFAULT_LOCALE_STRING,
  };
}

function serializeSegment(segment: PrismaTranscriptionDetail["segments"][number]): ApiSegment {
  return {
    id: segment.id,
    transcriptionId: segment.transcriptionId,
    speakerId: segment.speakerId,
    speakerKey: segment.speakerKey,
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.text,
    confidence: segment.confidence,
    words: parseWordTimings(segment.words as unknown),
    createdAt: formatDate(segment.createdAt) ?? DEFAULT_LOCALE_STRING,
  };
}

function serializeSpeaker(speaker: PrismaTranscriptionDetail["speakers"][number]): ApiSpeaker {
  return {
    id: speaker.id,
    transcriptionId: speaker.transcriptionId,
    speakerKey: speaker.speakerKey,
    displayName: speaker.displayName,
    createdAt: formatDate(speaker.createdAt) ?? DEFAULT_LOCALE_STRING,
    updatedAt: formatDate(speaker.updatedAt) ?? DEFAULT_LOCALE_STRING,
  };
}

export function serializeTranscriptionDetail(
  transcription: PrismaTranscriptionDetail,
): TranscriptionDetail {
  return {
    id: transcription.id,
    userId: transcription.userId,
    audioAssetId: transcription.audioAssetId,
    title: transcription.title,
    status: transcription.status,
    provider: transcription.provider,
    model: transcription.model,
    externalJobId: transcription.externalJobId,
    language: transcription.language,
    durationSeconds: transcription.durationSeconds,
    promptUsed: transcription.promptUsed,
    customPrompt: transcription.customPrompt,
    confidence: transcription.confidence,
    metadata: transcription.metadata,
    errorCode: transcription.errorCode,
    errorMessage: transcription.errorMessage,
    createdAt: formatDate(transcription.createdAt) ?? DEFAULT_LOCALE_STRING,
    updatedAt: formatDate(transcription.updatedAt) ?? DEFAULT_LOCALE_STRING,
    completedAt: formatDate(transcription.completedAt),
    audioAsset: serializeAudioAsset(transcription.audioAsset),
    segments: transcription.segments.map(serializeSegment),
    speakers: transcription.speakers.map(serializeSpeaker),
  };
}
