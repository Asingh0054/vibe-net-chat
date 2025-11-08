import { Capacitor } from '@capacitor/core';

export type PermissionType = 'camera' | 'storage' | 'bluetooth' | 'location' | 'notifications';

interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export const requestPermission = async (type: PermissionType): Promise<PermissionStatus> => {
  // For web platform
  if (!Capacitor.isNativePlatform()) {
    try {
      switch (type) {
        case 'camera':
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          return { granted: true, denied: false, prompt: false };
        
        case 'notifications':
          if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return {
              granted: permission === 'granted',
              denied: permission === 'denied',
              prompt: permission === 'default'
            };
          }
          break;
        
        case 'bluetooth':
          if ('bluetooth' in navigator) {
            return { granted: true, denied: false, prompt: false };
          }
          break;
        
        default:
          return { granted: true, denied: false, prompt: false };
      }
    } catch (error) {
      return { granted: false, denied: true, prompt: false };
    }
  }

  // For native platforms, permissions would be handled via Capacitor plugins
  return { granted: true, denied: false, prompt: false };
};

export const checkPermission = async (type: PermissionType): Promise<PermissionStatus> => {
  if (!Capacitor.isNativePlatform()) {
    switch (type) {
      case 'notifications':
        if ('Notification' in window) {
          const permission = Notification.permission;
          return {
            granted: permission === 'granted',
            denied: permission === 'denied',
            prompt: permission === 'default'
          };
        }
        break;
    }
  }
  
  return { granted: false, denied: false, prompt: true };
};
