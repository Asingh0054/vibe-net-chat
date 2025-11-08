import { useState, useEffect } from "react";
import { MessageSquare, Share2, Wifi, Bluetooth, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ConnectionModal } from "@/components/ConnectionModal";
import { PermissionsDialog } from "@/components/PermissionsDialog";
import { p2pManager, ConnectionMode } from "@/lib/webrtc";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [connectionCode, setConnectionCode] = useState<string>("");
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  useEffect(() => {
    // Check if first time user
    const hasSeenPermissions = localStorage.getItem("hasSeenPermissions");
    if (!hasSeenPermissions) {
      setPermissionsDialogOpen(true);
    }

    // Generate connection code (simplified - in production use a proper signaling server)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setConnectionCode(code);

    // Setup P2P event listeners
    p2pManager.onConnect((peerId) => {
      toast.success(`Connected to ${peerId}`);
      setConnectedPeers(p2pManager.getConnectedPeers());
    });

    p2pManager.onDisconnect((peerId) => {
      toast.info(`Disconnected from ${peerId}`);
      setConnectedPeers(p2pManager.getConnectedPeers());
    });

    return () => {
      // Cleanup on unmount
    };
  }, []);

  const handlePermissionsComplete = () => {
    localStorage.setItem("hasSeenPermissions", "true");
    setPermissionsDialogOpen(false);
    toast.success("Permissions configured!");
  };

  const handleConnect = (mode: ConnectionMode, code: string) => {

    // Create a peer connection
    const peer = p2pManager.createConnection(code, false);
    
    peer.on('signal', (signalData) => {
      // In a real app, you'd send this through a signaling server
      console.log('Signal data:', signalData);
      toast.info("Connecting...");
    });

    setConnectionModalOpen(false);
    toast.success(`Attempting ${mode} connection...`);
  };

  const handleStartConnection = () => {
    setConnectionModalOpen(true);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-12">\
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 neon-text bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            NeonShare
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            Share files and chat instantly via WiFi, Bluetooth, or Internet
          </p>
          {connectedPeers.length > 0 && (
            <p className="text-sm text-primary mb-4">
              ✓ {connectedPeers.length} peer{connectedPeers.length > 1 ? 's' : ''} connected
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
        connectionCode={connectionCode}
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
