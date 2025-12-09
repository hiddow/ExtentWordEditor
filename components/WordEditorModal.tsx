
import React, { useState, useRef, useEffect } from 'react';
import { VocabItem, SUPPORTED_LANGUAGES, LanguageCode, User, ItemStatus, SentenceToken } from '../types';
import { Sparkles, Image as ImageIcon, Save, RotateCcw, Trash2, Lock, Settings2, Upload, X, FileText, Mic, Play, Download, Plus, Wand2, Edit3, Globe, Info } from 'lucide-react';
import { generateVocabData, generateVocabImage, generateVocabAudio, generateTokenData } from '../services/geminiService';
import { translations, UILanguage } from '../translations';
import saveAs from 'file-saver';

interface WordEditorModalProps {
  item: VocabItem;
  currentUser: User;
  onUpdate: (updatedItem: VocabItem) => void;
  onDelete: (id: string) => void;
  targetLangName: string; // Passed from App based on context
  lang: UILanguage;
}

const DEFAULT_IMAGE_PROMPT = (term: string) => `Create a simple, modern, flat vector illustration for the vocabulary word: "${term}".

Design Style:
- **Borderless Flat Design**: Use purely solid color blocks/shapes. NO outlines. NO strokes.
- **Color Palette**: Fresh, elegant, and light tones.
- **Composition**: Close-up view. The subject should be large and fill the majority of the frame.
- **Background**: Pure white background.
- **RESTRICTIONS**: NO TEXT.`;

const AVAILABLE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
const AVAILABLE_STYLES = ['Natural', 'Cheerful', 'Formal', 'Empathetic', 'Serious', 'Calm'];

