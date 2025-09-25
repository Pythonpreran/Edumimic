import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EvaluationMetrics {
  faceEngagement: number;
  voiceClarity: number;
  contentQuality: number;
  interactionScore: number;
  overallScore: number;
  feedback: string;
  suggestions: string[];
}

export interface SessionData {
  transcript: string;
  emotions: { [key: string]: number }[];
  voiceQualities: any[];
  topic: string;
  duration: number;
}

export class ComprehensiveScoring {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async evaluateSession(sessionData: SessionData, apiKey?: string): Promise<EvaluationMetrics> {
    try {
      // Initialize Gemini if API key is provided
      if (apiKey && !this.genAI) {
        this.genAI = new GoogleGenerativeAI(apiKey);
      }

      // Calculate individual metrics
      const faceEngagement = this.calculateFaceEngagement(sessionData.emotions);
      const voiceClarity = this.calculateVoiceClarity(sessionData.voiceQualities);
      const interactionScore = this.calculateInteractionScore(sessionData);

      let contentQuality = 0.5; // Default fallback
      let feedback = "Session completed successfully.";
      let suggestions: string[] = [];

      // Use Gemini for content analysis if available
      if (this.genAI && sessionData.transcript) {
        try {
          const contentAnalysis = await this.analyzeContentWithGemini(sessionData);
          contentQuality = contentAnalysis.score;
          feedback = contentAnalysis.feedback;
          suggestions = contentAnalysis.suggestions;
        } catch (error) {
          console.error("Gemini analysis failed:", error);
          // Fallback to local content analysis
          const localAnalysis = this.analyzeContentLocally(sessionData);
          contentQuality = localAnalysis.score;
          feedback = localAnalysis.feedback;
          suggestions = localAnalysis.suggestions;
        }
      } else {
        // Local content analysis fallback
        const localAnalysis = this.analyzeContentLocally(sessionData);
        contentQuality = localAnalysis.score;
        feedback = localAnalysis.feedback;
        suggestions = localAnalysis.suggestions;
      }

      // Calculate overall score with weighted averages
      const overallScore = this.calculateOverallScore({
        faceEngagement,
        voiceClarity,
        contentQuality,
        interactionScore
      });

      return {
        faceEngagement,
        voiceClarity,
        contentQuality,
        interactionScore,
        overallScore,
        feedback,
        suggestions
      };

    } catch (error) {
      console.error("Evaluation failed:", error);
      return this.getDefaultMetrics();
    }
  }

  private calculateFaceEngagement(emotions: { [key: string]: number }[]): number {
    if (!emotions || emotions.length === 0) return 0.5;

    let totalEngagement = 0;
    let validFrames = 0;

    emotions.forEach(emotion => {
      if (Object.keys(emotion).length > 0) {
        const positive = (emotion.happy || 0) + (emotion.surprised || 0) * 0.5;
        const neutral = emotion.neutral || 0;
        const negative = (emotion.sad || 0) + (emotion.angry || 0) + (emotion.disgusted || 0) + (emotion.fearful || 0);
        
        const frameEngagement = Math.max(0, Math.min(1, 
          positive * 0.8 + neutral * 0.4 - negative * 0.3
        ));
        
        totalEngagement += frameEngagement;
        validFrames++;
      }
    });

    return validFrames > 0 ? totalEngagement / validFrames : 0.5;
  }

  private calculateVoiceClarity(voiceQualities: any[]): number {
    if (!voiceQualities || voiceQualities.length === 0) return 0.5;

    const avgClarity = voiceQualities.reduce((sum, quality) => 
      sum + (quality?.clarity || 0), 0) / voiceQualities.length;
    
    return Math.max(0, Math.min(1, avgClarity));
  }

  private calculateInteractionScore(sessionData: SessionData): number {
    const { transcript, duration } = sessionData;
    
    if (!transcript || duration === 0) return 0;

    // Words per minute (ideal: 120-180 WPM for presentations)
    const wordCount = transcript.split(/\s+/).length;
    const wordsPerMinute = (wordCount / duration) * 60;
    
    // Optimal WPM score
    let wpmScore = 0;
    if (wordsPerMinute >= 120 && wordsPerMinute <= 180) {
      wpmScore = 1;
    } else if (wordsPerMinute >= 100 && wordsPerMinute <= 200) {
      wpmScore = 0.8;
    } else if (wordsPerMinute >= 80 && wordsPerMinute <= 220) {
      wpmScore = 0.6;
    } else {
      wpmScore = 0.4;
    }

    // Interaction complexity (questions, explanations, etc.)
    const interactionPatterns = [
      /\?/g, // questions
      /because|therefore|thus|so|hence/gi, // explanations
      /first|second|third|next|then|finally/gi, // structure
      /for example|such as|like|including/gi // examples
    ];

    let interactionComplexity = 0;
    interactionPatterns.forEach(pattern => {
      const matches = transcript.match(pattern);
      interactionComplexity += matches ? matches.length : 0;
    });

    const complexityScore = Math.min(1, interactionComplexity / 10);

    return (wpmScore * 0.6 + complexityScore * 0.4);
  }

