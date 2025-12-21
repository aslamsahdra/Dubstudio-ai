
import { Language, ScriptAnalysis } from "../types";

/**
 * Service to handle API calls to our own Node.js server.
 * This keeps the API_KEY hidden on the server side.
 */

export const generateTranslatedScript = async (
  videoBase64: string,
  mimeType: string,
  targetLanguage: Language
): Promise<ScriptAnalysis> => {
  try {
    const response = await fetch('/api/analyze-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoData: videoBase64,
        mimeType: mimeType,
        targetLanguageCode: targetLanguage.name
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Analysis failed");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Script Proxy Error:", error);
    throw error;
  }
};

export const generateDubbedAudio = async (
  analysis: ScriptAnalysis,
  targetLanguage: Language
): Promise<string> => {
  try {
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Audio synthesis failed");
    }

    const data = await response.json();
    return data.audioBase64;
  } catch (error: any) {
    console.error("Audio Proxy Error:", error);
    throw error;
  }
};
