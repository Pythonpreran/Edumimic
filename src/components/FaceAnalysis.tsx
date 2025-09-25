import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";

interface FaceAnalysisProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onEmotionUpdate?: (emotions: { [key: string]: number }) => void;
  onEngagementUpdate?: (engagement: number) => void;
}

export default function FaceAnalysis({ videoRef, onEmotionUpdate, onEngagementUpdate }: FaceAnalysisProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [currentEmotions, setCurrentEmotions] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelsLoaded(true);
        console.log("Face-api models loaded successfully");
      } catch (error) {
        console.error("Failed to load face-api models:", error);
        // Fallback: load from CDN if local models fail
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js/weights"),
            faceapi.nets.faceLandmark68Net.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js/weights"),
            faceapi.nets.faceExpressionNet.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js/weights"),
          ]);
          setIsModelsLoaded(true);
          console.log("Face-api models loaded from CDN");
        } catch (cdnError) {
          console.error("Failed to load models from CDN:", cdnError);
        }
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (!isModelsLoaded) return;

    const detectFaces = async () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        try {
          const detections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

          if (detections.length > 0) {
            const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
            const resized = faceapi.resizeResults(detections, dims);

            // Debug: log first face landmarks positions
            console.log("Landmarks:", resized[0]?.landmarks?.positions);

            // Set canvas dimensions to match video
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;

            // Clear previous drawings
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              
              // Draw bounding boxes
              faceapi.draw.drawDetections(canvasRef.current, resized);
              
              // Draw face landmarks (lines on eyes, nose, mouth, etc.)
              resized.forEach(result => {
                if (result.landmarks) {
                  const drawLandmarks = new faceapi.draw.DrawFaceLandmarks(result.landmarks, { drawLines: true, drawPoints: true, lineWidth: 2 });
                  drawLandmarks.draw(canvasRef.current!);
                }
              });
              
              // Draw face expressions
              faceapi.draw.drawFaceExpressions(canvasRef.current, resized);
            }

            // Analyze emotions and engagement
            const detection = detections[0];
            const faceExpressions = detection.expressions;
            
            // Convert FaceExpressions to our emotion format
            const emotions: { [key: string]: number } = {
              neutral: faceExpressions.neutral || 0,
              happy: faceExpressions.happy || 0,
              sad: faceExpressions.sad || 0,
              angry: faceExpressions.angry || 0,
              fearful: faceExpressions.fearful || 0,
              disgusted: faceExpressions.disgusted || 0,
              surprised: faceExpressions.surprised || 0
            };
            
            setCurrentEmotions(emotions);
            onEmotionUpdate?.(emotions);

            // Calculate engagement score based on expressions
            const engagement = calculateEngagementScore(emotions);
            onEngagementUpdate?.(engagement);
          }
        } catch (error) {
          console.error("Face detection error:", error);
        }
      }
    };

    const interval = setInterval(detectFaces, 200);
    return () => clearInterval(interval);
  }, [isModelsLoaded, videoRef, onEmotionUpdate, onEngagementUpdate]);

  const calculateEngagementScore = (emotions: { [key: string]: number }): number => {
    // Higher scores for positive, focused expressions
    const positive = emotions.happy || 0;
    const neutral = emotions.neutral || 0;
    const surprised = emotions.surprised || 0;
    
    // Lower scores for distracted expressions
    const sad = emotions.sad || 0;
    const angry = emotions.angry || 0;
    const disgusted = emotions.disgusted || 0;
    const fearful = emotions.fearful || 0;

    // Engagement formula (0-1 scale)
    const engagementScore = Math.max(0, Math.min(1, 
      (positive * 0.8 + neutral * 0.6 + surprised * 0.4) - 
      (sad * 0.3 + angry * 0.4 + disgusted * 0.5 + fearful * 0.3)
    ));

    return engagementScore;
  };

  const getDominantEmotion = () => {
    if (Object.keys(currentEmotions).length === 0) return "neutral";
    
    return Object.entries(currentEmotions).reduce((a, b) => 
      currentEmotions[a[0]] > currentEmotions[b[0]] ? a : b
    )[0];
  };

  return (
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        style={{ mixBlendMode: 'difference' }}
      />
      
      {isModelsLoaded && Object.keys(currentEmotions).length > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg p-2 z-20">
          <div className="text-white text-xs">
            <div className="font-medium mb-1">😊 {getDominantEmotion()}</div>
            <div className="text-xs opacity-80">
              Engagement: {Math.round(calculateEngagementScore(currentEmotions) * 100)}%
            </div>
          </div>
        </div>
      )}
      
      {!isModelsLoaded && (
        <div className="absolute top-2 right-2 bg-yellow-500/80 backdrop-blur-sm rounded-lg p-2 z-20">
          <div className="text-white text-xs">Loading face models...</div>
        </div>
      )}
    </div>
  );
}