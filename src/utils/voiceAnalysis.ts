export interface VoiceQuality {
  clarity: number;
  score: string;
  volume: number;
  confidence: number;
}

export async function analyzeVoiceQuality(blob: Blob): Promise<VoiceQuality> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    
    // Calculate RMS (Root Mean Square) for volume analysis
    let sumSquares = 0;
    let maxAmplitude = 0;
    let silenceFrames = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);
      sumSquares += channelData[i] * channelData[i];
      maxAmplitude = Math.max(maxAmplitude, amplitude);
      
      // Count silence frames (very low amplitude)
      if (amplitude < 0.001) {
        silenceFrames++;
      }
    }
    
    const rms = Math.sqrt(sumSquares / channelData.length);
    const silenceRatio = silenceFrames / channelData.length;
    
    // Calculate clarity score based on multiple factors
    let clarityScore = 0;
    let scoreLabel = "";
    let confidence = 0;
    
    // Volume analysis
    const volumeScore = Math.min(1, rms * 20); // Normalize to 0-1 scale
    
    // Signal-to-noise ratio estimation
    const dynamicRange = maxAmplitude - rms;
    const snrScore = Math.min(1, dynamicRange * 10);
    
    // Speech consistency (less silence = more consistent speech)
    const consistencyScore = Math.max(0, 1 - silenceRatio * 2);
    
    // Combined clarity score
    clarityScore = (volumeScore * 0.4 + snrScore * 0.3 + consistencyScore * 0.3);
    confidence = clarityScore;
    
    // Determine score labels
    if (clarityScore > 0.8) {
      scoreLabel = "Excellent";
    } else if (clarityScore > 0.6) {
      scoreLabel = "Good";
    } else if (clarityScore > 0.4) {
      scoreLabel = "Fair";
    } else if (clarityScore > 0.2) {
      scoreLabel = "Poor";
    } else {
      scoreLabel = "Very Poor";
    }
    
    return {
      clarity: clarityScore,
      score: scoreLabel,
      volume: volumeScore,
      confidence: confidence
    };
    
  } catch (error) {
    console.error("Voice analysis failed:", error);
    return {
      clarity: 0,
      score: "Error",
      volume: 0,
      confidence: 0
    };
  }
}

export function getVoiceQualityColor(score: string): string {
  switch (score) {
    case "Excellent": return "text-green-500";
    case "Good": return "text-blue-500";
    case "Fair": return "text-yellow-500";
    case "Poor": return "text-orange-500";
    case "Very Poor": return "text-red-500";
    default: return "text-gray-500";
  }
}

export function getVoiceQualityIcon(score: string): string {
  switch (score) {
    case "Excellent": return "🎤✨";
    case "Good": return "🎤👍";
    case "Fair": return "🎤⚠️";
    case "Poor": return "🎤👎";
    case "Very Poor": return "🎤❌";
    default: return "🎤❓";
  }
}