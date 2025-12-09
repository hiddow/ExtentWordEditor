import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.warn("API_KEY is not set in environment variables!");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// ----------------------------------------------------------------------------
// Types (Mirrored from frontend)
// ----------------------------------------------------------------------------

export interface VocabItem {
    script?: string;
    phonetic?: string;
    variant?: string;
    partOfSpeech?: string;
    translations: Record<string, string>;
    exampleSentence?: string;
    exampleSentenceTokens?: any[];
    exampleScript?: string;
    exampleTranslation?: string;
    exampleTranslations?: Record<string, string>;
}

// ----------------------------------------------------------------------------
// Generation Logic
// ----------------------------------------------------------------------------

export const generateVocabData = async (
  term: string, 
  targetLanguage: string
): Promise<Partial<VocabItem>> => {
  try {
    // Define the language properties structure to reuse
    const languageProperties = {
      en: { type: Type.STRING }, ar: { type: Type.STRING }, de: { type: Type.STRING },
      es: { type: Type.STRING }, fr: { type: Type.STRING }, in: { type: Type.STRING },
      it: { type: Type.STRING }, ja: { type: Type.STRING }, ko: { type: Type.STRING },
      pl: { type: Type.STRING }, pt: { type: Type.STRING }, ru: { type: Type.STRING },
      th: { type: Type.STRING }, tr: { type: Type.STRING }, vi: { type: Type.STRING },
      zh_cn: { type: Type.STRING }, zh_tw: { type: Type.STRING }
    };

    const requiredLanguages = Object.keys(languageProperties);

    const prompt = `
      Analyze the vocabulary term "${term}" which is a ${targetLanguage} word.
      Provide the following details. ALL FIELDS ARE REQUIRED.
      
      1. script: 
         - If Japanese: Kanji with Furigana or Kana.
         - If Chinese: Pinyin. **CRITICAL**: Must be strictly lowercase, space-separated, with tone marks. Example: "dé guó" (CORRECT), "DeGuo" (WRONG).
         - If Korean: Hangul or Romanization.
         - Otherwise: "N/A" or IPA.
      2. variant:
         - **If Chinese**: Provide the **Traditional Chinese** character(s).
         - If Japanese: Provide the Kanji if the term is Kana, or vice versa if useful.
         - Otherwise: Empty string or alternate spelling.
      3. phonetic: IPA or standard romanization.
      4. partOfSpeech: Grammatical category.
      5. translations: Translate "${term}" into: en, ar, de, es, fr, in, it, ja, ko, pl, pt, ru, th, tr, vi, zh-rCN, zh-rTW.
      6. exampleSentence: A natural example sentence in ${targetLanguage}.
      7. exampleSentenceStructure: Break down the example sentence into an array of tokens. Punctuation should be separate tokens.
         - For each token, provide:
           - word: The token itself.
           - script: Reading/Pinyin. **CRITICAL**: For Chinese, strict lowercase, space-separated Pinyin (e.g., "hǎo").
           - variant: **Traditional Chinese** character for this token if applicable.
           - translation: Short English translation.
           - translations: A map of translations of this specific token into ALL requested languages (same list as above).
      8. exampleScript: Full reading of the sentence. **CRITICAL**: For Chinese, strict lowercase, space-separated Pinyin.
      9. exampleTranslations: Translate the sentence into all requested languages.
    `;

    // Using underscores in schema keys to ensure robustness, then mapping back
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            variant: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            translations: {
              type: Type.OBJECT,
              properties: languageProperties,
              required: requiredLanguages
            },
            exampleSentence: { type: Type.STRING },
            exampleSentenceStructure: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        script: { type: Type.STRING },
                        variant: { type: Type.STRING },
                        translation: { type: Type.STRING },
                        translations: {
                             type: Type.OBJECT,
                             properties: languageProperties,
                             // We make them optional here to avoid strict validation failures on rare words
                        }
                    },
                    required: ["word", "script", "translation"]
                }
            },
            exampleScript: { type: Type.STRING },
            exampleTranslations: {
              type: Type.OBJECT,
              properties: languageProperties,
              required: requiredLanguages
            }
          },
          required: [
            "script", "phonetic", "variant", "partOfSpeech", "translations", 
            "exampleSentence", "exampleSentenceStructure", "exampleScript", "exampleTranslations"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");

    const data = JSON.parse(text);
    
    // Helper to map safe keys (zh_cn) back to our keys (zh-rCN)
    const mapKeys = (obj: any) => {
      if (!obj) return {};
      return {
        ...obj,
        'zh-rCN': obj.zh_cn || obj['zh-rCN'],
        'zh-rTW': obj.zh_tw || obj['zh-rTW']
      };
    };

    const translations = mapKeys(data.translations);
    const exampleTranslations = mapKeys(data.exampleTranslations);
    
    // Map tokens to normalize keys
    const tokens = (data.exampleSentenceStructure || []).map((t: any) => ({
        ...t,
        translations: mapKeys(t.translations)
    }));
    
    return {
      script: data.script,
      phonetic: data.phonetic,
      variant: data.variant,
      partOfSpeech: data.partOfSpeech,
      translations: translations,
      exampleSentence: data.exampleSentence,
      exampleSentenceTokens: tokens,
      exampleScript: data.exampleScript,
      exampleTranslation: exampleTranslations['en'], // Fallback/Primary for UI
      exampleTranslations: exampleTranslations,
    };

  } catch (error) {
    console.error("Gemini Text Error:", error);
    throw error;
  }
};

