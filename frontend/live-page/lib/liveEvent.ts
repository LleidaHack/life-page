// Shared access to the LleidaHackBackend event-operations API.
export const liveApi = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

// Optional override; otherwise the current HackEPS edition is resolved from
// the backend, so a stale build-time default can never show an old event.
export const configuredEventId = process.env.NEXT_PUBLIC_EVENT_ID?.trim() || "";

let pending: Promise<string> | null = null;
export function resolveEventId(): Promise<string> {
  if (configuredEventId) return Promise.resolve(configuredEventId);
  pending ??= fetch(`${liveApi}/v1/event/get_hackeps`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw Error("HackEPS event not found");
      const event = await response.json();
      if (!event?.id) throw Error("HackEPS event not found");
      return String(event.id);
    })
    .catch((error) => {
      pending = null; // retry on the next call
      throw error;
    });
  return pending;
}
