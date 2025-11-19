"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * LIVE PAGE — Vertical Timeline (hardcoded while backend is WIP)
 * - Vertical timeline a la izquierda, pato decorativo a la derecha
 * - Destaca actividad en curso con color/animación
 * - Bip al cambiar actividad (con permiso del usuario)
 */

type Activity = {
  id: string;
  title: string;
  subtitle?: string;
  start: string; // HH:MM (24h)
  end: string;   // HH:MM (24h)
};

type DayBlock = {
  key: "dissabte" | "diumenge";
  label: string;
  activities: Activity[];
};

// ========= HARD-CODED SCHEDULE =========
const SCHEDULE: DayBlock[] = [
  {
    key: "dissabte",
    label: "Dissabte",
    activities: [
      { id: "sat-checkin", title: "Check-in", start: "08:30", end: "09:30" },
      { id: "sat-opening", title: "Acte d’Inauguració", subtitle: "Inici del hacking", start: "10:00", end: "11:00" },
      { id: "sat-lunch", title: "Dinar", start: "13:00", end: "14:30" },
      { id: "sat-act1", title: "Activitat 1", start: "17:00", end: "19:00" },
      { id: "sat-act2", title: "Activitat 2", start: "19:00", end: "20:30" },
      { id: "sat-dinner", title: "Sopar", start: "20:30", end: "22:00" },
    ],
  },
  {
    key: "diumenge",
    label: "Diumenge",
    activities: [
      { id: "sun-breakfast", title: "Esmorzar", start: "08:30", end: "09:30" },
      { id: "sun-act3", title: "Activitat 3", start: "10:00", end: "11:00" },
      { id: "sun-hacking-end", title: "Finalització del hacking", start: "11:00", end: "13:00" },
      { id: "sun-present", title: "Presentació del projectes", start: "13:00", end: "14:30" },
      { id: "sun-closing", title: "Acte de cloenda", start: "14:30", end: "15:00" },
      { id: "sun-lunch", title: "Dinar", start: "15:00", end: "16:00" },
    ],
  },
];

// ========= HELPERS =========
function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function dayKeyToday(): DayBlock["key"] | null {
  const d = new Date();
  const dow = d.getDay(); // 0=Dom, 6=Sáb
  if (dow === 6) return "dissabte";
  if (dow === 0) return "diumenge";
  return null;
}

function useTicker(ms = 1000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

// Pequeño beep (WebAudio) cuando cambia actividad
type BrowserWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

function useBeepPermission() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);
  const enable = () => {
    if (!ctxRef.current) {
      if (typeof window === "undefined") return;
      const extendedWindow = window as BrowserWindow;
      const AudioCtor = extendedWindow.AudioContext ?? extendedWindow.webkitAudioContext;
      if (!AudioCtor) return;
      ctxRef.current = new AudioCtor();
    }
    setEnabled(true);
  };
  const beep = () => {
    if (!enabled) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880; // Hz
    g.gain.value = 0.001; // volumen bajo
    o.connect(g).connect(ctx.destination);
    o.start();
    // envolvente corta
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.stop(ctx.currentTime + 0.2);
  };
  return { enabled, enable, beep };
}

// ========= TIMELINE ITEM =========
function TimelineItem({ a, active }: { a: Activity; active: boolean }) {
  return (
    <li className="relative pl-9 py-4">
      {/* Línea vertical */}
      <span className="absolute left-3 top-0 h-full w-px bg-neutral-300" />
      {/* Punto */}
      <span
        className={
          "absolute left-1.5 top-5 h-3.5 w-3.5 rounded-full border-2 " +
          (active ? "bg-amber-400 border-amber-500 animate-pulse" : "bg-white border-neutral-400")
        }
      />
      {/* Contenido */}
      <div
        className={
          "rounded-lg pr-4 transition-colors " +
          (active ? "bg-amber-50 ring-1 ring-amber-300" : "bg-white/0")
        }
      >
        <div className="text-xs md:text-sm tabular-nums text-neutral-600">
          {a.start} – {a.end}
        </div>
        <div className="text-base md:text-lg font-semibold text-neutral-900 flex items-center gap-2">
          {a.title}
          {active && (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] md:text-xs text-white">
              Ara
            </span>
          )}
        </div>
        {a.subtitle && (
          <p className="text-sm text-neutral-700 mt-1">{a.subtitle}</p>
        )}
      </div>
    </li>
  );
}

// ========= PAGE =========
export default function LivePage() {
  useTicker(1000); // refresca cada segundo
  const nowMin = minutesNow();
  const todayKey = dayKeyToday();
  const { enabled, enable, beep } = useBeepPermission();
  const lastActiveRef = useRef<string | null>(null);

  // Calcula actividad activa por día
  const activeByDay = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const day of SCHEDULE) {
      const current = day.activities.find((a) => nowMin >= hmToMinutes(a.start) && nowMin < hmToMinutes(a.end));
      map[day.key] = current?.id ?? null;
    }
    return map as Record<DayBlock["key"], string | null>;
  }, [nowMin]);

  // Sonido cuando cambia la actividad activa del día actual
  useEffect(() => {
    if (!todayKey) return;
    const currentActive = activeByDay[todayKey];
    if (currentActive && lastActiveRef.current !== currentActive) {
      beep();
      lastActiveRef.current = currentActive;
    }
  }, [activeByDay, todayKey, beep]);

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8">
      {/* Layout: izquierda timeline, derecha pato */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-6">
        {/* Columna izquierda: timeline */}
        <div>
          <h1 className="text-5xl font-bold text-primary/90 tracking-wide mb-6">Live</h1>

          {!enabled && (
            <div className="mb-4">
              <button
                onClick={enable}
                className="rounded-full bg-amber-500 text-white px-4 py-2 text-sm hover:bg-amber-600 transition"
              >
                Activar sonido de actividades
              </button>
            </div>
          )}

          {SCHEDULE.map((day) => (
            <section key={day.key} className="mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-2">{day.label}</h2>
              <ul className="relative">
                {/* Línea vertebral del día */}
                <span className="absolute left-3 top-0 bottom-0 w-px bg-neutral-300" />
                {day.activities.map((a) => (
                  <TimelineItem key={a.id} a={a} active={activeByDay[day.key] === a.id} />
                ))}
              </ul>

              {/* Próxima actividad (solo si es hoy) */}
              {todayKey === day.key && (
                <NextUp day={day} nowMin={nowMin} activeId={activeByDay[day.key]} />
              )}
            </section>
          ))}
        </div>

        {/* Columna derecha: pato decorativo */}
        <div className="relative hidden md:block">
          <div className="sticky top-24">
            <Image
              src="/animals/duck.webp" // coloca tu pato en public/background/duck_live.png
              alt="Pato pirata"
              width={420}
              height={520}
              className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NextUp({ day, nowMin, activeId }: { day: DayBlock; nowMin: number; activeId: string | null }) {
  const upcoming = useMemo(() => {
    return day.activities.find((a) => hmToMinutes(a.start) > nowMin) || null;
  }, [day, nowMin]);

  if (!upcoming || activeId === upcoming.id) return null;

  return (
    <div className="mt-4 ml-9 rounded-lg bg-primary/5 p-4 ring-1 ring-primary/10">
      <p className="text-sm text-neutral-700">Pròxim</p>
      <p className="text-lg font-semibold text-neutral-900">
        {upcoming.title}
        {upcoming.subtitle ? <span className="text-neutral-600 font-normal"> — {upcoming.subtitle}</span> : null}
      </p>
      <p className="text-sm tabular-nums text-neutral-600">{upcoming.start} – {upcoming.end}</p>
    </div>
  );
}
