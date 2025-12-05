import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { authOptions } from "@/lib/auth/options";
import { getTranscriptionWithSegments } from "@/server/services/transcriptionService";

export const runtime = "nodejs";

function formatTimestamp(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function buildTextExport(transcription: Awaited<ReturnType<typeof getTranscriptionWithSegments>>) {
  if (!transcription) return "";
  const speakerMap = new Map(
    transcription.speakers.map((speaker) => [speaker.id, speaker.displayName ?? speaker.speakerKey]),
  );
  const lines = transcription.segments.map((segment) => {
    const speakerName = segment.speakerId
      ? speakerMap.get(segment.speakerId) ?? "Speaker"
      : segment.speakerKey ?? "Speaker";
    const timestamp = formatTimestamp(segment.startMs);
    return `${speakerName} – ${timestamp} – ${segment.text}`;
  });
  return lines.join("\n");
}

async function buildDocxBuffer(transcription: Awaited<ReturnType<typeof getTranscriptionWithSegments>>) {
  if (!transcription) {
    return Buffer.from([]);
  }

  const speakerMap = new Map(
    transcription.speakers.map((speaker) => [speaker.id, speaker.displayName ?? speaker.speakerKey]),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: transcription.segments.map((segment) => {
          const speakerName = segment.speakerId
            ? speakerMap.get(segment.speakerId) ?? "Speaker"
            : segment.speakerKey ?? "Speaker";
          const timestamp = formatTimestamp(segment.startMs);
          return new Paragraph({
            children: [
              new TextRun({ text: `${speakerName} – ${timestamp} – `, bold: true }),
              new TextRun(segment.text),
            ],
          });
        }),
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const transcription = await getTranscriptionWithSegments(params.id, session.user.id);
  if (!transcription) {
    return NextResponse.json({ error: "Transcription introuvable" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "txt";

  if (format === "docx") {
    const buffer = await buildDocxBuffer(transcription);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=transcription-${transcription.id}.docx`,
      },
    });
  }

  const text = buildTextExport(transcription);
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=transcription-${transcription.id}.txt`,
    },
  });
}
