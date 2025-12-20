// Mintenance PWA Service Worker
const CACHE_NAME = 'mintenance-v1.2.3';
const STATIC_CACHE = 'mintenance-static-v1.2.3';
const DYNAMIC_CACHE = 'mintenance-dynamic-v1.2.3';

// Static files to cache
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/assets/icon.png',
  '/assets/adaptive-icon.png',
  '/assets/favicon.png',
  '/manifest.json',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Caching static files...');
      return cache.addAll(STATIC_FILES.map(url => new Request(url, { credentials: 'same-origin' })));
    }).catch((error) => {
      console.error('Failed to cache static files:', error);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or fetch from network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Clone the request because it's a stream and can only be consumed once
      const fetchRequest = request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response because it's a stream and can only be consumed once
        const responseToCache = response.clone();

        // Cache dynamic resources
        if (request.method === 'GET') {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return response;
      }).catch((error) => {
        console.error('Fetch failed:', error);

        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/');
        }

        throw error;
      });
    })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync offline data when connection is restored
    const clients = await self.clients.matchAll();

    clients.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        payload: { status: 'started' }
      });
    });

    // Notify clients that sync is complete
    clients.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        payload: { status: 'completed' }
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received');

  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.error('Failed to parse push data:', error);
      data = { title: 'Mintenance', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/assets/icon.png',
    badge: '/assets/icon.png',
    image: data.image,
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'default',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Mintenance', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url === '/' && 'focus' in client) {
          // Focus existing window and navigate to the appropriate page
          if (data.url) {
            client.postMessage({
              type: 'NAVIGATE',
              url: data.url
            });
          }
          return client.focus();
        }
      }

      // Open new window if none exists
      if (self.clients.openWindow) {
        const url = data.url || '/';
        return self.clients.openWindow(url);
      }
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(DYNAMIC_CACHE).then((cache) => {
          return cache.addAll(payload.urls);
        })
      );
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.delete(DYNAMIC_CACHE).then(() => {
          return caches.open(DYNAMIC_CACHE);
        })
      );
      break;

    default:
      console.log('Unknown message type:', type);
  }
});

console.log('Mintenance Service Worker loaded successfully');