import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchTimer, type TimerResponse } from "@/lib/api";
import { HACKATHON_END } from "@/lib/constants";

// Manual offset requested: subtract 3 hours from the countdown
const MANUAL_OFFSET_SECONDS = 4 * 3600;

type CountdownStats = {
  seconds: number;
  days: number;
  hours: number;
  minutes: number;
  secondsRemainder: number;
};

type UseOfficialTimerOptions = {
  pollEveryMs?: number;
  fallbackTarget?: Date;
};

export function useOfficialTimer({
  pollEveryMs = 60_000,
  fallbackTarget = HACKATHON_END,
}: UseOfficialTimerOptions = {}) {
  const [timer, setTimer] = useState<TimerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchTimer();
      setTimer(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollEveryMs);
    return () => clearInterval(id);
  }, [pollEveryMs, refresh]);

  const computeSeconds = useCallback(
    (source: TimerResponse | null) => {
      let baseSeconds: number | null = null;
      if (source) {
        if (source.status === "finished") return 0;
        const endMs = Date.parse(source.end_datetime);
        const nowMs = Date.parse(source.now);
        if (!Number.isNaN(endMs) && !Number.isNaN(nowMs)) {
          baseSeconds = Math.max(0, Math.floor((endMs - nowMs) / 1000));
        }
        if (!Number.isNaN(endMs)) {
          baseSeconds = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        }
      }
      if (baseSeconds === null) {
        if (!fallbackTarget) return 0;
        baseSeconds = Math.max(0, Math.floor((fallbackTarget.getTime() - Date.now()) / 1000));
      }
      return Math.max(0, baseSeconds - MANUAL_OFFSET_SECONDS);
    },
    [fallbackTarget]
  );

  const countdownSeconds = useMemo(() => {
    return computeSeconds(timer);
  }, [computeSeconds, timer]);

  const [seconds, setSeconds] = useState<number>(() => computeSeconds(null));
  useEffect(() => {
    setSeconds(countdownSeconds);
  }, [countdownSeconds]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const breakdown: CountdownStats = useMemo(() => {
    const safeSeconds = Math.max(0, seconds);
    const days = Math.floor(safeSeconds / 86_400);
    const hours = Math.floor((safeSeconds % 86_400) / 3_600);
    const minutes = Math.floor((safeSeconds % 3_600) / 60);
    const secondsRemainder = safeSeconds % 60;
    return { seconds: safeSeconds, days, hours, minutes, secondsRemainder };
  }, [seconds]);

  return {
    timer,
    error,
    loaded,
    refresh,
    countdown: breakdown,
  };
}
