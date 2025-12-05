import type { TranscriptionResult } from "@/server/providers/types";

type DeepgramSentence = {
  speaker?: string;
  start?: number;
  end?: number;
  text?: string;
  confidence?: number;
};

type DeepgramParagraph = {
  sentences?: DeepgramSentence[];
};

type DeepgramAlternative = {
  paragraphs?: {
    paragraphs?: DeepgramParagraph[];
  };
  language?: string;
  confidence?: number;
};

type DeepgramChannel = {
  alternatives?: DeepgramAlternative[];
};

type DeepgramResults = {
  channels?: DeepgramChannel[];
};

type DeepgramMetadata = {
  request_id?: string;
  duration?: number;
};

export type DeepgramResponse = {
  results?: DeepgramResults;
  metadata?: DeepgramMetadata;
};

function toMs(value: number | undefined): number {
  if (typeof value !== "number") {
    return 0;
  }
  return Math.round(value * 1000);
}

export function mapDeepgramResponse(response: DeepgramResponse): TranscriptionResult {
  const paragraphs =
    response.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs ?? [];

  const segments = paragraphs.flatMap((paragraph, paragraphIndex) =>
    (paragraph.sentences ?? []).map((sentence, sentenceIndex) => {
      const speakerKey = sentence.speaker ?? `speaker_${paragraphIndex}_${sentenceIndex}`;
      const startMs = toMs(sentence.start);
      const endMs = toMs(sentence.end ?? sentence.start);
      return {
        speakerKey,
        startMs,
        endMs,
        text: sentence.text?.trim() ?? "",
        confidence: sentence.confidence,
      };
    }),
  );

  const speakersMap = new Map<string, string>();
  segments.forEach((segment) => {
    if (!speakersMap.has(segment.speakerKey)) {
      const displayName = segment.text ? `Speaker ${speakersMap.size + 1}` : segment.speakerKey;
      speakersMap.set(segment.speakerKey, displayName);
    }
  });

  const alternative = response.results?.channels?.[0]?.alternatives?.[0];

  return {
    externalJobId: response.metadata?.request_id,
    language: alternative?.language ?? undefined,
    durationSeconds: response.metadata?.duration,
    confidence: alternative?.confidence,
    segments,
    speakers: Array.from(speakersMap.entries()).map(([speakerKey, displayName]) => ({
      speakerKey,
      displayName,
    })),
    metadata: response.metadata,
  };
}
