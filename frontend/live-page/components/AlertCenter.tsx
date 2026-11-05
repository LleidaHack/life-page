"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Volume2, VolumeX, X } from "lucide-react";

export type LiveAlert = {
  id: string;
  title: string;
  message: string;
  level: string;
  expires_at?: string;
};

let audioContext: AudioContext | null = null;
let soundEnabled = false;
const DISPLAY_MS = 8000;

function playTone() {
  if (!soundEnabled || audioContext?.state !== "running" || document.hidden)
    return;
  const context = audioContext;
  for (const [index, frequency] of [660, 880].entries()) {
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const start = context.currentTime + index * 0.16;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(0.09, start + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.26);
    oscillator.onended = () => {
      oscillator.disconnect();
      volume.disconnect();
    };
  }
}

export default function AlertCenter({
  alerts,
  eventId,
  onEnablePush,
}: {
  alerts: LiveAlert[];
  eventId: string;
  onEnablePush: () => void;
}) {
  const [visible, setVisible] = useState<LiveAlert[]>([]);
  const [enabled, setEnabled] = useState(
    soundEnabled && audioContext?.state === "running",
  );
  const [audioError, setAudioError] = useState("");
  const seen = useRef(new Set<string>());
  const ready = useRef(false);
  const initialized = useRef(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const storageKey = `hackeps-alerts-seen:${eventId}`;

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setVisible((current) => current.filter((alert) => alert.id !== id));
  }, []);

  const receive = useCallback(
    (incoming: LiveAlert[], snapshot = false) => {
      if (!initialized.current) {
        initialized.current = true;
        try {
          const stored = JSON.parse(
            sessionStorage.getItem(storageKey) || "null",
          );
          if (Array.isArray(stored)) {
            seen.current = new Set(stored);
            ready.current = true;
          }
        } catch {
          /* Restricted storage must not prevent notifications. */
        }
      }
      const fresh = incoming.filter(
        (alert) =>
          alert.id &&
          !seen.current.has(alert.id) &&
          (!alert.expires_at || Date.parse(alert.expires_at) > Date.now()),
      );
      incoming.forEach((alert) => seen.current.add(alert.id));
      const show = ready.current || !snapshot;
      ready.current = true;
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify([...seen.current].slice(-500)),
        );
      } catch {
        /* Session-only fallback. */
      }
      if (!show || !fresh.length) return;
      const notifications = fresh.slice(-3);
      setVisible((current) =>
        [...notifications.reverse(), ...current].slice(0, 3),
      );
      playTone();
    },
    [dismiss, storageKey],
  );

  useEffect(() => {
    receive(alerts, true);
  }, [alerts, receive]);
  useEffect(() => {
    visible.forEach((alert) => {
      if (!timers.current.has(alert.id))
        timers.current.set(
          alert.id,
          setTimeout(() => dismiss(alert.id), DISPLAY_MS),
        );
    });
  }, [visible, dismiss]);
  useEffect(() => {
    const timerMap = timers.current;
    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "hackeps-alert" &&
        String(event.data.event_id) === eventId
      )
        receive([event.data.alert]);
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      timerMap.forEach(clearTimeout);
      timerMap.clear();
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [eventId, receive]);

  async function toggleSound() {
    if (enabled) {
      soundEnabled = false;
      setEnabled(false);
      return;
    }
    try {
      audioContext ??= new AudioContext();
      await audioContext.resume();
      if (audioContext.state !== "running")
        throw new Error("Audio unavailable");
      soundEnabled = true;
      setEnabled(true);
      setAudioError("");
      playTone();
    } catch {
      setAudioError(
        "El navegador no ha pogut activar el so. Torna-ho a provar.",
      );
    }
  }

  return (
    <>
      <div
        className="live-notification-controls"
        aria-label="Preferències dels avisos"
      >
        <button type="button" onClick={toggleSound} aria-pressed={enabled}>
          {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {enabled ? "So activat" : "Activar so"}
        </button>
        <button type="button" onClick={onEnablePush}>
          <Bell size={16} />
          Notificacions push
        </button>
        {audioError && <span role="status">{audioError}</span>}
      </div>
      <div
        className="live-notification-stack"
        aria-live="polite"
        aria-relevant="additions"
      >
        {visible.map((alert) => (
          <div
            className={`live-toast ${alert.level}`}
            key={alert.id}
            role={alert.level === "danger" ? "alert" : "status"}
          >
            <span className="live-toast-icon" aria-hidden="true">
              <Bell size={22} />
            </span>
            <div>
              <span className="live-toast-source">HackEPS · Ara</span>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              aria-label={`Tancar avís: ${alert.title}`}
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
