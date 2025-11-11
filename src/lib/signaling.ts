import { supabase } from "@/integrations/supabase/client";
import { p2pManager } from "./webrtc";

export interface SignalData {
  connection_code: string;
  initiator_signal: any;
  responder_signal: any;
}

// Create or update a connection with signal data
export const sendSignal = async (
  connectionCode: string,
  signalData: any,
  isInitiator: boolean
): Promise<void> => {
  try {
    const fieldName = isInitiator ? 'initiator_signal' : 'responder_signal';
    
    await supabase
      .from('peer_connections')
      .upsert({
        connection_code: connectionCode,
        [fieldName]: signalData,
      }, {
        onConflict: 'connection_code',
      });
  } catch (error) {
    console.error('Error sending signal:', error);
    throw error;
  }
};

// Listen for signal data from peer
export const listenForSignal = (
  connectionCode: string,
  isInitiator: boolean,
  onSignal: (signalData: any) => void
): (() => void) => {
  const fieldName = isInitiator ? 'responder_signal' : 'initiator_signal';
  
  // Initial check for existing signal
  supabase
    .from('peer_connections')
    .select('*')
    .eq('connection_code', connectionCode)
    .single()
    .then(({ data }) => {
      if (data && data[fieldName]) {
        onSignal(data[fieldName]);
      }
    });

  // Listen for updates
  const channel = supabase
    .channel(`connection:${connectionCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'peer_connections',
        filter: `connection_code=eq.${connectionCode}`,
      },
      (payload) => {
        const signal = payload.new[fieldName];
        if (signal) {
          onSignal(signal);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Mark connection as connected
export const markConnectionAsConnected = async (connectionCode: string): Promise<void> => {
  try {
    await supabase
      .from('peer_connections')
      .update({ connected: true })
      .eq('connection_code', connectionCode);
  } catch (error) {
    console.error('Error marking connection as connected:', error);
  }
};

// Get connection status
export const getConnectionStatus = async (connectionCode: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('peer_connections')
      .select('connected')
      .eq('connection_code', connectionCode)
      .single();
    
    if (error) throw error;
    return data?.connected || false;
  } catch (error) {
    console.error('Error getting connection status:', error);
    return false;
  }
};

// Clean up old connections (optional - for maintenance)
export const cleanupExpiredConnections = async (): Promise<void> => {
  try {
    await supabase
      .from('peer_connections')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('Error cleaning up connections:', error);
  }
};

// Setup automatic signaling for a connection
export const setupSignalingForConnection = (
  peerId: string,
  connectionCode: string,
  isInitiator: boolean
): (() => void) => {
  const cleanup = listenForSignal(connectionCode, isInitiator, (signalData) => {
    console.log('Received signal data for', peerId);
    p2pManager.connect(peerId, signalData);
  });

  return cleanup;
};
