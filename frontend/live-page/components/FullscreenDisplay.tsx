"use client";

import AmbientScenes from "./AmbientScenes";
import { useState } from "react";
import Link from "next/link";
import { Maximize, Settings2 } from "lucide-react";
import AlertCenter, { type LiveAlert } from "./AlertCenter";
import "./fullscreen-display.css";

type Activity = { id: string; title: string; start: string; location: string };
type Presentation = {
  id: number;
  room: string;
  team: string;
  state: string;
  scheduled_at: string | null;
};
type Room = { id: string; title: string; paused: boolean };

export default function FullscreenDisplay({
  countdown,
  deadline,
  finished,
  now,
  activities,
  leaderboard,
  judging,
  rooms,
  presentations,
  room,
  alerts,
  eventId,
  error,
  pushStatus,
  onEnablePush,
}: {
  countdown: string;
  deadline: string | null;
  finished: boolean;
  now: number;
  activities: Activity[];
  leaderboard: { rank: number; nickname: string; balance: number }[];
  judging: boolean;
  rooms: Room[];
  presentations: Presentation[];
  room: string;
  alerts: LiveAlert[];
  eventId: string;
  error: string;
  pushStatus: string;
  onEnablePush: () => void;
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [screenError, setScreenError] = useState("");
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setScreenError("");
    } catch {
      setScreenError("El navegador no ha pogut activar la pantalla completa.");
    }
  }
  return (
    <main className={`farm-live minimal-screen ${judging ? "is-judging" : ""}`}>
      <AmbientScenes fullscreen />
      <div className="screen-header">
        <Link href="/" aria-label="Tornar a HackEPS Live">
          <img src="/hackeps/isotip.svg" width={56} height={36} alt="HackEPS" />
        </Link>

      {leaderboard.length > 0 && (
        <section className="screen-podium" aria-label="Classificació de LleidaCoins">
          <ol>
            {leaderboard.slice(0, 3).map((entry, index) => (
              <li key={`${entry.nickname}-${index}`} className={index === 0 ? "is-leading" : ""}>
                <span className="screen-podium-rank">{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}<span className="sr-only">Posició {entry.rank}</span></span>
                <strong>{entry.nickname}</strong>
                <span className="screen-podium-balance">{entry.balance.toLocaleString("ca-ES")} <small>LLC</small></span>
              </li>
            ))}
          </ol>
        </section>
      )}
        {error && (
          <p className="screen-connection" role="status">
            Sense connexió · Dades pendents d’actualitzar
          </p>
        )}
      </div>
      {!judging && <section className="screen-stage" aria-label="Compte enrere">
        {finished && <h1>Temps de lliurament finalitzat</h1>}
        <div className={`screen-timer ${deadline ? "" : "is-pending"}`}>
          {countdown}
        </div>
        {deadline && (
          <p className="screen-deadline">
            {new Date(deadline).toLocaleDateString("ca-ES", {
              day: "numeric",
              month: "long",
            })}{" "}
            ·{" "}
            {new Date(deadline).toLocaleTimeString("ca-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </section>}
      <section
        className={`screen-upcoming ${judging ? "is-judging" : ""}`}
        aria-label={judging ? "Torns de presentació" : "Pròximes activitats"}
      >
        {judging ? (
          <>
          <h1 className="screen-waiting-title">Judging</h1>
          {!rooms.length && <p className="screen-empty" role="status">Els torns es publicaran aquí quan estiguin preparats.</p>}
          <div className="screen-room-grid">
            {rooms
              .filter((r) => !room || r.id === room)
              .map((r) => {
                const turns = presentations
                  .filter(
                    (p) =>
                      p.room === r.id && !["done", "absent"].includes(p.state),
                  );
                const visibleTurns = turns.slice(0, 5);
                return (
                  <article key={r.id} className={`screen-room ${r.paused ? "is-paused" : ""}`}>
                    <div className="screen-room-heading"><h2>{r.title}</h2><span>{r.paused ? "En pausa" : `${turns.length} en cua`}</span></div>
                    {turns.length ? (
                      visibleTurns.map((p) => (
                        <div className={`screen-turn is-${p.state}`} key={p.id}>
                          <span className="screen-turn-label">
                            {(
                              {
                                presenting: "Presentant",
                                called: "Sala d’espera",
                                postponed: "Ajornat",
                              } as Record<string, string>
                            )[p.state] ||
                              (p.scheduled_at
                                ? new Date(p.scheduled_at).toLocaleTimeString(
                                    "ca-ES",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : "En espera")}
                          </span>
                          <strong>{p.team}</strong>
                        </div>
                      ))
                    ) : (
                      <p>Sense torns pendents</p>
                    )}
                    {turns.length > 5 && <p className="screen-room-more">+{turns.length - 5} equips</p>}
                  </article>
                );
              })}
          </div>
          </>
        ) : activities.length ? (
          <div className="screen-activity-grid">
            {activities.slice(0, 3).map((a) => (
              <article key={a.id}>
                <span className="screen-time">
                  {Date.parse(a.start) <= now
                    ? "Ara"
                    : new Date(a.start).toLocaleTimeString("ca-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                </span>
                <h2>{a.title}</h2>
                {a.location && <p>{a.location}</p>}
              </article>
            ))}
          </div>
        ) : (
          <p className="screen-empty">No hi ha més activitats programades.</p>
        )}
      </section>
      <div className={`screen-tools ${toolsOpen ? "is-open" : ""}`}>
        <button
          className="screen-settings-toggle"
          onClick={() => setToolsOpen(!toolsOpen)}
          aria-label="Ajustos de pantalla"
          aria-expanded={toolsOpen}
        >
          <Settings2 size={18} />
        </button>
        {toolsOpen && (
          <div className="screen-options">
            <button onClick={toggleFullscreen}>
              <Maximize size={16} />
              Pantalla completa
            </button>
            {(screenError || pushStatus) && (
              <p role="status">{screenError || pushStatus}</p>
            )}
          </div>
        )}
        <AlertCenter
          projection
          alerts={alerts}
          eventId={eventId}
          onEnablePush={onEnablePush}
        />
      </div>
    </main>
  );
}