export const generateVocabImage = async (
  term: string, 
  customPrompt?: string,
  referenceImageBase64?: string
): Promise<string> => {
  try {
    
    // Default prompt if custom one isn't provided
    const promptText = customPrompt || `
    Create a simple, modern, flat vector illustration for the vocabulary word: "${term}".
    
    Design Style:
    - **Borderless Flat Design**: Use purely solid color blocks/shapes. NO outlines. NO strokes.
    - **Color Palette**: Fresh, elegant, and light tones (pastel-like, clean aesthetic). Avoid dark, muddy, or neon colors.
    - **Composition**: Close-up view. The subject should be large and fill the majority of the frame. Subject should extend close to the edges of the canvas. Minimize empty white space around the subject. Centralized and balanced.
    - **Clear Semantics**: The image must clearly and instantly depict the meaning of the word.
    - **Background**: Pure white background.
    - **STRICT RESTRICTIONS**: ABSOLUTELY NO TEXT, LETTERS, OR CHARACTERS within the illustration. No gradients, no shadows, no complex details.
    `;

    const parts: any[] = [];

    // Add reference image if provided
    if (referenceImageBase64) {
      // Strip prefix if present (data:image/png;base64,)
      const base64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/png', // Assuming png/jpeg, Gemini usually handles widely used types
          data: base64Data
        }
      });
      // Append instruction to use image as reference
      parts.push({ text: "Use the attached image as a style reference. " + promptText });
    } else {
      parts.push({ text: promptText });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: parts
      },
      config: {
        // No responseMimeType/Schema for image generation
      }
    });

    // Check for inlineData
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini Image Error:", error);
    throw error;
  }
};

export const generateVocabAudio = async (
    text: string,
    voiceName: string = 'Kore',
    style: string = 'Natural'
): Promise<string> => {
    try {
        
        // Construct prompt with style instruction if not natural
        let promptText = text;
        if (style && style !== 'Natural') {
            promptText = `Say ${style}: ${text}`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: promptText }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                    }
                }
            }
        });

        const candidate = response.candidates?.[0];

        // The API returns raw audio bytes in inlineData
        const audioData = candidate?.content?.parts?.[0]?.inlineData?.data;
        
        if (!audioData) {
            console.error("Audio generation failed. Full response:", JSON.stringify(response, null, 2));
            const reason = candidate?.finishReason ? ` (Reason: ${candidate.finishReason})` : '';
            throw new Error(`No audio data generated${reason}.`);
        }

        // Return as Data URL
        return `data:audio/mp3;base64,${audioData}`;
    } catch (error) {
        console.error("Gemini Audio Error:", error);
        throw error;
    }
};
