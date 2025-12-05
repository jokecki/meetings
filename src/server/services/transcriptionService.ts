import {
  TranscriptionProvider,
  TranscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProviderAdapter } from "@/server/providers";
import type { ProviderTranscriptionPayload } from "@/server/providers/types";

export type CreateTranscriptionInput = {
  userId: string;
  audioAssetId: string;
  provider: TranscriptionProvider;
  model?: string;
  promptTemplate?: string;
  customPrompt?: string;
  language?: string;
  diarize?: boolean;
  additionalConfig?: Record<string, unknown>;
};

export async function createTranscriptionJob(input: CreateTranscriptionInput) {
  const audioAsset = await prisma.audioAsset.findUnique({
    where: { id: input.audioAssetId },
  });

  if (!audioAsset || audioAsset.userId !== input.userId) {
    throw new Error("Fichier audio introuvable pour cet utilisateur");
  }

  const transcription = await prisma.transcription.create({
    data: {
      userId: input.userId,
      audioAssetId: audioAsset.id,
      provider: input.provider,
      model: input.model,
      status: TranscriptionStatus.PENDING,
      customPrompt: input.customPrompt,
      promptUsed: input.promptTemplate ?? input.customPrompt ?? null,
      language: input.language,
      metadata: {
        additionalConfig: input.additionalConfig ?? {},
        diarize: input.diarize ?? true,
      },
    },
  });

  return transcription;
}

type StoredMetadata = {
  additionalConfig?: Record<string, unknown>;
  diarize?: boolean;
  providerResponse?: unknown;
};

export async function processTranscription(transcriptionId: string) {
  const transcription = await prisma.transcription.findUnique({
    where: { id: transcriptionId },
    include: {
      audioAsset: true,
    },
  });

  if (!transcription || !transcription.audioAsset) {
    throw new Error("Transcription ou fichier audio introuvable");
  }

  const provider = getProviderAdapter(transcription.provider);

  await prisma.transcription.update({
    where: { id: transcription.id },
    data: { status: TranscriptionStatus.PROCESSING, errorCode: null, errorMessage: null },
  });

  const metadata = (transcription.metadata as StoredMetadata) ?? {};

  const payload: ProviderTranscriptionPayload = {
    userId: transcription.userId,
    fileUrl: transcription.audioAsset.fileUrl,
    model: transcription.model ?? undefined,
    prompt: transcription.customPrompt ?? undefined,
    language: transcription.language ?? undefined,
    diarize: metadata.diarize ?? true,
    additionalConfig: metadata.additionalConfig ?? undefined,
  };

  try {
    const result = await provider.transcribe(payload);

    await prisma.$transaction(async (tx) => {
      await tx.segment.deleteMany({ where: { transcriptionId: transcription.id } });
      await tx.speaker.deleteMany({ where: { transcriptionId: transcription.id } });

      const speakers = await Promise.all(
        result.speakers.map((speaker) =>
          tx.speaker.create({
            data: {
              transcriptionId: transcription.id,
              speakerKey: speaker.speakerKey,
              displayName: speaker.displayName,
            },
          }),
        ),
      );

      const speakerIdByKey = new Map<string, string>();
      speakers.forEach((speaker) => {
        speakerIdByKey.set(speaker.speakerKey, speaker.id);
      });

      if (result.segments.length > 0) {
        await tx.segment.createMany({
          data: result.segments.map((segment) => ({
            transcriptionId: transcription.id,
            speakerId: speakerIdByKey.get(segment.speakerKey) ?? null,
            speakerKey: segment.speakerKey,
            startMs: segment.startMs,
            endMs: segment.endMs,
            text: segment.text,
            confidence: segment.confidence,
            words: segment.words ?? null,
          })),
        });
      }

      await tx.transcription.update({
        where: { id: transcription.id },
        data: {
          status: TranscriptionStatus.COMPLETED,
          externalJobId: result.externalJobId,
          language: result.language,
          durationSeconds: result.durationSeconds ?? transcription.audioAsset.durationSeconds,
          confidence: result.confidence,
          metadata: {
            ...metadata,
            providerResponse: result.metadata ?? {},
          },
          completedAt: new Date(),
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    let errorCode: string | undefined;
    if (typeof error === "object" && error !== null && "code" in error) {
      const possibleCode = (error as { code?: unknown }).code;
      if (typeof possibleCode === "string") {
        errorCode = possibleCode;
      }
    }

    await prisma.transcription.update({
      where: { id: transcription.id },
      data: {
        status: TranscriptionStatus.FAILED,
        errorMessage: message,
        errorCode,
      },
    });
    throw error;
  }
}

export async function renameSpeaker(
  transcriptionId: string,
  speakerId: string,
  newDisplayName: string,
) {
  const speaker = await prisma.speaker.findFirst({
    where: { id: speakerId, transcriptionId },
  });

  if (!speaker) {
    throw new Error("Intervenant introuvable");
  }

  return prisma.speaker.update({
    where: { id: speakerId },
    data: {
      displayName: newDisplayName,
    },
  });
}

export async function getTranscriptionWithSegments(transcriptionId: string, userId: string) {
  return prisma.transcription.findFirst({
    where: { id: transcriptionId, userId },
    include: {
      audioAsset: true,
      speakers: true,
      segments: {
        orderBy: { startMs: "asc" },
      },
    },
  });
}

export async function listUserTranscriptions(userId: string, limit = 20) {
  return prisma.transcription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      audioAsset: true,
    },
  });
}

export async function updateTranscriptionStatus(
  transcriptionId: string,
  status: TranscriptionStatus,
) {
  return prisma.transcription.update({
    where: { id: transcriptionId },
    data: { status },
  });
}

export async function updateTranscriptionMetadata(
  transcriptionId: string,
  userId: string,
  payload: {
    title?: string | null;
    customPrompt?: string | null;
  },
) {
  const updateData: {
    title?: string | null;
    customPrompt?: string | null;
  } = {};

  if (Object.prototype.hasOwnProperty.call(payload, "title")) {
    updateData.title = payload.title ? payload.title.trim() || null : payload.title ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "customPrompt")) {
    updateData.customPrompt = payload.customPrompt
      ? payload.customPrompt.trim() || null
      : payload.customPrompt ?? null;
  }

  return prisma.transcription.update({
    where: {
      id: transcriptionId,
      userId,
    },
    data: updateData,
  });
}
