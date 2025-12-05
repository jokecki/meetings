import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/server/utils/encryption";
import { TranscriptionProvider } from "@/generated/prisma";

const saveSchema = z.object({
  provider: z.nativeEnum(TranscriptionProvider),
  apiKey: z.string().min(10),
  nickname: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      nickname: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: keys });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { cipherText, nonce } = await encryptSecret(parsed.data.apiKey);

  const apiKey = await prisma.apiKey.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: parsed.data.provider,
      },
    },
    update: {
      encrypted: cipherText,
      nonce,
      nickname: parsed.data.nickname,
    },
    create: {
      userId: session.user.id,
      provider: parsed.data.provider,
      encrypted: cipherText,
      nonce,
      nickname: parsed.data.nickname,
    },
  });

  return NextResponse.json({ data: apiKey }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get("provider");
  if (!providerParam) {
    return NextResponse.json({ error: "provider requis" }, { status: 400 });
  }

  const provider = providerParam.toUpperCase() as keyof typeof TranscriptionProvider;
  if (!TranscriptionProvider[provider]) {
    return NextResponse.json({ error: "provider invalide" }, { status: 400 });
  }

  await prisma.apiKey.deleteMany({
    where: {
      userId: session.user.id,
      provider: TranscriptionProvider[provider],
    },
  });

  return NextResponse.json({ success: true });
}
