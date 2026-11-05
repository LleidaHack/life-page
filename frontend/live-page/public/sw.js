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
        visible.forEach((client) =>
          client.postMessage({
            type: "hackeps-alert",
            event_id: data.event_id,
            alert: data,
          }),
        );
        return;
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
