// Cache for persistent connection state
const CACHE_NAME = 'teamxv-connection-state-v1';

// Store connection state
self.addEventListener('message', (event) => {
  if (event.data.type === 'STORE_CONNECTION_STATE') {
    caches.open(CACHE_NAME).then(cache => {
      cache.put('/connection-state', new Response(JSON.stringify(event.data.state)));
    });
  }
});

// Handle periodic background sync to maintain connections
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'maintain-connections') {
    event.waitUntil(maintainConnections());
  }
});

async function maintainConnections() {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match('/connection-state');
  if (response) {
    const state = await response.json();
    // Send message to all clients to reconnect
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'RESTORE_CONNECTIONS',
        state: state
      });
    });
  }
}

self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: data.tag || 'teamxvit-notification',
    requireInteraction: false,
    data: data.data
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
