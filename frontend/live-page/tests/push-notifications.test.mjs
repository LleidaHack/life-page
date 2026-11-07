import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function worker(windows = []) {
  const events = {},
    notifications = [],
    messages = [],
    opened = [];
  const clients = windows.map((window) => ({
    ...window,
    postMessage: (message, ports) => {
      messages.push(message);
      // A Live page acknowledges; other visible pages ignore the message.
      if (window.ack !== false) ports?.[0]?.postMessage("shown");
    },
    focus: () => opened.push("focus"),
  }));
  vm.runInNewContext(
    readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
    {
      self: {
        addEventListener: (name, handler) => (events[name] = handler),
        registration: {
          showNotification: (...args) => notifications.push(args),
        },
      },
      clients: {
        matchAll: async () => clients,
        openWindow: async (url) => opened.push(url),
      },
      Date,
      MessageChannel,
      setTimeout,
      clearTimeout,
    },
  );
  return {
    notifications,
    messages,
    opened,
    async push(data) {
      let pending;
      events.push({
        data: { json: () => data },
        waitUntil: (promise) => (pending = promise),
      });
      await pending;
    },
    async click() {
      let pending;
      events.notificationclick({
        notification: { close() {} },
        waitUntil: (promise) => (pending = promise),
      });
      await pending;
    },
  };
}
const alert = {
  id: "alert-1",
  title: "Dinner",
  message: "Dinner is ready",
  event_id: 1,
  live: true,
};

test("visible Live receives the shared alert ID without a duplicate system notification", async () => {
  const w = worker([{ visibilityState: "visible" }]);
  await w.push(alert);
  assert.equal(w.notifications.length, 0);
  assert.equal(w.messages[0].type, "hackeps-alert");
  assert.equal(w.messages[0].alert.id, "alert-1");
  assert.equal(w.messages[0].event_id, 1);
});
test("visible window that does not show the alert still gets a system notification", async () => {
  const w = worker([{ visibilityState: "visible", ack: false }]);
  await w.push(alert);
  assert.equal(w.messages.length, 1);
  assert.equal(w.notifications.length, 1);
  assert.equal(w.notifications[0][1].tag, "alert-1");
});
test("background push uses a tagged system notification with sound permitted", async () => {
  const w = worker([{ visibilityState: "hidden" }]);
  await w.push(alert);
  assert.equal(w.notifications[0][1].tag, "alert-1");
  assert.equal(w.notifications[0][1].silent, false);
  assert.equal(w.messages.length, 0);
});
test("push-only destination stays a system notification even when Live is visible", async () => {
  const w = worker([{ visibilityState: "visible" }]);
  await w.push({ ...alert, live: false });
  assert.equal(w.notifications.length, 1);
  assert.equal(w.messages.length, 0);
});
test("expired announcements do not notify", async () => {
  const w = worker();
  await w.push({ ...alert, expires_at: "2000-01-01T00:00:00Z" });
  assert.equal(w.notifications.length, 0);
});
test("notification clicks reuse an existing Live window", async () => {
  const w = worker([{ visibilityState: "hidden" }]);
  await w.click();
  assert.deepEqual(w.opened, ["focus"]);
});
