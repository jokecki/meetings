import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { TranscriptionProvider } from "@prisma/client";
import { getProviderAdapter } from "@/server/providers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const providers = await Promise.all(
    Object.values(TranscriptionProvider).map(async (provider) => {
      const adapter = getProviderAdapter(provider);
      const models = await adapter.listModels();
      return {
        provider,
        models,
      };
    }),
  );

  return NextResponse.json({ data: providers });
}
