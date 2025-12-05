"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { formatDurationShort } from "@/lib/format/time";

type AudioPlayerHandle = {
  seekTo: (ms: number) => void;
};

type AudioPlayerProps = {
  audioUrl: string;
  onTimeUpdate?: (ms: number) => void;
  onReady?: (handle: AudioPlayerHandle) => void;
};

export function AudioPlayer({ audioUrl, onTimeUpdate, onReady }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    if (!containerRef.current) {
      return () => {};
    }

    const instance = WaveSurfer.create({
      container: containerRef.current,
      url: audioUrl,
      waveColor: "#475569",
      progressColor: "#6366f1",
      cursorColor: "#cbd5f5",
      barGap: 2,
      barHeight: 1,
      barRadius: 2,
      barWidth: 2,
      height: 80,
      responsive: true,
    });

    waveSurferRef.current = instance;

    const readyHandler = () => {
      const duration = Math.round((instance.getDuration() || 0) * 1000);
      setIsPlaying(false);
      setCurrentMs(0);
      setDurationMs(duration);
      setIsReady(true);
      onReady?.({
        seekTo: (ms: number) => {
          const clamped = Math.max(0, Math.min(ms, duration || ms));
          instance.setTime(clamped / 1000);
        },
      });
    };

    const timeHandler = () => {
      const position = Math.round(instance.getCurrentTime() * 1000);
      setCurrentMs(position);
      onTimeUpdate?.(position);
    };

    const finishHandler = () => {
      setIsPlaying(false);
      setCurrentMs(durationMs);
    };

    instance.on("ready", readyHandler);
    instance.on("audioprocess", timeHandler);
    instance.on("seek", timeHandler);
    instance.on("finish", finishHandler);

    return () => {
      instance.un("ready", readyHandler);
      instance.un("audioprocess", timeHandler);
      instance.un("seek", timeHandler);
      instance.un("finish", finishHandler);
      instance.destroy();
      waveSurferRef.current = null;
    };
  }, [audioUrl, onReady, onTimeUpdate, durationMs]);

  const togglePlay = () => {
    if (!waveSurferRef.current || !isReady) {
      return;
    }
    waveSurferRef.current.playPause();
    setIsPlaying(waveSurferRef.current.isPlaying());
  };

  const currentLabel = useMemo(() => formatDurationShort(currentMs), [currentMs]);
  const durationLabel = useMemo(() => formatDurationShort(durationMs), [durationMs]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!isReady}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          <span className="text-lg leading-none">{isPlaying ? "❚❚" : "▶"}</span>
        </button>
        <span className="text-xs text-slate-300">
          {currentLabel} / {durationLabel}
        </span>
      </div>
      <div ref={containerRef} className="mt-4 w-full" />
      {!isReady && (
        <p className="mt-2 text-xs text-slate-500">Chargement de l’onde...</p>
      )}
    </div>
  );
}
