/* 거시경제·투자 레이더 service worker
 * 전략
 *  - 앱 셸(index.html)과 데이터(data/market_state.json): network-first
 *    → 새 배포·매일 07:00/16:00 데이터 갱신이 재설치 없이 즉시 반영
 *  - 아이콘·매니페스트 등 정적 자산: cache-first (오프라인 보장)
 * 캐시 이름을 바꾸면(예: macro-radar-v2) 활성화 시 이전 캐시를 모두 지웁니다.
 */
var CACHE = 'macro-radar-v1';
var PRECACHE = [
  './', './index.html', './manifest.json', './data/market_state.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon.png', './favicon-32.png'
];

function isRefreshable(url) {
  var p = url.pathname;
  return p.endsWith('/') || p.endsWith('/index.html') || p.endsWith('/data/market_state.json');
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(PRECACHE.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || isRefreshable(url)) {
    e.respondWith(networkFirst(req));
    return;
  }
  e.respondWith(cacheFirst(req));
});

function networkFirst(req) {
  var key = req.mode === 'navigate' ? './index.html' : req.url;
  return fetch(req.url, { cache: 'no-store', credentials: 'same-origin' })
    .then(function (res) {
      if (res && res.ok) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(key, cp); }).catch(function () {});
      }
      return res;
    })
    .catch(function () {
      return caches.match(req, { ignoreSearch: true })
        .then(function (hit) { return hit || caches.match(key) || caches.match('./index.html'); })
        .then(function (hit) {
          if (hit) return hit;
          throw new Error('offline');
        });
    });
}

function cacheFirst(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); }).catch(function () {});
      }
      return res;
    });
  });
}
