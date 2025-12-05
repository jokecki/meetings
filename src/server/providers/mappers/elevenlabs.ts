import type { TranscriptionResult } from "@/server/providers/types";

type ElevenLabsWord = {
  start?: number;
  end?: number;
  text?: string;
  confidence?: number;
};

type ElevenLabsUtterance = {
  speaker?: string;
  user_id?: string;
  start?: number;
  end?: number;
  text?: string;
  confidence?: number;
  words?: ElevenLabsWord[];
};

type ElevenLabsTranscript = {
  utterances?: ElevenLabsUtterance[];
  language?: string;
  duration?: number;
  confidence?: number;
};

export type ElevenLabsResponse = {
  id?: string;
  transcript?: ElevenLabsTranscript;
};

function toMs(value: number | undefined, fallback: number): number {
  if (typeof value !== "number") {
    return Math.round(fallback * 1000);
  }
  return Math.round(value * 1000);
}

export function mapElevenLabsResponse(response: ElevenLabsResponse): TranscriptionResult {
  const utterances = response.transcript?.utterances ?? [];
  const segments = utterances.map((utterance, index) => {
    const speakerKey = utterance.speaker ?? utterance.user_id ?? `speaker_${index + 1}`;
    const startSeconds = typeof utterance.start === "number" ? utterance.start : 0;
    const endSeconds = typeof utterance.end === "number" ? utterance.end : startSeconds;
    const words = (utterance.words ?? []).map((word) => ({
      startMs: toMs(word.start, startSeconds),
      endMs: toMs(word.end, word.start ?? startSeconds),
      text: word.text ?? "",
      confidence: typeof word.confidence === "number" ? word.confidence : undefined,
    }));

    return {
      speakerKey,
      startMs: Math.round(startSeconds * 1000),
      endMs: Math.round(endSeconds * 1000),
      text: utterance.text ?? "",
      confidence: typeof utterance.confidence === "number" ? utterance.confidence : undefined,
      words: words.length > 0 ? words : undefined,
    };
  });

  const speakerMap = new Map<string, string>();
  segments.forEach((segment) => {
    if (!speakerMap.has(segment.speakerKey)) {
      speakerMap.set(segment.speakerKey, `Speaker ${speakerMap.size + 1}`);
    }
  });

  return {
    externalJobId: response.id ?? undefined,
    language: response.transcript?.language ?? undefined,
    durationSeconds: response.transcript?.duration,
    confidence: response.transcript?.confidence,
    segments,
    speakers: Array.from(speakerMap.entries()).map(([speakerKey, displayName]) => ({
      speakerKey,
      displayName,
    })),
    metadata: response,
  };
}
