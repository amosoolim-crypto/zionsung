// 시온성교회 홈페이지 서비스 워커
// - 18. PWA 오프라인 지원(핵심 페이지 캐시)
// - 19. 공지 푸시 알림 (Firebase Cloud Messaging)

// ---------- 19. FCM 백그라운드 알림 ----------
// index.html과 동일한 firebaseConfig를 그대로 씁니다.
// (공개 웹 API 키라 여기 노출돼도 안전합니다 - 접근 제어는 Firestore 규칙이 담당)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDrFtnaRBeQCwufSJvJI9LE0PyYP6Ba4uM",
  authDomain: "amosoo.firebaseapp.com",
  projectId: "amosoo",
  storageBucket: "amosoo.firebasestorage.app",
  messagingSenderId: "202449237451",
  appId: "1:202449237451:web:27395cc8d94540ade2724e"
});

try {
  var messaging = firebase.messaging();
  messaging.onBackgroundMessage(function (payload) {
    var title = (payload.notification && payload.notification.title) || '시온성교회 공지';
    var options = {
      body: (payload.notification && payload.notification.body) || '새로운 소식이 있어요.',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png'
    };
    self.registration.showNotification(title, options);
  });
} catch (e) {
  console.warn('FCM 백그라운드 핸들러 초기화 실패:', e);
}

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

// 참고: 'push' 이벤트는 위 firebase.messaging().onBackgroundMessage()가
// 대신 처리하므로 여기서 따로 리스너를 달면 알림이 중복으로 뜹니다.

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
