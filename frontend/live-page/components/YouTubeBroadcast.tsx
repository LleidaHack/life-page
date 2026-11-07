"use client";

import "./youtube-broadcast.css";

function videoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const id = url.hostname === "youtu.be" ? parts[0]
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
        ? url.pathname === "/watch" ? url.searchParams.get("v")
          : ["live", "embed", "shorts"].includes(parts[0]) ? parts[1] : null
        : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export default function YouTubeBroadcast({ url, enabled }: { url?: string | null; enabled: boolean }) {
  const id = enabled && url ? videoId(url) : null;
  if (!id) return null;
  return (
    <section className="youtube-broadcast" aria-label="Retransmissió de LleidaHack">
      <div className="youtube-broadcast-heading">
        <span>● Retransmissió</span>
        <h2>HackEPS en directe</h2>
        <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">Obrir a YouTube ↗</a>
      </div>
      <iframe
        key={id}
        src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0`}
        title="Retransmissió de HackEPS"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </section>
  );
}
