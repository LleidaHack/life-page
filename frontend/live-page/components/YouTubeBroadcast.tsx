"use client";

import { useEffect, useState } from "react";
import "./youtube-broadcast.css";

type Broadcast = { video_id: string; title: string };

export default function YouTubeBroadcast({ api, eventId }: { api: string; eventId: string }) {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(`${api}/v1/operations/${eventId}/broadcast`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Broadcast unavailable");
        const { live } = await response.json();
        if (!controller.signal.aborted) {
          setBroadcast(live && /^[\w-]{11}$/.test(live.video_id) ? live : null);
        }
      } catch {
        if (!controller.signal.aborted) setBroadcast(null);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 30000);
      }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [api, eventId]);

  if (!broadcast) return null;
  return (
    <section className="youtube-broadcast" aria-label="Retransmissió de LleidaHack">
      <div className="youtube-broadcast-heading">
        <span>● En directe</span>
        <h2>{broadcast.title}</h2>
        <a href={`https://www.youtube.com/watch?v=${broadcast.video_id}`} target="_blank" rel="noreferrer">Obrir a YouTube ↗</a>
      </div>
      <iframe
        key={broadcast.video_id}
        src={`https://www.youtube.com/embed/${broadcast.video_id}?autoplay=1&mute=1&playsinline=1&rel=0`}
        title={broadcast.title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </section>
  );
}
