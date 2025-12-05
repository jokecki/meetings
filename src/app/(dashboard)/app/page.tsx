import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">
          Bonjour {session?.user.name ?? session?.user.email ?? "Admin"}
        </h1>
        <p className="text-sm text-slate-300">
          Gère tes transcriptions, suis la progression et configure les fournisseurs d’API.
        </p>
      </header>

      <DashboardShell />
    </div>
  );
}
