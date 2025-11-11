import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, BluetoothOff, Loader2, Radio, Unplug } from "lucide-react";
import { bluetoothManager, BTDevice } from "@/lib/bluetooth";
import { toast } from "sonner";

interface BluetoothPeerScannerProps {
  onConnect: (deviceId: string, deviceName: string) => void;
}

export function BluetoothPeerScanner({ onConnect }: BluetoothPeerScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BTDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<BTDevice | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(bluetoothManager.isBluetoothSupported());
    
    // Set up device found callback
    bluetoothManager.onDeviceFound((device) => {
      setDevices((prev) => {
        const exists = prev.find((d) => d.id === device.id);
        if (exists) {
          return prev.map((d) => (d.id === device.id ? device : d));
        }
        return [...prev, device];
      });
    });

    // Check for already discovered devices
    const existingDevices = bluetoothManager.getDevices();
    if (existingDevices.length > 0) {
      setDevices(existingDevices);
    }

    const currentDevice = bluetoothManager.getConnectedDevice();
    if (currentDevice) {
      setConnectedDevice(currentDevice);
    }
  }, []);

  const handleScan = async () => {
    setScanning(true);
    
    try {
      await bluetoothManager.scanForDevices();
      const discoveredDevices = bluetoothManager.getDevices();
      setDevices(discoveredDevices);
      
      if (discoveredDevices.length === 0) {
        toast.info("No Bluetooth devices found");
      }
    } catch (error) {
      toast.error("Failed to scan for Bluetooth devices");
      console.error("Bluetooth scan error:", error);
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: BTDevice) => {
    if (device.connected) {
      toast.info(`Already connected to ${device.name}`);
      return;
    }

    setConnecting(device.id);
    
    try {
      const success = await bluetoothManager.connectToDevice(device.id);
      
      if (success) {
        setConnectedDevice(device);
        setDevices((prev) =>
          prev.map((d) => (d.id === device.id ? { ...d, connected: true } : d))
        );
        onConnect(device.id, device.name);
      }
    } catch (error) {
      toast.error("Failed to connect to device");
      console.error("Bluetooth connection error:", error);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (device: BTDevice) => {
    try {
      await bluetoothManager.disconnect();
      setConnectedDevice(null);
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, connected: false } : d))
      );
      toast.info(`Disconnected from ${device.name}`);
    } catch (error) {
      toast.error("Failed to disconnect");
      console.error("Bluetooth disconnect error:", error);
    }
  };

  const getConnectionBadge = (device: BTDevice) => {
    if (device.connected) {
      return <Badge className="bg-primary">Connected</Badge>;
    }
    return <Badge variant="secondary">Available</Badge>;
  };

  if (!isSupported) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-secondary/30 rounded-lg">
        <BluetoothOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-2">
          Bluetooth Web API is not supported in this browser
        </p>
        <p className="text-sm text-muted-foreground/70">
          Try using Chrome, Edge, or Opera on desktop/Android
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5 text-secondary" />
          <h3 className="font-medium">Bluetooth Devices</h3>
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
            <>
              <Radio className="h-4 w-4 mr-2" />
              Scan for Devices
            </>
          )}
        </Button>
      </div>

      {connectedDevice && (
        <div className="p-4 rounded-lg border-2 border-primary bg-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bluetooth className="h-5 w-5 text-primary animate-pulse" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Active Connection</h4>
                  <Badge className="bg-primary">Connected</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{connectedDevice.name}</p>
                <p className="text-xs text-muted-foreground/70 font-mono">
                  {connectedDevice.id}
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleDisconnect(connectedDevice)}
              size="sm"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              <Unplug className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {devices.length > 0 ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border neon-border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Bluetooth className="h-5 w-5 text-secondary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{device.name}</h4>
                    {getConnectionBadge(device)}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {device.id}
                  </p>
                </div>
              </div>
              <Button
                onClick={() =>
                  device.connected
                    ? handleDisconnect(device)
                    : handleConnect(device)
                }
                disabled={connecting === device.id}
                size="sm"
                variant={device.connected ? "outline" : "default"}
                className={
                  device.connected
                    ? "border-destructive text-destructive hover:bg-destructive/10"
                    : "bg-gradient-to-r from-secondary to-accent neon-glow"
                }
              >
                {connecting === device.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : device.connected ? (
                  <>
                    <Unplug className="h-4 w-4 mr-2" />
                    Disconnect
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border border-dashed border-border rounded-lg">
          <Bluetooth className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {scanning ? "Scanning for nearby devices..." : "No devices discovered yet"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {!scanning && "Click 'Scan for Devices' to start discovery"}
          </p>
        </div>
      )}

      <div className="text-xs text-muted-foreground/70 p-3 bg-card/50 rounded border border-border">
        <strong>Note:</strong> Bluetooth pairing requires user interaction. Click "Scan for Devices" to see available Bluetooth devices nearby.
      </div>
    </div>
  );
}
