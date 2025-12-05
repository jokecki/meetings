import type { TranscriptionResult } from "@/server/providers/types";

type OpenAIWord = {
  start?: number;
  end?: number;
  word?: string;
  text?: string;
  confidence?: number;
};

type OpenAISegment = {
  id?: string;
  speaker?: string;
  start?: number;
  end?: number;
  text?: string;
  confidence?: number;
  words?: OpenAIWord[];
};

export type OpenAIResponse = {
  id?: string;
  language?: string;
  duration?: number;
  overall_confidence?: number;
  segments?: OpenAISegment[];
};

function toMs(value: number | undefined, fallback: number): number {
  if (typeof value !== "number") {
    return Math.round(fallback * 1000);
  }
  return Math.round(value * 1000);
}

export function mapOpenAIResponse(response: OpenAIResponse): TranscriptionResult {
  const segments = (response.segments ?? []).map((segment, index) => {
    const startSeconds = typeof segment.start === "number" ? segment.start : 0;
    const endSeconds = typeof segment.end === "number" ? segment.end : startSeconds;

    const words = (segment.words ?? []).map((word) => ({
      startMs: toMs(word.start, startSeconds),
      endMs: toMs(word.end, word.start ?? startSeconds),
      text: word.word ?? word.text ?? "",
      confidence: typeof word.confidence === "number" ? word.confidence : undefined,
    }));

    const speakerKey = segment.speaker ?? segment.id ?? `speaker_${index + 1}`;

    return {
      speakerKey,
      startMs: Math.round(startSeconds * 1000),
      endMs: Math.round(endSeconds * 1000),
      text: segment.text ?? "",
      confidence: typeof segment.confidence === "number" ? segment.confidence : undefined,
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
    language: response.language ?? undefined,
    durationSeconds: response.duration ?? undefined,
    confidence: response.overall_confidence ?? undefined,
    segments,
    speakers: Array.from(speakerMap.entries()).map(([speakerKey, displayName]) => ({
      speakerKey,
      displayName,
    })),
    metadata: response,
  };
}
