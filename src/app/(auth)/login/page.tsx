import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion | Transcription App",
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900/80 p-8 shadow-xl ring-1 ring-white/10">
        <h1 className="text-2xl font-semibold text-white">Connexion</h1>
        <p className="mt-2 text-sm text-slate-300">
          Accède à ton espace de transcription sécurisé.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
