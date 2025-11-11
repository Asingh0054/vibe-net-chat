export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = async (title: string, options?: NotificationOptions) => {
  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return;
  }

  // Check if service worker is available
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Use service worker for persistent notifications
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        ...options
      });
    });
  } else {
    // Fallback to regular notification
    new Notification(title, {
      icon: '/favicon.ico',
      ...options
    });
  }
};

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Request periodic background sync for connection maintenance
      if ('periodicSync' in registration) {
        try {
          await (registration as any).periodicSync.register('maintain-connections', {
            minInterval: 60 * 1000 // Check every minute
          });
          console.log('Periodic sync registered');
        } catch (error) {
          console.log('Periodic sync not supported');
        }
      }
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'RESTORE_CONNECTIONS') {
          // Dispatch custom event for app to handle
          window.dispatchEvent(new CustomEvent('restore-connections', {
            detail: event.data.state
          }));
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Store connection state in service worker
export const storeConnectionState = (state: any) => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'STORE_CONNECTION_STATE',
      state
    });
  }
};
