// Keeps a copy of the app on the device, so the laptop page and the phone
// page open without internet once they have been opened before.
//
// The pages and the files they load are kept together as one release, and
// every file is requested with its ?v= version, so a page never gets
// scripts from another release. npm run stamp changes VERSION too: the
// browser then fetches the new release in the background and uses it from
// the next time the page opens. Until then the old copy keeps working.
//
// On localhost the network comes first, so changes show up straight away
// while developing; the copy is only used when the server is down.
const VERSION = '20261022170120';
const CACHE = 'hussel-' + VERSION;
const FONTS = 'hussel-fonts';
const PAGES = ['./', 'index.html', 'player.html', 'speler.html'];
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].indexOf(self.location.hostname) !== -1;

// The files a page loads, read from its own script and stylesheet tags, so
// no list has to be kept up to date by hand.
function filesOf(html) {
  const files = [];
  const pattern = /(?:src|href)="([a-z0-9./-]+\.(?:js|css)(?:\?v=[0-9]+)?)"/g;
  let match;
  while ((match = pattern.exec(html))) files.push(match[1]);
  return files;
}

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(CACHE);
    const files = {};
    for (const page of PAGES) {
      const response = await fetch(page, { cache: 'no-cache' });
      if (!response.ok) throw new Error(page + ': ' + response.status);
      await cache.put(page, response.clone());
      for (const file of filesOf(await response.text())) files[file] = true;
    }
    await cache.addAll(Object.keys(files));
    await self.skipWaiting();
  })());
});

// Old releases go once the new one is complete.
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    for (const name of await caches.keys()) {
      if (name !== CACHE && name !== FONTS) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

async function fromCopy(request, key) {
  const copy = await caches.match(key, { cacheName: CACHE });
  return copy || fetch(request);
}

async function fromNetwork(request, key) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE)).put(key, response.clone());
    return response;
  } catch (error) {
    const copy = await caches.match(key, { cacheName: CACHE });
    if (copy) return copy;
    throw error;
  }
}

// Fonts are kept from the first time they come through; without them the
// pages fall back to the system font.
async function font(request) {
  const cache = await caches.open(FONTS);
  const copy = await cache.match(request);
  if (copy) return copy;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(font(request));
    return;
  }
  // Everything else elsewhere, such as the PeerJS server, goes past.
  if (url.origin !== self.location.origin) return;
  // A page is the same page whatever ?session= code follows it.
  const key = request.mode === 'navigate' ? url.origin + url.pathname : request;
  event.respondWith(LOCAL ? fromNetwork(request, key) : fromCopy(request, key));
});
