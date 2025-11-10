import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, BluetoothConnected, BluetoothSearching } from "lucide-react";
import { bluetoothManager, BTDevice } from "@/lib/bluetooth";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export const BluetoothDeviceSelector = () => {
  const [devices, setDevices] = useState<BTDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BTDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);

  useEffect(() => {
    // Set up callbacks
    bluetoothManager.onDeviceFound((device) => {
      setDevices((prev) => {
        const exists = prev.find((d) => d.id === device.id);
        if (exists) return prev;
        return [...prev, device];
      });
    });

    bluetoothManager.onTransferProgress((progress) => {
      setTransferProgress(progress);
    });

    bluetoothManager.onFileReceived((file) => {
      toast.success(`Received file: ${file.name}`);
      // Auto-download received file
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });

    return () => {
      bluetoothManager.disconnect();
    };
  }, []);

  const handleScan = async () => {
    if (!bluetoothManager.isBluetoothSupported()) {
      toast.error('Bluetooth is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    setIsScanning(true);
    await bluetoothManager.scanForDevices();
    setIsScanning(false);
  };

  const handleConnect = async (deviceId: string) => {
    const success = await bluetoothManager.connectToDevice(deviceId);
    if (success) {
      const device = bluetoothManager.getConnectedDevice();
      setConnectedDevice(device);
      // Start listening for incoming files
      await bluetoothManager.receiveFile();
    }
  };

  const handleDisconnect = async () => {
    await bluetoothManager.disconnect();
    setConnectedDevice(null);
    setTransferProgress(0);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!connectedDevice) {
      toast.error('Please connect to a device first');
      return;
    }

    const success = await bluetoothManager.sendFile(file);
    if (success) {
      setTransferProgress(0);
    }
  };

  return (
    <Card className="w-full royal-shadow rajasthani-pattern">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-cinzel">
          <Bluetooth className="w-5 h-5 text-accent" />
          Bluetooth File Sharing
        </CardTitle>
        <CardDescription>
          Connect to nearby devices via Bluetooth for instant file transfer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectedDevice ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border-2 border-accent">
              <div className="flex items-center gap-3">
                <BluetoothConnected className="w-6 h-6 text-accent animate-pulse-royal" />
                <div>
                  <p className="font-semibold font-cinzel">{connectedDevice.name}</p>
                  <Badge variant="secondary" className="mt-1 bg-accent text-accent-foreground">
                    Connected
                  </Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDisconnect}
                className="royal-border"
              >
                Disconnect
              </Button>
            </div>

            {transferProgress > 0 && transferProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transfer Progress</span>
                  <span className="font-semibold">{Math.round(transferProgress)}%</span>
                </div>
                <Progress value={transferProgress} className="h-2" />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="bluetooth-file" className="cursor-pointer">
                <Button 
                  className="w-full golden-border animate-shimmer-gold"
                  onClick={() => document.getElementById('bluetooth-file')?.click()}
                >
                  Send File via Bluetooth
                </Button>
              </label>
              <input
                id="bluetooth-file"
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-muted-foreground text-center">
                Files will be automatically received when sent from connected device
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              onClick={handleScan}
              disabled={isScanning}
              className="w-full royal-border"
              variant="outline"
            >
              {isScanning ? (
                <>
                  <BluetoothSearching className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4 mr-2" />
                  Scan for Devices
                </>
              )}
            </Button>

            {devices.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold font-cinzel">Available Devices:</p>
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Bluetooth className="w-4 h-4 text-primary" />
                      <span className="font-medium">{device.name}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleConnect(device.id)}
                      className="royal-border"
                      variant="outline"
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {devices.length === 0 && !isScanning && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No devices found. Click scan to discover nearby Bluetooth devices.
              </p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p className="font-semibold">Browser Support:</p>
          <p>• Chrome/Edge: Full support</p>
          <p>• Firefox/Safari: Limited or no support</p>
          <p>• Both devices must have Web Bluetooth enabled</p>
        </div>
      </CardContent>
    </Card>
  );
};
