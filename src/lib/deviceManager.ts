import { supabase } from "@/integrations/supabase/client";

export interface SavedPeer {
  id: string;
  peer_device_id: string;
  peer_name: string;
  last_connected: string | null;
}

// Generate a unique device ID using crypto
export const generateDeviceId = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Get or create device ID
export const getDeviceId = async (): Promise<string> => {
  // Check localStorage first
  let deviceId = localStorage.getItem('team_xv_device_id');
  
  if (!deviceId) {
    // Generate new device ID
    deviceId = generateDeviceId();
    localStorage.setItem('team_xv_device_id', deviceId);
    
    // Store in Supabase
    await supabase.from('devices').insert({
      device_id: deviceId,
      device_name: navigator.userAgent.split('(')[0].trim(),
    });
  } else {
    // Update last_seen in Supabase
    await supabase
      .from('devices')
      .upsert({
        device_id: deviceId,
        device_name: navigator.userAgent.split('(')[0].trim(),
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'device_id',
      });
  }
  
  return deviceId;
};

// Get device name
export const getDeviceName = (): string => {
  return localStorage.getItem('team_xv_device_name') || 'My Device';
};

// Set device name
export const setDeviceName = (name: string) => {
  localStorage.setItem('team_xv_device_name', name);
};

// Save a peer connection
export const savePeer = async (deviceId: string, peerDeviceId: string, peerName: string) => {
  await supabase
    .from('saved_peers')
    .upsert({
      device_id: deviceId,
      peer_device_id: peerDeviceId,
      peer_name: peerName,
      last_connected: new Date().toISOString(),
    }, {
      onConflict: 'device_id,peer_device_id',
    });
};

// Get saved peers
export const getSavedPeers = async (deviceId: string): Promise<SavedPeer[]> => {
  const { data, error } = await supabase
    .from('saved_peers')
    .select('*')
    .eq('device_id', deviceId)
    .order('last_connected', { ascending: false });
  
  if (error) {
    console.error('Error fetching saved peers:', error);
    return [];
  }
  
  return data || [];
};

// Remove a saved peer
export const removeSavedPeer = async (deviceId: string, peerDeviceId: string) => {
  await supabase
    .from('saved_peers')
    .delete()
    .eq('device_id', deviceId)
    .eq('peer_device_id', peerDeviceId);
};

// Update last connected time
export const updateLastConnected = async (deviceId: string, peerDeviceId: string) => {
  await supabase
    .from('saved_peers')
    .update({ last_connected: new Date().toISOString() })
    .eq('device_id', deviceId)
    .eq('peer_device_id', peerDeviceId);
};
