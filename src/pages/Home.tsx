import { useState, useEffect, useRef } from "react";
import { MessageSquare, Share2, Wifi, Bluetooth, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ConnectionModal } from "@/components/ConnectionModal";
import { PermissionsDialog } from "@/components/PermissionsDialog";
import { DeviceIdCard } from "@/components/DeviceIdCard";
import { SavedDevicesList } from "@/components/SavedDevicesList";
import { BluetoothDeviceSelector } from "@/components/BluetoothDeviceSelector";
import { p2pManager, ConnectionMode } from "@/lib/webrtc";
import { getDeviceId, getSavedPeers, savePeer, removeSavedPeer, updateLastConnected, SavedPeer } from "@/lib/deviceManager";
import { setupSignalingForConnection, sendSignal } from "@/lib/signaling";
import { toast } from "sonner";
import { requestNotificationPermission } from "@/lib/notifications";

const Home = () => {
  const navigate = useNavigate();
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const [savedPeers, setSavedPeers] = useState<SavedPeer[]>([]);
  const [connectedPeerDeviceIds, setConnectedPeerDeviceIds] = useState<string[]>([]);
  const signalingCleanups = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    const initializeDevice = async () => {
      // Check if first time user
      const hasSeenPermissions = localStorage.getItem("hasSeenPermissions");
      if (!hasSeenPermissions) {
        setPermissionsDialogOpen(true);
      }

      // Get or create device ID
      const myDeviceId = await getDeviceId();
      setDeviceId(myDeviceId);
      p2pManager.setMyDeviceId(myDeviceId);

      // Request notification permission
      await requestNotificationPermission();

      // Load saved peers
      const peers = await getSavedPeers(myDeviceId);
      setSavedPeers(peers);

      // Setup P2P event listeners
      p2pManager.onConnect(async (peerId, peerDeviceId, peerName) => {
        toast.success(`Connected to ${peerName}`);
        
        // Save peer connection
        await savePeer(myDeviceId, peerDeviceId, peerName);
        await updateLastConnected(myDeviceId, peerDeviceId);
        
        // Reload saved peers
        const updatedPeers = await getSavedPeers(myDeviceId);
        setSavedPeers(updatedPeers);
        
        // Update connected peer IDs
        const allPeers = p2pManager.getAllPeersInfo();
        const connectedIds = allPeers.filter(p => p.status === 'connected').map(p => p.deviceId);
        setConnectedPeerDeviceIds(connectedIds);
        
        // Store connection state in service worker
        import('@/lib/notifications').then(({ storeConnectionState }) => {
          storeConnectionState({
            deviceId: myDeviceId,
            peers: allPeers.filter(p => p.status === 'connected').map(p => ({
              peerId: p.peerId,
              deviceId: p.deviceId,
              peerName: p.peerName
            }))
          });
        });
      });

      p2pManager.onDisconnect(async (peerId, peerDeviceId) => {
        const peerInfo = p2pManager.getPeerInfo(peerId);
        toast.info(`Disconnected from ${peerInfo?.peerName || 'peer'}`);
        
        // Update connected peer IDs
        const allPeers = p2pManager.getAllPeersInfo();
        setConnectedPeerDeviceIds(allPeers.filter(p => p.status === 'connected').map(p => p.deviceId));
      });

      p2pManager.onStatusChange((peerId, status) => {
        const peerInfo = p2pManager.getPeerInfo(peerId);
        if (status === 'reconnecting') {
          toast.info(`Reconnecting to ${peerInfo?.peerName || 'peer'}...`);
        } else if (status === 'connected') {
          // Update connected peer IDs when status changes
          const allPeers = p2pManager.getAllPeersInfo();
          setConnectedPeerDeviceIds(allPeers.filter(p => p.status === 'connected').map(p => p.deviceId));
        }
      });

      // Restore persisted connections
      await p2pManager.restoreConnections();
      
      // Auto-reconnect to all saved peers
      for (const peer of peers) {
        await handleReconnect(peer.peer_device_id, peer.peer_name);
      }
    };

    initializeDevice();

    // Handle page visibility changes to maintain connections
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible - check and restore connections
        const allPeers = p2pManager.getAllPeersInfo();
        allPeers.forEach(peer => {
          if (peer.status !== 'connected') {
            handleReconnect(peer.deviceId, peer.peerName);
          }
        });
      }
    };

    // Handle restore connections from service worker
    const handleRestoreConnections = async (event: any) => {
      const { deviceId: storedDeviceId, peers: storedPeers } = event.detail;
      if (storedDeviceId === deviceId) {
        for (const peer of storedPeers) {
          await handleReconnect(peer.deviceId, peer.peerName);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('restore-connections', handleRestoreConnections);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('restore-connections', handleRestoreConnections);
      // Cleanup signaling listeners but don't destroy connections
      signalingCleanups.current.forEach(cleanup => cleanup());
      signalingCleanups.current.clear();
    };
  }, [deviceId]);

  const handlePermissionsComplete = () => {
    localStorage.setItem("hasSeenPermissions", "true");
    setPermissionsDialogOpen(false);
    toast.success("Permissions configured!");
  };

  const handleConnect = async (mode: ConnectionMode, peerDeviceIdOrCode: string) => {
    // Find if this is a saved peer
    const savedPeer = savedPeers.find(p => p.peer_device_id === peerDeviceIdOrCode);
    const peerName = savedPeer?.peer_name || 'Unknown Device';
    const connectionCode = `${deviceId}-${peerDeviceIdOrCode}`;

    // Check if already connected
    const existingPeer = p2pManager.getAllPeersInfo().find(p => p.deviceId === peerDeviceIdOrCode);
    if (existingPeer && existingPeer.status === 'connected') {
      toast.info(`Already connected to ${peerName}`);
      setConnectionModalOpen(false);
      return;
    }

    // Create a peer connection as initiator
    const peer = p2pManager.createConnection(peerDeviceIdOrCode, peerDeviceIdOrCode, peerName, true);
    
    peer.on('signal', async (signalData) => {
      try {
        await sendSignal(connectionCode, signalData, true);
        
        // Setup signaling listener for response
        const cleanup = setupSignalingForConnection(peerDeviceIdOrCode, connectionCode, true);
        signalingCleanups.current.set(peerDeviceIdOrCode, cleanup);
      } catch (error) {
        console.error('Error sending signal:', error);
        toast.error('Connection failed. Please check your internet connection.');
      }
    });

    setConnectionModalOpen(false);
  };

  const handleReconnect = async (peerDeviceId: string, peerName: string) => {
    // Check if already connected
    const allPeers = p2pManager.getAllPeersInfo();
    const existingPeer = allPeers.find(p => p.deviceId === peerDeviceId);
    
    if (existingPeer && existingPeer.status === 'connected') {
      toast.info(`Already connected to ${peerName}`);
      return;
    }

    const connectionCode = `${deviceId}-${peerDeviceId}`;

    // Create new connection attempt
    const peer = p2pManager.createConnection(peerDeviceId, peerDeviceId, peerName, true);
    
    peer.on('signal', async (signalData) => {
      console.log('Sending reconnect signal data...');
      try {
        await sendSignal(connectionCode, signalData, true);
        toast.info(`Reconnecting to ${peerName}...`);
        
        // Setup signaling listener
        const cleanup = setupSignalingForConnection(peerDeviceId, connectionCode, true);
        signalingCleanups.current.set(peerDeviceId, cleanup);
      } catch (error) {
        console.error('Error reconnecting:', error);
        toast.error('Failed to reconnect');
      }
    });

    await updateLastConnected(deviceId, peerDeviceId);
  };

  const handleRemovePeer = async (peerDeviceId: string) => {
    // Manually disconnect (no auto-reconnect)
    const allPeers = p2pManager.getAllPeersInfo();
    const peer = allPeers.find(p => p.deviceId === peerDeviceId);
    if (peer) {
      p2pManager.disconnect(peer.peerId, true);
    }
    
    // Cleanup signaling
    const cleanup = signalingCleanups.current.get(peerDeviceId);
    if (cleanup) {
      cleanup();
      signalingCleanups.current.delete(peerDeviceId);
    }
    
    await removeSavedPeer(deviceId, peerDeviceId);
    const updatedPeers = await getSavedPeers(deviceId);
    setSavedPeers(updatedPeers);
    toast.success("Device removed from saved list");
  };

  const handleStartConnection = () => {
    setConnectionModalOpen(true);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 neon-text bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Team XV IT
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            Share files and chat instantly via WiFi, Bluetooth, or Internet
          </p>
          {connectedPeerDeviceIds.length > 0 && (
            <p className="text-sm text-primary mb-4">
              ✓ {connectedPeerDeviceIds.length} device{connectedPeerDeviceIds.length > 1 ? 's' : ''} connected
            </p>
          )}
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              className="neon-glow bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={handleStartConnection}
            >
              <Link2 className="mr-2 h-5 w-5" />
              Connect to Peer
            </Button>
            <Button
              size="lg"
              className="neon-glow bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={() => navigate("/chat")}
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Start Chatting
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="neon-border hover:bg-primary/10"
              onClick={() => navigate("/share")}
            >
              <Share2 className="mr-2 h-5 w-5" />
              Share Files
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12 space-y-6">
          {deviceId && <DeviceIdCard deviceId={deviceId} />}
          
          <BluetoothDeviceSelector />
          
          <SavedDevicesList
            savedPeers={savedPeers}
            onConnect={handleReconnect}
            onRemove={handleRemovePeer}
            connectedPeerIds={connectedPeerDeviceIds}
          />
        </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <Card className="neon-border bg-card/50 backdrop-blur hover:neon-glow transition-all">
          <CardHeader>
            <Wifi className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-primary">WiFi Direct</CardTitle>
            <CardDescription>Connect and share without internet</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Lightning-fast file transfers over local WiFi networks
            </p>
          </CardContent>
        </Card>

        <Card className="neon-border bg-card/50 backdrop-blur hover:neon-glow transition-all">
          <CardHeader>
            <Bluetooth className="h-10 w-10 text-secondary mb-2" />
            <CardTitle className="text-secondary">Bluetooth</CardTitle>
            <CardDescription>Close-range sharing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Share files with nearby devices using Bluetooth
            </p>
          </CardContent>
        </Card>

        <Card className="neon-border bg-card/50 backdrop-blur hover:neon-glow transition-all">
          <CardHeader>
            <MessageSquare className="h-10 w-10 text-accent mb-2" />
            <CardTitle className="text-accent">P2P Chat</CardTitle>
            <CardDescription>Private messaging</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              End-to-end encrypted peer-to-peer messaging
            </p>
          </CardContent>
        </Card>

        <Card className="neon-border bg-card/50 backdrop-blur hover:neon-glow transition-all">
          <CardHeader>
            <Share2 className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-primary">Internet Share</CardTitle>
            <CardDescription>Share anywhere</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect with anyone, anywhere via internet
            </p>
          </CardContent>
        </Card>
      </div>

        <div className="mt-12 text-center">
          <div className="inline-block p-6 rounded-lg bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 neon-border animate-pulse-glow">
            <p className="text-lg font-semibold text-foreground">
              🚀 Fast • 🔒 Secure • 🌐 Versatile
            </p>
          </div>
        </div>
      </div>

      <ConnectionModal
        open={connectionModalOpen}
        onOpenChange={setConnectionModalOpen}
        onConnect={handleConnect}
        connectionCode={deviceId}
      />

      <PermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        onComplete={handlePermissionsComplete}
      />
    </>
  );
};

export default Home;
