
export type LanguageCode = 
  | 'en' | 'ar' | 'de' | 'es' | 'fr' | 'in' | 'it' | 'ja' 
  | 'ko' | 'pl' | 'pt' | 'ru' | 'th' | 'tr' | 'vi' | 'zh-rCN' | 'zh-rTW';

export type UserRole = 'admin' | 'editor';

// Permission Map: Key is AppName, Value is array of allowed languages
export type PermissionMap = Record<string, (LanguageCode | 'common')[]>;

export interface User {
  id: string;
  username: string;
  role: UserRole;
  // If role is admin, this is ignored (has full access).
  permissions: PermissionMap;
}

export interface AppDefinition {
  id: string;
  name: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW'
}

export enum ItemStatus {
  PENDING = 'pending',
  LOADING = 'loading',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface SentenceToken {
  word: string;
  script: string;
  variant?: string; // Traditional Chinese or alternate script
  translation: string; // Primary (English) translation
  translations?: Partial<Record<LanguageCode, string>>; // Multi-language translations
}

export interface VocabItem {
  id: string;
  intId: number; // Unique Integer ID for export/tracking
  appName: string; // The product this item belongs to
  targetLang: LanguageCode; // The specific target language dataset this item belongs to
  term: string;
  originalIndex: number; 
  status: ItemStatus;
  
  // Generated Content
  script?: string; 
  phonetic?: string;
  variant?: string; // New: Traditional Chinese / Variant
  partOfSpeech?: string;
  
  translations: Partial<Record<LanguageCode, string>>;
  
  exampleSentence?: string;
  exampleSentenceTokens?: SentenceToken[]; // New: Segmented tokens
  exampleScript?: string; 
  exampleTranslation?: string; 
  exampleTranslations: Partial<Record<LanguageCode, string>>; 
  
  imageUrl?: string; 
  imagePrompt?: string; 
  
  audioUrl?: string; // TTS Audio (Base64 data URI)
}

export interface AIResponseSchema {
  script: string;
  phonetic: string;
  variant: string;
  partOfSpeech: string;
  translations: Record<string, string>;
  exampleSentence: string;
  exampleSentenceStructure: SentenceToken[];
  exampleScript: string;
  exampleTranslations: Record<string, string>;
}

export const SUPPORTED_LANGUAGES: { code: LanguageCode; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'in', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh-rCN', name: 'Chinese (Simplified)' },
  { code: 'zh-rTW', name: 'Chinese (Traditional)' },
];