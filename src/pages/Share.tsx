import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, File, Image, Video, Music, FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface SharedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  timestamp: Date;
}

const Share = () => {
  const [files, setFiles] = useState<SharedFile[]>([
    {
      id: "1",
      name: "vacation-photo.jpg",
      size: "2.4 MB",
      type: "image",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      name: "presentation.pdf",
      size: "5.1 MB",
      type: "document",
      timestamp: new Date(Date.now() - 7200000),
    },
  ]);

  const handleFileUpload = () => {
    toast.success("File upload will be implemented with WebRTC");
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-8 w-8 text-primary" />;
      case "video":
        return <Video className="h-8 w-8 text-secondary" />;
      case "audio":
        return <Music className="h-8 w-8 text-accent" />;
      case "document":
        return <FileText className="h-8 w-8 text-primary" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold neon-text">Share Files</h1>
        <p className="text-muted-foreground">Drop files or click to upload</p>
      </div>

      <Card className="mb-8 neon-border bg-card/50 backdrop-blur">
        <CardContent className="p-8">
          <div
            className="border-2 border-dashed border-primary/50 rounded-lg p-12 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer neon-glow-sm"
            onClick={handleFileUpload}
          >
            <Upload className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse-glow" />
            <h3 className="text-xl font-semibold mb-2 text-primary">Drop files here</h3>
            <p className="text-muted-foreground">or click to browse</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4 neon-text">Shared Files</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="neon-border bg-card/50 backdrop-blur hover:neon-glow transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.type)}
                  <div>
                    <CardTitle className="text-sm font-medium">{file.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="hover:bg-primary/10">
                  <Download className="h-4 w-4 text-primary" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {file.timestamp.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Share;
