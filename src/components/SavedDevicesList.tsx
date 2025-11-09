import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Trash2, Users } from "lucide-react";
import { SavedPeer } from "@/lib/deviceManager";
import { Badge } from "@/components/ui/badge";

interface SavedDevicesListProps {
  savedPeers: SavedPeer[];
  onConnect: (peerDeviceId: string, peerName: string) => void;
  onRemove: (peerDeviceId: string) => void;
  connectedPeerIds: string[];
}

export function SavedDevicesList({ savedPeers, onConnect, onRemove, connectedPeerIds }: SavedDevicesListProps) {
  if (savedPeers.length === 0) {
    return (
      <Card className="neon-border bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-secondary" />
            <CardTitle>Saved Devices</CardTitle>
          </div>
          <CardDescription>No saved connections yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="neon-border bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-secondary" />
          <CardTitle>Saved Devices</CardTitle>
        </div>
        <CardDescription>Reconnect to your saved peers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {savedPeers.map((peer) => {
          const isConnected = connectedPeerIds.includes(peer.peer_device_id);
          
          return (
            <div
              key={peer.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{peer.peer_name}</p>
                  {isConnected && (
                    <Badge variant="default" className="bg-primary/20 text-primary">
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {peer.peer_device_id.substring(0, 16)}...
                </p>
                {peer.last_connected && (
                  <p className="text-xs text-muted-foreground">
                    Last: {new Date(peer.last_connected).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onConnect(peer.peer_device_id, peer.peer_name)}
                  variant="outline"
                  size="sm"
                  className="neon-border"
                  disabled={isConnected}
                >
                  <Link2 className="h-4 w-4 mr-1" />
                  {isConnected ? "Connected" : "Reconnect"}
                </Button>
                <Button
                  onClick={() => onRemove(peer.peer_device_id)}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
