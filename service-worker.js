// 시온성교회 홈페이지 서비스 워커
// - 18. PWA 오프라인 지원(핵심 페이지 캐시)
// - 19. 공지 푸시 알림 골격(FCM 등 실제 발송 서버 연결 전까지는 동작하지 않습니다)

var CACHE_NAME = 'zionsung-v1';
var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).catch(function (err) {
      console.warn('서비스워커 캐시 실패:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// 네트워크 우선, 실패하면 캐시로 폴백 (오프라인에서도 홈페이지가 열리도록)
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') { return; }
  event.respondWith(
    fetch(event.request)
      .then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, resClone); });
        return res;
      })
      .catch(function () { return caches.match(event.request); })
  );
});

// ---------- 19. 공지 푸시 알림 (골격) ----------
// 실제로 알림이 오려면 Firebase Cloud Messaging(FCM)을 켜고 VAPID 키를 발급받아
// 이 파일과 index.html에 연동 코드를 추가해야 합니다. (Firebase 콘솔 > 프로젝트 설정 >
// 클라우드 메시징 > 웹 구성 > 키 쌍 생성). 지금은 서버가 없어 알림이 발송되지 않지만,
// 나중에 서버(또는 Firebase Functions)에서 푸시를 보내면 아래 코드가 알림을 띄웁니다.
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  var title = data.title || '시온성교회 공지';
  var options = {
    body: data.body || '새로운 소식이 있어요.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
