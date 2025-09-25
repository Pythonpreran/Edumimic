import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  Lightbulb,
  Star,
  RotateCcw,
  Download
} from 'lucide-react';
import { TeachingSession } from './EduMimic';

interface FeedbackModalProps {
  session: TeachingSession;
  onClose: () => void;
  onNewSession: () => void;
}

export default function FeedbackModal({ session, onClose, onNewSession }: FeedbackModalProps) {
  const calculateScores = () => {
    const duration = session.duration / 1000 / 60; // minutes
    const wordCount = session.transcript.join(' ').split(' ').filter(w => w.trim()).length;
    const wordsPerMinute = duration > 0 ? wordCount / duration : 0;
    
    // Content Clarity (40%) - based on word count and pace
    const clarityScore = Math.min(5, Math.max(1, 
      wordsPerMinute > 100 && wordsPerMinute < 180 ? 5 : 
      wordsPerMinute > 80 && wordsPerMinute < 220 ? 4 : 3
    ));

    // Voice Delivery (30%) - based on session interactions
    const deliveryScore = Math.min(5, Math.max(1,
      session.aiInteractions.length > 5 ? 5 :
      session.aiInteractions.length > 3 ? 4 : 3
    ));

    // Body Language (30%) - based on emotion variety
    const emotionVariety = [...new Set(session.emotions)].length;
    const bodyLanguageScore = Math.min(5, Math.max(1,
      emotionVariety > 3 ? 5 :
      emotionVariety > 2 ? 4 : 3
    ));

    const overall = Math.round((clarityScore * 0.4 + deliveryScore * 0.3 + bodyLanguageScore * 0.3) * 10) / 10;

    return {
      clarity: clarityScore,
      delivery: deliveryScore,
      bodyLanguage: bodyLanguageScore,
      overall,
      wordsPerMinute: Math.round(wordsPerMinute)
    };
  };

  const scores = calculateScores();
  
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-success';
    if (score >= 3.5) return 'text-primary';
    if (score >= 2.5) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Good';
    if (score >= 2.5) return 'Fair';
    return 'Needs Improvement';
  };

  const generateTips = () => {
    const tips = [];
    
    if (scores.clarity < 4) {
      if (scores.wordsPerMinute > 180) {
        tips.push("Try speaking more slowly for better clarity");
      } else if (scores.wordsPerMinute < 100) {
        tips.push("Increase your speaking pace to maintain engagement");
      }
      tips.push("Use more pauses and emphasis on key points");
    }

    if (scores.delivery < 4) {
      tips.push("Encourage more student interaction with questions");
      tips.push("Vary your tone and volume for emphasis");
    }

    if (scores.bodyLanguage < 4) {
      const dominantEmotion = session.emotions[session.emotions.length - 1];
      if (dominantEmotion === 'neutral') {
        tips.push("Try smiling more to appear more approachable 😊");
      }
      tips.push("Use more varied facial expressions to show enthusiasm");
    }

    return tips;
  };

  const tips = generateTips();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-primary" />
            Teaching Session Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Overview */}
          <Card className="p-4 bg-gradient-primary text-white">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Clock className="h-5 w-5 mx-auto mb-1" />
                <div className="text-2xl font-bold">
                  {Math.round(session.duration / 1000 / 60)}m
                </div>
                <div className="text-xs opacity-90">Duration</div>
              </div>
              <div>
                <MessageSquare className="h-5 w-5 mx-auto mb-1" />
                <div className="text-2xl font-bold">{session.transcript.length}</div>
                <div className="text-xs opacity-90">Statements</div>
              </div>
              <div>
                <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                <div className="text-2xl font-bold">{session.aiInteractions.length}</div>
                <div className="text-xs opacity-90">Interactions</div>
              </div>
            </div>
          </Card>

          {/* Overall Score */}
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(scores.overall)}`}>
              {scores.overall}
            </div>
            <div className="text-lg font-medium text-muted-foreground">
              {getScoreDescription(scores.overall)} • {scores.wordsPerMinute} WPM
            </div>
            <div className="flex justify-center mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`h-6 w-6 ${
                    star <= Math.round(scores.overall) 
                      ? 'text-warning fill-warning' 
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Detailed Scores */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Detailed Feedback</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Content Clarity (40%)</span>
                  <Badge className={getScoreColor(scores.clarity)}>
                    {scores.clarity}/5
                  </Badge>
                </div>
                <Progress value={scores.clarity * 20} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Voice Delivery (30%)</span>
                  <Badge className={getScoreColor(scores.delivery)}>
                    {scores.delivery}/5
                  </Badge>
                </div>
                <Progress value={scores.delivery * 20} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Body Language (30%)</span>
                  <Badge className={getScoreColor(scores.bodyLanguage)}>
                    {scores.bodyLanguage}/5
                  </Badge>
                </div>
                <Progress value={scores.bodyLanguage * 20} className="h-2" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Improvement Tips */}
          {tips.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Improvement Tips
              </h3>
              <div className="space-y-2">
                {tips.map((tip, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary/30">
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <Download className="mr-2 h-4 w-4" />
            Save Report
          </Button>
          <Button onClick={onNewSession} className="bg-gradient-primary">
            <RotateCcw className="mr-2 h-4 w-4" />
            New Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}