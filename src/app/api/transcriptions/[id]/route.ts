import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import {
  getTranscriptionWithSegments,
  updateTranscriptionMetadata,
} from "@/server/services/transcriptionService";
import { serializeTranscriptionDetail } from "@/server/serializers/transcription";

const updateSchema = z
  .object({
    title: z.string().max(200).optional().nullable(),
    customPrompt: z.string().max(4000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucun champ à mettre à jour",
  });

export async function GET(
  _request: Request,
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

  return NextResponse.json({ data: serializeTranscriptionDetail(transcription) });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await updateTranscriptionMetadata(params.id, session.user.id, parsed.data);
    const transcription = await getTranscriptionWithSegments(params.id, session.user.id);
    if (!transcription) {
      return NextResponse.json({ error: "Transcription introuvable" }, { status: 404 });
    }
    return NextResponse.json({ data: serializeTranscriptionDetail(transcription) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
