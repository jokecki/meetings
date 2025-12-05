import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import {
  createTranscriptionJob,
  listUserTranscriptions,
  processTranscription,
} from "@/server/services/transcriptionService";
import { TranscriptionProvider } from "@/generated/prisma";

const createSchema = z.object({
  audioAssetId: z.string().min(1),
  provider: z.nativeEnum(TranscriptionProvider),
  model: z.string().optional(),
  promptTemplate: z.string().optional(),
  customPrompt: z.string().optional(),
  language: z.string().optional(),
  diarize: z.boolean().optional(),
  additionalConfig: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const items = await listUserTranscriptions(session.user.id, 50);
  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const job = await createTranscriptionJob({
    userId: session.user.id,
    audioAssetId: parsed.data.audioAssetId,
    provider: parsed.data.provider,
    model: parsed.data.model,
    promptTemplate: parsed.data.promptTemplate,
    customPrompt: parsed.data.customPrompt,
    language: parsed.data.language,
    diarize: parsed.data.diarize,
    additionalConfig: parsed.data.additionalConfig,
  });

  processTranscription(job.id).catch((error) => {
    console.error("Échec du traitement de transcription", error);
  });

  return NextResponse.json({ data: job }, { status: 201 });
}
