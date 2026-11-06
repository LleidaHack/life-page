"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Bell, X } from "lucide-react";
import type { LiveAlert } from "./AlertCenter";

function messagePages(message: string) {
  const pages: string[] = [];
  let remaining = message;
  while (remaining.length > 250) {
    const boundary = remaining.lastIndexOf(" ", 250);
    const end = boundary > 100 ? boundary : 250;
    pages.push(remaining.slice(0, end));
    remaining = remaining.slice(end).trimStart();
  }
  pages.push(remaining);
  return pages;
}

export default function ScreenAnnouncement({ alert, onDismiss, onShow }: {
  alert: LiveAlert;
  onDismiss: (id: string) => void;
  onShow: () => void;
}) {
  const [pages] = useState(() => messagePages(alert.message));
  const [page, setPage] = useState(0);
  const [duration] = useState(() => {
    const readingTime = Math.max(pages.length * 15000, (alert.title.length + alert.message.length) * 55);
    return Math.max(0, Math.min(readingTime, alert.expires_at ? Date.parse(alert.expires_at) - Date.now() : readingTime));
  });
  useEffect(() => {
    if (duration > 0) onShow();
    const timer = setTimeout(() => onDismiss(alert.id), duration);
    const pageTimer = pages.length > 1 && duration > 0
      ? setInterval(() => setPage(current => Math.min(pages.length - 1, current + 1)), duration / pages.length)
      : null;
    return () => { clearTimeout(timer); if (pageTimer) clearInterval(pageTimer); };
  }, [alert.id, duration, onDismiss, onShow, pages.length]);

  if (!duration) return null;
  return (
    <div className="screen-announcement-overlay">
      <section
        className={`screen-announcement ${alert.level}`}
        role={alert.level === "danger" ? "alert" : "status"}
        aria-live={alert.level === "danger" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        <div className="screen-announcement-content">
          <Bell className="screen-announcement-icon" aria-hidden="true" />
          <h2>{alert.title}</h2>
          <p>{pages[page]}</p>
          {pages.length > 1 && <small className="screen-announcement-page">{page + 1} / {pages.length}</small>}
        </div>
        <button className="screen-announcement-close" onClick={() => onDismiss(alert.id)} aria-label={`Tancar avís: ${alert.title}`}>
          <X size={24} />
        </button>
        <div className="screen-announcement-progress" aria-hidden="true">
          <div style={{ "--announcement-duration": `${duration}ms` } as CSSProperties} />
        </div>
      </section>
    </div>
  );
}
