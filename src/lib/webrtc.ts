import SimplePeer from 'simple-peer';
import { showNotification } from './notifications';
import { validateInput, chatMessageSchema, fileSchema, signalDataSchema, deviceIdSchema, peerNameSchema } from './validation';
import { toast } from 'sonner';

export interface PeerConnection {
  peer: SimplePeer.Instance;
  peerId: string;
  deviceId: string;
  peerName: string;
  connected: boolean;
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

export type ConnectionMode = 'internet' | 'wifi' | 'bluetooth';

export class P2PManager {
  private peers: Map<string, PeerConnection> = new Map();
  private myDeviceId: string = '';
  private onMessageCallback?: (peerId: string, message: any) => void;
  private onFileCallback?: (peerId: string, file: Blob, filename: string) => void;
  private onConnectCallback?: (peerId: string, deviceId: string, peerName: string) => void;
  private onDisconnectCallback?: (peerId: string, deviceId: string) => void;
  private onStatusChangeCallback?: (peerId: string, status: PeerConnection['status']) => void;
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.peers = new Map();
    this.loadPersistedConnections();
  }

  private loadPersistedConnections() {
    try {
      const persistedConnections = localStorage.getItem('team_xv_connections');
      if (persistedConnections) {
        const connections = JSON.parse(persistedConnections);
        return connections;
      }
    } catch (error) {
      // Silent fail - don't expose error details
    }
    return [];
  }

  private saveConnectionsToPersistence() {
    try {
      const connections = Array.from(this.peers.values())
        .filter(p => p.connected)
        .map(p => ({
          deviceId: p.deviceId,
          peerName: p.peerName,
          peerId: p.peerId
        }));
      localStorage.setItem('team_xv_connections', JSON.stringify(connections));
    } catch (error) {
      // Silent fail
    }
  }

  async restoreConnections() {
    const connections = this.loadPersistedConnections();
    for (const conn of connections) {
      if (!this.peers.has(conn.peerId)) {
        await this.attemptReconnection(conn.peerId, conn.deviceId, conn.peerName);
      }
    }
  }

  setMyDeviceId(deviceId: string) {
    const validation = validateInput(deviceIdSchema, deviceId);
    if (validation.success) {
      this.myDeviceId = validation.data;
    }
  }

  getMyDeviceId(): string {
    return this.myDeviceId;
  }

  // Create a peer connection (initiator)
  createConnection(peerId: string, deviceId: string, peerName: string, initiator: boolean = true): SimplePeer.Instance {
    // Validate all inputs
    const peerIdValidation = validateInput(deviceIdSchema, peerId);
    const deviceIdValidation = validateInput(deviceIdSchema, deviceId);
    const peerNameValidation = validateInput(peerNameSchema, peerName);
    
    if (!peerIdValidation.success || !deviceIdValidation.success || !peerNameValidation.success) {
      throw new Error('Invalid connection parameters');
    }
    
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.setupPeerEvents(peer, peerIdValidation.data, deviceIdValidation.data, peerNameValidation.data);
    
    this.peers.set(peerIdValidation.data, {
      peer,
      peerId: peerIdValidation.data,
      deviceId: deviceIdValidation.data,
      peerName: peerNameValidation.data,
      connected: false,
      status: 'connecting'
    });

    this.onStatusChangeCallback?.(peerIdValidation.data, 'connecting');
    return peer;
  }

