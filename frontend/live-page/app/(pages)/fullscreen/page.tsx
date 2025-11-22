"use client";

import {
  fetchSchedule,
  fetchTimer,
  type ScheduleResponse,
  type TimerResponse,
} from "@/lib/api";
import { DEFAULT_TIMEZONE, HACKATHON_END, HACKATHON_START } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import React, { useMemo, useState, useEffect } from "react";

type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  description?: string;
};

const SUBMISSION_DEADLINE = HACKATHON_END;
const SCHEDULE_REFRESH_MS = 5 * 60 * 1000;
const MOBILE_FULLSCREEN_BREAKPOINT = 1024;

const DAY_NAME_TO_OFFSET: Record<string, number> = {
  Wednesday: -3,
  Thursday: -2,
  Friday: -1,
  Saturday: 0,
  Sunday: 1,
  Monday: 2,
};

function buildScheduleEvents(schedule: ScheduleResponse): EventItem[] {
  const events: EventItem[] = [];

  for (const [day, entries] of Object.entries(schedule)) {
    const offset = DAY_NAME_TO_OFFSET[day] ?? 0;
    const baseDate = new Date(HACKATHON_START.getTime());
    baseDate.setDate(baseDate.getDate() + offset);

    entries.forEach((entry, index) => {
      const [h, m] = (entry.start ?? "00:00").split(":");
      const hours = Number(h) || 0;
      const minutes = Number(m) || 0;
      const startDate = new Date(baseDate.getTime());
      startDate.setHours(hours, minutes, 0, 0);

      events.push({
        id: `${day}-${index}-${entry.start ?? "00:00"}`,
        title: entry.title ?? entry.Title ?? "Activitat",
        date: startDate.toISOString(),
        location: entry.location ?? "Ubicació pendent",
        description: entry.description ?? entry.Description ?? undefined,
      });
    });
  }

  return events.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

function useCountdownFromSeconds(targetSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor(targetSeconds))
  );
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setSecondsLeft(Math.max(0, Math.floor(targetSeconds)));
  }, [targetSeconds]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [targetSeconds]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return { days, hours, minutes, seconds, totalSeconds: secondsLeft, now };
}

