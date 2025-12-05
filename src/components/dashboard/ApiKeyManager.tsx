"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ApiKeySummary } from "@/lib/api/types";
import {
  providerLabel,
  TRANSCRIPTION_PROVIDERS,
  type TranscriptionProviderValue,
} from "@/lib/constants/transcription";

type Props = {
  items: ApiKeySummary[];
  isLoading: boolean;
};

type SavePayload = {
  provider: TranscriptionProviderValue;
  apiKey: string;
  nickname?: string;
};

async function saveApiKey(payload: SavePayload) {
  const response = await apiFetch<{ data: ApiKeySummary }>("/api/settings/keys", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

async function deleteApiKey(provider: TranscriptionProviderValue) {
  await apiFetch("/api/settings/keys?provider=" + provider, {
    method: "DELETE",
  });
}

const PROVIDERS_ORDER = TRANSCRIPTION_PROVIDERS;

export function ApiKeyManager({ items, isLoading }: Props) {
  const queryClient = useQueryClient();
  const [formProvider, setFormProvider] = useState<TranscriptionProviderValue>(PROVIDERS_ORDER[0]);
  const [apiKey, setApiKey] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existingByProvider = useMemo(() => {
    const map = new Map<TranscriptionProviderValue, ApiKeySummary>();
    items.forEach((item) => map.set(item.provider, item));
    return map;
  }, [items]);

  const saveMutation = useMutation({
    mutationFn: saveApiKey,
    onSuccess: () => {
      setApiKey("");
      setNickname("");
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setError(message);
    },
  });

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);

      if (!apiKey || apiKey.length < 8) {
        setError("Clé API trop courte");
        return;
      }

      await saveMutation.mutateAsync({
        provider: formProvider,
        apiKey,
        nickname: nickname || undefined,
      });
    },
    [apiKey, nickname, formProvider, saveMutation],
  );

  const handleDelete = useCallback(
    async (provider: TranscriptionProviderValue) => {
      setError(null);
      await deleteMutation.mutateAsync(provider);
    },
    [deleteMutation],
  );

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-white">Clés API</h2>
        <p className="text-sm text-slate-300">
          Stockées chiffrées côté serveur. Tu peux les modifier à tout moment.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="space-y-1 text-sm">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">
              Fournisseur
            </label>
            <select
              value={formProvider}
              onChange={(event) => setFormProvider(event.target.value as TranscriptionProviderValue)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              {PROVIDERS_ORDER.map((provider) => (
                <option key={provider} value={provider}>
                  {providerLabel(provider)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-sm">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">Clé API</label>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Colle la clé fournie par le service"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">
              Surnom (optionnel)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Prod, Perso, ..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-900"
          >
            {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Clés configurées</h3>
          <ul className="space-y-3 text-sm">
            {isLoading ? (
              <li className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-slate-400">Chargement...</li>
            ) : PROVIDERS_ORDER.map((provider) => {
                const item = existingByProvider.get(provider);
                return (
                  <li
                    key={provider}
                    className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div>
                      <p className="font-medium text-white">{providerLabel(provider)}</p>
                      {item ? (
                        <p className="text-xs text-slate-400">
                          {item.nickname ? `${item.nickname} •` : ""} Mise à jour {new Date(item.updatedAt).toLocaleString("fr-FR")}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-300">Aucune clé enregistrée</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item && (
                        <button
                          onClick={() => handleDelete(provider)}
                          className="rounded-md border border-rose-500/60 px-2 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
                          disabled={deleteMutation.isPending}
                          type="button"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    </section>
  );
}
