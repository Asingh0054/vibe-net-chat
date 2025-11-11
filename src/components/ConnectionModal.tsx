import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Bluetooth, Globe, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ConnectionMode } from "@/lib/webrtc";
import { validateInput, connectionCodeSchema } from "@/lib/validation";
import { WiFiPeerScanner } from "./WiFiPeerScanner";
import { BluetoothPeerScanner } from "./BluetoothPeerScanner";

interface ConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (mode: ConnectionMode, connectionCode: string) => void;
  connectionCode?: string;
}

export function ConnectionModal({
  open,
  onOpenChange,
  onConnect,
  connectionCode,
}: ConnectionModalProps) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ConnectionMode>("internet");

  const handleCopy = () => {
    if (connectionCode) {
      navigator.clipboard.writeText(connectionCode);
      setCopied(true);
      toast.success("Connection code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = () => {
    const trimmedCode = code.trim();
    
    if (!trimmedCode) {
      toast.error("Please enter a connection code");
      return;
    }
    
    // Validate connection code
    const validation = validateInput(connectionCodeSchema, trimmedCode);
    if (validation.success === false) {
      toast.error(validation.error);
      return;
    }
    
    toast.success("Connecting to peer...");
    onConnect(selectedMode, validation.data);
    setCode("");
    onOpenChange(false);
  };

  const handleWiFiConnect = (deviceAddress: string, deviceName: string) => {
    toast.success(`Connecting to ${deviceName} via WiFi Direct`);
    // In production, this would establish the WiFi Direct connection
    // and then proceed with WebRTC signaling
    onOpenChange(false);
  };

  const handleBluetoothConnect = (deviceId: string, deviceName: string) => {
    toast.success(`Connected to ${deviceName} via Bluetooth`);
    // In production, this would establish the Bluetooth connection
    // and then proceed with data transfer
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neon-border bg-card/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-2xl neon-text">Connect to Peer</DialogTitle>
          <DialogDescription>
            Choose your connection method and share your code or enter theirs
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedMode} onValueChange={(v) => setSelectedMode(v as ConnectionMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="internet" className="gap-2">
              <Globe className="h-4 w-4" />
              Internet
            </TabsTrigger>
            <TabsTrigger value="wifi" className="gap-2">
              <Wifi className="h-4 w-4" />
              WiFi
            </TabsTrigger>
            <TabsTrigger value="bluetooth" className="gap-2">
              <Bluetooth className="h-4 w-4" />
              Bluetooth
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internet" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Connection Code</label>
              <div className="flex gap-2">
                <Input
                  value={connectionCode || "Generating..."}
                  readOnly
                  className="neon-border font-mono"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="neon-border"
                  disabled={!connectionCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or connect to</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Enter Connection Code</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste code here..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="neon-border font-mono"
                  onKeyPress={(e) => e.key === "Enter" && handleConnect()}
                />
                <Button
                  onClick={handleConnect}
                  className="bg-gradient-to-r from-primary to-accent neon-glow"
                  disabled={!code.trim()}
                >
                  Connect
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wifi" className="space-y-4">
            <WiFiPeerScanner onConnect={handleWiFiConnect} />
          </TabsContent>

          <TabsContent value="bluetooth" className="space-y-4">
            <BluetoothPeerScanner onConnect={handleBluetoothConnect} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
