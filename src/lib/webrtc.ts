import SimplePeer from 'simple-peer';

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

  constructor() {
    this.peers = new Map();
  }

  setMyDeviceId(deviceId: string) {
    this.myDeviceId = deviceId;
  }

  getMyDeviceId(): string {
    return this.myDeviceId;
  }

  // Create a peer connection (initiator)
  createConnection(peerId: string, deviceId: string, peerName: string, initiator: boolean = true): SimplePeer.Instance {
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

    this.setupPeerEvents(peer, peerId, deviceId, peerName);
    
    this.peers.set(peerId, {
      peer,
      peerId,
      deviceId,
      peerName,
      connected: false,
      status: 'connecting'
    });

    this.onStatusChangeCallback?.(peerId, 'connecting');
    return peer;
  }

  private setupPeerEvents(peer: SimplePeer.Instance, peerId: string, deviceId: string, peerName: string) {
    peer.on('connect', () => {
      const connection = this.peers.get(peerId);
      if (connection) {
        connection.connected = true;
        connection.status = 'connected';
      }
      this.onStatusChangeCallback?.(peerId, 'connected');
      this.onConnectCallback?.(peerId, deviceId, peerName);
    });

    peer.on('data', (data: Uint8Array) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(data));
        
        if (message.type === 'file') {
          // Handle file metadata
          this.handleFileTransfer(peerId, message);
        } else {
          // Handle regular message
          this.onMessageCallback?.(peerId, message);
        }
      } catch (error) {
        console.error('Error parsing peer data:', error);
      }
    });

    peer.on('close', () => {
      const connection = this.peers.get(peerId);
      if (connection) {
        connection.connected = false;
        connection.status = 'disconnected';
      }
      this.onStatusChangeCallback?.(peerId, 'disconnected');
      this.onDisconnectCallback?.(peerId, deviceId);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
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
    const connection = this.peers.get(peerId);
    if (connection && connection.connected) {
      connection.peer.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Send a file
  async sendFile(peerId: string, file: File) {
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
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.signal(signalData);
    }
  }

  // Disconnect from a peer
  disconnect(peerId: string) {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.destroy();
      this.peers.delete(peerId);
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
    this.peers.forEach(connection => {
      connection.peer.destroy();
    });
    this.peers.clear();
  }
}

// Singleton instance
export const p2pManager = new P2PManager();
