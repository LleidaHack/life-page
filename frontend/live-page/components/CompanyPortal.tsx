"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CompanyLogo from "./CompanyLogo";
import "./live-theme.css";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { liveApi } from "@/lib/liveEvent";
import { remainingSeconds, formatRemaining } from "@/lib/companyTimer.mjs";
import "./company-portal.css";

type Note = {
  text: string;
  score: number | null;
  favorite: boolean;
  version: number;
  updated_at: string | null;
};
type Project = {
  id: number;
  title: string;
  team: string;
  description: string;
  repository_url: string | null;
  demo_url: string | null;
  members: string[];
  url: string | null;
  challenge: string | null;
  note: Note;
};
type Snapshot = {
  company: string;
  server_time: string;
  duration_seconds: number;
  rooms: string[];
  room_labels: Record<string, string>;
  version: number;
  winner_id: number | null;
  projects: Project[];
  presentations: {
    id: number;
    group_id: number;
    room: string;
    state: string;
    started_at: string | null;
    scheduled_at: string | null;
  }[];
};
class PortalError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
    super(
      typeof detail === "string"
        ? (
            {
              "Invalid company credentials":
                "Correu o contrasenya incorrectes.",
              "Company session expired":
                "La sessió ha caducat. Copia les notes pendents i torna a entrar.",
              "Company has no access to this event":
                "Ja no tens accés a aquest esdeveniment. Contacta amb l’organització.",
              "Invitation expired or already used":
                "La invitació ha caducat o ja s’ha utilitzat. Demana’n una de nova.",
              "Company selection changed; refresh first":
                "Un altre dispositiu ha canviat la proposta. Actualitza la pàgina abans de tornar a triar.",
            } as Record<string, string>
          )[detail] ||
            "No s’ha pogut completar l’operació. Revisa les dades i torna-ho a provar."
        : "No s’ha pogut desar. Revisa la connexió i torna-ho a provar.",
    );
  }
}
async function api<T>(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${liveApi}/v1/company-portal${path}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok) throw new PortalError(response.status, result.detail);
  return result;
}
const safeUrl = (value: string | null) => {
  try {
    return value && ["http:", "https:"].includes(new URL(value).protocol)
      ? value
      : null;
  } catch {
    return null;
  }
};

function Notes({
  project,
  token,
  eventId,
  onDirty,
  onSaved,
}: {
  project: Project;
  token: string;
  eventId: string;
  onDirty: (dirty: boolean) => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(project.note),
    [saved, setSaved] = useState(project.note);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState<Note | null>(null);
  const dirty =
    draft.text !== saved.text ||
    draft.score !== saved.score ||
    draft.favorite !== saved.favorite;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty && project.note.version > saved.version) {
      setDraft(project.note);
      setSaved(project.note);
    }
  }, [project.note, dirty, saved.version]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(version = saved.version) {
    setBusy(true);
    setError("");
    try {
      const result = await api<Note>(
        `/events/${eventId}/notes/${project.id}`,
        token,
        "PUT",
        {
          text: draft.text,
          score: draft.score,
          favorite: draft.favorite,
          version,
        },
      );
      setDraft(result);
      setSaved(result);
      setConflict(null);
      onSaved();
    } catch (e) {
      if (e instanceof PortalError && e.status === 409)
        setConflict((e.detail as { current: Note }).current);
      else
        setError(
          e instanceof Error ? e.message : "No s’han pogut desar les notes.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="company-card">
      <h2>Notes compartides de l’empresa</h2>
      <p>Les veuen tots els dispositius que utilitzen aquest compte.</p>
      <label>
        Notes
        <textarea
          maxLength={10000}
          disabled={busy}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        />
      </label>
      <label>
        Puntuació (opcional, de 0 a 10)
        <Input
          type="number"
          step={1}
          disabled={busy}
          min={0}
          max={10}
          value={draft.score ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              score: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </label>
      <label>
        <input
          type="checkbox"
          disabled={busy}
          checked={draft.favorite}
          onChange={(e) => setDraft({ ...draft, favorite: e.target.checked })}
        />{" "}
        Favorit
      </label>
      {error && <p role="alert">{error} El text continua aquí.</p>}
      {conflict && (
        <div role="alert" className="company-conflict">
          <h3>Un altre dispositiu ha modificat aquestes notes</h3>
          <p className="company-description">{conflict.text || "Sense text"}</p>
          <p>
            Puntuació: {conflict.score ?? "—"} ·{" "}
            {conflict.favorite ? "Favorit" : "No favorit"}
          </p>
          <Button
            onClick={() => {
              if (
                confirm(
                  "Descartar el teu esborrany i carregar la versió desada?",
                )
              ) {
                setDraft(conflict);
                setSaved(conflict);
                setConflict(null);
              }
            }}
          >
            Carregar notes desades
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (confirm("Substituir les notes desades per la teva versió?"))
                void save(conflict.version);
            }}
          >
            Desar la meva versió
          </Button>
        </div>
      )}
      <Button
        disabled={!dirty || busy || !!conflict}
        onClick={() => void save()}
      >
        {busy ? "Desant…" : "Desar notes"}
      </Button>
      <span role="status">{dirty ? " Canvis pendents" : " Notes desades"}</span>
    </section>
  );
}

