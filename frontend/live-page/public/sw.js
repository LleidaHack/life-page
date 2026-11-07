// Screens stay open for days: take over as soon as a new worker is installed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

const ACK_TIMEOUT_MS = 1500;
// Resolves true only if a Live page for this event showed the alert. Visible
// windows that are not showing alerts (other pages, other events) do not ack.
function deliverToPage(client, message) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, ACK_TIMEOUT_MS);
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(true);
    };
    client.postMessage(message, [channel.port2]);
  });
}

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    (async () => {
      if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return;
      const windows = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const visible = windows.filter(
        (client) => client.visibilityState === "visible",
      );
      // The foreground toast and tone share the alert ID with WebSocket delivery.
      if (visible.length && data.live !== false && data.event_id != null) {
        const shown = await Promise.all(
          visible.map((client) =>
            deliverToPage(client, {
              type: "hackeps-alert",
              event_id: data.event_id,
              alert: data,
            }),
          ),
        );
        if (shown.some(Boolean)) return;
      }
      await self.registration.showNotification(data.title || "HackEPS", {
        body: data.message,
        tag: data.id,
        icon: "/tractor-icon.svg",
        silent: false,
        data: { url: "/" },
      });
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (windows.length) return windows[0].focus();
      return clients.openWindow("/");
    })(),
  );
});