export default function FullscreenMinimal() {
  const [timerData, setTimerData] = useState<TimerResponse | null>(null);
  const [scheduleEvents, setScheduleEvents] = useState<EventItem[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < MOBILE_FULLSCREEN_BREAKPOINT);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (isMobile === null || isMobile) {
      return;
    }
    let ignore = false;
    let isFetching = false;

    const loadTimer = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const data = await fetchTimer();
        if (!ignore) {
          setTimerData(data);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error carregant el temporitzador oficial:", error);
        }
      } finally {
        isFetching = false;
      }
    };

    loadTimer();
    const interval = setInterval(loadTimer, 60_000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile === null || isMobile) {
      return;
    }
    let ignore = false;
    let isFetching = false;

    const loadSchedule = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const data = await fetchSchedule();
        if (!ignore) {
          setScheduleEvents(buildScheduleEvents(data));
          setScheduleError(null);
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Error desconegut";
          setScheduleError(`No s'ha pogut carregar l'horari (${message})`);
          console.error("Error carregant l'horari oficial:", error);
        }
      } finally {
        isFetching = false;
      }
    };

    loadSchedule();
    const interval = setInterval(loadSchedule, SCHEDULE_REFRESH_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [isMobile]);

  const fallbackSeconds = useMemo(
    () =>
      Math.max(
        0,
        Math.floor((SUBMISSION_DEADLINE.getTime() - Date.now()) / 1000)
      ),
    []
  );
  const countdownTargetSeconds = useMemo(() => {
    if (!timerData) {
      return fallbackSeconds;
    }
    if (timerData.status === "pending") {
      return timerData.seconds_until_start + timerData.seconds_remaining;
    }
    if (timerData.status === "running") {
      return timerData.seconds_remaining;
    }
    return 0;
  }, [fallbackSeconds, timerData]);
  const countdown = useCountdownFromSeconds(countdownTargetSeconds);
  const now = countdown.now;
  const countdownHeading = useMemo(() => {
    if (!timerData) {
      return "Temps restant";
    }
    if (timerData.status === "pending") {
      return "Compte enrere";
    }
    if (timerData.status === "finished") {
      return "Hackathon finalitzat";
    }
    return "Temps restant";
  }, [timerData]);
  const { formattedEvents, remainingEvents } = useMemo(() => {
    const nowTimestamp = now.getTime();
    const sourceEvents = scheduleEvents.length > 0 ? scheduleEvents : null;
    const futureEvents = [...(sourceEvents ?? [])]
      .map((event) => {
        const dateObj = new Date(event.date);
        return { ...event, dateObj };
      })
      .filter((event) => event.dateObj.getTime() >= nowTimestamp)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    const limitedEvents = futureEvents.slice(0, 4).map((event) => ({
      ...event,
      readableDate: new Intl.DateTimeFormat("ca-ES", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: DEFAULT_TIMEZONE,
      }).format(event.dateObj),
    }));

    return {
      formattedEvents: limitedEvents,
      remainingEvents: futureEvents.length - limitedEvents.length,
    };
  }, [now, scheduleEvents]);

  const formatTimeLeft = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [
      hours > 0 ? String(hours).padStart(2, "0") : null,
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].filter(Boolean);
    return parts.join(":");
  };

  const nextEvent = formattedEvents[0];
  const nextEventDiffMs = nextEvent
    ? nextEvent.dateObj.getTime() - now.getTime()
    : null;
  const showNextEventCountdown =
    nextEventDiffMs !== null &&
    nextEventDiffMs > 0 &&
    nextEventDiffMs <= 30 * 60 * 1000;
  const nextEventCountdownText =
    showNextEventCountdown && nextEventDiffMs !== null
      ? formatTimeLeft(nextEventDiffMs)
      : null;

  const countdownBlocks = [
    { label: "Dies", value: countdown.days },
    { label: "Hores", value: countdown.hours },
    { label: "Min", value: countdown.minutes },
    { label: "Seg", value: countdown.seconds },
  ];

  if (isMobile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cta text-primary">
        Carregant visualització…
      </div>
    );
  }

  if (isMobile) {
    return <MobileFullscreenNotice />;
  }

  return (
    <div className="fixed inset-0 z-[50] bg-[#f7e7c3] text-white">
      <style jsx global>{`
        @keyframes boat-drift {
          0% {
            transform: translateX(-20%) translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateX(20%) translateY(-8px) rotate(1deg);
          }
          100% {
            transform: translateX(-20%) translateY(0) rotate(-1deg);
          }
        }
        @keyframes subtle-wave {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes island-bob {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes ship-sail {
          0% {
            transform: translate3d(-40vw, -10px, 0) rotate(-3deg);
            opacity: 0;
          }
          2% {
            opacity: 1;
          }
          8% {
            transform: translate3d(55vw, 6px, 0) rotate(2deg);
            opacity: 1;
          }
          10% {
            transform: translate3d(70vw, 12px, 0) rotate(4deg);
            opacity: 0;
          }
          100% {
            transform: translate3d(70vw, 12px, 0) rotate(4deg);
            opacity: 0;
          }
        }
        @keyframes crab-diagonal {
          0% {
            transform: translate3d(-220px, 60px, 0) rotate(-8deg);
            opacity: 0;
          }
          2% {
            transform: translate3d(-40px, -10px, 0) rotate(-2deg);
            opacity: 1;
          }
          6% {
            transform: translate3d(120px, 40px, 0) rotate(6deg);
            opacity: 1;
          }
          8.5% {
            transform: translate3d(240px, 110px, 0) rotate(10deg);
            opacity: 1;
          }
          9% {
            opacity: 0;
          }
          100% {
            transform: translate3d(420px, 160px, 0) rotate(15deg);
            opacity: 0;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 ">
          <Image
            src="/background/ona_blava.webp"
            alt="Ona blava invertida"
            fill
            sizes="100vw"
            priority
            // Girar 60 grados
            className="object-cover object-left-top scale-x-[1.4] scale-y-[1.6] select-none rotate-[-30deg] -translate-y-50 -translate-x-30"
          />
        </div>
        <div className="absolute bottom-4 left-2 w-[540px] max-w-[55vw] sm:left-12">
          <Image
            src="/duck_animation.webp"
            alt="Ona blava al primer pla"
            width={800}
            height={200}
            priority
            className="h-auto w-full select-none drop-shadow-2xl scale-x-[-1] -translate-y-10"
          />
        </div>
        <div className="absolute bottom-16 right-10 w-[160px] sm:w-[210px]">
          <Image
            src="/animals/crab.webp"
            alt="Cranc caminant per la sorra"
            width={260}
            height={200}
            priority
            className="h-auto w-full select-none drop-shadow-lg"
            style={{ animation: "crab-diagonal 120s linear infinite" }}
          />
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between px-8 py-10">
        <div className="flex items-center justify-between text-sm uppercase tracking-[0.4em] text-cta/70">
          <span>HackEPS 2025</span>
          <Link
            href="/"
            className="rounded-full border border-white/30 px-4 py-2 text-xs tracking-[0.3em] text-white transition hover:border-white"
          >
            Sortir
          </Link>
        </div>

        <div className="grid flex-1 items-start gap-12 pb-16 pt-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <div className="space-y-3">
              <h1 className="text-5xl font-semibold leading-tight md:text-6xl text-cta">
                {countdownHeading}
              </h1>
            </div>
            <div className="flex flex-wrap gap-4">
              {countdownBlocks.map((block) => (
                <div
                  key={block.label}
                  className="flex min-w-[120px] flex-1 flex-col items-center rounded-3xl border border-white/20 bg-white/5 px-6 py-5 text-center backdrop-blur-xl"
                >
                  <span className="text-5xl font-bold tabular-nums text-cta">
                    {String(block.value).padStart(2, "0")}
                  </span>
                  <span className="mt-2 text-xs uppercase tracking-[0.5em] text-cta/60">
                    {block.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5 rounded-[32px] border border-white/15 bg-white/5 p-6 backdrop-blur-xl">
            <div>
              <h2 className="text-2xl font-semibold text-cta">
              Què queda per fer?
              </h2>
              {scheduleError && (
                <p className="mt-1 text-xs text-red-200">{scheduleError}</p>
              )}
            </div>
            <div className="space-y-4">
              {formattedEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-cta/90"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-semibold">{event.title}</p>
                    <span className="font-mono text-xs uppercase tracking-[0.3em] text-cta/60">
                      {event.readableDate}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-[0.4em] text-cta/50">
                    {event.location}
                  </p>
                  {event.description && (
                    <p className="mt-2 text-sm text-cta/70">
                      {event.description}
                    </p>
                  )}
                  {showNextEventCountdown &&
                    nextEvent &&
                    nextEvent.id === event.id &&
                    nextEventCountdownText && (
                      <p className="mt-3 inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                        Comença en {nextEventCountdownText}
                      </p>
                    )}
                </div>
              ))}
              {formattedEvents.length === 0 && (
                <p className="text-sm text-cta/70">
                  Ja no queda cap activitat programada.
                </p>
              )}
              {remainingEvents > 0 && (
                <p className="text-xs uppercase tracking-[0.35em] text-cta/60">
                  + {remainingEvents} esdeveniments més
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MobileFullscreenNotice() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cta px-6 text-center text-primary">
      <div className="max-w-md space-y-5">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Disponible només en desktop
        </h1>
        <p className="text-base text-primary/80 sm:text-lg">
          La vista a pantalla completa està optimitzada per pantalles grans.
          Obre-la des dun ordinador o projector per continuar.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-primary/40 px-6 py-2 font-medium transition hover:bg-primary/10"
        >
          Tornar al inici
        </Link>
      </div>
    </div>
  );
}