  private async analyzeContentWithGemini(sessionData: SessionData): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }> {
    if (!this.genAI) throw new Error("Gemini not initialized");

    const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
    Analyze this educational presentation and provide a detailed evaluation:

    Topic: ${sessionData.topic}
    Duration: ${sessionData.duration} seconds
    Transcript: ${sessionData.transcript}

    Please evaluate based on:
    1. Content accuracy and completeness
    2. Clarity of explanation
    3. Educational value
    4. Structure and flow
    5. Engagement techniques

    Provide your response in this exact JSON format:
    {
      "score": 0.85,
      "feedback": "Your explanation was clear and well-structured...",
      "suggestions": [
        "Add more examples to illustrate key points",
        "Speak slightly slower for better comprehension"
      ]
    }

    Score should be between 0 and 1. Keep feedback concise but constructive.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const analysis = JSON.parse(text);
      return {
        score: Math.max(0, Math.min(1, analysis.score || 0.5)),
        feedback: analysis.feedback || "Content analysis completed.",
        suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : []
      };
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      throw new Error("Invalid response format");
    }
  }

  private analyzeContentLocally(sessionData: SessionData): {
    score: number;
    feedback: string;
    suggestions: string[];
  } {
    const { transcript, topic, duration } = sessionData;
    
    if (!transcript) {
      return {
        score: 0.2,
        feedback: "No speech detected during the session.",
        suggestions: ["Ensure microphone is working", "Speak clearly and loudly"]
      };
    }

    const wordCount = transcript.split(/\s+/).length;
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Basic content quality metrics
    let contentScore = 0.5; // Base score
    const suggestions: string[] = [];

    // Word count analysis
    if (wordCount < 50) {
      contentScore -= 0.2;
      suggestions.push("Provide more detailed explanations");
    } else if (wordCount > 500) {
      contentScore += 0.1;
    }

    // Topic relevance (simple keyword matching)
    const topicKeywords = topic.toLowerCase().split(/\s+/);
    const transcriptLower = transcript.toLowerCase();
    const keywordMatches = topicKeywords.filter(keyword => 
      transcriptLower.includes(keyword)
    ).length;
    
    const relevanceScore = keywordMatches / topicKeywords.length;
    contentScore += relevanceScore * 0.3;

    // Structure analysis
    if (sentences.length > 3) {
      contentScore += 0.1;
    }

    // Educational indicators
    const educationalPatterns = [
      /explain|definition|means|refers to/gi,
      /example|instance|such as/gi,
      /because|reason|cause/gi,
      /important|key|main|primary/gi
    ];

    let educationalScore = 0;
    educationalPatterns.forEach(pattern => {
      if (transcript.match(pattern)) {
        educationalScore += 0.05;
      }
    });

    contentScore = Math.max(0, Math.min(1, contentScore + educationalScore));

    // Generate feedback
    let feedback = "";
    if (contentScore >= 0.8) {
      feedback = "Excellent presentation with clear explanations and good topic coverage.";
    } else if (contentScore >= 0.6) {
      feedback = "Good presentation with room for improvement in detail and clarity.";
    } else if (contentScore >= 0.4) {
      feedback = "Adequate presentation but needs more comprehensive coverage.";
    } else {
      feedback = "Presentation needs significant improvement in content and delivery.";
    }

    // Add specific suggestions
    if (relevanceScore < 0.5) {
      suggestions.push("Stay more focused on the main topic");
    }
    if (wordCount < 100) {
      suggestions.push("Provide more detailed explanations");
    }
    if (!transcript.match(/example|instance/gi)) {
      suggestions.push("Include examples to illustrate your points");
    }

    return { score: contentScore, feedback, suggestions };
  }

  private calculateOverallScore(metrics: {
    faceEngagement: number;
    voiceClarity: number;
    contentQuality: number;
    interactionScore: number;
  }): number {
    const weights = {
      faceEngagement: 0.2,
      voiceClarity: 0.25,
      contentQuality: 0.35,
      interactionScore: 0.2
    };

    return (
      metrics.faceEngagement * weights.faceEngagement +
      metrics.voiceClarity * weights.voiceClarity +
      metrics.contentQuality * weights.contentQuality +
      metrics.interactionScore * weights.interactionScore
    );
  }

  private getDefaultMetrics(): EvaluationMetrics {
    return {
      faceEngagement: 0.5,
      voiceClarity: 0.5,
      contentQuality: 0.5,
      interactionScore: 0.5,
      overallScore: 0.5,
      feedback: "Unable to complete full evaluation due to technical issues.",
      suggestions: ["Ensure camera and microphone permissions are granted", "Try again with better lighting"]
    };
  }
}