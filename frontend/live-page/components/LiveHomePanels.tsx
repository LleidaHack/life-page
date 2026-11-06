"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Radio,
  Wifi,
  MessageCircle,
  CalendarClock,
  Instagram,
  Linkedin,
} from "lucide-react";

type HomeData = {
  stream_url?: string | null;
  wifi_name?: string;
  wifi_instructions?: string;
  wifi_guide_url?: string | null;
  slack_url: string | null;
};
type Activity = { title: string; start: string; end: string; location: string };

export default function LiveHomePanels({
  data,
  next,
  now,
}: {
  data: HomeData;
  next?: Activity;
  now: number;
}) {
  const [embed, setEmbed] = useState("");
  const stream = data.stream_url;
  function openPlayer() {
    if (!stream) return;
    const url = new URL(stream);
    if (
      ["twitch.tv", "www.twitch.tv"].includes(url.hostname) &&
      /^\/[a-zA-Z0-9_]+\/?$/.test(url.pathname)
    ) {
      const parameters = new URLSearchParams({
        channel: url.pathname.split("/")[1],
        parent: window.location.hostname,
        muted: "true",
        autoplay: "true",
      });
      setEmbed(`https://player.twitch.tv/?${parameters}`);
    } else window.open(stream, "_blank", "noopener,noreferrer");
  }
  return (
    <div className="live-home-panels">
      <section className="live-featured" aria-labelledby="featured-title">
        <div className="live-panel-heading">
          <Radio aria-hidden="true" />
          <span className="farm-eyebrow">Canal oficial</span>
        </div>
        <h2 id="featured-title">Retransmissió</h2>
        {stream ? (
          <>
            {embed ? (
              <iframe
                title="Retransmissió de HackEPS"
                src={embed}
                allowFullScreen
              />
            ) : (
              <button onClick={openPlayer}>Veure la retransmissió</button>
            )}
            <a href={stream} target="_blank" rel="noreferrer">
              Obrir el canal ↗
            </a>
          </>
        ) : (
          <p>Retransmissió no disponible.</p>
        )}
        <div className="live-next-event">
          <CalendarClock aria-hidden="true" />
          <div>
            <span className="farm-eyebrow">
              {next && Date.parse(next.start) <= now
                ? "Ara mateix"
                : "Pròxim esdeveniment"}
            </span>
            <h3>{next?.title || "Consulta l’agenda de la hackató"}</h3>
            {next && (
              <p>
                {new Date(next.start).toLocaleTimeString("ca-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {next.location}
              </p>
            )}
            <Link href="/schedule">Veure tot l’horari →</Link>
          </div>
        </div>
      </section>
      <div className="live-information-grid">
        <section aria-labelledby="wifi-title">
          <div className="live-panel-heading">
            <Wifi aria-hidden="true" />
            <h2 id="wifi-title">Wi-Fi</h2>
          </div>
          {data.wifi_name && <strong>{data.wifi_name}</strong>}
          <p className="live-preserve-lines">
            {data.wifi_instructions || "Dades de connexió pendents."}
          </p>
          {data.wifi_guide_url && (
            <a
              className="farm-button"
              href={data.wifi_guide_url}
              target="_blank"
              rel="noreferrer"
            >
              Com connectar-me al Wi-Fi?
            </a>
          )}
          <p>Necessites ajuda? Contacta amb organització.</p>
        </section>
        <section aria-labelledby="contact-title">
          <div className="live-panel-heading">
            <MessageCircle aria-hidden="true" />
            <h2 id="contact-title">Contacte</h2>
          </div>
          <p>Parla amb organització a Discord.</p>
          {data.slack_url ? (
            <a
              className="farm-button"
              href={data.slack_url}
              target="_blank"
              rel="noreferrer"
            >
              Entrar a Discord ↗
            </a>
          ) : (
            <p>Enllaç pendent de publicar.</p>
          )}
          <div className="live-socials">
            <a
              href="https://instagram.com/hackeps_/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de HackEPS"
            >
              <Instagram size={22} />
            </a>
            <a
              href="https://linkedin.com/company/hackeps/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn de HackEPS"
            >
              <Linkedin size={22} />
            </a>
            <Link href="/help">Preguntes freqüents →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
