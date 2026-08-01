/* Optional companion for hosted deployments: gives the app real offline
   support, instant loads, and somewhere for reminders to be delivered.
   Drop it next to index.html. */
const CACHE = "todo-v3";

self.addEventListener("install", (e) => {
  /* No skipWaiting here: a new version waits until the person taps Update, so
     the page is never swapped out from under them mid-sentence. */
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./"])));
});

/* The page asks for the swap when the person is ready. */
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network first, cache fallback: always fresh when online, always available offline. */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./")))
  );
});

/* Tapping a reminder opens the app rather than a second copy of it. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      for (const client of all) if ("focus" in client) return client.focus();
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
