/* Athar service worker: offline app shell, cached Quran text, capped audio cache */
const VERSION = 'v3';
const SHELL = `athar-shell-${VERSION}`;
const FONTS = 'athar-fonts';
const API = 'athar-quran-api';
const AUDIO = 'athar-audio';
const META = 'athar-meta';
const AUDIO_KEEP = 10;               // recordings kept for offline playback (least recently played go first)
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap';
const SHELL_FILES = ['./', './index.html', './css/style.css', './js/app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.all(SHELL_FILES.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await cacheFonts().catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('athar-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function cacheFonts() {
  const c = await caches.open(FONTS);
  const css = await fetch(FONT_CSS);
  if (!css.ok) return;
  await c.put(FONT_CSS, css.clone());
  const text = await css.text();
  const urls = [...new Set([...text.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]))];
  await Promise.all(urls.map(u => c.match(u).then(h => h || fetch(u).then(r => r.ok && c.put(u, r))).catch(() => {})));
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// network first, fall back to the cached copy (so fixes show up straight away when online)
async function networkFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  try {
    const res = await withTimeout(fetch(req), 5000);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}

/* ── audio: cache on play, keep the last AUDIO_KEEP recordings ── */
async function readLru() {
  const m = await (await caches.open(META)).match('lru');
  return m ? await m.json() : [];
}
async function writeLru(list) {
  await (await caches.open(META)).put('lru', new Response(JSON.stringify(list), { headers: { 'content-type': 'application/json' } }));
}
async function touchAudio(url) {
  let list = (await readLru()).filter(u => u !== url);
  list.push(url);
  const c = await caches.open(AUDIO);
  while (list.length > AUDIO_KEEP) await c.delete(list.shift());
  // drop anything stored but not tracked
  for (const k of await c.keys()) if (!list.includes(k.url)) await c.delete(k);
  await writeLru(list);
}
const downloading = new Set();
async function downloadAudio(url) {
  if (downloading.has(url)) return;
  downloading.add(url);
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok && res.status === 200) {
      await (await caches.open(AUDIO)).put(url, res);
      await touchAudio(url);
    }
  } catch (err) { /* offline or no CORS: playback still streams normally */ }
  finally { downloading.delete(url); }
}
async function serveAudio(event) {
  const req = event.request, url = req.url;
  const c = await caches.open(AUDIO);
  const hit = await c.match(url);
  if (!hit) {
    event.waitUntil(downloadAudio(url));
    return fetch(req);
  }
  event.waitUntil(touchAudio(url));
  const range = req.headers.get('range');
  if (!range) return hit;
  const blob = await hit.blob();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const size = blob.size;
  let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` }
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith(networkFirst(req, SHELL).catch(() => caches.match('./index.html')));
    } else {
      event.respondWith(networkFirst(req, SHELL));
    }
    return;
  }
  if (url.hostname === 'api.alquran.cloud') { event.respondWith(cacheFirst(req, API)); return; }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { event.respondWith(staleWhileRevalidate(req, FONTS)); return; }
  if (url.hostname === 'cdn.mp3quran.net' && url.pathname.endsWith('.mp3')) { event.respondWith(serveAudio(event)); return; }
});
