import { Capacitor } from '@capacitor/core';

export interface WiFiNetwork {
  ssid: string;
  bssid: string;
  capabilities: string;
  frequency: number;
  level: number;
  timestamp: number;
}

export interface WiFiDirectDevice {
  deviceName: string;
  deviceAddress: string;
  primaryDeviceType: string;
  secondaryDeviceType: string;
  status: number;
}

// WiFi Direct is primarily available on native platforms
// Web browsers have very limited WiFi API access for security reasons
export const isWiFiDirectAvailable = (): boolean => {
  return Capacitor.isNativePlatform();
};

// For web platform, we can only check if connected to WiFi
export const isConnectedToWiFi = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // On web, we can use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.type === 'wifi';
    }
    // Fallback: assume connected if online
    return navigator.onLine;
  }
  
  // Native platform would use Capacitor Network plugin
  return true;
};

// Scan for WiFi Direct peers (native only)
export const scanWiFiDirectPeers = async (): Promise<WiFiDirectDevice[]> => {
  if (!Capacitor.isNativePlatform()) {
    console.warn('WiFi Direct peer discovery is only available on native platforms');
    return [];
  }
  
  // This would integrate with a native Capacitor plugin for WiFi Direct
  // For now, return empty array as placeholder
  return [];
};

// Connect to WiFi Direct peer (native only)
export const connectToWiFiDirectPeer = async (deviceAddress: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.warn('WiFi Direct connections are only available on native platforms');
    return false;
  }
  
  // This would integrate with a native Capacitor plugin for WiFi Direct
  // For now, return false as placeholder
  return false;
};

// Create WiFi Direct group (native only)
export const createWiFiDirectGroup = async (): Promise<{ groupName: string; passphrase: string } | null> => {
  if (!Capacitor.isNativePlatform()) {
    console.warn('WiFi Direct group creation is only available on native platforms');
    return null;
  }
  
  // This would integrate with a native Capacitor plugin for WiFi Direct
  // For now, return null as placeholder
  return null;
};

// Disconnect from WiFi Direct (native only)
export const disconnectWiFiDirect = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  
  // This would integrate with a native Capacitor plugin for WiFi Direct
  return true;
};

// Get WiFi Direct connection info
export const getWiFiDirectInfo = async (): Promise<any> => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  
  // This would integrate with a native Capacitor plugin for WiFi Direct
  return null;
};
