import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComprehensiveScoring, EvaluationMetrics, SessionData } from '@/utils/scoringSystem';
import { VoiceQuality, getVoiceQualityColor, getVoiceQualityIcon } from '@/utils/voiceAnalysis';

interface EvaluationPanelProps {
  sessionData: SessionData;
  currentVoiceQuality?: VoiceQuality;
  currentEmotions?: { [key: string]: number };
  isRecording: boolean;
  onEvaluationComplete?: (metrics: EvaluationMetrics) => void;
}

export default function EvaluationPanel({
  sessionData,
  currentVoiceQuality,
  currentEmotions,
  isRecording,
  onEvaluationComplete
}: EvaluationPanelProps) {
  const [evaluation, setEvaluation] = useState<EvaluationMetrics | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const scorer = new ComprehensiveScoring();

  const handleEvaluate = async () => {
    if (!sessionData.transcript && !isRecording) {
      alert("No transcript available to evaluate. Please record some speech first.");
      return;
    }

    setIsEvaluating(true);
    try {
      const metrics = await scorer.evaluateSession(sessionData, geminiApiKey || undefined);
      setEvaluation(metrics);
      onEvaluationComplete?.(metrics);
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return "text-green-500";
    if (score >= 0.6) return "text-blue-500";
    if (score >= 0.4) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.9) return "Excellent";
    if (score >= 0.8) return "Very Good";
    if (score >= 0.7) return "Good";
    if (score >= 0.6) return "Fair";
    if (score >= 0.4) return "Needs Improvement";
    return "Poor";
  };

  const getDominantEmotion = () => {
    if (!currentEmotions || Object.keys(currentEmotions).length === 0) return "neutral";
    
    return Object.entries(currentEmotions).reduce((a, b) => 
      currentEmotions[a[0]] > currentEmotions[b[0]] ? a : b
    )[0];
  };

  const calculateCurrentEngagement = () => {
    if (!currentEmotions) return 0;
    
    const positive = (currentEmotions.happy || 0) + (currentEmotions.surprised || 0) * 0.5;
    const neutral = currentEmotions.neutral || 0;
    const negative = (currentEmotions.sad || 0) + (currentEmotions.angry || 0) + 
                     (currentEmotions.disgusted || 0) + (currentEmotions.fearful || 0);
    
    return Math.max(0, Math.min(1, positive * 0.8 + neutral * 0.4 - negative * 0.3));
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Real-time Evaluation</h3>
          <Badge variant={isRecording ? "default" : "secondary"}>
            {isRecording ? "🔴 Live" : "⏸️ Paused"}
          </Badge>
        </div>

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="live">Live Metrics</TabsTrigger>
            <TabsTrigger value="evaluation">Full Evaluation</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            {/* Real-time Voice Quality */}
            <div className="space-y-2">
              <Label>Voice Quality</Label>
              <div className="flex items-center gap-2">
                {currentVoiceQuality ? (
                  <>
                    <Badge className={getVoiceQualityColor(currentVoiceQuality.score)}>
                      {getVoiceQualityIcon(currentVoiceQuality.score)} {currentVoiceQuality.score}
                    </Badge>
                    <Progress 
                      value={currentVoiceQuality.clarity * 100} 
                      className="flex-1" 
                    />
                    <span className="text-sm text-muted-foreground">
                      {Math.round(currentVoiceQuality.clarity * 100)}%
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No voice data</span>
                )}
              </div>
            </div>

            {/* Real-time Face Analysis */}
            <div className="space-y-2">
              <Label>Face Engagement</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  😊 {getDominantEmotion()}
                </Badge>
                <Progress 
                  value={calculateCurrentEngagement() * 100} 
                  className="flex-1" 
                />
                <span className="text-sm text-muted-foreground">
                  {Math.round(calculateCurrentEngagement() * 100)}%
                </span>
              </div>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold">{sessionData.transcript.split(/\s+/).length}</div>
                <div className="text-sm text-muted-foreground">Words Spoken</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(sessionData.duration / 60)}m</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="evaluation" className="space-y-4">
            {!geminiApiKey && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="apikey">Gemini API Key (Optional)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  >
                    {showApiKeyInput ? 'Hide' : 'Advanced Scoring'}
                  </Button>
                </div>
                
                {showApiKeyInput && (
                  <Input
                    id="apikey"
                    type="password"
                    placeholder="Enter Gemini API key for AI-powered content analysis"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>
            )}

            <Button 
              onClick={handleEvaluate}
              disabled={isEvaluating || (!sessionData.transcript && !isRecording)}
              className="w-full"
            >
              {isEvaluating ? "Evaluating..." : "Generate Complete Evaluation"}
            </Button>

            {evaluation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
                      {Math.round(evaluation.overallScore * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                    <Badge className={getScoreColor(evaluation.overallScore)}>
                      {getScoreLabel(evaluation.overallScore)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Face Engagement</span>
                      <span className={`text-sm font-medium ${getScoreColor(evaluation.faceEngagement)}`}>
                        {Math.round(evaluation.faceEngagement * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Voice Clarity</span>
                      <span className={`text-sm font-medium ${getScoreColor(evaluation.voiceClarity)}`}>
                        {Math.round(evaluation.voiceClarity * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Content Quality</span>
                      <span className={`text-sm font-medium ${getScoreColor(evaluation.contentQuality)}`}>
                        {Math.round(evaluation.contentQuality * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Interaction Score</span>
                      <span className={`text-sm font-medium ${getScoreColor(evaluation.interactionScore)}`}>
                        {Math.round(evaluation.interactionScore * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Feedback</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {evaluation.feedback}
                  </p>
                </div>

                {evaluation.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Suggestions for Improvement</Label>
                    <ul className="text-sm space-y-1">
                      {evaluation.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}