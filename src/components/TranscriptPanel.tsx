import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Clock } from 'lucide-react';

interface TranscriptPanelProps {
  transcript: string[];
  isRecording: boolean;
}

export default function TranscriptPanel({ transcript, isRecording }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [duration, setDuration] = React.useState(0);

  // Auto-scroll to bottom when new transcript arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Update word count
  useEffect(() => {
    const totalWords = transcript.join(' ').split(' ').filter(word => word.trim()).length;
    setWordCount(totalWords);
  }, [transcript]);

  // Update duration timer
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getReadingSpeed = () => {
    if (duration === 0) return 0;
    return Math.round((wordCount / duration) * 60);
  };

  return (
    <Card className="p-4 h-80">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Live Transcript</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(duration)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {wordCount} words
          </Badge>
          {wordCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {getReadingSpeed()} wpm
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="h-56" ref={scrollRef}>
        <div className="space-y-2 pr-4">
          {transcript.length > 0 ? (
            transcript.map((text, index) => (
              <div
                key={index}
                className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary/30 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground mt-1 font-mono">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm leading-relaxed flex-1">{text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isRecording ? 'Start speaking to see transcript...' : 'Transcript will appear here'}
                </p>
              </div>
            </div>
          )}
          
          {isRecording && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-100"></div>
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-200"></div>
              </div>
              <span className="text-xs">Listening...</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}