export default function CompanyPortal() {
  const [token, setToken] = useState(""),
    [ready, setReady] = useState(false),
    [invite, setInvite] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<{ id: number; name: string }[]>([]),
    [eventId, setEventId] = useState("");
  const [data, setData] = useState<Snapshot | null>(null),
    [room, setRoom] = useState(""),
    [view, setView] = useState("now"),
    [selected, setSelected] = useState<number | null>(null),
    [comparison, setComparison] = useState<number[]>([]),
    [query, setQuery] = useState(""),
    [onlyFavorites, setOnlyFavorites] = useState(false);
  const dirty = useRef(false),
    onDirty = useCallback((value: boolean) => {
      dirty.current = value;
    }, []);
  const [clock, setClock] = useState(Date.now()),
    offset = useRef(0);
  useEffect(() => {
    const setup =
      new URLSearchParams(location.hash.slice(1)).get("invite") || "";
    setInvite(setup);
    if (setup) history.replaceState(null, "", location.pathname);
    setToken(
      setup ? "" : sessionStorage.getItem("company-portal-session") || "",
    );
    setReady(true);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    api<{ id: number; name: string }[]>("/events", token)
      .then((rows) => {
        if (active) {
          setEvents(rows);
          setEventId(String(rows[0]?.id || ""));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  const load = useCallback(async () => {
    if (!token || !eventId) return;
    const next = await api<Snapshot>(`/events/${eventId}`, token);
    offset.current = new Date(next.server_time).getTime() - Date.now();
    setData(next);
    setError("");
  }, [token, eventId]);
  useEffect(() => {
    if (!token || !eventId) return;
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (!document.hidden) {
          const next = await api<Snapshot>(`/events/${eventId}`, token);
          if (active) {
            offset.current = new Date(next.server_time).getTime() - Date.now();
            setData(next);
            setError("");
          }
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Sense connexió");
      } finally {
        if (active) timer = setTimeout(poll, 5000);
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token, eventId]);
  function navigate(action: () => void) {
    if (
      dirty.current &&
      !confirm("Hi ha notes sense desar. Vols descartar-les?")
    )
      return;
    dirty.current = false;
    action();
  }
  const activeRoom = data?.rooms.includes(room) ? room : data?.rooms[0] || "";
  const current = data?.presentations.find(
    (p) => p.room === activeRoom && p.state === "presenting",
  );
  const project = data?.projects.find((p) => p.id === selected);
  useEffect(() => {
    if (selected === null && current) setSelected(current.group_id);
  }, [selected, current]);
  const remaining = remainingSeconds(
    current?.started_at,
    clock,
    offset.current,
    data?.duration_seconds || 300,
  );
  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ access_token: string }>(
        invite ? "/setup" : "/login",
        "",
        "POST",
        invite ? { token: invite, password } : { email, password },
      );
      sessionStorage.setItem("company-portal-session", result.access_token);
      setToken(result.access_token);
      setInvite("");
      setPassword("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No s’ha pogut iniciar sessió.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function chooseWinner(groupId: number) {
    if (
      !data ||
      !confirm(
        "Confirmar aquest projecte com a proposta privada de guanyador? No es publicarà el resultat.",
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/events/${eventId}/winner`, token, "PUT", {
        version: data.version,
        group_id: groupId,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No s’ha pogut desar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="company-portal">
      <header className="company-header">
        <Link
          href="/"
          className="company-live-brand"
          aria-label="HackEPS Live"
          onClick={(e) => {
            if (
              dirty.current &&
              !confirm("Hi ha notes sense desar. Vols descartar-les?")
            )
              e.preventDefault();
          }}
        >
          <Image
            src="/hackeps/isotip.svg"
            alt="HackEPS"
            width={64}
            height={40}
          />
          <span>LIVE</span>
        </Link>
        <span className="company-header-title">Portal d’empreses</span>
        {token && (
          <Button
            onClick={() =>
              navigate(() => {
                void api("/logout", token, "POST").catch(() => {});
                sessionStorage.removeItem("company-portal-session");
                setToken("");
                setData(null);
                setEventId("");
                setEvents([]);
                setSelected(null);
                setComparison([]);
              })
            }
          >
            Sortir
          </Button>
        )}
      </header>
      <div className="company-content">
        {data && (
          <div className="company-identity">
            <CompanyLogo name={data.company} />
            <div>
              <p className="company-eyebrow">Espai de valoració</p>
              <h1>{data.company}</h1>
            </div>
          </div>
        )}
        {error && (
          <p className="company-error" role="alert">
            {error}
          </p>
        )}
        {!ready ? (
          <p>Carregant…</p>
        ) : !token ? (
          <form className="company-card company-login" onSubmit={authenticate}>
            <Image
              className="company-edition-logo"
              src="/hackeps/logo-taronja.webp"
              alt="HackEPS"
              width={140}
              height={154}
            />
            <p className="company-eyebrow">Jurat i empreses</p>
            <h1>
              {invite
                ? "Crea la contrasenya de l’empresa"
                : "Accés de l’empresa"}
            </h1>
            <p>Un compte compartit, disponible des de diversos dispositius.</p>
            {!invite && (
              <label>
                Correu electrònic
                <Input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            <label>
              Contrasenya
              <Input
                type="password"
                required
                minLength={invite ? 8 : 1}
                maxLength={256}
                autoComplete={invite ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {invite && (
              <p>
                Inclou majúscules, minúscules i un número. Si restableixes la
                contrasenya, es tancaran les altres sessions.
              </p>
            )}
            <Button disabled={busy}>
              {busy ? "Entrant…" : invite ? "Activar el compte" : "Entrar"}
            </Button>
            <p>
              Per obtenir accés o restablir la contrasenya, demana una nova
              invitació a l’organització.
            </p>
          </form>
        ) : (
          <>
            <label>
              Esdeveniment
              <select
                value={eventId}
                onChange={(e) =>
                  navigate(() => {
                    setEventId(e.target.value);
                    setData(null);
                    setSelected(null);
                    setComparison([]);
                    setRoom("");
                  })
                }
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            {!events.length && (
              <p>
                No tens cap esdeveniment assignat. Contacta amb l’organització.
              </p>
            )}
            {data && (
              <>
                {view === "now" && (
                  <>
                    <label>
                      Sala
                      <select
                        value={activeRoom}
                        onChange={(e) =>
                          navigate(() => {
                            setRoom(e.target.value);
                            setSelected(null);
                          })
                        }
                      >
                        {data.rooms.map((value) => (
                          <option key={value} value={value}>
                            {data.room_labels[value] || value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <section className="company-card company-timer">
                      <span>
                        {current
                          ? "Presentació en curs"
                          : "Esperant la següent presentació"}
                      </span>
                      <strong>{formatRemaining(remaining)}</strong>
                      {remaining !== null && remaining <= 0 && (
                        <p>Temps finalitzat</p>
                      )}
                      {current && selected !== current.group_id && (
                        <Button
                          onClick={() =>
                            navigate(() => setSelected(current.group_id))
                          }
                        >
                          Veure el projecte que s’està presentant
                        </Button>
                      )}
                    </section>
                    {project ? (
                      <>
                        <article className="company-card">
                          <span>{project.challenge}</span>
                          <h1>{project.title}</h1>
                          <p>
                            {project.team} · {project.members.join(", ")}
                          </p>
                          <p className="company-description">
                            {project.description || "Descripció no disponible."}
                          </p>
                          {safeUrl(project.url) && (
                            <a
                              href={project.url!}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Veure projecte a Devpost ↗
                            </a>
                          )}
                          {safeUrl(project.repository_url) && (
                            <p>
                              <a
                                href={project.repository_url!}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Repositori ↗
                              </a>
                            </p>
                          )}
                          {safeUrl(project.demo_url) && (
                            <p>
                              <a
                                href={project.demo_url!}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Demo / vídeo ↗
                              </a>
                            </p>
                          )}
                        </article>
                        <Notes
                          key={`${eventId}:${project.id}`}
                          project={project}
                          token={token}
                          eventId={eventId}
                          onDirty={onDirty}
                          onSaved={() =>
                            void load().catch(() =>
                              setError(
                                "Notes desades; no s’ha pogut actualitzar la llista.",
                              ),
                            )
                          }
                        />
                      </>
                    ) : (
                      <p>
                        Selecciona un projecte o espera que comenci una
                        presentació.
                      </p>
                    )}
                  </>
                )}
                {view === "projects" && (
                  <>
                    <h1>Projectes</h1>
                    <label>
                      Cercar
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={onlyFavorites}
                        onChange={(e) => setOnlyFavorites(e.target.checked)}
                      />{" "}
                      Només favorits
                    </label>
                    <div className="company-grid">
                      {data.projects
                        .filter(
                          (p) =>
                            (!onlyFavorites || p.note.favorite) &&
                            `${p.title} ${p.team}`
                              .toLocaleLowerCase()
                              .includes(query.toLocaleLowerCase()),
                        )
                        .map((p) => (
                          <article className="company-card" key={p.id}>
                            <h2>{p.title}</h2>
                            <p>
                              {p.team} ·{" "}
                              {p.note.version
                                ? "Amb valoració"
                                : "Pendent de valorar"}
                            </p>
                            <p>
                              {p.note.score === null
                                ? "Sense puntuació"
                                : `${p.note.score}/10`}
                            </p>
                            <Button
                              onClick={() =>
                                navigate(() => {
                                  setSelected(p.id);
                                  setView("now");
                                })
                              }
                            >
                              Veure i anotar
                            </Button>
                            <label>
                              <input
                                type="checkbox"
                                checked={comparison.includes(p.id)}
                                disabled={
                                  !comparison.includes(p.id) &&
                                  comparison.length >= 4
                                }
                                onChange={(e) =>
                                  setComparison(
                                    e.target.checked
                                      ? [...comparison, p.id]
                                      : comparison.filter((id) => id !== p.id),
                                  )
                                }
                              />{" "}
                              Comparar
                            </label>
                          </article>
                        ))}
                    </div>
                  </>
                )}
                {view === "compare" && (
                  <>
                    <h1>Comparar projectes</h1>
                    <p>
                      Selecciona fins a quatre projectes a la llista. La
                      proposta de guanyador és privada.
                    </p>
                    <div className="company-grid">
                      {data.projects
                        .filter((p) => comparison.includes(p.id))
                        .map((p) => (
                          <article className="company-card" key={p.id}>
                            <h2>{p.title}</h2>
                            <p>{p.team}</p>
                            <p>Puntuació: {p.note.score ?? "—"}</p>
                            <p className="company-description">
                              {p.note.text || "Sense notes"}
                            </p>
                            <p>{p.note.favorite ? "★ Favorit" : ""}</p>
                            <Button
                              disabled={busy}
                              onClick={() => void chooseWinner(p.id)}
                            >
                              {data.winner_id === p.id
                                ? "Guanyador proposat ✓"
                                : "Proposar guanyador"}
                            </Button>
                          </article>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
            <nav className="company-bottom" aria-label="Portal d’empreses">
              {[
                ["now", "Ara"],
                ["projects", "Projectes"],
                ["compare", `Comparar (${comparison.length})`],
              ].map(([key, label]) => (
                <Button
                  key={key}
                  aria-pressed={view === key}
                  onClick={() => navigate(() => setView(key))}
                >
                  {label}
                </Button>
              ))}
            </nav>
          </>
        )}
      </div>
    </main>
  );
}
