import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import FaceAnalysis from './FaceAnalysis';

interface WebcamFeedProps {
  isActive: boolean;
  onEmotionUpdate: (emotions: string[]) => void;
  onFaceEmotionUpdate?: (emotions: { [key: string]: number }) => void;
  onEngagementUpdate?: (engagement: number) => void;
  selectedCamera?: string;
}

export default function WebcamFeed({ isActive, onEmotionUpdate, onFaceEmotionUpdate, onEngagementUpdate, selectedCamera }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function initCamera() {
      setIsLoading(true);
      try {
        // Stop previous stream if exists
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
            facingMode: selectedCamera ? undefined : 'user'
          }
        });
        
        setStream(mediaStream);
        setHasPermission(true);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (isActive) {
      initCamera();
    } else {
      // Clean up when not active
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, selectedCamera]);

  // Separate effect for video ref update
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Card className={cn(
      "relative overflow-hidden bg-muted shadow-lg",
      "border-2 transition-all duration-300",
      isActive ? "border-primary animate-pulse-glow" : "border-border"
    )}>
      <div className="aspect-video w-full relative">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading camera...</p>
            </div>
          </div>
        ) : stream ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover rounded-lg"
            />
            {isActive && (
              <FaceAnalysis 
                videoRef={videoRef}
                onEmotionUpdate={onFaceEmotionUpdate}
                onEngagementUpdate={onEngagementUpdate}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-background flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎥</div>
              <p className="text-muted-foreground text-sm">
                Camera will appear here
              </p>
            </div>
          </div>
        )}
        
        {isActive && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 backdrop-blur-sm rounded-full px-3 py-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-medium">RECORDING</span>
          </div>
        )}
        
        {isActive && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <p className="text-white text-xs">
              🎤 Listening for speech...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}