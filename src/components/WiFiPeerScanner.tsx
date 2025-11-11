import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2, SignalHigh, SignalMedium, SignalLow } from "lucide-react";
import { scanWiFiDirectPeers, connectToWiFiDirectPeer, WiFiDirectDevice } from "@/lib/wifi";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

interface WiFiPeerScannerProps {
  onConnect: (deviceAddress: string, deviceName: string) => void;
}

export function WiFiPeerScanner({ onConnect }: WiFiPeerScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [peers, setPeers] = useState<WiFiDirectDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setPeers([]);
    
    try {
      const discoveredPeers = await scanWiFiDirectPeers();
      setPeers(discoveredPeers);
      
      if (discoveredPeers.length === 0) {
        toast.info("No WiFi Direct peers found nearby");
      } else {
        toast.success(`Found ${discoveredPeers.length} peer${discoveredPeers.length > 1 ? 's' : ''}`);
      }
    } catch (error) {
      toast.error("Failed to scan for peers");
      console.error("WiFi scan error:", error);
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: WiFiDirectDevice) => {
    setConnecting(device.deviceAddress);
    
    try {
      const success = await connectToWiFiDirectPeer(device.deviceAddress);
      
      if (success) {
        toast.success(`Connected to ${device.deviceName}`);
        onConnect(device.deviceAddress, device.deviceName);
      } else {
        toast.error("Connection failed");
      }
    } catch (error) {
      toast.error("Failed to connect to peer");
      console.error("WiFi connection error:", error);
    } finally {
      setConnecting(null);
    }
  };

  const getSignalIcon = (level: number) => {
    if (level > -50) return <SignalHigh className="h-5 w-5 text-primary" />;
    if (level > -70) return <SignalMedium className="h-5 w-5 text-accent" />;
    return <SignalLow className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0: return <Badge variant="secondary">Available</Badge>;
      case 1: return <Badge variant="default">Invited</Badge>;
      case 2: return <Badge className="bg-primary">Connected</Badge>;
      case 3: return <Badge variant="destructive">Failed</Badge>;
      case 4: return <Badge variant="outline">Unavailable</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!isNative) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-primary/30 rounded-lg">
        <WifiOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-2">
          WiFi Direct scanning requires the native mobile app
        </p>
        <p className="text-sm text-muted-foreground/70">
          Install the app on Android or iOS to use this feature
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          <h3 className="font-medium">WiFi Direct Peers</h3>
        </div>
        <Button
          onClick={handleScan}
          disabled={scanning}
          variant="outline"
          className="neon-border"
          size="sm"
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            "Scan for Peers"
          )}
        </Button>
      </div>

      {peers.length > 0 ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {peers.map((peer) => (
            <div
              key={peer.deviceAddress}
              className="flex items-center justify-between p-4 rounded-lg border border-border neon-border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {getSignalIcon(peer.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{peer.deviceName}</h4>
                    {getStatusBadge(peer.status)}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {peer.deviceAddress}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {peer.primaryDeviceType}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleConnect(peer)}
                disabled={connecting === peer.deviceAddress || peer.status === 2}
                size="sm"
                className="bg-gradient-to-r from-primary to-accent neon-glow"
              >
                {connecting === peer.deviceAddress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : peer.status === 2 ? (
                  "Connected"
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border border-dashed border-border rounded-lg">
          <Wifi className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {scanning ? "Scanning for nearby devices..." : "No peers discovered yet"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {!scanning && "Click 'Scan for Peers' to start discovery"}
          </p>
        </div>
      )}
    </div>
  );
}
