import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Share2, Clock } from "lucide-react";

interface Interaction {
  id: string;
  name: string;
  type: "chat" | "share";
  timestamp: Date;
  preview: string;
}

const Recent = () => {
  const interactions: Interaction[] = [
    {
      id: "1",
      name: "Alex's Phone",
      type: "chat",
      timestamp: new Date(Date.now() - 300000),
      preview: "Sure! This neon interface looks amazing!",
    },
    {
      id: "2",
      name: "Sarah's Laptop",
      type: "share",
      timestamp: new Date(Date.now() - 3600000),
      preview: "Received 3 files",
    },
    {
      id: "3",
      name: "Mike's Tablet",
      type: "chat",
      timestamp: new Date(Date.now() - 7200000),
      preview: "Thanks for the files!",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold neon-text">Recent Interactions</h1>
        <p className="text-muted-foreground">Your recent chats and file transfers</p>
      </div>

      <div className="space-y-4">
        {interactions.map((interaction) => (
          <Card
            key={interaction.id}
            className="neon-border bg-card/50 backdrop-blur hover:neon-glow transition-all cursor-pointer"
          >
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <Avatar className="h-12 w-12 border-2 border-primary neon-glow-sm">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                  {interaction.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-lg">{interaction.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{interaction.preview}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {interaction.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {interaction.type === "chat" ? (
                  <MessageSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Share2 className="h-5 w-5 text-secondary" />
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Recent;
