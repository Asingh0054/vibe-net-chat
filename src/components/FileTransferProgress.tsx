import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Download, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FileTransferInfo {
  id: string;
  filename: string;
  size: number;
  transferredBytes: number;
  direction: 'upload' | 'download';
  startTime: number;
  peerName?: string;
  speed?: number;
  estimatedTimeRemaining?: number;
}

interface FileTransferProgressProps {
  transfers: FileTransferInfo[];
  onCancel?: (transferId: string) => void;
}

export function FileTransferProgress({ transfers, onCancel }: FileTransferProgressProps) {
  if (transfers.length === 0) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const calculateProgress = (transfer: FileTransferInfo): number => {
    if (transfer.size === 0) return 0;
    return Math.min(100, (transfer.transferredBytes / transfer.size) * 100);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md w-full">
      {transfers.map((transfer) => {
        const progress = calculateProgress(transfer);
        const isComplete = progress >= 100;

        return (
          <Card
            key={transfer.id}
            className="neon-border bg-card/95 backdrop-blur shadow-lg"
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {transfer.direction === 'upload' ? (
                    <Upload className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Download className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium truncate">{transfer.filename}</p>
                    </div>
                    {transfer.peerName && (
                      <p className="text-xs text-muted-foreground">
                        {transfer.direction === 'upload' ? 'To' : 'From'}: {transfer.peerName}
                      </p>
                    )}
                  </div>
                </div>
                {!isComplete && onCancel && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => onCancel(transfer.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <Progress
                  value={progress}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatBytes(transfer.transferredBytes)} / {formatBytes(transfer.size)}
                  </span>
                  <span className="font-medium">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>

              {!isComplete && transfer.speed !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Speed: <span className="text-foreground font-medium">{formatSpeed(transfer.speed)}</span>
                  </span>
                  {transfer.estimatedTimeRemaining !== undefined && transfer.estimatedTimeRemaining > 0 && (
                    <span className="text-muted-foreground">
                      ETA: <span className="text-foreground font-medium">{formatTime(transfer.estimatedTimeRemaining)}</span>
                    </span>
                  )}
                </div>
              )}

              {isComplete && (
                <p className="text-xs text-primary font-medium">
                  Transfer complete!
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
