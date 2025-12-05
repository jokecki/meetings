import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import { renameSpeaker } from "@/server/services/transcriptionService";

const schema = z.object({
  displayName: z.string().min(1).max(100),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; speakerId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const speaker = await renameSpeaker(params.id, params.speakerId, parsed.data.displayName);
    return NextResponse.json({ data: speaker });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
