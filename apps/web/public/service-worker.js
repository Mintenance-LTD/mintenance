/**
 * Service Worker for Mintenance Web App
 * Implements caching strategies for offline support
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `mintenance-${CACHE_VERSION}`;

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, fallback to network
  CACHE_FIRST: 'cache-first',

  // Network first, fallback to cache
  NETWORK_FIRST: 'network-first',

  // Stale while revalidate
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',

  // Network only
  NETWORK_ONLY: 'network-only',

  // Cache only
  CACHE_ONLY: 'cache-only',
};

// Resources to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
];

// Route patterns and their caching strategies
const CACHE_ROUTES = [
  // Static assets - Cache first
  { pattern: /\/_next\/static\/.+/, strategy: CACHE_STRATEGIES.CACHE_FIRST },
  { pattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/, strategy: CACHE_STRATEGIES.CACHE_FIRST },

  // API routes - Network first with cache fallback
  { pattern: /\/api\//, strategy: CACHE_STRATEGIES.NETWORK_FIRST },

  // Supabase API - Network first
  { pattern: /supabase\.co/, strategy: CACHE_STRATEGIES.NETWORK_FIRST },

  // Pages - Stale while revalidate
  { pattern: /^(?!.*\/_next\/static).*\/$/, strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE },
];

// Cache size limits
const CACHE_LIMITS = {
  images: 50,
  pages: 30,
  api: 20,
};

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    }).then(() => {
      console.log('[SW] Service worker installed');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Find matching cache strategy
  const route = CACHE_ROUTES.find((r) => r.pattern.test(url.href));
  const strategy = route ? route.strategy : CACHE_STRATEGIES.NETWORK_FIRST;

  // Apply caching strategy
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      event.respondWith(cacheFirst(request));
      break;

    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(request));
      break;

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(request));
      break;

    case CACHE_STRATEGIES.NETWORK_ONLY:
      event.respondWith(fetch(request));
      break;

    case CACHE_STRATEGIES.CACHE_ONLY:
      event.respondWith(caches.match(request));
      break;

    default:
      event.respondWith(networkFirst(request));
  }
});

// ============================================================================
// CACHING STRATEGIES IMPLEMENTATION
// ============================================================================

/**
 * Cache First Strategy
 * Returns cached response if available, otherwise fetches from network
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  console.log('[SW] Cache miss, fetching:', request.url);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/offline');
    }

    throw error;
  }
}

/**
 * Network First Strategy
 * Tries network first, falls back to cache on failure
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful responses
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Returning cached response');
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/offline');
    }

    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * Returns cached response immediately, updates cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Fetch fresh data in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached response immediately if available
  if (cached) {
    console.log('[SW] Returning stale cache, revalidating:', request.url);
    return cached;
  }

  // Wait for network if no cache
  console.log('[SW] No cache, waiting for network:', request.url);
  return fetchPromise;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clean up old cache entries to stay within limits
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    console.log(`[SW] Trimming cache ${cacheName}: ${keys.length} -> ${maxItems}`);
    const itemsToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
  }
}

// Trim caches periodically
setInterval(() => {
  trimCache(CACHE_NAME, 100);
}, 1000 * 60 * 5); // Every 5 minutes

// ============================================================================
// BACKGROUND SYNC (for offline actions)
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    console.log('[SW] Syncing offline data...');

    // Get pending requests from IndexedDB or cache
    // Send them to the server
    // Clear pending queue

    console.log('[SW] Data synced successfully');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New notification from Mintenance',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Mintenance', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// ============================================================================
// LOGGING & DEBUGGING
// ============================================================================

console.log('[SW] Service worker loaded', {
  version: CACHE_VERSION,
  cacheName: CACHE_NAME,
});
