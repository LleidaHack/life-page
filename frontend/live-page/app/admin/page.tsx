"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  adminLogin,
  fetchAlertHistory,
  fetchNotificationStats,
  sendAlert,
  type AlertLevel,
  type AlertMessage,
  type NotificationStats,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hackeps-admin-token";

type StoredToken = {
  token: string;
  expiresAt: string;
};

const LEVEL_OPTIONS: { value: AlertLevel; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "danger", label: "Danger" },
];

const LEVEL_BADGE_STYLES: Record<AlertLevel, string> = {
  info: "bg-sky-100 text-sky-700 border-sky-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-red-100 text-red-700 border-red-200",
};

type LoginFormState = {
  username: string;
  password: string;
};

type AlertFormState = {
  title: string;
  message: string;
  level: AlertLevel;
};

export default function AdminPage() {
  const [tokenInfo, setTokenInfo] = useState<StoredToken | null>(null);
  const [loginForm, setLoginForm] = useState<LoginFormState>({ username: "", password: "" });
  const [alertForm, setAlertForm] = useState<AlertFormState>({
    title: "",
    message: "",
    level: "info",
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [history, setHistory] = useState<AlertMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as StoredToken;
      if (parsed?.token && parsed?.expiresAt) {
        const expiresAt = new Date(parsed.expiresAt);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        setTokenInfo(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const token = tokenInfo?.token ?? null;
  const tokenExpiresAt = useMemo(() => {
    if (!tokenInfo) return null;
    const parsed = new Date(tokenInfo.expiresAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [tokenInfo]);
  const isTokenExpired = tokenExpiresAt ? tokenExpiresAt.getTime() <= Date.now() : false;

  const handleLogin = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoginLoading(true);
      setLoginError(null);
      try {
        const response = await adminLogin(loginForm.username, loginForm.password);
        const stored: StoredToken = {
          token: response.access_token,
          expiresAt: response.expires_at,
        };
        setTokenInfo(stored);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        }
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : "Error iniciant sessio³");
      } finally {
        setLoginLoading(false);
      }
    },
    [loginForm]
  );

  const handleLogout = useCallback(() => {
    setTokenInfo(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (isTokenExpired && tokenInfo) {
      handleLogout();
    }
  }, [handleLogout, isTokenExpired, tokenInfo]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await fetchAlertHistory();
      setHistory(data);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "No sha pogut carregar lhistorial");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadStats = useCallback(async () => {
    if (!token || isTokenExpired) {
      setStats(null);
      return;
    }
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await fetchNotificationStats(token);
      setStats(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No shan pogut carregar les estadistiques";
      setStatsError(message);
      if (message.includes("401")) {
        handleLogout();
      }
    } finally {
      setStatsLoading(false);
    }
  }, [handleLogout, isTokenExpired, token]);

  useEffect(() => {
    if (!token || isTokenExpired) return;
    loadStats();
    const id = setInterval(loadStats, 10000);
    return () => clearInterval(id);
  }, [isTokenExpired, loadStats, token]);

  const handleSendAlert = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!token || isTokenExpired) {
        setAlertFeedback("Cal iniciar sessio abans denviar alertes.");
        return;
      }
      if (!alertForm.message.trim()) {
        setAlertFeedback("El missatge es obligatori.");
        return;
      }

      setSendingAlert(true);
      setAlertFeedback(null);
      try {
        const response = await sendAlert(token, {
          message: alertForm.message.trim(),
          title: alertForm.title.trim() || null,
          level: alertForm.level,
        });
        setAlertFeedback("Alerta enviada correctament.");
        setAlertForm((prev) => ({ ...prev, message: "" }));
        setHistory((prev) => [response.alert, ...prev].slice(0, 50));
        loadStats();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error enviant alerta. Revisa el token.";
        setAlertFeedback(message);
        if (message.includes("401")) {
          handleLogout();
        }
      } finally {
        setSendingAlert(false);
      }
    },
    [alertForm, handleLogout, isTokenExpired, loadStats, token]
  );

  const inputClasses =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

  const isAuthenticated = Boolean(token) && !isTokenExpired;

  const lastAlertReadable = useMemo(() => {
    if (!stats?.last_alert_at) return "Encara no s'ha enviat cap alerta.";
    try {
      return new Date(stats.last_alert_at).toLocaleString("ca-ES", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return stats.last_alert_at;
    }
  }, [stats]);

  const expiresInLabel = useMemo(() => {
    if (!tokenExpiresAt) return "Sense token actiu";
    const diffMs = tokenExpiresAt.getTime() - Date.now();
    if (diffMs <= 0) return "Token caducat";
    const minutes = Math.floor(diffMs / 60000);
    return minutes < 1 ? "Menys d&apos;1 minut" : `${minutes} min restants`;
  }, [tokenExpiresAt]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f7f2] px-4 py-16 text-slate-900">
        <div className="mx-auto flex max-w-5xl flex-col gap-12 md:flex-row md:items-center">
          <div className="space-y-6">
          </div>
          <Card className="w-full border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900 text-center">Inici Sessió</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="py-2">
                  <label className="text-sm text-slate-600 py-2">Usuari</label>
                  <input
                    className={inputClasses}
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="admin"
                    autoComplete="username"
                  />
                </div>
                <div className="py-2">
                  <label className="text-sm text-slate-600">Contrasenya</label>
                  <input
                    className={inputClasses}
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="*******"
                    autoComplete="current-password"
                  />
                </div>
                {loginError && <p className="text-sm text-red-500">{loginError}</p>}
                <Button type="submit" className="w-full bg-white text-black border-black" disabled={loginLoading}>
                  {loginLoading ? "Validant..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fefcf7] px-4 py-16 text-slate-900">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold text-slate-900">Panell dorganitzacio</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-700">
              Sessio Cadcua en:{expiresInLabel}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Tancar sessió
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Stats</h2>
            <Button variant="outline" onClick={loadStats} disabled={statsLoading}>
              {statsLoading ? "Actualitzantâ€¦" : "Refresca"}
            </Button>
          </div>
          {statsError && <p className="text-sm text-red-500">{statsError}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Clients connectats
              </p>
              <p className="mt-2 text-4xl font-semibold text-slate-900">
                {stats ? stats.connected_clients : "0”"}
              </p>
              <p className="text-sm text-slate-500">Connexions WebSocket actives</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Alertes recents</p>
              <p className="mt-2 text-4xl font-semibold text-slate-900">
                {stats ? stats.recent_alerts : "0”"}
              </p>
              <p className="text-sm text-slate-500">Guardades a l&apos;historial</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Darrera alerta</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{lastAlertReadable}</p>
              <p className="text-sm text-slate-500">Actualitzat cada 10 segons</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-slate-200 bg-white text-slate-900 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-center">Enviar una alerta</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSendAlert}>
                <div>
                  <label className="text-sm text-slate-600">Títol</label>
                  <input
                    className={inputClasses}
                    value={alertForm.title}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="A dinar tots!"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Missatge *</label>
                  <textarea
                    className={cn(inputClasses, "min-h-[120px] resize-none text-base")}
                    value={alertForm.message}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="A dinar pesaos¦"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Nivell</label>
                  <select
                    className={cn(inputClasses, "bg-slate-50 text-base")}
                    value={alertForm.level}
                    onChange={(e) =>
                      setAlertForm((prev) => ({ ...prev, level: e.target.value as AlertLevel }))
                    }
                  >
                    {LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="text-slate-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {alertFeedback && <p className="text-sm text-slate-600">{alertFeedback}</p>}
                <Button type="submit" className="w-full bg-white text-black border-black" disabled={sendingAlert}>
                  {sendingAlert ? "Enviant..." : "Enviar alerta"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white text-slate-900 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Historial recent</CardTitle>
              </div>
              <Button variant="outline" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? "Actualitzant..." : "Refresca"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {historyError && <p className="text-sm text-red-500">{historyError}</p>}
              {!history.length && !historyError && (
                <p className="text-sm text-slate-600">Encara no hi ha  alerta.</p>
              )}
              <ul className="space-y-3">
                {history.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                          LEVEL_BADGE_STYLES[alert.level]
                        )}
                      >
                        {LEVEL_OPTIONS.find((opt) => opt.value === alert.level)?.label ??
                          alert.level}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(alert.created_at).toLocaleString("ca-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                    {alert.title && <p className="mt-2 text-base font-semibold">{alert.title}</p>}
                    <p className="text-base text-slate-700">{alert.message}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
