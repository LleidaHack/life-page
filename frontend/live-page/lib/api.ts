const sanitizeBaseUrl = (value?: string | null) =>
  value?.replace(/\/+$/, "") ?? null;

const PUBLIC_API_BASE_URL = sanitizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
const INTERNAL_API_BASE_URL =
  sanitizeBaseUrl(process.env.API_INTERNAL_BASE_URL) ??
  PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

const buildPath = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return INTERNAL_API_BASE_URL;
  }
  return PUBLIC_API_BASE_URL ?? window.location.origin;
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

function buildApiUrl(path: string) {
  return `${resolveApiBaseUrl()}${buildPath(path)}`;
}

export type TimerResponse = {
  timezone: string;
  status: "pending" | "running" | "finished";
  start_datetime: string;
  end_datetime: string;
  now: string;
  seconds_until_start: number;
  seconds_elapsed: number;
  seconds_remaining: number;
};

export type Challenge = {
  id: number;
  empresa: string;
  titol: string;
  descripcio: string;
  badges: string[];
  premi: string | null;
  link: string | null;
};

export type Faq = {
  id?: number;
  question: string;
  answer: string;
};

export type ScheduleEntry = {
  location: string;
  start: string;
  end: string;
  title?: string;
  description?: string;
  Title?: string;
  Description?: string;
  showInMainPage?: boolean;
  link?: string | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  isRunningNow?: boolean;
};

export type ScheduleResponse = Record<string, ScheduleEntry[]>;

export type AlertLevel = "info" | "warning" | "success" | "danger";

export type AlertMessage = {
  id: string;
  title: string | null;
  message: string;
  level: AlertLevel;
  created_at: string;
};

export type NotificationStats = {
  connected_clients: number;
  recent_alerts: number;
  last_alert_at: string | null;
};

export type AdminLoginResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
  expires_in: number;
};

export type SendAlertRequest = {
  message: string;
  title?: string | null;
  level: AlertLevel;
};

export type SendAlertResponse = {
  status: "sent";
  alert: AlertMessage;
};

function assertResponseOk(response: Response, context: string) {
  if (!response.ok) {
    throw new Error(`${context} request failed (${response.status})`);
  }
}

export async function fetchTimer(signal?: AbortSignal): Promise<TimerResponse> {
  const response = await fetch(buildApiUrl("/timer"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "Timer");
  return response.json();
}

export async function fetchChallenges(signal?: AbortSignal): Promise<Challenge[]> {
  const response = await fetch(buildApiUrl("/challenges"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "Challenges");
  return response.json();
}

export async function fetchFaqs(signal?: AbortSignal): Promise<Faq[]> {
  const response = await fetch(buildApiUrl("/faq"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "FAQ");
  return response.json();
}

export async function fetchSchedule(signal?: AbortSignal): Promise<ScheduleResponse> {
  const response = await fetch(buildApiUrl("/schedule"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "Schedule");
  return response.json();
}

export async function adminLogin(
  username: string,
  password: string,
  signal?: AbortSignal
): Promise<AdminLoginResponse> {
  const response = await fetch(buildApiUrl("/notifications/admin/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "Admin login");
  return response.json();
}

export async function sendAlert(
  token: string,
  payload: SendAlertRequest,
  signal?: AbortSignal
): Promise<SendAlertResponse> {
  const response = await fetch(buildApiUrl("/notifications/alerts"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "Send alert");
  return response.json();
}

export async function fetchAlertHistory(signal?: AbortSignal): Promise<AlertMessage[]> {
  const response = await fetch(buildApiUrl("/notifications/alerts/history"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "Alert history");
  return response.json();
}

export async function deleteAlert(
  token: string,
  alertId: string,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(buildApiUrl(`/notifications/alerts/${alertId}`), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "Delete alert");
}

export async function fetchNotificationStats(
  token: string,
  signal?: AbortSignal
): Promise<NotificationStats> {
  const response = await fetch(buildApiUrl("/notifications/stats"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal,
  });

  assertResponseOk(response, "Notification stats");
  return response.json();
}
