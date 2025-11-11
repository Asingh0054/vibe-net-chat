import { useState, useRef, DragEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, File, Image, Video, Music, FileText, Download, X, CloudDownload } from "lucide-react";
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
  received?: boolean;
  fromPeer?: string;
}

const Share = () => {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set up file receive handler
    const handleFileReceived = async (peerId: string, fileBlob: Blob, filename: string) => {
      const fileType = getFileType(fileBlob.type);
      const fileSize = formatFileSize(fileBlob.size);
      
      // Convert Blob to File object
      const fileArray = await fileBlob.arrayBuffer();
      const file = new globalThis.File([fileArray], filename, { type: fileBlob.type });
      
      // Get peer info
      const peers = p2pManager.getConnectedPeers();
      const peer = peers.find((p) => p === peerId);
      const peerName = peer || peerId;
      
      const receivedFile: SharedFile = {
        id: `received-${Date.now()}`,
        name: filename,
        size: fileSize,
        type: fileType,
        timestamp: new Date(),
        file: file,
        received: true,
        fromPeer: peerName
      };
      
      // Add to files list
      setFiles((prev) => [receivedFile, ...prev]);
      
      // Auto-download the file
      autoDownloadFile(file, filename);
      
      // Show notification
      toast.success(`Received ${filename} from ${peerName}`, {
        duration: 5000,
        action: {
          label: "Download",
          onClick: () => autoDownloadFile(file, filename)
        }
      });
    };
    
    // Register the callback
    p2pManager.onFile(handleFileReceived);
    
    // Cleanup
    return () => {
      // Note: p2pManager doesn't have an unregister method,
      // but the component will unmount so it's fine
    };
  }, []);

  const autoDownloadFile = (file: File, filename: string) => {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.info(`Downloaded ${filename}`);
    } catch (error) {
      toast.error("Failed to download file");
      console.error("Auto-download error:", error);
    }
  };

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

  const handleDownloadFile = (sharedFile: SharedFile) => {
    if (!sharedFile.file) {
      toast.error("File not available");
      return;
    }
    autoDownloadFile(sharedFile.file, sharedFile.name);
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
          Files ({files.length})
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
            <Card
              key={file.id}
              className={`neon-border backdrop-blur hover:neon-glow transition-all ${
                file.received ? 'bg-primary/10 border-primary' : 'bg-card/50'
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3 flex-1">
                  {file.received ? (
                    <CloudDownload className="h-5 w-5 text-primary animate-pulse" />
                  ) : (
                    getFileIcon(file.type)
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium truncate">{file.name}</CardTitle>
                      {file.received && (
                        <Badge className="bg-primary text-xs">Received</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                    {file.fromPeer && (
                      <p className="text-xs text-primary/70">From: {file.fromPeer}</p>
                    )}
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
                {file.received ? (
                  <Button
                    onClick={() => handleDownloadFile(file)}
                    className="w-full bg-gradient-to-r from-primary to-accent neon-glow"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Again
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSendFile(file)}
                    className="w-full bg-gradient-to-r from-primary to-accent neon-glow"
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Send to Peers
                  </Button>
                )}
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
