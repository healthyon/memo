// 서비스 워커 - PWA 캐싱 및 오프라인 지원 (최적화)
const CACHE_NAME = 'memo-app-v1.0.4';
const STATIC_CACHE = 'memo-static-v1.0.4';
const DYNAMIC_CACHE = 'memo-dynamic-v1.0.4';

const CACHE_URLS = [
  '.',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// 프리로딩 최적화
const PRIORITY_RESOURCES = ['./index.html', './style.css'];
const LAZY_RESOURCES = ['./script.js', './manifest.json'];

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2'
];

const FIREBASE_URLS = [
  'firebase',
  'firestore',
  'googleapis.com/identitytoolkit',
  'securetoken.googleapis.com',
  'gstatic.com/firebasejs'
];

// 설치 이벤트 - 우선순위 기반 캐싱
self.addEventListener('install', (event) => {
  console.log('서비스 워커 설치됨');
  
  event.waitUntil(
    Promise.all([
      // 우선순위 리소스 먼저 캐시
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('우선순위 리소스 캐시');
        await cache.addAll(PRIORITY_RESOURCES);
        
        // 나머지 리소스 백그라운드 캐시
        setTimeout(() => {
          cache.addAll(LAZY_RESOURCES).catch(console.warn);
        }, 100);
      }),
      // 폰트 캐시 (백그라운드)
      caches.open(DYNAMIC_CACHE).then((cache) => {
        Promise.allSettled(
          FONT_URLS.map(url => 
            fetch(url, { mode: 'cors' }).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(() => {})
          )
        );
      })
    ]).catch(console.warn)
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

// Fetch 이벤트 - 네트워크 요청 처리 (Cache First 전략)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Firebase 요청은 네트워크 우선
  if (FIREBASE_URLS.some(url => event.request.url.includes(url))) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Firebase 요청 실패시 오프라인 알림
          return new Response(JSON.stringify({
            error: 'offline',
            message: '오프라인 상태입니다'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // 앱 리소스는 캐시 우선 (GitHub Pages 경로 고려)
  if (requestUrl.pathname.includes('/memo/') || requestUrl.pathname === '/' || 
      requestUrl.pathname.endsWith('.html') || requestUrl.pathname.endsWith('.css') || 
      requestUrl.pathname.endsWith('.js') || requestUrl.pathname.endsWith('.json')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // 백그라운드에서 업데이트 확인
            fetch(event.request)
              .then((response) => {
                if (response && response.status === 200) {
                  const responseClone = response.clone();
                  caches.open(STATIC_CACHE)
                    .then((cache) => {
                      cache.put(event.request, responseClone);
                    });
                }
              })
              .catch(() => {});
            
            return cachedResponse;
          }
          
          // 캐시에 없으면 네트워크에서 가져오기
          return fetch(event.request)
            .then((response) => {
              if (!response || response.status !== 200) {
                return response;
              }
              
              const responseClone = response.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
              
              return response;
            });
        })
        .catch(() => {
          // 오프라인시 기본 페이지 반환
          if (event.request.destination === 'document') {
            return caches.match('./');
          }
        })
    );
    return;
  }
  
  // 기타 요청 (폰트, 이미지 등)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
          .then((fetchResponse) => {
            if (fetchResponse && fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return fetchResponse;
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
      clients.openWindow('./')
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