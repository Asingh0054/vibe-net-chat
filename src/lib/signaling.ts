import { supabase } from "@/integrations/supabase/client";
import { p2pManager } from "./webrtc";
import { validateInput, connectionCodeSchema, signalDataSchema } from './validation';
import { toast } from 'sonner';

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
  // Validate connection code
  const codeValidation = validateInput(connectionCodeSchema, connectionCode);
  if (codeValidation.success === false) {
    toast.error('Invalid connection code');
    throw new Error(codeValidation.error);
  }
  
  // Validate signal data structure
  const signalValidation = validateInput(signalDataSchema, signalData);
  if (signalValidation.success === false) {
    toast.error('Invalid signal data');
    throw new Error('Invalid signal data');
  }
  
  try {
    const fieldName = isInitiator ? 'initiator_signal' : 'responder_signal';
    
    await supabase
      .from('peer_connections')
      .upsert({
        connection_code: codeValidation.data,
        [fieldName]: signalData,
      }, {
        onConflict: 'connection_code',
      });
  } catch (error) {
    throw error;
  }
};

// Listen for signal data from peer
export const listenForSignal = (
  connectionCode: string,
  isInitiator: boolean,
  onSignal: (signalData: any) => void
): (() => void) => {
  // Validate connection code
  const codeValidation = validateInput(connectionCodeSchema, connectionCode);
  if (!codeValidation.success) {
    toast.error('Invalid connection code');
    return () => {};
  }
  
  const fieldName = isInitiator ? 'responder_signal' : 'initiator_signal';
  
  // Initial check for existing signal
  supabase
    .from('peer_connections')
    .select('*')
    .eq('connection_code', codeValidation.data)
    .single()
    .then(({ data }) => {
      if (data && data[fieldName]) {
        // Validate signal data before processing
        const validation = validateInput(signalDataSchema, data[fieldName]);
        if (validation.success) {
          onSignal(data[fieldName]);
        }
      }
    });

  // Listen for updates
  const channel = supabase
    .channel(`connection:${codeValidation.data}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'peer_connections',
        filter: `connection_code=eq.${codeValidation.data}`,
      },
      (payload) => {
        const signal = payload.new[fieldName];
        if (signal) {
          // Validate signal data before processing
          const validation = validateInput(signalDataSchema, signal);
          if (validation.success) {
            onSignal(signal);
          }
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
  // Validate connection code
  const validation = validateInput(connectionCodeSchema, connectionCode);
  if (!validation.success) {
    return;
  }
  
  try {
    await supabase
      .from('peer_connections')
      .update({ connected: true })
      .eq('connection_code', validation.data);
  } catch (error) {
    // Silent fail
  }
};

// Get connection status
export const getConnectionStatus = async (connectionCode: string): Promise<boolean> => {
  // Validate connection code
  const validation = validateInput(connectionCodeSchema, connectionCode);
  if (!validation.success) {
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('peer_connections')
      .select('connected')
      .eq('connection_code', validation.data)
      .single();
    
    if (error) throw error;
    return data?.connected || false;
  } catch (error) {
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
    // Silent fail
  }
};

// Setup automatic signaling for a connection
export const setupSignalingForConnection = (
  peerId: string,
  connectionCode: string,
  isInitiator: boolean
): (() => void) => {
  const cleanup = listenForSignal(connectionCode, isInitiator, (signalData) => {
    p2pManager.connect(peerId, signalData);
  });

  return cleanup;
};
