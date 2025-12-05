import { describe, expect, it } from "vitest";
import { mapDeepgramResponse, type DeepgramResponse } from "../../mappers/deepgram";

describe("mapDeepgramResponse", () => {
  it("normalise une réponse Deepgram en segments et speakers", () => {
    const response: DeepgramResponse = {
      results: {
        channels: [
          {
            alternatives: [
              {
                paragraphs: {
                  paragraphs: [
                    {
                      sentences: [
                        {
                          speaker: "spk_0",
                          start: 0,
                          end: 1.2,
                          text: "Bonjour à tous",
                          confidence: 0.93,
                        },
                        {
                          speaker: "spk_1",
                          start: 1.3,
                          end: 2,
                          text: "Salut !",
                          confidence: 0.88,
                        },
                      ],
                    },
                  ],
                },
                language: "fr",
                confidence: 0.91,
              },
            ],
          },
        ],
      },
      metadata: {
        request_id: "req_123",
        duration: 120,
      },
    };

    const result = mapDeepgramResponse(response);

    expect(result.externalJobId).toBe("req_123");
    expect(result.language).toBe("fr");
    expect(result.durationSeconds).toBe(120);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toMatchObject({
      speakerKey: "spk_0",
      startMs: 0,
      endMs: 1200,
      text: "Bonjour à tous",
    });
    expect(result.segments[1]).toMatchObject({
      speakerKey: "spk_1",
      startMs: 1300,
      endMs: 2000,
      text: "Salut !",
    });
    expect(result.speakers).toHaveLength(2);
    expect(result.speakers[0]).toMatchObject({ speakerKey: "spk_0", displayName: "Speaker 1" });
  });
});
