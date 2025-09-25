import React, { useState, useRef, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../types/speech.d.ts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Square, RotateCcw, Camera, Mic, MicOff } from 'lucide-react';
import WebcamFeed from './WebcamFeed';
import TranscriptPanel from './TranscriptPanel';
import AIStudentChat from './AIStudentChat';
import FeedbackModal from './FeedbackModal';
import DeviceSelector from './DeviceSelector';
import EvaluationPanel from './EvaluationPanel';
import { analyzeVoiceQuality, VoiceQuality } from '@/utils/voiceAnalysis';
import { SessionData } from '@/utils/scoringSystem';
import { API_KEYS, API_ENDPOINTS } from '@/config/api';

export interface TeachingSession {
  id: string;
  topic: string;
  transcript: string[];
  emotions: string[];
  aiInteractions: { timestamp: number; message: string; type: 'question' | 'reaction' }[];
  startTime: Date;
  duration: number;
}

export default function EduMimic() {
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');
  const [session, setSession] = useState<TeachingSession | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [emotions, setEmotions] = useState<string[]>(['neutral']);
  const [aiMessages, setAiMessages] = useState<
    { timestamp: number; message: string; type: 'question' | 'reaction' }[]
  >([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [useWhisper, setUseWhisper] = useState<boolean>(false);
  const [transcriptCount, setTranscriptCount] = useState<number>(0);
  
  // New evaluation states
  const [currentVoiceQuality, setCurrentVoiceQuality] = useState<VoiceQuality | undefined>();
  const [currentFaceEmotions, setCurrentFaceEmotions] = useState<{ [key: string]: number }>({});
  const [currentEngagement, setCurrentEngagement] = useState<number>(0);
  const [emotionHistory, setEmotionHistory] = useState<{ [key: string]: number }[]>([]);
  const [voiceQualityHistory, setVoiceQualityHistory] = useState<VoiceQuality[]>([]);

  const { transcript: liveTranscript, resetTranscript, listening, browserSupportsSpeechRecognition } = useSpeechRecognition({ 
    continuous: true 
  });
  
  // Debug logging
  console.log('Speech Recognition State:', { 
    listening, 
    browserSupportsSpeechRecognition, 
    isActive, 
    isRecording, 
    liveTranscript: liveTranscript?.slice(0, 50) + '...' 
  });
  const sessionStartTime = useRef<Date>(new Date());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (useWhisper) {
      // Handle Whisper recording
      if (isActive && isRecording) {
        startWhisperRecording();
      } else {
        stopWhisperRecording();
      }
      return;
    }
    
    if (!browserSupportsSpeechRecognition) {
      setErrorMessage('Speech recognition not supported. Please use Chrome or Edge browser.');
      return;
    }
    
    if (isActive && isRecording) {
      SpeechRecognition.startListening({ 
        continuous: true, 
        language: 'en-US',
        interimResults: false 
      }).catch((err) =>
        setErrorMessage(`Speech recognition failed: ${err.message}`)
      );
    } else {
      SpeechRecognition.stopListening();
    }
  }, [isActive, isRecording, browserSupportsSpeechRecognition, useWhisper]);

  useEffect(() => {
    if (useWhisper) return; // Skip Web Speech API when using Whisper
    
    if (liveTranscript && liveTranscript.trim() !== '' && listening) {
      const trimmedTranscript = liveTranscript.trim();
      console.log('New transcript:', trimmedTranscript);
      
      // Add to transcript array
      setTranscript((prev) => {
        const newTranscript = [...prev, trimmedTranscript];
        
        // Check if transcript contains question triggers
        const hasQuestionTriggers = trimmedTranscript.includes('?') || 
          /\b(explain|why|how|can you repeat|what do you mean|i don't understand)\b/i.test(trimmedTranscript);
        
        // Generate AI response based on triggers or random interval
        setTranscriptCount(prevCount => {
          const newCount = prevCount + 1;
          const randomInterval = Math.floor(Math.random() * 3) + 5; // 5-7 randomly
          
          if (hasQuestionTriggers || newCount % randomInterval === 0) {
            generateAIResponse(newTranscript, aiMessages);
          }
          return newCount;
        });
        
        return newTranscript;
      });
      
      // Reset for next transcript
      resetTranscript();
    }
  }, [liveTranscript, listening, resetTranscript, useWhisper, aiMessages]);

  // Utility: check if audio blob has enough volume
  const isLoudEnough = async (blob: Blob, threshold = 0.01): Promise<boolean> => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0); // first channel
      let sumSquares = 0;
      for (let i = 0; i < channelData.length; i++) {
        sumSquares += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sumSquares / channelData.length); // Root mean square (volume)
      
      console.log("Audio RMS:", rms);
      return rms > threshold; // true if loud enough
    } catch (error) {
      console.error('Error analyzing audio volume:', error);
      return false; // Skip if we can't analyze
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch(API_ENDPOINTS.OPENAI_TRANSCRIPTION, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        console.log('Whisper transcription:', data.text);
        setTranscript((prev) => {
          const newTranscript = [...prev, data.text];
          
          // Check if transcript contains question triggers
          const hasQuestionTriggers = data.text.includes('?') || 
            /\b(explain|why|how|can you repeat|what do you mean|i don't understand)\b/i.test(data.text);
          
          // Generate AI response based on triggers or random interval
          setTranscriptCount(prevCount => {
            const newCount = prevCount + 1;
            const randomInterval = Math.floor(Math.random() * 3) + 5; // 5-7 randomly
            
            if (hasQuestionTriggers || newCount % randomInterval === 0) {
              generateAIResponse(newTranscript, aiMessages);
            }
            return newCount;
          });
          
          return newTranscript;
        });
        return data.text;
      }
    } catch (error) {
      console.error('Whisper transcription error:', error);
      setErrorMessage('Whisper transcription failed.');
    }
    return '';
  };

  const startWhisperRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          // Analyze voice quality
          const voiceQuality = await analyzeVoiceQuality(audioBlob);
          setCurrentVoiceQuality(voiceQuality);
          setVoiceQualityHistory(prev => [...prev, voiceQuality]);
          
          const loud = await isLoudEnough(audioBlob);
          if (loud && voiceQuality.score !== "Poor" && voiceQuality.score !== "Very Poor") {
            await transcribeAudio(audioBlob);
          } else {
            console.log("Skipped low quality audio chunk");
          }
        }
        audioChunksRef.current = [];
      };
      
      // Record in 10-second chunks
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setTimeout(() => {
            if (mediaRecorderRef.current && isRecording) {
              mediaRecorderRef.current.start();
            }
          }, 100);
        }
      }, 10000);
      
      mediaRecorderRef.current.start();
      console.log('Started Whisper recording in 10-second chunks');
    } catch (error) {
      console.error('Failed to start Whisper recording:', error);
      setErrorMessage('Failed to access microphone for Whisper recording.');
    }
  };

  const stopWhisperRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    mediaRecorderRef.current = null;
    console.log('Stopped Whisper recording');
  };

  const generateAIResponse = async (fullTranscript: string[], currentAiMessages: { timestamp: number; message: string; type: 'question' | 'reaction' }[]) => {
    try {
      // Create context from full conversation
      const transcriptContext = fullTranscript.join(' ');
      const chatHistory = currentAiMessages.map(msg => `Student: ${msg.message}`).join('\n');
      
      const contextPrompt = `You are a curious student in a ${currentTopic} lesson. 

Full lesson transcript so far: "${transcriptContext}"

Previous student interactions:
${chatHistory}

Based on the full context above, respond as a realistic student would. Be brief (1-2 sentences). Consider the flow of the conversation and ask relevant questions or make appropriate reactions. Respond as: "Student: [your response]"`;

      const response = await fetch(
        `${API_ENDPOINTS.GEMINI_GENERATE_CONTENT}?key=${API_KEYS.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: contextPrompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiResponse = data.candidates[0].content.parts[0].text.replace('Student: ', '');
        setAiMessages((prev) => [
          ...prev,
          { timestamp: Date.now(), message: aiResponse, type: Math.random() > 0.7 ? 'question' : 'reaction' },
        ]);
      }
    } catch (error) {
      console.error('AI response error:', error);
      setErrorMessage('Failed to generate AI response.');
    }
  };

  const startTeaching = async () => {
    if (!currentTopic.trim()) {
      setCurrentTopic('General Topic');
    }
    
    setIsActive(true);
    setIsRecording(true);
    sessionStartTime.current = new Date();
    setTranscript([]);
    setEmotions(['neutral']);
    setAiMessages([]);
    setErrorMessage('');
    setTranscriptCount(0);
    
    // Reset evaluation states
    setCurrentVoiceQuality(undefined);
    setCurrentFaceEmotions({});
    setCurrentEngagement(0);
    setEmotionHistory([]);
    setVoiceQualityHistory([]);

    // Both Whisper and Web Speech API will be handled by the useEffect hooks
  };

  const stopTeaching = () => {
    setIsActive(false);
    setIsRecording(false);
    
    // Stop Web Speech API
    SpeechRecognition.stopListening();
    
    // Clean up Whisper recording
    stopWhisperRecording();
    
    const sessionData: TeachingSession = {
      id: Date.now().toString(),
      topic: currentTopic,
      transcript,
      emotions,
      aiInteractions: aiMessages,
      startTime: sessionStartTime.current,
      duration: Date.now() - sessionStartTime.current.getTime(),
    };
    setSession(sessionData);
    setShowFeedback(true);
  };

  const restartSession = () => {
    stopTeaching();
    setTimeout(() => startTeaching(), 100);
  };

  const handleFaceEmotionUpdate = (emotions: { [key: string]: number }) => {
    setCurrentFaceEmotions(emotions);
    setEmotionHistory(prev => [...prev, emotions]);
  };

  const handleEngagementUpdate = (engagement: number) => {
    setCurrentEngagement(engagement);
  };

  const getCurrentSessionData = (): SessionData => {
    return {
      transcript: transcript.join(' '),
      emotions: emotionHistory,
      voiceQualities: voiceQualityHistory,
      topic: currentTopic,
      duration: Math.floor((Date.now() - sessionStartTime.current.getTime()) / 1000)
    };
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTopic(e.target.value);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            EduMimic
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-Powered Teaching Practice Simulator
          </p>
        </div>

        {errorMessage && (
          <Card className="p-4 mb-6 bg-destructive/10 border-destructive">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </Card>
        )}
        {!isActive && (
          <Card className="p-6 mb-6 border-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Teaching Topic</label>
                <input
                  type="text"
                  placeholder="e.g., Photosynthesis, Math Fractions, History of Rome..."
                  value={currentTopic}
                  onChange={handleTopicChange}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div>
                  <label className="text-sm font-medium">Whisper Transcription</label>
                  <p className="text-xs text-muted-foreground">Records in 10-second chunks for better accuracy</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useWhisper}
                    onChange={(e) => setUseWhisper(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              <Button
                onClick={startTeaching}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                size="lg"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Teaching Session
              </Button>
            </div>
          </Card>
        )}

        {/* Main Interface */}
        {isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left Panel - Webcam Feed */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Live Feed</h2>
                <div className="flex items-center gap-2">
                  <Badge variant={isRecording ? 'default' : 'secondary'}>
                    {isRecording ? <Mic className="h-3 w-3 mr-1" /> : <MicOff className="h-3 w-3 mr-1" />}
                    {isRecording ? 'Recording' : 'Paused'}
                  </Badge>
                  <Badge variant="outline" className="bg-accent text-accent-foreground">
                    <Camera className="h-3 w-3 mr-1" />
                    {currentTopic}
                  </Badge>
                </div>
              </div>
              <WebcamFeed 
                isActive={isActive} 
                onEmotionUpdate={setEmotions}
                onFaceEmotionUpdate={handleFaceEmotionUpdate}
                onEngagementUpdate={handleEngagementUpdate}
                selectedCamera={selectedCamera} 
              />
              <DeviceSelector
                onCameraChange={setSelectedCamera}
                onMicrophoneChange={setSelectedMicrophone}
              />
            </Card>

            {/* Right Panel - Transcript, AI Chat & Evaluation */}
            <div className="space-y-6">
              <TranscriptPanel transcript={transcript} isRecording={isRecording} />
              <AIStudentChat messages={aiMessages} />
              <EvaluationPanel
                sessionData={getCurrentSessionData()}
                currentVoiceQuality={currentVoiceQuality}
                currentEmotions={currentFaceEmotions}
                isRecording={isRecording}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        {isActive && (
          <Card className="p-6">
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => setIsRecording(!isRecording)}
                className="px-6"
              >
                {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {isRecording ? 'Pause' : 'Resume'}
              </Button>
              
              <Button
                variant="outline"
                onClick={restartSession}
                className="px-6"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart
              </Button>
              
              <Button
                onClick={stopTeaching}
                className="px-8 bg-gradient-accent hover:shadow-glow transition-all duration-300"
              >
                <Square className="mr-2 h-4 w-4" />
                End Session
              </Button>
            </div>
          </Card>
        )}

        {/* Feedback Modal */}
        {showFeedback && session && (
          <FeedbackModal 
            session={session} 
            onClose={() => setShowFeedback(false)}
            onNewSession={() => {
              setShowFeedback(false);
              setCurrentTopic('');
            }}
          />
        )}
      </div>
    </div>
  );
}