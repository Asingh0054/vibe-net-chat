import SimplePeer from 'simple-peer';
import { showNotification } from './notifications';
import { validateInput, chatMessageSchema, fileSchema, signalDataSchema, deviceIdSchema, peerNameSchema } from './validation';
import { toast } from 'sonner';


export interface FileTransferProgress {
  transferId: string;
  filename: string;
  size: number;
  transferredBytes: number;
  direction: 'upload' | 'download';
  startTime: number;
  peerName: string;
}

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
  private onFileProgressCallback?: (progress: FileTransferProgress) => void;
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeTransfers: Map<string, FileTransferProgress> = new Map();

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
        
        if (message.type === 'file-start') {
          // Initialize download progress
          const transferProgress: FileTransferProgress = {
            transferId: message.transferId,
            filename: message.filename,
            size: message.size,
            transferredBytes: 0,
            direction: 'download',
            startTime: Date.now(),
            peerName
          };
          
          this.activeTransfers.set(message.transferId, transferProgress);
          this.onFileProgressCallback?.(transferProgress);
          
          // Initialize chunk buffer
          (this.activeTransfers.get(message.transferId) as any).chunks = new Array(message.totalChunks);
          (this.activeTransfers.get(message.transferId) as any).receivedChunks = 0;
          (this.activeTransfers.get(message.transferId) as any).totalChunks = message.totalChunks;
          (this.activeTransfers.get(message.transferId) as any).mimeType = message.mimeType;
        } else if (message.type === 'file-chunk') {
          const transfer = this.activeTransfers.get(message.transferId) as any;
          if (transfer) {
            transfer.chunks[message.chunkIndex] = new Uint8Array(message.data);
            transfer.receivedChunks++;
            
            // Update progress
            transfer.transferredBytes = (transfer.receivedChunks / transfer.totalChunks) * transfer.size;
            this.onFileProgressCallback?.(transfer);
          }
        } else if (message.type === 'file-complete') {
          const transfer = this.activeTransfers.get(message.transferId) as any;
          if (transfer && transfer.chunks) {
            // Combine all chunks
            const totalLength = transfer.chunks.reduce((acc: number, chunk: Uint8Array) => acc + chunk.byteLength, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of transfer.chunks) {
              combined.set(chunk, offset);
              offset += chunk.byteLength;
            }
            
            const blob = new Blob([combined], { type: transfer.mimeType });
            
            // Mark as complete
            transfer.transferredBytes = transfer.size;
            this.onFileProgressCallback?.(transfer);
            
            // Call file callback
            this.onFileCallback?.(peerId, blob, transfer.filename);
            
            // Show notification
            showNotification('File Received', {
              body: `${peerName} sent you a file: ${transfer.filename}`,
              tag: `file-${peerId}-${Date.now()}`
            });
            
            // Remove from active transfers after a delay
            setTimeout(() => {
              this.activeTransfers.delete(message.transferId);
            }, 3000);
          }
        } else if (message.type === 'file') {
          // Legacy file transfer (old format)
          const fileValidation = validateInput(fileSchema, {
            name: message.filename,
            size: message.size,
            type: message.mimeType || 'application/octet-stream'
          });
          
          if (!fileValidation.success) {
            toast.error('Received invalid file');
            return;
          }
          
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
              return;
            }
          }
          
          this.onMessageCallback?.(peerId, message);
          showNotification('New Message', {
            body: `${peerName}: ${message.text || 'Sent a message'}`,
            tag: `message-${peerId}-${Date.now()}`
          });
        }
      } catch (error) {
        // Silent fail
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

  // Send a file with progress tracking
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

    const transferId = `${peerId}-${Date.now()}`;
    const chunkSize = 16384; // 16KB chunks for better progress tracking
    const arrayBuffer = await file.arrayBuffer();
    const totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);
    
    // Initialize transfer progress
    const transferProgress: FileTransferProgress = {
      transferId,
      filename: file.name,
      size: file.size,
      transferredBytes: 0,
      direction: 'upload',
      startTime: Date.now(),
      peerName: connection.peerName
    };
    
    this.activeTransfers.set(transferId, transferProgress);
    this.onFileProgressCallback?.(transferProgress);

    try {
      // Send file metadata first
      connection.peer.send(JSON.stringify({
        type: 'file-start',
        transferId,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        totalChunks
      }));

      // Send file in chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, arrayBuffer.byteLength);
        const chunk = arrayBuffer.slice(start, end);
        
        connection.peer.send(JSON.stringify({
          type: 'file-chunk',
          transferId,
          chunkIndex: i,
          data: Array.from(new Uint8Array(chunk))
        }));

        // Update progress
        transferProgress.transferredBytes = end;
        this.onFileProgressCallback?.(transferProgress);
        
        // Small delay to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Send completion message
      connection.peer.send(JSON.stringify({
        type: 'file-complete',
        transferId
      }));

      // Mark as complete
      transferProgress.transferredBytes = file.size;
      this.onFileProgressCallback?.(transferProgress);
      
      // Remove from active transfers after a delay
      setTimeout(() => {
        this.activeTransfers.delete(transferId);
      }, 3000);

      return true;
    } catch (error) {
      this.activeTransfers.delete(transferId);
      return false;
    }
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

  onFileProgress(callback: (progress: FileTransferProgress) => void) {
    this.onFileProgressCallback = callback;
  }

  getActiveTransfers(): FileTransferProgress[] {
    return Array.from(this.activeTransfers.values());
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
