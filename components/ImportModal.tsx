import React, { useState, useEffect } from 'react';
import { AppDefinition, SUPPORTED_LANGUAGES, LanguageCode } from '../types';
import { CloudService } from '../services/cloudService';
import { Plus, X, Upload } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { translations, UILanguage } from '../translations';

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: (appName: string, langCode: LanguageCode, terms: string[]) => void;
  lang: UILanguage;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportComplete, lang }) => {
  const [apps, setApps] = useState<AppDefinition[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('en');
  
  const [isCreating, setIsCreating] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [step, setStep] = useState<'config' | 'upload'>('config');

  const t = translations[lang];

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    const list = await CloudService.getApps();
    setApps(list);
    if (list.length > 0 && !selectedApp) {
      setSelectedApp(list[0].name);
    }
  };

  const handleCreateApp = async () => {
    if (!newAppName.trim()) return;
    try {
      const app = await CloudService.createApp(newAppName);
      setApps(prev => [...prev, app]);
      setSelectedApp(app.name);
      setIsCreating(false);
      setNewAppName('');
    } catch (e) {
      alert("Failed to create app (Name likely exists)");
    }
  };

  const handleNext = () => {
    if (selectedApp && selectedLang) setStep('upload');
  };

  const handleDataLoaded = (terms: string[]) => {
    onImportComplete(selectedApp, selectedLang, terms);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{t.import_title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400"><X size={20}/></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {step === 'config' ? (
            <div className="space-y-6">
              
              {/* APP SELECTION */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.import_app_label}</label>
                {!isCreating ? (
                  <div className="flex gap-2">
                    <select 
                      value={selectedApp}
                      onChange={(e) => setSelectedApp(e.target.value)}
                      className="flex-1 p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
                    >
                      {apps.map(app => (
                        <option key={app.id} value={app.name}>{app.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setIsCreating(true)}
                      className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-200 dark:border-indigo-800"
                      title={t.import_create_new}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                     <input 
                        autoFocus
                        type="text"
                        placeholder="Enter new App Name..."
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        className="flex-1 p-2.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                     />
                     <button 
                       onClick={handleCreateApp}
                       disabled={!newAppName.trim()}
                       className="px-4 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
                     >
                       {t.import_add}
                     </button>
                     <button 
                       onClick={() => setIsCreating(false)}
                       className="px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                     >
                       {t.import_cancel}
                     </button>
                  </div>
                )}
              </div>

              {/* LANGUAGE SELECTION */}
              <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.import_lang_label}</label>
                  <select 
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
                  >
                      {SUPPORTED_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {t.import_lang_desc} <strong>{SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name}</strong>.
                  </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleNext}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  {t.import_btn_continue} <Upload size={18} />
                </button>
              </div>
            </div>
          ) : (
             <div className="h-full min-h-[300px]">
                <div className="mb-4 flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
                   <div className="flex justify-between">
                       <span className="font-bold">App:</span> <span>{selectedApp}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="font-bold">Language:</span> <span>{SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name}</span>
                   </div>
                </div>
                <FileUpload onDataLoaded={handleDataLoaded} lang={lang} />
             </div>
          )}
        </div>
      </div>
    </div>
  );
};