import { describe, expect, it } from "vitest";
import { mapOpenAIResponse, type OpenAIResponse } from "../../mappers/openai";

describe("mapOpenAIResponse", () => {
  it("transforme une réponse Whisper en segments normalisés", () => {
    const response: OpenAIResponse = {
      id: "task-1",
      language: "en",
      duration: 45,
      overall_confidence: 0.76,
      segments: [
        {
          id: "seg-1",
          speaker: "speaker_0",
          start: 0,
          end: 2.5,
          text: "Hello world",
          confidence: 0.7,
          words: [
            { start: 0, end: 0.5, word: "Hello" },
            { start: 0.5, end: 2.5, word: "world" },
          ],
        },
      ],
    };

    const result = mapOpenAIResponse(response);

    expect(result.externalJobId).toBe("task-1");
    expect(result.language).toBe("en");
    expect(result.segments[0]).toMatchObject({
      speakerKey: "speaker_0",
      startMs: 0,
      endMs: 2500,
      text: "Hello world",
    });
    expect(result.speakers[0]).toMatchObject({ speakerKey: "speaker_0" });
    expect(result.segments[0].words?.[0]).toMatchObject({ text: "Hello", startMs: 0, endMs: 500 });
  });
});
