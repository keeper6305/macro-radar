/* 거시경제·투자 레이더 service worker
 * 전략
 *  - 앱 셸(index.html)과 데이터(data/market_state.json): network-first
 *    → 새 배포·매일 07:00/16:35 데이터 갱신이 재설치 없이 즉시 반영
 *  - 아이콘·매니페스트 등 정적 자산: cache-first (오프라인 보장)
 * 캐시 이름을 바꾸면(예: macro-radar-v7) 활성화 시 이전 캐시를 모두 지웁니다.
 *
 * 주의
 *  - 내비게이션 응답을 모두 './index.html' 키로 저장하면 점검(qa)·문서 페이지를 한 번 열었을 때
 *    앱 껍데기 캐시가 그 문서로 덮어써진다. 앱 셸 주소일 때만 그 키를 쓰고, 나머지는 URL별로 저장한다.
 *  - ?qa=1 점검 모드는 서비스워커가 개입하지 않는다(항상 네트워크).
 */
var CACHE = 'macro-radar-v9-3';
var PRECACHE = [
  './', './index.html', './manifest.json', './data/market_state.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon.png', './favicon-32.png', './favicon-16.png', './favicon.svg'
];

function isShell(url) {
  var p = url.pathname;
  return p.endsWith('/') || p.endsWith('/index.html');
}
function isRefreshable(url) {
  var p = url.pathname;
  return p.endsWith('/data/market_state.json');
}
function offlineResponse() {
  return new Response('오프라인 상태입니다. 연결 후 다시 열어 주세요.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
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
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE && k.indexOf('macro-radar') === 0;
      }).map(function (k) { return caches.delete(k); }));
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
  /* 점검 모드는 캐시를 쓰지 않는다 */
  if (url.search.indexOf('qa=1') >= 0) return;

  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, isShell(url) ? './index.html' : url.href));
    return;
  }
  if (isRefreshable(url)) {
    e.respondWith(networkFirst(req, req.url));
    return;
  }
  e.respondWith(cacheFirst(req));
});

function networkFirst(req, cacheKey) {
  var key = cacheKey || req.url;
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
        .then(function (hit) { return hit || caches.match(key); })
        .then(function (hit) {
          return hit || offlineResponse();
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
