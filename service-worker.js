// 시온성교회 홈페이지 서비스 워커
// - 18. PWA 오프라인 지원(핵심 페이지 캐시 + 오프라인 폴백)
// - 19. 공지 푸시 알림 (Firebase Cloud Messaging)
// - 21. 새 버전 자동 업데이트 감지

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

// ---------- 18. 오프라인 캐시 ----------
// 버전을 올리면(v1 -> v2) 예전 캐시는 activate 단계에서 자동 삭제됩니다.
var CACHE_NAME = 'zionsung-v2';
var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './home-screen-guide.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).catch(function (err) {
      console.warn('서비스워커 캐시 실패:', err);
    })
  );
  // 새 서비스워커가 설치되면 대기하지 않고 바로 활성화 대상이 됩니다.
  // (실제 적용은 아래 SKIP_WAITING 메시지 또는 자동 갱신 시점에 이뤄짐)
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

// ---------- 21. 페이지 요청으로 즉시 업데이트 적용 ----------
// index.html에서 "새 버전이 있어요" 배너의 새로고침 버튼을 누르면
// navigator.serviceWorker.controller.postMessage('SKIP_WAITING') 을 호출합니다.
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 네트워크 우선, 실패하면 캐시로 폴백 (오프라인에서도 홈페이지가 열리도록)
// 페이지 이동(navigate) 요청은 캐시에도 없으면 index.html로 최종 폴백합니다.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') { return; }
  event.respondWith(
    fetch(event.request)
      .then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, resClone); });
        return res;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          if (cached) { return cached; }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return undefined;
        });
      })
  );
});

// 참고: 'push' 이벤트는 위 firebase.messaging().onBackgroundMessage()가
// 대신 처리하므로 여기서 따로 리스너를 달면 알림이 중복으로 뜹니다.

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