export const WordEditorModal: React.FC<WordEditorModalProps> = ({ 
  item, currentUser, onUpdate, onDelete, targetLangName, lang 
}) => {
  const t = translations[lang];

  const [formData, setFormData] = useState<VocabItem>({ ...item });
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Image Generation Settings
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [imagePrompt, setImagePrompt] = useState(DEFAULT_IMAGE_PROMPT(item.term));
  const [refImage, setRefImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Settings
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedStyle, setSelectedStyle] = useState('Natural');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Token Editor State
  const [editingTokenIdx, setEditingTokenIdx] = useState<number | null>(null);
  const [tokenEditData, setTokenEditData] = useState<SentenceToken | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Permission Logic
  const isAdmin = currentUser.role === 'admin';
  const appName = item.appName;

  const hasPermission = (permission: LanguageCode | 'common') => {
      if (isAdmin) return true;
      const appPerms = currentUser.permissions[appName];
      return appPerms && appPerms.includes(permission);
  };

  const canEditCommon = hasPermission('common');
  const canEditLang = (code: string) => hasPermission(code as LanguageCode);

  // Use the item's intrinsic targetLang for logic, falling back to name checks if needed
  const isChinese = item.targetLang === 'zh-rCN' || item.targetLang === 'zh-rTW' || targetLangName.toLowerCase().includes('chinese');

  // Sync internal state if item prop changes
  useEffect(() => {
    setFormData({ ...item });
    setImagePrompt(DEFAULT_IMAGE_PROMPT(item.term));
    setRefImage(null);
    setIsDirty(false);
    setEditingTokenIdx(null);
  }, [item]);

  const handleChange = (field: keyof VocabItem, value: any) => {
    if (!canEditCommon) return;
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleTranslationChange = (code: LanguageCode, value: string) => {
    if (!canEditLang(code)) return;
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [code]: value
      }
    }));
    setIsDirty(true);
  };

  const handleExampleTranslationChange = (code: LanguageCode, value: string) => {
    if (!canEditLang(code)) return;
    setFormData(prev => ({
      ...prev,
      exampleTranslations: {
        ...prev.exampleTranslations,
        [code]: value
      }
    }));
    setIsDirty(true);
  };

  const handleRegenerateText = async () => {
    if (!isAdmin) {
        alert("Only admins can regenerate AI data.");
        return;
    }
    setIsRegeneratingText(true);
    try {
      // Pass the current term, not from state to avoid closure staleness if term changed rapidly, though less likely here
      const newData = await generateVocabData(formData.term, targetLangName);
      
      // Use functional update to avoid race conditions with other async generators (Image/Audio)
      setFormData(prev => ({
        ...prev,
        ...newData,
        translations: { ...prev.translations, ...newData.translations },
        exampleTranslations: { ...prev.exampleTranslations, ...newData.exampleTranslations },
        status: ItemStatus.COMPLETED
      }));
      setIsDirty(true);
    } catch (e) {
      alert("Failed to regenerate text. Check console.");
    } finally {
      setIsRegeneratingText(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!canEditCommon) return;
    setIsRegeneratingImage(true);
    try {
      const imageBase64 = await generateVocabImage(
        formData.term, 
        imagePrompt,
        refImage || undefined
      );
      // Use functional update for concurrency safety
      setFormData(prev => ({ 
          ...prev, 
          imageUrl: imageBase64, 
          status: ItemStatus.COMPLETED 
      }));
      setIsDirty(true);
      setShowImageSettings(false); 
    } catch (e) {
      alert("Failed to generate image.");
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!canEditCommon) return;
    setIsRegeneratingAudio(true);
    try {
        const textToSpeak = formData.term;
        const audioBase64 = await generateVocabAudio(textToSpeak, selectedVoice, selectedStyle);
        // Use functional update for concurrency safety
        setFormData(prev => ({ 
            ...prev, 
            audioUrl: audioBase64, 
            status: ItemStatus.COMPLETED 
        }));
        setIsDirty(true);
    } catch (e) {
        alert("Failed to generate audio.");
    } finally {
        setIsRegeneratingAudio(false);
    }
  };

  const playAudio = () => {
      if (formData.audioUrl) {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
          const audio = new Audio(formData.audioUrl);
          audioRef.current = audio;
          setIsPlayingAudio(true);
          audio.onended = () => setIsPlayingAudio(false);
          audio.play().catch(e => {
              console.error("Play failed", e);
              setIsPlayingAudio(false);
          });
      }
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setRefImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAdmin) {
        alert("Only Admins can delete words.");
        return;
    }
    
    if (confirm(t.edit_delete_confirm)) {
        onDelete(item.id);
    }
  };

  const handleSave = () => {
    // Functional update ensures we capture any background completion that happened right before save
    setFormData(prev => {
        const updated = { ...prev, status: ItemStatus.COMPLETED };
        onUpdate(updated);
        return updated;
    });
    setIsDirty(false);
  };

  const downloadAsset = (type: 'image' | 'audio') => {
      const dataUrl = type === 'image' ? formData.imageUrl : formData.audioUrl;
      if (!dataUrl) return;

      const ext = type === 'image' ? 'png' : 'mp3';
      const cleanProduct = formData.appName.replace(/\s+/g, '_');
      const cleanLang = targetLangName.replace(/\s+/g, '_');
      const filename = `${cleanProduct}_${cleanLang}_${formData.intId}.${ext}`;
      saveAs(dataUrl, filename);
  };

  // --- Token Editor Logic ---

  const handleTokenClick = (idx: number, token: SentenceToken) => {
      if (!canEditCommon) return;
      setEditingTokenIdx(idx);
      // Ensure translations object exists
      setTokenEditData({ 
          ...token, 
          translations: token.translations || {} 
      });
  };

  const handleSaveToken = () => {
      if (editingTokenIdx !== null && tokenEditData && formData.exampleSentenceTokens) {
          setFormData(prev => {
              const newTokens = [...(prev.exampleSentenceTokens || [])];
              if (editingTokenIdx >= newTokens.length) return prev; // Safety

              newTokens[editingTokenIdx] = tokenEditData;
              
              // Reconstruct full sentence and script
              const newSentence = newTokens.map(t => t.word).join('');
              const newScript = newTokens.map(t => t.script).join(' ');

              return {
                  ...prev,
                  exampleSentenceTokens: newTokens,
                  exampleSentence: newSentence,
                  exampleScript: newScript
              };
          });
          setIsDirty(true);
          setEditingTokenIdx(null);
          setTokenEditData(null);
      }
  };

  const handleAddToken = () => {
      const newToken: SentenceToken = { word: 'New', script: '', translation: '', translations: {} };
      setFormData(prev => {
          const newTokens = [...(prev.exampleSentenceTokens || []), newToken];
          setEditingTokenIdx(newTokens.length - 1); // Set editing to the new item
          return { ...prev, exampleSentenceTokens: newTokens };
      });
      setTokenEditData(newToken);
  };

  const handleDeleteToken = () => {
      if (editingTokenIdx !== null && formData.exampleSentenceTokens) {
          setFormData(prev => {
              const newTokens = (prev.exampleSentenceTokens || []).filter((_, i) => i !== editingTokenIdx);
              const newSentence = newTokens.map(t => t.word).join('');
              const newScript = newTokens.map(t => t.script).join(' ');
              
              return {
                  ...prev,
                  exampleSentenceTokens: newTokens,
                  exampleSentence: newSentence,
                  exampleScript: newScript
              };
          });
          setIsDirty(true);
          setEditingTokenIdx(null);
          setTokenEditData(null);
      }
  };

  const handleAITokenFill = async () => {
      if (!tokenEditData) return;
      setIsGeneratingToken(true);
      try {
          const result = await generateTokenData(tokenEditData.word, targetLangName);
          setTokenEditData(result);
      } catch (e) {
          alert("Failed to generate token data");
      } finally {
          setIsGeneratingToken(false);
      }
  };

  const updateTokenTranslation = (langCode: LanguageCode, value: string) => {
      if (!tokenEditData) return;
      setTokenEditData(prev => ({
          ...prev!,
          translations: {
              ...prev!.translations,
              [langCode]: value
          }
      }));
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 transition-colors duration-200">
        
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors duration-200">
        <div className="flex-1 mr-4">
            <div className="flex justify-between items-center mb-1">
                 <input 
                    type="text" 
                    value={formData.term}
                    disabled={!canEditCommon}
                    onChange={(e) => handleChange('term', e.target.value)}
                    className="text-2xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none focus:ring-0 p-0 w-full placeholder:text-slate-300 dark:placeholder:text-slate-600 disabled:opacity-70 disabled:cursor-not-allowed"
                    placeholder="Enter term..."
                />
                 {isAdmin && (
                    <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={handleRegenerateText}
                            disabled={isRegeneratingText}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-200 dark:border-indigo-800"
                        >
                            <RotateCcw size={14} className={isRegeneratingText ? "animate-spin" : ""} />
                            {t.edit_regenerate_text}
                        </button>
                        <button 
                            type="button"
                            onClick={handleDelete}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title={t.btn_delete}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                 )}
            </div>
         
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/50">{item.appName}</span>
            <span className="text-[10px] font-mono text-slate-400">ID: {item.intId}</span>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                {targetLangName} Vocabulary {!canEditCommon && <span className="text-amber-500 ml-2 text-[10px] border border-amber-200 dark:border-amber-800 px-1 rounded">{t.edit_readonly}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
            {isDirty && <span className="text-xs text-amber-600 dark:text-amber-500 font-medium animate-pulse">{t.edit_unsaved}</span>}
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button 
                onClick={handleSave} 
                disabled={!isDirty}
                className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition shadow-sm
                    ${isDirty 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                    }
                `}
            >
                <Save size={16} />
                {isDirty ? t.edit_save : t.edit_saved}
            </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Main Info Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left: Media Column */}
          <div className="space-y-6">
            
            {/* Image Card */}
            <div className="relative">
              <div className="aspect-square w-full rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative group shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt={formData.term} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-300 dark:text-slate-600 flex flex-col items-center">
                    <ImageIcon size={48} />
                    <span className="text-sm mt-2">{t.img_no_image}</span>
                  </div>
                )}
                
                {/* Image Actions Overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition duration-200">
                    {formData.imageUrl && (
                        <button onClick={() => downloadAsset('image')} className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-900 shadow-sm" title={t.img_download}>
                            <Download size={14} className="text-slate-600 dark:text-slate-300"/>
                        </button>
                    )}
                </div>

                {/* Generate Buttons Overlay */}
                {canEditCommon && !showImageSettings && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-black/40 transition flex flex-col gap-2 items-center justify-center opacity-0 group-hover:opacity-100">
                      <button 
                        onClick={() => handleGenerateImage()}
                        disabled={isRegeneratingImage}
                        className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-5 py-2.5 rounded-full shadow-xl font-semibold text-sm flex items-center gap-2 transform hover:scale-105 transition"
                      >
                        {isRegeneratingImage ? <div className="animate-spin h-4 w-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full"/> : <Sparkles size={16} />}
                        {formData.imageUrl ? t.img_regenerate : t.img_generate}
                      </button>
                      <button 
                         onClick={() => setShowImageSettings(true)}
                         className="bg-slate-800/80 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 hover:bg-slate-900"
                      >
                        <Settings2 size={12} /> {t.img_settings}
                      </button>
                  </div>
                )}

                {/* Settings Overlay */}
                {showImageSettings && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 p-4 flex flex-col z-20">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs font-bold uppercase text-slate-500">{t.img_settings}</h4>
                             <button onClick={() => setShowImageSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                        </div>
                        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">{t.img_prompt_label}</label>
                                <textarea 
                                    className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 h-24 resize-none focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={imagePrompt}
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">{t.img_ref_label}</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border border-dashed border-slate-300 dark:border-slate-600 rounded p-3 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                >
                                    {refImage ? (
                                        <div className="relative h-16 w-full">
                                            <img src={refImage} className="h-full w-full object-contain" />
                                            <button onClick={(e) => {e.stopPropagation(); setRefImage(null)}} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                                            <Upload size={14} />
                                            <span>{t.img_upload_ref}</span>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleRefImageUpload} />
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerateImage}
                            disabled={isRegeneratingImage}
                            className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold"
                        >
                            {isRegeneratingImage ? 'Generating...' : t.img_btn_generate}
                        </button>
                    </div>
                )}
              </div>
            </div>

            {/* Audio Section */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-3">
                     <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                        <Mic size={14} /> {t.audio_label}
                     </h3>
                     {formData.audioUrl && (
                         <button onClick={() => downloadAsset('audio')} className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                            <Download size={12} /> MP3
                         </button>
                     )}
                </div>
                
                {formData.audioUrl ? (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                         <button 
                            onClick={playAudio} 
                            disabled={isPlayingAudio}
                            className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 transition"
                         >
                            {isPlayingAudio ? <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"/> : <Play size={14} fill="currentColor"/>}
                         </button>
                         <div className="flex-1">
                             <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                 <div className={`h-full bg-indigo-500 ${isPlayingAudio ? 'animate-progress' : 'w-full'}`}></div>
                             </div>
                         </div>
                         {canEditCommon && (
                             <button onClick={handleGenerateAudio} disabled={isRegeneratingAudio} className="text-xs text-slate-400 hover:text-indigo-500 p-1">
                                 <RotateCcw size={14} />
                             </button>
                         )}
                    </div>
                ) : (
                    <div className="text-center py-2 text-sm text-slate-400 dark:text-slate-500">
                        {t.audio_no_audio}
                    </div>
                )}

                {canEditCommon && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                        <div className="flex gap-2">
                            <select 
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 outline-none focus:border-indigo-500"
                            >
                                {AVAILABLE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <select 
                                value={selectedStyle}
                                onChange={(e) => setSelectedStyle(e.target.value)}
                                className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 outline-none focus:border-indigo-500"
                            >
                                {AVAILABLE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <button 
                            onClick={handleGenerateAudio}
                            disabled={isRegeneratingAudio}
                            className="w-full bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isRegeneratingAudio ? t.audio_generating : t.audio_generate}
                        </button>
                    </div>
                )}
            </div>
            
            {/* Metadata Fields */}
            <div className="grid grid-cols-2 gap-2">
               <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">{t.field_script}</label>
                  <input 
                    className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none disabled:opacity-50"
                    value={formData.script || ''}
                    disabled={!canEditCommon}
                    onChange={(e) => handleChange('script', e.target.value)}
                    placeholder="e.g. Kanji / Pinyin"
                  />
               </div>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">
                      {isChinese ? t.field_variant : 'Variant'}
                  </label>
                  <input 
                    className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none disabled:opacity-50"
                    // If Chinese, prioritize Variant. If not, fallback to Variant then Phonetic
                    value={formData.variant || formData.phonetic || ''}
                    disabled={!canEditCommon}
                    onChange={(e) => handleChange('variant', e.target.value)}
                    placeholder={isChinese ? "Traditional Chinese" : "IPA / Variant"}
                  />
               </div>
            </div>
            
             <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">{t.field_pos}</label>
                  <input 
                    className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none disabled:opacity-50"
                    value={formData.partOfSpeech || ''}
                    disabled={!canEditCommon}
                    onChange={(e) => handleChange('partOfSpeech', e.target.value)}
                    placeholder="Noun, Verb..."
                  />
            </div>
          </div>

          {/* Middle: Translations */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Example Sentence Editor */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 relative">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2">
                        <FileText size={16} className="text-indigo-500" /> 
                        {t.field_example}
                    </h3>
                    <div className="flex items-center gap-3">
                        {canEditCommon && (
                            <button 
                                onClick={handleAddToken}
                                className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1"
                            >
                                <Plus size={12} /> {t.field_add_word}
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Tip */}
                <div className="mb-4 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <Info size={14} className="shrink-0" />
                    <span>{t.hint_token_edit}</span>
                </div>

                {/* Token Visualization */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {formData.exampleSentenceTokens && formData.exampleSentenceTokens.length > 0 ? (
                        formData.exampleSentenceTokens.map((token, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleTokenClick(idx, token)}
                                disabled={!canEditCommon}
                                className={`flex flex-col items-center p-2 rounded-lg border transition-all text-left group
                                    ${editingTokenIdx === idx 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-300 ring-1 ring-indigo-500' 
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-sm'
                                    }
                                `}
                            >
                                {/* Top: Script or Variant (Traditional) */}
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{token.script || '-'}</span>
                                    {isChinese && token.variant && (
                                         <span className="text-[9px] text-slate-300 dark:text-slate-600 leading-none">{token.variant}</span>
                                    )}
                                </div>
                                
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 my-0.5">{token.word}</span>
                                
                                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5 max-w-[80px] truncate">
                                    {token.translations?.['en'] || token.translation || '-'}
                                </span>
                            </button>
                        ))
                    ) : (
                        // Fallback if no tokens (legacy data)
                         <textarea 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-base text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.exampleSentence || ''}
                            disabled={!canEditCommon}
                            onChange={(e) => handleChange('exampleSentence', e.target.value)}
                            placeholder="No tokens available. Regenerate or type sentence..."
                        />
                    )}
                </div>

                {/* Inline Token Editor Popover */}
                {editingTokenIdx !== null && tokenEditData && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg animate-in fade-in zoom-in-95 flex flex-col md:flex-row overflow-hidden h-[400px]">
                        {/* Sidebar: Core Info */}
                        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Edit3 size={12} /> Edit Token
                                </h4>
                                <div className="flex gap-1">
                                    <button onClick={handleDeleteToken} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                                    <button onClick={() => setEditingTokenIdx(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Word</label>
                                <input 
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    value={tokenEditData.word}
                                    onChange={e => setTokenEditData({...tokenEditData, word: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Script (Pinyin)</label>
                                <input 
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    value={tokenEditData.script}
                                    onChange={e => setTokenEditData({...tokenEditData, script: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">
                                    {isChinese ? t.field_variant : 'Variant'}
                                </label>
                                <input 
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    value={tokenEditData.variant || ''}
                                    onChange={e => setTokenEditData({...tokenEditData, variant: e.target.value})}
                                />
                            </div>

                            <button onClick={handleAITokenFill} disabled={isGeneratingToken} className="mt-auto w-full text-xs flex items-center justify-center gap-1 text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/30 px-2 py-2 rounded font-bold border border-purple-100 dark:border-purple-800">
                                {isGeneratingToken ? <div className="animate-spin w-3 h-3 border-2 border-purple-600 rounded-full border-t-transparent"/> : <Wand2 size={12} />}
                                {t.field_auto_fill}
                            </button>
                        </div>

                        {/* Main: Multi-Language Translations */}
                        <div className="flex-1 flex flex-col p-4 bg-white dark:bg-slate-900">
                             <div className="flex justify-between items-center mb-3">
                                 <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Globe size={12} /> {t.field_meanings}
                                 </h4>
                                 <button onClick={handleSaveToken} className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded hover:bg-indigo-700">Apply</button>
                             </div>
                             
                             <div className="overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 content-start">
                                 {SUPPORTED_LANGUAGES.map(lang => (
                                     <div key={lang.code} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                         <div className="flex justify-between mb-1">
                                             <span className="text-[10px] font-bold text-slate-400 uppercase">{lang.name}</span>
                                         </div>
                                         <input 
                                            className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                            value={tokenEditData.translations?.[lang.code] || (lang.code === 'en' ? tokenEditData.translation : '')}
                                            onChange={(e) => updateTokenTranslation(lang.code, e.target.value)}
                                            placeholder="..."
                                         />
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}
                
                {/* Read-Only Full Sentence Display (if desired for copy-paste) */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-serif italic">"{formData.exampleSentence}"</p>
                    <p className="text-xs text-slate-400">{formData.exampleScript}</p>
                </div>
            </div>

            {/* Language Grid */}
            <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-4 flex items-center gap-2">
                    {t.field_translations}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SUPPORTED_LANGUAGES.map(lang => {
                        const isEditable = canEditLang(lang.code);
                        return (
                            <div key={lang.code} className={`p-4 rounded-xl border transition-colors ${isEditable ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-80'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{lang.name}</span>
                                    {!isEditable && <Lock size={12} className="text-slate-300 dark:text-slate-600" />}
                                </div>
                                <div className="space-y-2">
                                    <input 
                                        className="w-full text-sm font-medium text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 outline-none transition-colors py-1 disabled:cursor-not-allowed"
                                        value={formData.translations[lang.code] || ''}
                                        onChange={(e) => handleTranslationChange(lang.code, e.target.value)}
                                        disabled={!isEditable}
                                        placeholder="Word translation"
                                    />
                                    <input 
                                        className="w-full text-xs text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 outline-none transition-colors py-1 disabled:cursor-not-allowed"
                                        value={formData.exampleTranslations[lang.code] || ''}
                                        onChange={(e) => handleExampleTranslationChange(lang.code, e.target.value)}
                                        disabled={!isEditable}
                                        placeholder="Sentence translation"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
