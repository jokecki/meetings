import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth/options";
import { TranscriptionDetailShell } from "@/components/transcription/TranscriptionDetailShell";
import { getTranscriptionWithSegments } from "@/server/services/transcriptionService";
import { serializeTranscriptionDetail } from "@/server/serializers/transcription";

export default async function TranscriptionDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    notFound();
  }

  const transcription = await getTranscriptionWithSegments(params.id, session.user.id);
  if (!transcription) {
    notFound();
  }

  const serialized = serializeTranscriptionDetail(transcription);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <Link
        href="/app"
        className="inline-flex w-fit items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
      >
        ← Retour au tableau de bord
      </Link>
      <TranscriptionDetailShell transcription={serialized} />
    </div>
  );
}
