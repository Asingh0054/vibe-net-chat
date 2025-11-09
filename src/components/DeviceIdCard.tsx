import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface DeviceIdCardProps {
  deviceId: string;
}

export function DeviceIdCard({ deviceId }: DeviceIdCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    toast.success("Device ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="neon-border bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <CardTitle>My Device ID</CardTitle>
        </div>
        <CardDescription>Share this ID to connect with others</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="flex-1 p-3 rounded-lg bg-muted/50 border border-border font-mono text-sm break-all">
            {deviceId}
          </div>
          <Button
            onClick={handleCopy}
            variant="outline"
            className="neon-border"
            size="icon"
          >
            {copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
