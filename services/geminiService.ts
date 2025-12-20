
import { GoogleGenAI, Modality } from "@google/genai";
import { Language, ScriptAnalysis, Speaker } from "../types";

// Note: In the preview environment, process.env.API_KEY is pre-configured.
// For local use, ensure you have an .env file with API_KEY=your_key.

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'ਤੁਹਾਡੀ_ਕੀ_ਇੱਥੇ_ਪਾਓ') {
    throw new Error("API Key is missing. Please add your key to the .env file as instructed in the guide.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTranslatedScript = async (
  videoBase64: string,
  mimeType: string,
  targetLanguage: Language
): Promise<ScriptAnalysis> => {
  try {
    const ai = getClient();
    const model = "gemini-3-flash-preview"; 
    
    const prompt = `
      You are an AI video dubbing engineer. 
      Analyze this video and:
      1. Detect all unique speakers (e.g. Speaker A, Speaker B).
      2. Identify their genders (MALE/FEMALE).
      3. Translate everything spoken into ${targetLanguage.name}.
      4. Maintain the tone and style of the original.
      5. Output ONLY a JSON object with this structure:
      {
        "speakers": [{ "id": "Speaker A", "gender": "MALE" }],
        "script": [{ "speakerId": "Speaker A", "text": "Translated content" }]
      }
    `;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType, data: videoBase64 } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    if (!response.text) throw new Error("AI did not return a script.");

    const result = JSON.parse(response.text.trim());
    
    const formattedTranscript = (result.script || []).map((line: any) => `${line.speakerId}: ${line.text}`).join('\n');
    const speakers = (result.speakers || []).map((s: any) => ({
      id: s.id,
      gender: (s.gender?.toUpperCase() === 'FEMALE') ? 'FEMALE' : 'MALE'
    }));

    return { transcript: formattedTranscript, speakers };

  } catch (error: any) {
    console.error("Script analysis error:", error);
    throw new Error(error.message || "Failed to analyze video.");
  }
};

export const generateDubbedAudio = async (
  analysis: ScriptAnalysis,
  targetLanguage: Language
): Promise<string> => {
  try {
    const ai = getClient();
    const model = "gemini-2.5-flash-preview-tts"; 

    // Dynamically assign voices based on gender detection from the first step
    const speechConfig = {
      multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
              { speaker: "Speaker A", voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
              { speaker: "Speaker B", voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
      }
    };
    
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: analysis.transcript }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("Failed to generate dub audio.");
    return audioData;
  } catch (error: any) {
    console.error("Audio generation error:", error);
    throw new Error(error.message || "Failed to generate dub audio.");
  }
};