  private setupPeerEvents(peer: SimplePeer.Instance, peerId: string, deviceId: string, peerName: string) {
    peer.on('connect', () => {
      const connection = this.peers.get(peerId);
      if (connection) {
        connection.connected = true;
        connection.status = 'connected';
      }
      this.saveConnectionsToPersistence();
      this.onStatusChangeCallback?.(peerId, 'connected');
      this.onConnectCallback?.(peerId, deviceId, peerName);
      
      // Clear any reconnection interval
      const interval = this.reconnectIntervals.get(peerId);
      if (interval) {
        clearInterval(interval);
        this.reconnectIntervals.delete(peerId);
      }
    });

    peer.on('data', (data: Uint8Array) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(data));
        
        if (message.type === 'file') {
          // Validate file metadata
          const fileValidation = validateInput(fileSchema, {
            name: message.filename,
            size: message.size,
            type: message.mimeType || 'application/octet-stream'
          });
          
          if (!fileValidation.success) {
            toast.error('Received invalid file');
            return;
          }
          
          // Handle file metadata
          this.handleFileTransfer(peerId, message);
          showNotification('File Received', {
            body: `${peerName} sent you a file: ${message.filename}`,
            tag: `file-${peerId}-${Date.now()}`
          });
        } else {
          // Validate text messages
          if (message.text) {
            const msgValidation = validateInput(chatMessageSchema, message.text);
            if (!msgValidation.success) {
              return; // Silently drop invalid messages
            }
          }
          
          this.onMessageCallback?.(peerId, message);
          showNotification('New Message', {
            body: `${peerName}: ${message.text || 'Sent a message'}`,
            tag: `message-${peerId}-${Date.now()}`
          });
        }
      } catch (error) {
        // Silent fail - don't expose error details
      }
    });

    peer.on('close', () => {
      const connection = this.peers.get(peerId);
      if (connection) {
        connection.connected = false;
        connection.status = 'disconnected';
      }
      this.saveConnectionsToPersistence();
      this.onStatusChangeCallback?.(peerId, 'disconnected');
      this.onDisconnectCallback?.(peerId, deviceId);
      
      // Attempt automatic reconnection
      this.scheduleReconnection(peerId, deviceId, peerName);
    });

    peer.on('error', (err) => {
      // Don't log sensitive error details
    });
  }

  private handleFileTransfer(peerId: string, message: any) {
    if (message.data) {
      const blob = new Blob([new Uint8Array(message.data)]);
      this.onFileCallback?.(peerId, blob, message.filename);
    }
  }

  // Send a text message
  sendMessage(peerId: string, message: any) {
    // Validate message if it's a string
    if (typeof message === 'string') {
      const validation = validateInput(chatMessageSchema, message);
      if (!validation.success) {
        toast.error('Message is too long');
        return false;
      }
    } else if (message.text) {
      const validation = validateInput(chatMessageSchema, message.text);
      if (!validation.success) {
        toast.error('Message is too long');
        return false;
      }
    }
    
    const connection = this.peers.get(peerId);
    if (connection && connection.connected) {
      connection.peer.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Send a file
  async sendFile(peerId: string, file: File) {
    // Validate file
    const validation = validateInput(fileSchema, {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    if (validation.success === false) {
      toast.error(validation.error);
      return false;
    }
    
    const connection = this.peers.get(peerId);
    if (!connection || !connection.connected) {
      return false;
    }

    const arrayBuffer = await file.arrayBuffer();
    const message = {
      type: 'file',
      filename: file.name,
      size: file.size,
      data: Array.from(new Uint8Array(arrayBuffer))
    };

    connection.peer.send(JSON.stringify(message));
    return true;
  }

  // Connect to a peer using signal data
  connect(peerId: string, signalData: SimplePeer.SignalData) {
    // Validate signal data
    const validation = validateInput(signalDataSchema, signalData);
    if (!validation.success) {
      return;
    }
    
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.signal(signalData);
    }
  }

  // Disconnect from a peer (manual disconnect - no reconnection)
  disconnect(peerId: string, manual: boolean = true) {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.destroy();
      this.peers.delete(peerId);
      
      // Clear reconnection interval if manual disconnect
      if (manual) {
        const interval = this.reconnectIntervals.get(peerId);
        if (interval) {
          clearInterval(interval);
          this.reconnectIntervals.delete(peerId);
        }
        this.saveConnectionsToPersistence();
      }
    }
  }

  private scheduleReconnection(peerId: string, deviceId: string, peerName: string) {
    // Don't schedule if already reconnecting
    if (this.reconnectIntervals.has(peerId)) return;

    let attempts = 0;
    const maxAttempts = 10;
    const reconnectDelay = 3000; // 3 seconds

    const interval = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(interval);
        this.reconnectIntervals.delete(peerId);
        return;
      }

      const connection = this.peers.get(peerId);
      if (connection?.connected) {
        clearInterval(interval);
        this.reconnectIntervals.delete(peerId);
        return;
      }

      await this.attemptReconnection(peerId, deviceId, peerName);
    }, reconnectDelay);

    this.reconnectIntervals.set(peerId, interval);
  }

  private async attemptReconnection(peerId: string, deviceId: string, peerName: string) {
    try {
      const connection = this.peers.get(peerId);
      if (connection?.connected) return;

      // Remove old disconnected peer
      if (connection) {
        this.peers.delete(peerId);
      }

      // Create new connection attempt
      this.onStatusChangeCallback?.(peerId, 'reconnecting');
      
    } catch (error) {
      // Silent fail
    }
  }

  // Event listeners
  onMessage(callback: (peerId: string, message: any) => void) {
    this.onMessageCallback = callback;
  }

  onFile(callback: (peerId: string, file: Blob, filename: string) => void) {
    this.onFileCallback = callback;
  }

  onConnect(callback: (peerId: string, deviceId: string, peerName: string) => void) {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: (peerId: string, deviceId: string) => void) {
    this.onDisconnectCallback = callback;
  }

  onStatusChange(callback: (peerId: string, status: PeerConnection['status']) => void) {
    this.onStatusChangeCallback = callback;
  }

  // Get all connected peers
  getConnectedPeers(): string[] {
    return Array.from(this.peers.values())
      .filter(p => p.connected)
      .map(p => p.peerId);
  }

  // Check if connected to a specific peer
  isConnected(peerId: string): boolean {
    return this.peers.get(peerId)?.connected || false;
  }

  // Get peer connection info
  getPeerInfo(peerId: string): { deviceId: string; peerName: string; status: PeerConnection['status'] } | null {
    const connection = this.peers.get(peerId);
    if (!connection) return null;
    return {
      deviceId: connection.deviceId,
      peerName: connection.peerName,
      status: connection.status
    };
  }

  // Get all peers info
  getAllPeersInfo(): Array<{ peerId: string; deviceId: string; peerName: string; status: PeerConnection['status'] }> {
    return Array.from(this.peers.values()).map(p => ({
      peerId: p.peerId,
      deviceId: p.deviceId,
      peerName: p.peerName,
      status: p.status
    }));
  }

  // Cleanup
  destroy() {
    // Clear all reconnection intervals
    this.reconnectIntervals.forEach(interval => clearInterval(interval));
    this.reconnectIntervals.clear();
    
    this.peers.forEach(connection => {
      connection.peer.destroy();
    });
    this.peers.clear();
    
    // Clear persistence
    localStorage.removeItem('team_xv_connections');
  }
}

// Singleton instance
export const p2pManager = new P2PManager();
