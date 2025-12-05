import { describe, expect, it } from "vitest";
import { mapElevenLabsResponse, type ElevenLabsResponse } from "../../mappers/elevenlabs";

describe("mapElevenLabsResponse", () => {
  it("convertit la structure ElevenLabs en format interne", () => {
    const response: ElevenLabsResponse = {
      id: "job-1",
      transcript: {
        language: "fr",
        duration: 87,
        confidence: 0.82,
        utterances: [
          {
            speaker: "A",
            start: 0,
            end: 1.4,
            text: "Bonjour",
            confidence: 0.9,
            words: [
              { start: 0, end: 0.4, text: "Bon", confidence: 0.8 },
              { start: 0.4, end: 1.4, text: "jour", confidence: 0.85 },
            ],
          },
        ],
      },
    };

    const result = mapElevenLabsResponse(response);

    expect(result.externalJobId).toBe("job-1");
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toMatchObject({
      speakerKey: "A",
      startMs: 0,
      endMs: 1400,
      words: [
        { text: "Bon", startMs: 0, endMs: 400 },
        { text: "jour", startMs: 400, endMs: 1400 },
      ],
    });
    expect(result.speakers[0]).toMatchObject({ displayName: "Speaker 1" });
  });
});
