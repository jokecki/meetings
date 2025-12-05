"use client";

import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import type { ProviderModels } from "@/lib/api/types";
import {
  TRANSCRIPTION_PROVIDERS,
  type TranscriptionProviderValue,
} from "@/lib/constants/transcription";

type ProviderKeyStatus = Record<TranscriptionProviderValue, boolean>;

type UploadCardProps = {
  providers: ProviderModels[];
  providerHasKey: ProviderKeyStatus;
  onRequestTranscription: (payload: {
    audioAssetId: string;
    provider: TranscriptionProviderValue;
    model?: string;
    prompt?: string;
    language?: string;
    diarize: boolean;
  }) => Promise<void>;
};

type UploadState = "idle" | "uploading" | "creating" | "success" | "error";

const ACCEPTED_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/webm"];

export function UploadCard({ providers, providerHasKey, onRequestTranscription }: UploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<TranscriptionProviderValue>(TRANSCRIPTION_PROVIDERS[0]);
  const [model, setModel] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [diarize, setDiarize] = useState(true);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const modelsForProvider = useMemo(() => {
    return providers.find((item) => item.provider === provider)?.models ?? [];
  }, [providers, provider]);

  const isProviderReady = providerHasKey[provider] ?? false;

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Format audio non supporté");
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  }, []);

  const resetForm = useCallback(() => {
    setFile(null);
    setProgress(0);
    setState("idle");
    setPrompt("");
    setLanguage("");
  }, []);

  const uploadFile = useCallback(
    async (audioFile: File) =>
      new Promise<{ audioAssetId: string }>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", audioFile);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({ audioAssetId: response.data.id as string });
            } catch {
              reject(new Error("Réponse inattendue du serveur"));
            }
          } else {
            reject(new Error(`Échec de l'upload (${xhr.status})`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Erreur réseau pendant l'upload"));
        };

        xhr.send(formData);
      }),
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);

      if (!file) {
        setError("Merci de sélectionner un fichier audio");
        return;
      }

      if (!isProviderReady) {
        setError("Configure la clé API du fournisseur dans les paramètres avant de lancer une transcription");
        return;
      }

      if (file.size === 0) {
        setError("Fichier vide");
        return;
      }

      if (file.size > 1_500_000_000) {
        setError("Fichier trop volumineux (limite ~1,5Go)");
        return;
      }

      setState("uploading");
      try {
        const { audioAssetId } = await uploadFile(file);
        setState("creating");
        await onRequestTranscription({
          audioAssetId,
          provider,
          model: model || undefined,
          prompt: prompt || undefined,
          language: language || undefined,
          diarize,
        });
        setState("success");
        resetForm();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inattendue";
        setError(message);
        setState("error");
      }
    },
    [file, isProviderReady, uploadFile, onRequestTranscription, provider, model, prompt, language, diarize, resetForm],
  );

  const statusMessage = useMemo(() => {
    switch (state) {
      case "uploading":
        return "Upload du fichier en cours...";
      case "creating":
        return "Création de la transcription...";
      case "success":
        return "Transcription ajoutée à la file";
      case "error":
        return error ?? "Erreur";
      default:
        return null;
    }
  }, [state, error]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Nouvelle transcription</h2>
          <p className="text-sm text-slate-300">
            Charge un fichier audio (max 3h) et choisis le fournisseur de transcription.
          </p>
        </div>
        <p className="text-xs text-slate-400">Types acceptés: mp3, m4a, wav, webm</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/40 text-sm text-slate-300 transition hover:border-indigo-400">
            <input type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={handleFileChange} />
            {file ? (
              <>
                <span className="font-medium text-white">{file.name}</span>
                <span className="text-xs text-slate-400">{(file.size / 1_000_000).toFixed(1)} Mo</span>
              </>
            ) : (
              <>
                <span className="font-medium text-white">Déposer ou sélectionner un fichier</span>
                <span className="text-xs text-slate-400">Max 3 heures</span>
              </>
            )}
          </label>

          <div className="grid gap-3 text-sm">
            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">Fournisseur</label>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as TranscriptionProviderValue)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {providers.map((item) => (
                  <option key={item.provider} value={item.provider}>
                    {item.provider}
                  </option>
                ))}
              </select>
              {!isProviderReady && (
                <p className="text-xs text-amber-300">
                  Configure une clé API valide pour ce fournisseur avant de lancer une transcription.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">Modèle</label>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Automatique</option>
                {modelsForProvider.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">
                Langue (optionnel)
              </label>
              <input
                type="text"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder="fr, en, auto..."
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="diarize"
                type="checkbox"
                checked={diarize}
                onChange={(event) => setDiarize(event.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
              />
              <label htmlFor="diarize" className="text-xs text-slate-300">
                Activer la diarisation (qui parle)
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">
            Prompt personnalisé (optionnel)
          </label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Contexte, glossaire, style..."
            rows={3}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {statusMessage && (
          <div
            className={clsx(
              "rounded-md border px-3 py-2 text-sm",
              state === "error"
                ? "border-rose-600/60 bg-rose-900/40 text-rose-200"
                : "border-indigo-600/60 bg-indigo-900/40 text-indigo-100",
            )}
          >
            {statusMessage}
          </div>
        )}

        {state === "uploading" && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={state === "uploading" || state === "creating"}
            className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-900"
          >
            {state === "uploading" ? "Upload..." : state === "creating" ? "Création..." : "Lancer la transcription"}
          </button>
        </div>
      </form>
    </section>
  );
}
