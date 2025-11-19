"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Octagon,
  X,
  type LucideIcon,
} from "lucide-react";

import { getApiBaseUrl, type AlertMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type ConnectionState = "connecting" | "open" | "closed";

const MAX_VISIBLE_ALERTS = 3;
const AUTO_DISMISS_MS = 2 * 60 * 1000; // 2 minutes

const LEVEL_META: Record<
  AlertMessage["level"],
  { label: string; icon: LucideIcon; className: string; badgeClass: string }
> = {
  info: {
    label: "Info",
    icon: Info,
    className: "border-sky-400/60 bg-sky-600/30 text-white shadow-sky-900/50",
    badgeClass: "bg-sky-500/40 text-white",
  },
  success: {
    label: "Èxit",
    icon: CheckCircle2,
    className: "border-emerald-400/60 bg-emerald-600/30 text-white shadow-emerald-900/50",
    badgeClass: "bg-emerald-500/40 text-white",
  },
  warning: {
    label: "Avís",
    icon: AlertTriangle,
    className: "border-amber-400/70 bg-amber-600/30 text-white shadow-amber-900/40",
    badgeClass: "bg-amber-500/40 text-white",
  },
  danger: {
    label: "Perill",
    icon: Octagon,
    className: "border-red-500/70 bg-red-700/40 text-white shadow-red-900/60",
    badgeClass: "bg-red-500/60 text-white",
  },
};

const WEBSOCKET_PATH = "/notifications/ws/events";

function buildWsUrl(path: string): string | null {
  try {
    const url = new URL(path, getApiBaseUrl());
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  } catch (error) {
    console.error("Failed to build alerts websocket URL:", error);
    return null;
  }
}

function formatClock(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ca-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  const clearTimer = useCallback((id: string) => {
    const timer = dismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.current.delete(id);
    }
  }, []);

  const removeAlert = useCallback(
    (id: string) => {
      clearTimer(id);
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    },
    [clearTimer]
  );

  const scheduleDismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      const timer = setTimeout(() => removeAlert(id), AUTO_DISMISS_MS);
      dismissTimers.current.set(id, timer);
    },
    [clearTimer, removeAlert]
  );

  const playAlertTone = useCallback(() => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 760;
    gainNode.gain.value = 0.2;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    oscillator.start(now);
    oscillator.stop(now + 1.2);
  }, []);

  const handleIncomingAlert = useCallback(
    (alert: AlertMessage) => {
      setAlerts((prev) => {
        const filtered = prev.filter((item) => item.id !== alert.id);
        return [alert, ...filtered].slice(0, MAX_VISIBLE_ALERTS);
      });
      playAlertTone();
    },
    [playAlertTone]
  );

  useEffect(() => {
    alerts.forEach((alert) => {
      if (!dismissTimers.current.has(alert.id)) {
        scheduleDismiss(alert.id);
      }
    });
  }, [alerts, scheduleDismiss]);

  useEffect(() => {
    const timers = dismissTimers.current;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    const connect = () => {
      if (!mounted) {
        return;
      }
      setConnectionState("connecting");
      const url = buildWsUrl(WEBSOCKET_PATH);
      if (!url) {
        setConnectionState("closed");
        return;
      }

      ws = new WebSocket(url);

      ws.onopen = () => setConnectionState("open");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "alert_history" && Array.isArray(data.payload)) {
            setAlerts(data.payload.slice(0, MAX_VISIBLE_ALERTS));
          } else if (data?.type === "alert" && data.payload) {
            handleIncomingAlert(data.payload as AlertMessage);
          }
        } catch (error) {
          console.warn("Invalid alert message", error);
        }
      };
      ws.onclose = () => {
        setConnectionState("closed");
        if (mounted) {
          reconnectTimer = setTimeout(connect, 4000);
        }
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      ws?.close();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [handleIncomingAlert]);

  const statusLabel = useMemo(() => {
    switch (connectionState) {
      case "open":
        return "Canal d'alertes connectat";
      case "connecting":
        return "Connectant canal d'alertes…";
      default:
        return "Canal d'alertes desconnectat";
    }
  }, [connectionState]);

  if (!alerts.length && connectionState === "open") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col gap-3">
      {alerts.map((alert) => {
        const meta = LEVEL_META[alert.level];
        const Icon = meta.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "pointer-events-auto w-80 rounded-2xl border p-4 shadow-2xl backdrop-blur-lg transition-all duration-300",
              meta.className
            )}
            role="status"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-black/20 p-2">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", meta.badgeClass)}>
                    {meta.label}
                  </span>
                  <span className="text-xs uppercase text-white/70">{formatClock(alert.created_at)}</span>
                </div>
                {alert.title && <p className="text-sm font-semibold text-white">{alert.title}</p>}
                <p className="text-base text-white/90">{alert.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAlert(alert.id)}
                className="rounded-full p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
                aria-label="Tancar alerta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
      <div
        className={cn(
          "pointer-events-auto rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur",
          connectionState === "open"
            ? "border-emerald-400/50 bg-emerald-600/20 text-emerald-100"
            : connectionState === "connecting"
            ? "border-amber-400/50 bg-amber-600/30 text-amber-100"
            : "border-red-400/50 bg-red-700/30 text-red-100"
        )}
      >
        {statusLabel}
      </div>
    </div>
  );
}
