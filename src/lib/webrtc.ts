import SimplePeer from 'simple-peer';

export interface PeerConnection {
  peer: SimplePeer.Instance;
  peerId: string;
  connected: boolean;
}

export type ConnectionMode = 'internet' | 'wifi' | 'bluetooth';

export class P2PManager {
  private peers: Map<string, PeerConnection> = new Map();
  private onMessageCallback?: (peerId: string, message: any) => void;
  private onFileCallback?: (peerId: string, file: Blob, filename: string) => void;
  private onConnectCallback?: (peerId: string) => void;
  private onDisconnectCallback?: (peerId: string) => void;

  constructor() {
    this.peers = new Map();
  }

  // Create a peer connection (initiator)
  createConnection(peerId: string, initiator: boolean = true): SimplePeer.Instance {
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

    this.setupPeerEvents(peer, peerId);
    
    this.peers.set(peerId, {
      peer,
      peerId,
      connected: false
    });

    return peer;
  }

  private setupPeerEvents(peer: SimplePeer.Instance, peerId: string) {
    peer.on('connect', () => {
      const connection = this.peers.get(peerId);
      if (connection) {
        connection.connected = true;
      }
      this.onConnectCallback?.(peerId);
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
      }
      this.onDisconnectCallback?.(peerId);
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

  onConnect(callback: (peerId: string) => void) {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: (peerId: string) => void) {
    this.onDisconnectCallback = callback;
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
