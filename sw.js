// 서비스 워커 - PWA 캐싱 및 오프라인 지원
const CACHE_NAME = 'memo-app-v1.0.0';
const CACHE_URLS = [
  '/memo/',
  '/memo/index.html',
  '/memo/style.css',
  '/memo/script.js',
  '/memo/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2'
];

// 설치 이벤트 - 캐시 생성
self.addEventListener('install', (event) => {
  console.log('서비스 워커 설치됨');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 생성 및 파일 저장');
        return cache.addAll(CACHE_URLS);
      })
      .catch((error) => {
        console.error('캐시 생성 실패:', error);
      })
  );
  
  // 즉시 활성화
  self.skipWaiting();
});

// 활성화 이벤트 - 구 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('서비스 워커 활성화됨');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('구 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 모든 클라이언트 제어
  self.clients.claim();
});

// Fetch 이벤트 - 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  // Firebase 요청은 캐시하지 않음
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis.com/identitytoolkit') ||
      event.request.url.includes('securetoken.googleapis.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시에서 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then((response) => {
            // 응답이 유효하지 않으면 그대로 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 응답을 복사하여 캐시에 저장
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // 네트워크 오류시 기본 오프라인 페이지 반환
            if (event.request.destination === 'document') {
              return caches.match('/memo/');
            }
          });
      })
  );
});

// 메시지 이벤트 - 클라이언트와 통신
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// 푸시 알림 (확장 가능)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/memo/icon-192.png',
      badge: '/memo/badge-72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: '메모 확인',
          icon: '/memo/checkmark.png'
        },
        {
          action: 'close',
          title: '닫기',
          icon: '/memo/xmark.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('메모장 알림', options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/memo/')
    );
  }
});

// 동기화 (백그라운드 동기화)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Firebase 동기화 로직은 메인 앱에서 처리
      console.log('백그라운드 동기화 트리거됨')
    );
  }
});

console.log('서비스 워커 로드 완료 - 메모장 PWA');