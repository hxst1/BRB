/*
 * Service worker de la app.
 * - Sin conexión: las navegaciones que fallan muestran /offline.
 * - Notificaciones push: las muestra y, al tocarlas, abre la pantalla indicada.
 * No cachea nada más: el resto va siempre a la red.
 */
const CACHE = "offline-v2";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    (async () => {
      // Si ya está mirando justo esa pantalla, sobra el aviso.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const watching = windows.some(
        (client) => client.focused && client.visibilityState === "visible" && new URL(client.url).pathname === data.url,
      );
      if (watching) return;

      await self.registration.showNotification(data.title || "Tienes novedades", {
        body: data.body,
        tag: data.tag,
        renotify: Boolean(data.tag),
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        data: { url: data.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const ours = windows.filter((client) => new URL(client.url).origin === self.location.origin);
      // La ventana de la app antes que la web metida en la extensión (un iframe).
      const existing = ours.find((client) => client.frameType === "top-level") || ours[0];
      if (existing) {
        await existing.focus().catch(() => undefined);
        // navigate() no existe en iPhone y falla en las ventanas que este service
        // worker no controla: entonces le pide a la propia app que cambie de página.
        try {
          if (existing.navigate && (await existing.navigate(url))) return;
        } catch {
          // Sigue abajo.
        }
        existing.postMessage({ type: "navigate", url });
        return;
      }
      return self.clients.openWindow(url);
    })(),
  );
});
