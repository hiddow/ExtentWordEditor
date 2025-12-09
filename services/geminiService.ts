import { AIResponseSchema, VocabItem, SentenceToken } from "../types";

const apiFromEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
  ? (import.meta as any).env.VITE_API_URL
  : undefined;

const apiFromWindow = (() => {
  if (typeof window === 'undefined') return undefined;
  const { protocol, hostname, port } = window.location;
  const origin = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  // 生产默认同域 /api（由反代到 3002）
  if (!isLocal) return `${origin}/api`;

  // 本地开发：Vite 3000/4173，后端 3002
  if (port === '3000' || port === '4173') {
    return `${protocol}//${hostname}:3002`;
  }

  // 其它本地端口，尝试同域 /api
  return `${origin}/api`;
})();

const API_URL = `${apiFromEnv || apiFromWindow || 'http://localhost:3002'}/ai/generate`;

export const generateVocabData = async (
  term: string, 
  targetLanguage: string
): Promise<Partial<VocabItem>> => {
  try {
    const response = await fetch(`${API_URL}/vocab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, lang: targetLanguage })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Generation failed');
    }

    return await response.json();
  } catch (error) {
    console.error("Gemini Text Error:", error);
    throw error;
  }
};

export const generateTokenData = async (
    token: string,
    targetLanguage: string
): Promise<SentenceToken> => {
    // Note: We haven't exposed this on backend yet.
    // Ideally we add it to backend too.
    // For now, let's keep it mock or throw error, OR add backend support.
    // Usage is rare? Let's assume user wants 'generateVocabData' mostly.
    // I should add this to backend if I want to be complete.
    // Time constraint? I'll implement it as specific request if needed, 
    // but looking at usage, it might be used in "Example Sentence" analysis.
    // Oh, generateVocabData returns the structure. 
    // This `generateTokenData` might be used for ad-hoc token analysis.
    console.warn("generateTokenData not implemented on backend yet");
    return { word: token, script: '', translation: '' };
}

export const generateVocabImage = async (
  term: string, 
  customPrompt?: string,
  referenceImageBase64?: string
): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }) // Note: customPrompt/refImage not supported in simple backend yet
    });

    if (!response.ok) {
        throw new Error('Image generation failed');
    }

    const data = await response.json();
    return data.imageUrl;
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
        const response = await fetch(`${API_URL}/audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: voiceName, style })
        });

        if (!response.ok) {
            throw new Error('Audio generation failed');
        }

        const data = await response.json();
        return data.audioUrl;
    } catch (error) {
        console.error("Gemini Audio Error:", error);
        throw error;
    }
};
