import { useState, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, File, Image, Video, Music, FileText, Download, X } from "lucide-react";
import { toast } from "sonner";
import { p2pManager } from "@/lib/webrtc";
import { validateInput, fileSchema } from "@/lib/validation";

interface SharedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  timestamp: Date;
  file?: File;
}

const Share = () => {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newFiles: SharedFile[] = [];
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      
      // Validate file
      const validation = validateInput(fileSchema, {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      if (validation.success === false) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      const fileType = getFileType(file.type);
      const fileSize = formatFileSize(file.size);
      
      newFiles.push({
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: fileSize,
        type: fileType,
        timestamp: new Date(),
        file: file
      });
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...newFiles, ...prev]);
      toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} added`);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFileUpload(droppedFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
  };

  const handleSendFile = async (sharedFile: SharedFile) => {
    if (!sharedFile.file) {
      toast.error("File not available");
      return;
    }

    const peers = p2pManager.getConnectedPeers();
    if (peers.length === 0) {
      toast.error("No connected peers. Connect to a device first.");
      return;
    }

    try {
      // Send to all connected peers
      for (const peer of peers) {
        await p2pManager.sendFile(peer, sharedFile.file);
      }
      toast.success(`Sending ${sharedFile.name} to ${peers.length} peer${peers.length > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error("Failed to send file");
      console.error("File send error:", error);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    toast.info("File removed");
  };

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.includes("pdf") || mimeType.includes("document")) return "document";
    return "file";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
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
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleInputChange}
            accept="*/*"
          />
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/20 neon-glow"
                : "border-primary/50 hover:border-primary hover:bg-primary/5 neon-glow-sm"
            }`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse-glow" />
            <h3 className="text-xl font-semibold mb-2 text-primary">
              {isDragging ? "Drop files here" : "Drag and drop files"}
            </h3>
            <p className="text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Maximum file size: 100MB
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4 neon-text">
          Files Ready to Share ({files.length})
        </h2>
        {files.length === 0 ? (
          <Card className="neon-border bg-card/30">
            <CardContent className="p-8 text-center text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No files added yet. Drop or upload files to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="neon-border bg-card/50 backdrop-blur hover:neon-glow transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium truncate">{file.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-destructive/10 text-destructive"
                  onClick={() => handleRemoveFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {file.timestamp.toLocaleString()}
                </p>
                <Button
                  onClick={() => handleSendFile(file)}
                  className="w-full bg-gradient-to-r from-primary to-accent neon-glow"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Send to Peers
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};

export default Share;
