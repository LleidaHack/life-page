"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AlertCenter, { type LiveAlert } from "./AlertCenter";
import LiveHomePanels from "./LiveHomePanels";
import FullscreenDisplay from "./FullscreenDisplay";
import "./event-live.css";

const TractorRun = dynamic(() => import("./TractorRun"), { ssr: false });
type Activity = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  points: number;
};
type LiveEvent = {
  title: string;
  leaderboard?: { rank: number; nickname: string; balance: number }[];
  phase: string;
  deadline: string | null;
  server_time: string;
  game_enabled: boolean;
  map_url: string | null;
  map_notes: string;
  slack_url: string | null;
  stream_url?: string | null;
  wifi_name?: string;
  wifi_instructions?: string;
  wifi_guide_url?: string | null;
  activities: Activity[];
  challenges: {
    id: string;
    title: string;
    description: string;
    resources: { title: string; url: string }[];
  }[];
  faqs: { question: string; answer: string }[];
  alerts: LiveAlert[];
  rooms: { id: string; title: string; paused: boolean }[];
  presentations: {
    id: number;
    room: string;
    team: string;
    state: string;
    scheduled_at: string | null;
  }[];
};
const api = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");
const eventId = process.env.NEXT_PUBLIC_EVENT_ID || "1";
export default function EventLive({ view = "home" }: { view?: string }) {
  const [data, setData] = useState<LiveEvent | null>(null),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now()),
    [offset, setOffset] = useState(0);
  const [game, setGame] = useState(false),
    [clicks, setClicks] = useState(0),
    [search, setSearch] = useState(""),
    [push, setPush] = useState("");
  const [room, setRoom] = useState("");
  const closeGame = useCallback(() => setGame(false), []);
  useEffect(() => {
    setRoom(new URLSearchParams(window.location.search).get("room") || "");
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${api}/v1/operations/${eventId}/public`, {
          cache: "no-store",
        });
        if (!response.ok) throw Error("No s’ha pogut actualitzar el Live");
        const next = await response.json();
        if (active) {
          setData(next);
          setOffset(new Date(next.server_time).getTime() - Date.now());
          setError("");
        }
      } catch {
        if (active)
          setError("Sense connexió. Mostrant la darrera informació rebuda.");
      }
    };
    void load();
    const timer = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      socket = new WebSocket(
        `${api.replace(/^http/, "ws")}/v1/operations/${eventId}/ws`,
      );
      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === "alerts" && Array.isArray(message.alerts)) {
            setData((current) =>
              current ? { ...current, alerts: message.alerts } : current,
            );
          }
        } catch {
          /* HTTP polling repairs malformed or interrupted updates. */
        }
      };
      socket.onclose = () => {
        if (active) retry = setTimeout(connect, 3000);
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      active = false;
      clearTimeout(retry);
      socket?.close();
    };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function subscribe() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window))
        throw Error(
          "Afegeix el Live a la pantalla d’inici i obre’l per activar els avisos.",
        );
      const { public_key } = await (
        await fetch(`${api}/v1/operations/${eventId}/push-key`)
      ).json();
      if (!public_key)
        throw Error("Les notificacions push encara no estan configurades.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const normalized = public_key.replace(/-/g, "+").replace(/_/g, "/");
      const key = Uint8Array.from(
        atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
        (c) => c.charCodeAt(0),
      );
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      const response = await fetch(
        `${api}/v1/operations/${eventId}/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        },
      );
      if (!response.ok) throw Error("No s’ha pogut activar la subscripció");
      setPush("Avisos activats!");
    } catch (e) {
      setPush(
        e instanceof Error ? e.message : "No s’han pogut activar els avisos",
      );
    }
  }
  const fullscreen = view === "fullscreen";
  if (!data)
    return (
      <main className="farm-live">
        <p role="status">{error || "Carregant HackEPS Live…"}</p>
      </main>
    );
  const left = data.deadline
    ? Math.max(
        0,
        Math.floor((new Date(data.deadline).getTime() - now - offset) / 1000),
      )
    : null;
  const countdown =
    left === null
      ? "Pendent de confirmar"
      : [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60]
          .map((v) => String(v).padStart(2, "0"))
          .join(":");
  const activities = (data.activities || [])
    .filter((a) => new Date(a.end).getTime() > now + offset)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const presentations = (data.presentations || []).filter(
    (p) =>
      (!room || p.room === room) &&
      p.team.toLowerCase().includes(search.toLowerCase()),
  );
  const judging = data.phase === "judging";
  if (fullscreen)
    return (
      <FullscreenDisplay
        countdown={countdown}
        deadline={data.deadline}
        finished={left === 0}
        now={now + offset}
        activities={activities}
        judging={judging}
        rooms={data.rooms}
        presentations={presentations}
        room={room}
        alerts={data.alerts}
        eventId={eventId}
        error={error}
        pushStatus={push}
        onEnablePush={subscribe}
      />
    );
  return (
    <main className={`farm-live ${fullscreen ? "farm-screen" : ""}`}>
      <header>
        <Link href="/" className="farm-brand">
          <img src="/hackeps/isotip.svg" alt="HackEPS" width={75} height={48} />
        </Link>
        {!fullscreen && (
          <nav aria-label="Navegació">
            <Link href="/challenges">Reptes</Link>
            <Link href="/schedule">Agenda</Link>
            <Link href="/map">Mapa</Link>
            <Link href="/help">Ajuda</Link>
            <Link href="/leaderboard">LleidaCoins</Link>
            {judging && <Link href="/judging">Presentacions</Link>}
            <Link href="/fullscreen">Pantalla</Link>
          </nav>
        )}
      </header>
      {!fullscreen && (
        <div className="live-countdown-bar">
          <Link
            href="/fullscreen"
            aria-label="Temps de lliurament. Obrir pantalla completa"
          >
            <span>Temps per lliurar el projecte</span>
            <strong>{countdown}</strong>
          </Link>
        </div>
      )}
      <div className="farm-page-content">
        {view === "management" && (
          <section className="farm-management">
            <h1>Gestió de HackEPS</h1>
            <p>
              Els avisos, els horaris i els permisos es gestionen al panell de
              LleidaHack.
            </p>
            {process.env.NEXT_PUBLIC_ADMIN_URL && (
              <a
                className="farm-button"
                href={process.env.NEXT_PUBLIC_ADMIN_URL}
              >
                Obrir Gestió
              </a>
            )}
          </section>
        )}
        {error && (
          <p className="farm-status" role="status">
            {error}
          </p>
        )}
        <AlertCenter
          alerts={data.alerts}
          eventId={eventId}
          onEnablePush={subscribe}
        />
        {push && (
          <p className="live-push-status" role="status">
            {push}
          </p>
        )}
        {(view === "home" || fullscreen) && (
          <>
            <section
              className={`farm-hero ${fullscreen ? "" : "live-home-intro"}`}
            >
              <div>
                <h1>
                  {left === 0
                    ? "Temps de lliurament finalitzat"
                    : fullscreen
                      ? "Temps per lliurar el projecte"
                      : data.title}
                </h1>
                <p>Temps restant per lliurar el projecte</p>
                <div className="farm-countdown" aria-label="Temps restant">
                  {countdown}
                </div>
                {data.deadline && (
                  <small>
                    Límit: {new Date(data.deadline).toLocaleString("ca-ES")}
                  </small>
                )}
              </div>
              <div className="farm-art">
                <img
                  className="farm-edition-logo"
                  src="/hackeps/logo-taronja.webp"
                  alt="HackEPS · 10a edició"
                  width={340}
                  height={420}
                />
                <button
                  className="farm-tractor"
                  aria-label="Tractor"
                  onClick={() => {
                    setClicks(clicks + 1);
                    if (clicks >= 4 && data.game_enabled) setGame(true);
                  }}
                >
                  <svg viewBox="0 0 360 250" aria-hidden="true">
                    <path
                      d="M0 225Q90 180 180 220T360 200V250H0Z"
                      fill="#78c6bd"
                    />
                    <path
                      d="M65 145V65H170V145H260L290 185H55Z"
                      fill="#ff7430"
                    />
                    <path d="M83 80H148V135H83Z" fill="#94cbf5" />
                    <path
                      d="M190 115V70H204V145"
                      fill="none"
                      stroke="#2e2e2e"
                      strokeWidth="12"
                    />
                    <rect
                      x="210"
                      y="150"
                      width="60"
                      height="30"
                      rx="5"
                      fill="#fff"
                    />
                    <circle cx="100" cy="190" r="48" fill="#2e2e2e" />
                    <circle cx="100" cy="190" r="25" fill="#fff" />
                    <circle cx="260" cy="200" r="31" fill="#2e2e2e" />
                    <circle cx="260" cy="200" r="15" fill="#fff" />
                  </svg>
                </button>
              </div>
            </section>
            {view === "home" && (
              <LiveHomePanels
                data={data}
                next={activities[0]}
                now={now + offset}
              />
            )}
            <section>
              <h2>Ara i a continuació</h2>
              <div className="farm-grid">
                {activities.slice(0, fullscreen ? 4 : 3).map((a) => (
                  <article key={a.id}>
                    <span className="farm-eyebrow">
                      {new Date(a.start).getTime() <= now + offset
                        ? "ARA"
                        : new Date(a.start).toLocaleTimeString("ca-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </span>
                    <h3>{a.title}</h3>
                    <p>{a.location}</p>
                  </article>
                ))}
                {!activities.length && (
                  <p>No hi ha més activitats programades.</p>
                )}
              </div>
            </section>
          </>
        )}
        {view === "schedule" && (
          <section>
            <h1>Agenda de la HackEPS</h1>
            <div className="farm-grid">
              {data.activities.map((a) => (
                <article key={a.id}>
                  <p>
                    {new Date(a.start).toLocaleString("ca-ES")} –{" "}
                    {new Date(a.end).toLocaleTimeString("ca-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <h2>{a.title}</h2>
                  <p>{a.location}</p>
                  {a.points > 0 && (
                    <span>+{a.points} LleidaCoins per participar</span>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        {view === "challenges" && (
          <section>
            <p className="farm-eyebrow">TRIA EL TEU TERRENY</p>
            <h1>Els reptes</h1>
            <div className="farm-grid">
              {data.challenges.map((c) => (
                <article key={c.id}>
                  <h2>{c.title}</h2>
                  <p style={{ whiteSpace: "pre-wrap" }}>{c.description}</p>
                  {c.resources?.length > 0 && (
                    <>
                      <h3>Recursos</h3>
                      <ul>
                        {c.resources.map((r, i: number) => (
                          <li key={i}>
                            <a href={r.url} target="_blank" rel="noreferrer">
                              {r.title} ↗
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </article>
              ))}
            </div>
            {!data.challenges.length && (
              <p>Els reptes encara no s’han publicat.</p>
            )}
          </section>
        )}
        {view === "map" && (
          <section>
            <h1>Mapa de l’esdeveniment</h1>
            {data.map_url ? (
              <a href={data.map_url} target="_blank" rel="noreferrer">
                <img
                  className="farm-map"
                  src={data.map_url}
                  alt="Mapa de l’esdeveniment"
                />
              </a>
            ) : (
              <p>El mapa encara no s’ha publicat.</p>
            )}
            <p style={{ whiteSpace: "pre-wrap" }}>{data.map_notes}</p>
          </section>
        )}
        {view === "help" && (
          <section>
            <h1>Un cop de mà?</h1>
            {data.faqs.map((f, i: number) => (
              <details key={i}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </section>
        )}
        {judging && (view === "judging" || view === "home" || fullscreen) && (
          <section>
            <p className="farm-eyebrow">JUDGING TIME</p>
            <h2>Presentacions en directe</h2>
            {!fullscreen && (
              <input
                aria-label="Cerca el teu equip"
                placeholder="Cerca el teu equip…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            <div className="farm-grid">
              {data.rooms
                .filter((r) => !room || r.id === room)
                .map((r) => (
                  <article key={r.id}>
                    <h3>
                      {r.title} {r.paused && "· En pausa"}
                    </h3>
                    {presentations
                      .filter(
                        (p) =>
                          p.room === r.id &&
                          !["done", "absent"].includes(p.state),
                      )
                      .slice(0, fullscreen ? 5 : 20)
                      .map((p) => (
                        <div key={p.id} className={`farm-turn ${p.state}`}>
                          <strong>{p.team}</strong>
                          <span>
                            {{
                              waiting: "En espera",
                              called: "Vine a la sala",
                              presenting: "Presentant",
                              postponed: "Ajornat",
                            }[p.state as string] || p.state}
                          </span>
                          <small>
                            {p.scheduled_at
                              ? `Hora estimada: ${new Date(p.scheduled_at).toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit" })}`
                              : "Pendent d’horari"}
                          </small>
                        </div>
                      ))}
                  </article>
                ))}
            </div>
          </section>
        )}
        {(view === "home" || view === "leaderboard") && (
          <section
            className="farm-leaderboard"
            aria-labelledby="leaderboard-title"
          >
            <p className="farm-eyebrow">EL RÀNQUING DE LA HACKEPS</p>
            <h2 id="leaderboard-title">Classificació de LleidaCoins</h2>
            <p>
              Ordenada pel saldo actual: els bescanvis resten i les correccions
              s’hi reflecteixen. Els empats comparteixen posició.
            </p>
            {(data.leaderboard ?? []).length ? (
              <>
                <table>
                  <caption className="farm-ranking-caption">
                    {view === "home" ? "Top 10" : "Top 50"} · Actualització cada
                    3 segons
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Posició</th>
                      <th scope="col">Hacker</th>
                      <th scope="col" aria-label="Saldo en LleidaCoins">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.leaderboard ?? [])
                      .slice(0, view === "home" ? 10 : 50)
                      .map((entry, index) => (
                        <tr
                          key={`${entry.nickname}-${index}`}
                          className={entry.rank <= 3 ? "farm-podium" : ""}
                        >
                          <td>
                            <span aria-hidden="true">
                              {entry.rank === 1
                                ? "🥇 "
                                : entry.rank === 2
                                  ? "🥈 "
                                  : entry.rank === 3
                                    ? "🥉 "
                                    : ""}
                            </span>
                            {entry.rank}
                          </td>
                          <th scope="row">{entry.nickname}</th>
                          <td>{entry.balance.toLocaleString("ca-ES")}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {view === "home" && (
                  <Link className="farm-button" href="/leaderboard">
                    Veure la classificació →
                  </Link>
                )}
              </>
            ) : (
              <p className="farm-ranking-empty">
                Encara no hi ha punts al rànquing. Participa en activitats per
                aconseguir les primeres LleidaCoins!
              </p>
            )}
          </section>
        )}
        {view === "judging" && !judging && (
          <p>Els torns es publicaran quan comencin les presentacions.</p>
        )}
      </div>
      {!fullscreen && (
        <footer>
          {data.slack_url && (
            <a
              className="farm-button"
              href={data.slack_url}
              target="_blank"
              rel="noreferrer"
            >
              Entrar a Slack ↗
            </a>
          )}

          <p>HackEPS · LleidaHack · Escola Politècnica Superior</p>
        </footer>
      )}
      {fullscreen && (
        <button
          className="farm-fullscreen"
          onClick={() =>
            document.fullscreenElement
              ? document.exitFullscreen()
              : document.documentElement.requestFullscreen()
          }
        >
          Pantalla completa
        </button>
      )}
      {game && <TractorRun onClose={closeGame} />}
    </main>
  );
}
