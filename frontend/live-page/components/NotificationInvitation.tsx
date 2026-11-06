"use client";

import { useEffect, useState } from "react";

export default function NotificationInvitation({ api, eventId, onEnable }: {
  api: string;
  eventId: string;
  onEnable: () => Promise<boolean>;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const storageKey = `hackeps-push-invitation:${eventId}`;
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) ||
        !("PushManager" in window) || Notification.permission !== "default") return;
    try { if (sessionStorage.getItem(storageKey)) return; } catch { /* Storage is optional. */ }
    const controller = new AbortController();
    fetch(`${api}/v1/operations/${eventId}/push-key`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!controller.signal.aborted && data?.public_key) setVisible(true); })
      .catch(() => { /* Retry on the next visit when the backend is available. */ });
    return () => controller.abort();
  }, [api, eventId, storageKey]);

  function dismiss() {
    setVisible(false);
    try { sessionStorage.setItem(storageKey, "dismissed"); } catch { /* Storage is optional. */ }
  }
  async function enable() {
    setBusy(true);
    try {
      const activated = await onEnable();
      if (activated || Notification.permission === "denied") dismiss();
    } finally { setBusy(false); }
  }
  if (!visible) return null;
  return (
    <aside className="live-push-invitation" aria-labelledby="push-invitation-title">
      <div>
        <strong id="push-invitation-title">Vols rebre els avisos de la HackEPS?</strong>
        <p>T’avisarem quan comencin les activitats i els àpats.</p>
      </div>
      <button type="button" onClick={enable} disabled={busy}>{busy ? "Activant…" : "Activar notificacions"}</button>
      <button type="button" onClick={dismiss} disabled={busy}>Ara no</button>
    </aside>
  );
}
