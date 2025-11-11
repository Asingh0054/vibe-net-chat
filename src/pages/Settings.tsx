import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Wifi, Bluetooth, Bell, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Settings = () => {
  const [settings, setSettings] = useState({
    darkMode: true,
    wifiDirect: true,
    bluetooth: false,
    notifications: true,
    autoDownload: false,
    encryption: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success("Settings updated");
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold neon-text">Settings</h1>
        <p className="text-muted-foreground">Customize your TeamXV IT experience</p>
      </div>

      <div className="space-y-6">
        <Card className="neon-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark Mode
              </Label>
              <Switch
                id="dark-mode"
                checked={settings.darkMode}
                onCheckedChange={() => handleToggle("darkMode")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="neon-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Connectivity
            </CardTitle>
            <CardDescription>Manage connection options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="wifi-direct" className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                WiFi Direct
              </Label>
              <Switch
                id="wifi-direct"
                checked={settings.wifiDirect}
                onCheckedChange={() => handleToggle("wifiDirect")}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bluetooth" className="flex items-center gap-2">
                <Bluetooth className="h-4 w-4" />
                Bluetooth
              </Label>
              <Switch
                id="bluetooth"
                checked={settings.bluetooth}
                onCheckedChange={() => handleToggle("bluetooth")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="neon-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Control notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={() => handleToggle("notifications")}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-download">Auto-download Files</Label>
              <Switch
                id="auto-download"
                checked={settings.autoDownload}
                onCheckedChange={() => handleToggle("autoDownload")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="neon-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Privacy and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="encryption">End-to-End Encryption</Label>
              <Switch
                id="encryption"
                checked={settings.encryption}
                onCheckedChange={() => handleToggle("encryption")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                placeholder="My Device"
                className="neon-border focus:neon-glow-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full bg-gradient-to-r from-primary to-accent neon-glow hover:opacity-90">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default Settings;
