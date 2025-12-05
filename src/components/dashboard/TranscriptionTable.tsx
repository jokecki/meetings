"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Transcription } from "@/lib/api/types";
import { providerLabel, type TranscriptionProviderValue } from "@/lib/constants/transcription";
import { StatusBadge } from "./StatusBadge";

type Props = {
  items: Transcription[];
  isLoading: boolean;
};

function formatRelativeDate(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { locale: fr, addSuffix: true });
  } catch {
    return "";
  }
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return "—";
  }
  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

type GroupedItems = {
  inProgress: Transcription[];
  completed: Transcription[];
};

const IN_PROGRESS_STATUSES = ["PENDING", "UPLOADING", "PROCESSING"] as const;

const groupItems = (items: Transcription[]): GroupedItems => {
  return items.reduce<GroupedItems>(
    (acc, item) => {
      if ((IN_PROGRESS_STATUSES as readonly string[]).includes(item.status)) {
        acc.inProgress.push(item);
      } else {
        acc.completed.push(item);
      }
      return acc;
    },
    { inProgress: [], completed: [] },
  );
};

export function TranscriptionTable({ items, isLoading }: Props) {
  const grouped = groupItems(items);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">File d’attente</h2>
          <span className="text-xs text-slate-400">Actualisation toutes les 5s</span>
        </header>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Fichier</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Modèle</th>
                <th className="px-4 py-3">Durée</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Créée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && grouped.inProgress.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Chargement...
                  </td>
                </tr>
              ) : grouped.inProgress.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Aucune transcription en cours.
                  </td>
                </tr>
              ) : (
                grouped.inProgress.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-900/60">
                    <td className="px-4 py-3 text-slate-200">{item.audioAsset?.fileName ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{providerLabel(item.provider as TranscriptionProviderValue)}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{item.model ?? "Auto"}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{formatDuration(item.durationSeconds)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{formatRelativeDate(item.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Historique</h2>
          <span className="text-xs text-slate-400">{grouped.completed.length} transcription(s)</span>
        </header>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Titre</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Durée</th>
                <th className="px-4 py-3">Confiance</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && grouped.completed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Chargement...
                  </td>
                </tr>
              ) : grouped.completed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Aucun historique pour le moment.
                  </td>
                </tr>
              ) : (
                grouped.completed.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-900/60">
                    <td className="px-4 py-3 text-slate-200">
                      <div className="flex flex-col">
                        <span>{item.title ?? item.audioAsset?.fileName ?? "Sans titre"}</span>
                        <span className="text-xs text-slate-500">{formatRelativeDate(item.completedAt ?? item.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{providerLabel(item.provider as TranscriptionProviderValue)}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{formatDuration(item.durationSeconds)}</td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {item.confidence ? `${Math.round(item.confidence * 100)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/api/transcriptions/${item.id}/export?format=txt`}
                          className="text-xs font-medium text-indigo-300 hover:text-indigo-100"
                        >
                          .txt
                        </Link>
                        <Link
                          href={`/api/transcriptions/${item.id}/export?format=docx`}
                          className="text-xs font-medium text-indigo-300 hover:text-indigo-100"
                        >
                          .docx
                        </Link>
                        <Link
                          href={`/app/transcriptions/${item.id}`}
                          className="text-xs font-medium text-slate-300 hover:text-white"
                        >
                          Détails
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
