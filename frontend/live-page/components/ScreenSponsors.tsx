"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { liveApi } from "@/lib/liveEvent";
import { parseEventSponsors, type EventSponsor } from "@/lib/eventSponsors";
import "./screen-sponsors.css";

function SponsorLogo({ sponsor }: { sponsor: EventSponsor }) {
  const [failed, setFailed] = useState(false);
  if (!sponsor.image || failed) return null;
  return (
    <span className="screen-sponsor-logo">
      {/* The API supplies data URLs; retain the original logo without a proxy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="company-logo" src={sponsor.image} alt={`Logo de ${sponsor.name}`}
        width={180} height={56} decoding="async" onError={() => setFailed(true)} />
    </span>
  );
}

export default function ScreenSponsors({ eventId }: { eventId: string }) {
  const [sponsors, setSponsors] = useState<EventSponsor[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!eventId) return;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout>;
    async function refresh() {
      let delay = 300_000;
      try {
        const response = await fetch(`${liveApi}/v1/event/${encodeURIComponent(eventId)}/sponsors`, {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (!response.ok) throw new Error("Sponsors unavailable");
        const rows = parseEventSponsors(await response.json()).filter(
          (entry) => !/^clouding(?:\.io)?$/i.test(entry.name.trim()),
        );
        if (!controller.signal.aborted) setSponsors(rows);
      } catch {
        // Keep the last successful list during an outage and retry shortly.
        delay = 30_000;
      } finally {
        if (!controller.signal.aborted) retry = setTimeout(refresh, delay);
      }
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(retry);
    };
  }, [eventId]);

  useEffect(() => {
    if (paused || sponsors.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 2) % sponsors.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [sponsors.length, paused]);

  const activeIndex = sponsors.length ? index % sponsors.length : 0;

  function renderSponsorCard(offset: number) {
    const position = (activeIndex + offset) % sponsors.length;
    const sponsor = sponsors[position];
    if (!sponsor || (offset === 1 && sponsors.length < 2)) return <span />;

    return (
      <button
        className="screen-sponsor-toggle"
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={`${sponsor.name}: ${paused ? "reprendre" : "pausar"} els patrocinadors`}
        aria-pressed={paused}
      >
        {sponsors.map((entry, entryIndex) => (
          <span
            className={`screen-sponsor-brand ${entryIndex === position ? "is-active" : ""}`}
            key={entry.id}
            aria-hidden={entryIndex !== position}
          >
            <SponsorLogo sponsor={entry} />
          </span>
        ))}
      </button>
    );
  }

  return (
    <section className="screen-sponsors" aria-label="Patrocinadors de l’esdeveniment">
      {renderSponsorCard(0)}
      <div className="sponsors-powered-by">
        <p>Powered by</p>
        <a className="clouding-sponsor" href="https://clouding.io/" target="_blank" rel="noreferrer">
          <Image src="/clouding-logo.png" alt="clouding.io" width={900} height={640} />
        </a>
      </div>
      {renderSponsorCard(1)}
    </section>
  );
}
