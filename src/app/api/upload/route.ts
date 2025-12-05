import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { serverEnv } from "@/env/server";
import { StorageProvider } from "@/generated/prisma";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 1024 * 1024 * 1024; // ~1 Go

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const durationSecondsRaw = formData.get("durationSeconds");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (>1Go)" }, { status: 400 });
  }

  let durationSeconds: number | null = null;
  if (typeof durationSecondsRaw === "string" && durationSecondsRaw.trim().length > 0) {
    const parsed = Number(durationSecondsRaw);
    if (!Number.isNaN(parsed) && parsed > 0) {
      durationSeconds = Math.round(parsed);
    }
  }

  if (serverEnv.STORAGE_PROVIDER !== "VERCEL_BLOB") {
    return NextResponse.json({ error: "Storage provider non supporté" }, { status: 400 });
  }

  const objectKey = `audio/${session.user.id}/${Date.now()}-${file.name}`;

  const blob = await put(objectKey, file, {
    access: "public",
    token: serverEnv.BLOB_READ_WRITE_TOKEN,
    contentType: file.type,
  });

  const audioAsset = await prisma.audioAsset.create({
    data: {
      userId: session.user.id,
      storageProvider: StorageProvider.VERCEL_BLOB,
      fileUrl: blob.url,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      durationSeconds,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
    },
  });

  return NextResponse.json({ data: audioAsset }, { status: 201 });
}
