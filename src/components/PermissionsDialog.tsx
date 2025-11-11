import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, FolderOpen, Bluetooth, MapPin, Bell, CheckCircle, XCircle } from "lucide-react";
import { requestPermission, checkPermission, PermissionType } from "@/lib/permissions";
import { toast } from "sonner";

interface Permission {
  type: PermissionType;
  name: string;
  description: string;
  icon: React.ReactNode;
  granted: boolean;
}

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function PermissionsDialog({ open, onOpenChange, onComplete }: PermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      type: "camera",
      name: "Camera",
      description: "For video calls and scanning QR codes",
      icon: <Camera className="h-6 w-6" />,
      granted: false,
    },
    {
      type: "storage",
      name: "Storage",
      description: "To save and access shared files",
      icon: <FolderOpen className="h-6 w-6" />,
      granted: false,
    },
    {
      type: "bluetooth",
      name: "Bluetooth",
      description: "For nearby device connections",
      icon: <Bluetooth className="h-6 w-6" />,
      granted: false,
    },
    {
      type: "location",
      name: "Location",
      description: "For WiFi Direct device discovery",
      icon: <MapPin className="h-6 w-6" />,
      granted: false,
    },
    {
      type: "notifications",
      name: "Notifications",
      description: "To notify you of messages and file transfers",
      icon: <Bell className="h-6 w-6" />,
      granted: false,
    },
  ]);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    const updatedPermissions = await Promise.all(
      permissions.map(async (perm) => {
        const status = await checkPermission(perm.type);
        return { ...perm, granted: status.granted };
      })
    );
    setPermissions(updatedPermissions);
  };

  const handleRequestPermission = async (type: PermissionType) => {
    const status = await requestPermission(type);
    
    if (status.granted) {
      toast.success("Permission granted!");
      setPermissions((prev) =>
        prev.map((p) => (p.type === type ? { ...p, granted: true } : p))
      );
    } else if (status.denied) {
      toast.error("Permission denied. Please enable it in settings.");
    }
  };

  const handleGrantAll = async () => {
    const permissionsToRequest = permissions.filter((p) => !p.granted);
    
    if (permissionsToRequest.length === 0) {
      toast.success("All permissions already granted!");
      onComplete();
      return;
    }

    const results = await Promise.all(
      permissionsToRequest.map(async (perm) => {
        const status = await requestPermission(perm.type);
        return { type: perm.type, granted: status.granted };
      })
    );

    setPermissions((prev) =>
      prev.map((p) => {
        const result = results.find((r) => r.type === p.type);
        return result ? { ...p, granted: result.granted } : p;
      })
    );

    const allGranted = results.every((r) => r.granted);
    if (allGranted) {
      toast.success("All permissions granted!");
      setTimeout(() => onComplete(), 500);
    } else {
      toast.error("Some permissions were denied. Please enable them in settings.");
    }
  };

  const allGranted = permissions.every((p) => p.granted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neon-border bg-card/95 backdrop-blur max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl neon-text">App Permissions</DialogTitle>
          <DialogDescription>
            TeamXV IT needs these permissions to provide the best experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {permissions.map((permission) => (
            <div
              key={permission.type}
              className="flex items-center gap-4 p-4 rounded-lg border border-border neon-border bg-card/50"
            >
              <div className="text-primary">{permission.icon}</div>
              <div className="flex-1">
                <h4 className="font-medium">{permission.name}</h4>
                <p className="text-sm text-muted-foreground">{permission.description}</p>
              </div>
              {permission.granted ? (
                <CheckCircle className="h-6 w-6 text-primary neon-glow-sm" />
              ) : (
                <Button
                  onClick={() => handleRequestPermission(permission.type)}
                  size="sm"
                  variant="outline"
                  className="neon-border"
                >
                  Grant
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for Now
          </Button>
          <Button
            onClick={handleGrantAll}
            className="bg-gradient-to-r from-primary to-accent neon-glow"
          >
            {allGranted ? "Continue" : "Grant All Permissions"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
