/** Service worker routing and precache rules. Pure functions, no browser globals required. */

export const SW_PATH = '/sw.js';
export const FALLBACK_DOC = '/index.html';
export const CACHE_PREFIX = 'mini-arcade-';

export type SwRequestInfo = {
  method: string;
  pathname: string;
  mode?: string;
  destination?: string;
  upgrade?: string | null;
};

export type FetchPlan = 'bypass' | 'navigate' | 'cache-first';

export function normalizePathname(path: string): string {
  if (!path) return '/';
  const trimmed = path.split('?')[0].split('#')[0];
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function isApiPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path === '/api' || path.startsWith('/api/');
}

export function isWebSocketUpgrade(upgrade: string | null | undefined): boolean {
  return (upgrade ?? '').trim().toLowerCase() === 'websocket';
}

export function isApiOrWebSocket(req: SwRequestInfo): boolean {
  return isWebSocketUpgrade(req.upgrade) || isApiPath(req.pathname);
}

export function isNavigationRequest(req: SwRequestInfo): boolean {
  return req.mode === 'navigate' || req.destination === 'document';
}

export function planFetch(req: SwRequestInfo): FetchPlan {
  if (req.method.toUpperCase() !== 'GET') return 'bypass';
  if (isApiOrWebSocket(req)) return 'bypass';
  if (isNavigationRequest(req)) return 'navigate';
  return 'cache-first';
}

/** Files the generated service worker may precache. Never include /sw.js or /api/*. */
export function shouldPrecachePath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === SW_PATH || isApiPath(path)) return false;
  if (path.endsWith('.map')) return false;
  if (path === '/' || path === FALLBACK_DOC) return true;
  if (path === '/manifest.webmanifest' || path === '/apple-touch-icon.png') return true;
  if (path.startsWith('/icons/')) return true;
  if (path.startsWith('/assets/')) return true;
  return false;
}

export function toPrecacheUrl(relativePath: string): string {
  const posix = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (posix === 'index.html') return FALLBACK_DOC;
  return normalizePathname(posix.startsWith('/') ? posix : `/${posix}`);
}

export function selectPrecacheUrls(relativePaths: readonly string[]): string[] {
  const urls = new Set<string>();
  for (const rel of relativePaths) {
    const url = toPrecacheUrl(rel);
    if (shouldPrecachePath(url)) urls.add(url);
  }
  if (urls.size > 0) urls.add(FALLBACK_DOC);
  return [...urls].sort();
}

export function cacheNameFor(version: string): string {
  return CACHE_PREFIX + version;
}

export function renderServiceWorker(version: string, precache: readonly string[]): string {
  const list = JSON.stringify(precache, null, 2);
  const cache = cacheNameFor(version);
  return `/* Generated. Do not edit by hand. cache ${cache} */
const VERSION = ${JSON.stringify(version)};
const CACHE_NAME = ${JSON.stringify(cache)};
const PRECACHE = ${list};
const FALLBACK_DOC = ${JSON.stringify(FALLBACK_DOC)};
const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)};

function pathnameOf(request) {
  try { return new URL(request.url).pathname; } catch { return '/'; }
}

function isApiOrWebSocket(request) {
  const upgrade = request.headers.get('Upgrade');
  if (upgrade && upgrade.trim().toLowerCase() === 'websocket') return true;
  const path = pathnameOf(request);
  return path === '/api' || path.startsWith('/api/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiOrWebSocket(request)) return;
  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(FALLBACK_DOC);
        return cached || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return fetch(request);
  })());
});
`;
}
