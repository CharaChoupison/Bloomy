// Service worker de Bloomy : l'app reste consultable sans réseau (métro, mode avion).
//
// - Écrans (navigations) : réseau d'abord ; en cas d'échec, la dernière version vue de l'écran.
//   Chaque écran chargé avec succès est gardé, pour cet appareil seulement.
// - Fichiers de l'app (/_next/static, icônes) : versionnés par Next, servis depuis le cache.
// - Jamais en cache : API, actions serveur (POST), connexion, réponses en erreur ou redirigées.
// - Notifications (push) : affichées telles qu'envoyées par le serveur (voir lib/push), le toucher
//   ouvre l'écran concerné.
// - Déconnexion ou session expirée (passage par /login) : les écrans gardés sont effacés, pour que
//   personne ne puisse relire les données de l'élève sur l'appareil.
//
// Pour tout invalider, changer VERSION.
const VERSION = "v1";
const PAGES = `bloomy-pages-${VERSION}`;
const STATIC = `bloomy-static-${VERSION}`;
const NETWORK_TIMEOUT_MS = 6000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("bloomy-") && k !== PAGES && k !== STATIC).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
});

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    // Message illisible : on affiche quand même quelque chose (obligatoire pour les notifications web).
  }
  const title = typeof message.title === "string" ? message.title : "Bloomy";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof message.body === "string" ? message.body : "",
      tag: typeof message.tag === "string" ? message.tag : undefined,
      data: { url: typeof message.url === "string" && message.url.startsWith("/") ? message.url : "/" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      lang: "fr",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(target).catch(() => {});
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});

const isLogin = (url) => url.pathname === "/login";
const isStatic = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isLogin(url)) {
    event.waitUntil(caches.delete(PAGES));
    return;
  }
  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate" && !url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.redirected && isLogin(new URL(response.url))) {
      await caches.delete(PAGES); // session expirée : on oublie tout
    } else if (response.ok && !response.redirected) {
      await cache.put(cacheKey(request), response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(cacheKey(request));
    return cached ?? offlinePage();
  }
}

/** Les paramètres (semaine, période…) changent le contenu : on les garde, mais pas le fragment. */
function cacheKey(request) {
  const url = new URL(request.url);
  url.hash = "";
  return url.href;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function offlinePage() {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Hors ligne · Bloomy</title>
<style>
:root{color-scheme:light dark;--bg:#f5f5f7;--ink:#1c1c1e;--muted:#6b6b73;--accent:#2156d9;--on:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0d;--ink:#f2f2f4;--muted:#9a9aa3;--accent:#86aefc;--on:#0b0b0d}}
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:var(--bg);color:var(--ink);
font:15px/1.45 system-ui,-apple-system,sans-serif;padding:24px;box-sizing:border-box;text-align:center}
h1{font-size:22px;margin:0 0 8px}p{color:var(--muted);margin:0 0 24px;max-width:320px}
button{font:inherit;font-weight:600;min-height:44px;padding:0 24px;border:0;border-radius:999px;background:var(--accent);color:var(--on)}
</style></head><body><main>
<h1>Pas de connexion</h1>
<p>Cet écran n'a pas encore été ouvert sur cet appareil, il n'est donc pas disponible hors ligne.</p>
<button type="button" onclick="location.reload()">Réessayer</button>
</main></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
