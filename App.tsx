
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppStatus, ItemStatus, VocabItem, 
  SUPPORTED_LANGUAGES, User, AppDefinition, LanguageCode
} from './types';
import { WordEditorModal } from './components/WordEditorModal';
import { LoginScreen } from './components/LoginScreen';
import { AdminUserModal } from './components/AdminUserModal';
import { ImportModal } from './components/ImportModal';
import { generateVocabData } from './services/geminiService';
import { CloudService } from './services/cloudService';
import { translations, UILanguage } from './translations';
import { 
  Download, Play, Settings2, 
  CheckCircle2, AlertTriangle, Loader2, BookOpen, ChevronRight, Search, FileText, Keyboard, Plus,
  Trash2, X, CheckSquare, Square, LogOut, Users, Shield, Layers, LayoutGrid, Sun, Moon, HelpCircle, FileAudio, Image as ImageIcon, Globe, GraduationCap, Workflow, Lightbulb, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import saveAs from 'file-saver';

// Documentation Modal Component
const HelpModal = ({ onClose, lang }: { onClose: () => void, lang: UILanguage }) => {
    const t = translations[lang];
    
    return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-lg">
                    <HelpCircle size={24} className="text-indigo-600" /> {t.help_title}
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-500"><X size={20}/></button>
            </div>
            <div className="p-8 overflow-y-auto prose dark:prose-invert max-w-none text-sm leading-relaxed">
                
                <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                    <h4 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mt-0 mb-2">{t.help_welcome}</h4>
                    <p className="text-indigo-700 dark:text-indigo-300 mb-0">{t.help_desc}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <h5 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-3">
                            <Users size={18} className="text-purple-500"/> {t.help_roles}
                        </h5>
                        <ul className="list-none pl-0 space-y-2">
                            <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs h-fit whitespace-nowrap">Admin</span>
                                <span>{t.help_role_admin}</span>
                            </li>
                            <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs h-fit whitespace-nowrap">Editor</span>
                                <span>{t.help_role_editor}</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-3">
                             <Lightbulb size={18} className="text-amber-500"/> {t.help_tips}
                        </h5>
                         <ul className="list-disc pl-4 space-y-2 text-slate-600 dark:text-slate-300">
                            <li>{t.help_tip1}</li>
                            <li>{t.help_tip2}</li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                    <h5 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-6">
                        <Workflow size={18} className="text-emerald-500"/> {t.help_workflow}
                    </h5>
                    
                    <div className="space-y-6">
                        {[
                            { title: t.help_step1, desc: t.help_step1_desc, icon: <LayoutGrid size={20} className="text-indigo-600"/> },
                            { title: t.help_step2, desc: t.help_step2_desc, icon: <Layers size={20} className="text-indigo-600"/> },
                            { title: t.help_step3, desc: t.help_step3_desc, icon: <Play size={20} className="text-indigo-600"/> },
                            { title: t.help_step4, desc: t.help_step4_desc, icon: <FileText size={20} className="text-indigo-600"/> },
                            { title: t.help_step5, desc: t.help_step5_desc, icon: <Download size={20} className="text-indigo-600"/> },
                        ].map((step, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900 flex items-center justify-center shadow-sm">
                                    {step.icon}
                                </div>
                                <div>
                                    <h6 className="font-bold text-slate-900 dark:text-white text-base mb-1">{step.title}</h6>
                                    <p className="text-slate-600 dark:text-slate-400 m-0 text-sm">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    </div>
    );
};

type FilterType = 'all' | 'missing_img' | 'missing_audio' | 'missing_trans';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Initialize UI Language
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('vocab_forge_lang');
        return (saved === 'en' || saved === 'zh') ? saved : 'zh'; // Default to Chinese
    }
    return 'zh';
  });

  const t = translations[uiLanguage];

  // Initialize Dark Mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('vocab_forge_theme');
        if (saved) return saved === 'dark';
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    }
    return false;
  });
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [items, setItems] = useState<VocabItem[]>([]);
  
  // View Filters
  const [currentAppName, setCurrentAppName] = useState<string>('');
  const [currentTargetLang, setCurrentTargetLang] = useState<LanguageCode>('en');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const [processingIdx, setProcessingIdx] = useState<number>(-1);
  const [selectedItem, setSelectedItem] = useState<VocabItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // App / Product Management
  const [apps, setApps] = useState<AppDefinition[]>([]);

  // UI State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Restore Session on Mount
  useEffect(() => {
      const savedUser = CloudService.restoreSession();
      if (savedUser) {
          setCurrentUser(savedUser);
      }
  }, []);

  // Load Data on Mount if User exists
  useEffect(() => {
    if (currentUser) {
        loadAppsAndData();
    }
  }, [currentUser]);

  // Handle Dark Mode Side Effects
  useEffect(() => {
      if (darkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('vocab_forge_theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('vocab_forge_theme', 'light');
      }
  }, [darkMode]);

  // Handle Language Side Effects
  useEffect(() => {
      localStorage.setItem('vocab_forge_lang', uiLanguage);
  }, [uiLanguage]);

  const toggleLanguage = () => {
      setUiLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  const loadAppsAndData = async () => {
    const [appList, allItems] = await Promise.all([
        CloudService.getApps(),
        CloudService.getVocabItems() // Get all to filter locally
    ]);
    
    setApps(appList);
    setItems(allItems);
    
    // Attempt to restore last context from CloudService
    const lastContext = CloudService.getLastContext();
    if (lastContext && appList.find(a => a.name === lastContext.appName)) {
        setCurrentAppName(lastContext.appName);
        setCurrentTargetLang(lastContext.langCode as LanguageCode);
    } else {
        // Fallback
        if (appList.length > 0 && !currentAppName) {
            setCurrentAppName(appList[0].name);
        }
    }
    
    if (allItems.length > 0) {
        setStatus(AppStatus.REVIEW);
    } else {
        setStatus(AppStatus.IDLE);
    }
  };

  // --- Auth Handlers ---
  
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Note: CloudService.login already saves the session
  };

  const handleLogout = () => {
    CloudService.logout();
    setCurrentUser(null);
    setItems([]);
    setStatus(AppStatus.IDLE);
    setSelectedItem(null);
    setCurrentAppName('');
  };

  // --- Data Handlers ---

  const handleImportComplete = async (appName: string, langCode: LanguageCode, terms: string[]) => {
    const newItems: VocabItem[] = terms.map((term, idx) => ({
      id: crypto.randomUUID(),
      intId: 0, // Placeholder, set by service
      appName: appName,
      targetLang: langCode, // Specific dataset language
      term,
      originalIndex: idx, 
      status: ItemStatus.PENDING,
      translations: {},
      exampleTranslations: {},
    }));

    // Save to Cloud
    const updatedTotal = await CloudService.addVocabItems(newItems);
    
    // Save Context for next refresh
    CloudService.saveContext(appName, langCode);

    // Refresh apps list in case a new one was created
    const appList = await CloudService.getApps();
    setApps(appList);
    setCurrentAppName(appName);
    setCurrentTargetLang(langCode); // Switch view to new upload
    setItems(updatedTotal);
    
    setCheckedItems(new Set()); 
    setStatus(AppStatus.REVIEW);
    
    // Select first new item if relevant
    const firstNew = updatedTotal.find(i => i.appName === appName && i.targetLang === langCode && i.status === ItemStatus.PENDING);
    if (firstNew) setSelectedItem(firstNew);
  };

  const handleAddSingleItem = async () => {
    if (currentUser?.role !== 'admin') return;
    if (!currentAppName) {
        alert("Please select or create an App first.");
        return;
    }
    
    const newItem: VocabItem = {
        id: crypto.randomUUID(),
        intId: 0, // Service will set
        appName: currentAppName,
        targetLang: currentTargetLang,
        term: "New Word",
        originalIndex: 0,
        status: ItemStatus.PENDING,
        translations: {},
        exampleTranslations: {}
    };
    const updatedList = await CloudService.addVocabItems([newItem]);
    setItems(updatedList);
    setSelectedItem(updatedList[updatedList.length - 1]);
  };

  const handleDeleteItem = async (id: string, e?: React.MouseEvent) => {
    // Prevent event bubbling if triggered from list
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (currentUser?.role !== 'admin') {
      alert("Only administrators can delete items.");
      return;
    }
    
    // If triggered from list click (has event), confirm here. 
    // If triggered from Modal (no event), Modal already confirmed.
    if (e && !confirm(t.edit_delete_confirm)) return;
    
    setIsDeleting(true);
    try {
        if (selectedItem?.id === id) {
            setSelectedItem(null);
        }

        const set = new Set<string>([id]);
        const remaining = await CloudService.deleteVocabItems(set);
        setItems(remaining);
        
        if (checkedItems.has(id)) {
            const newSet = new Set(checkedItems);
            newSet.delete(id);
            setCheckedItems(newSet);
        }
    } catch (err) {
        console.error("Delete failed", err);
        alert("Failed to delete item.");
    } finally {
        setIsDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (currentUser?.role !== 'admin') return;
    if (checkedItems.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${checkedItems.size} items?`)) {
        setIsDeleting(true);
        try {
            const remaining = await CloudService.deleteVocabItems(checkedItems);
            setItems(remaining);
            if (selectedItem && checkedItems.has(selectedItem.id)) {
                setSelectedItem(null);
            }
            setCheckedItems(new Set());
        } catch (err) {
            alert("Batch delete failed.");
        } finally {
            setIsDeleting(false);
        }
    }
  };

  const updateItem = async (updated: VocabItem) => {
    // Optimistic Update
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedItem(updated);
    // Cloud Update
    await CloudService.updateVocabItem(updated);
  };

  // --- Processing Queue ---

  // Filter Items by APP, LANG, Search Term, and FilterType
  const filteredItems = items.filter(i => {
    // Basic Context Filter
    const itemLang = i.targetLang || 'en';
    const isContextMatch = i.appName === currentAppName && itemLang === currentTargetLang;
    if (!isContextMatch) return false;

    // Search Filter
    const searchLower = searchTerm.toLowerCase();
    const isSearchMatch = i.term.toLowerCase().includes(searchLower) || 
                          (i.translations['en'] && i.translations['en']?.toLowerCase().includes(searchLower));
    if (!isSearchMatch) return false;

    // Status/Completeness Filter
    if (filterType === 'missing_img') return !i.imageUrl;
    if (filterType === 'missing_audio') return !i.audioUrl;
    if (filterType === 'missing_trans') return Object.keys(i.translations).length === 0;

    return true;
  });

  const processQueue = useCallback(async () => {
    setStatus(AppStatus.PROCESSING);
    
    // Only process items in CURRENT VIEW
    const idx = items.findIndex(i => 
        i.status === ItemStatus.PENDING && 
        i.appName === currentAppName &&
        (i.targetLang || 'en') === currentTargetLang
    );

    if (idx === -1) {
      setProcessingIdx(-1);
      setStatus(AppStatus.REVIEW);
      return;
    }

    setProcessingIdx(idx);
    const currentItem = items[idx];

    // Optimistic: Loading
    const loadingItem = { ...currentItem, status: ItemStatus.LOADING };
    setItems(prev => {
        const copy = [...prev];
        copy[idx] = loadingItem;
        return copy;
    });

    try {
      // Get Friendly Name for API
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === currentItem.targetLang)?.name || 'English';
      
      const data = await generateVocabData(currentItem.term, langName);
      
      const completedItem = { 
        ...loadingItem, 
        ...data,
        status: ItemStatus.COMPLETED 
      };

      // Save to Cloud & State
      await CloudService.updateVocabItem(completedItem);
      
      setItems(prev => {
        const copy = [...prev];
        const currentIdx = copy.findIndex(i => i.id === currentItem.id);
        if (currentIdx !== -1) {
            copy[currentIdx] = completedItem;
            if (selectedItem && selectedItem.id === completedItem.id) {
                setSelectedItem(completedItem);
            }
        }
        return copy;
      });

    } catch (error) {
       const errorItem = { ...loadingItem, status: ItemStatus.ERROR };
       await CloudService.updateVocabItem(errorItem);
       setItems(prev => {
        const copy = [...prev];
        const currentIdx = copy.findIndex(i => i.id === currentItem.id);
        if (currentIdx !== -1) copy[currentIdx] = errorItem;
        return copy;
      });
    }

    // Tick
    setTimeout(() => {}, 100);

  }, [items, currentTargetLang, currentAppName, selectedItem]);

  useEffect(() => {
    if (status === AppStatus.PROCESSING && processingIdx !== -1) {
       const currentStatus = items[processingIdx]?.status;
       if (currentStatus === ItemStatus.COMPLETED || currentStatus === ItemStatus.ERROR) {
          processQueue();
       }
    } else if (status === AppStatus.PROCESSING && processingIdx === -1) {
        processQueue();
    }
  }, [status, processingIdx, items, processQueue]);


  const handleStartProcessing = () => {
    // Check if there are pending items in current view
    if (filteredItems.some(i => i.status === ItemStatus.PENDING)) {
      setStatus(AppStatus.PROCESSING);
      setProcessingIdx(-1);
    }
  };

  // --- Export ---
  const handleExport = () => {
    // Only export current view data
    const exportItems = filteredItems; 
    const langName = SUPPORTED_LANGUAGES.find(l => l.code === currentTargetLang)?.name || 'English';
    
    const jsonString = JSON.stringify(exportItems, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    saveAs(blob, `${currentAppName}_${langName}_export.json`);

    const flattenForExcel = exportItems.map(item => {
      const flat: any = {
        ID: item.intId,
        App: item.appName,
        TargetLang: langName,
        Term: item.term,
        Script: item.script,
        Phonetic: item.phonetic,
        Variant: item.variant,
        PartOfSpeech: item.partOfSpeech,
        Example: item.exampleSentence,
        ExampleScript: item.exampleScript,
      };
      SUPPORTED_LANGUAGES.forEach(lang => {
        flat[`Values-${lang.code}`] = item.translations[lang.code] || '';
        flat[`Example-${lang.code}`] = item.exampleTranslations?.[lang.code] || '';
      });
      return flat;
    });

    const ws = XLSX.utils.json_to_sheet(flattenForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vocabulary");
    XLSX.writeFile(wb, `${currentAppName}_${langName}_vocab.xlsx`);
  };

  const handleBatchDownloadAssets = async () => {
      if (filteredItems.length === 0) return;
      setIsZipping(true);
      
      try {
        const zip = new JSZip();
        const imgFolder = zip.folder("images");
        const audioFolder = zip.folder("audio");
        
        let count = 0;

        filteredItems.forEach(item => {
            const cleanAppName = item.appName.replace(/\s+/g, '_');
            // Use item.targetLang as it's more accurate for individual items
            const langCode = item.targetLang || 'en';
            const langName = SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.name || 'English';
            const cleanTarget = langName.replace(/\s+/g, '_');
            
            const fileNameBase = `${cleanAppName}_${cleanTarget}_${item.intId}`;

            if (item.imageUrl && imgFolder) {
                const base64Data = item.imageUrl.split(',')[1];
                if (base64Data) {
                    imgFolder.file(`${fileNameBase}.png`, base64Data, {base64: true});
                    count++;
                }
            }

            if (item.audioUrl && audioFolder) {
                const base64Data = item.audioUrl.split(',')[1];
                if (base64Data) {
                    audioFolder.file(`${fileNameBase}.mp3`, base64Data, {base64: true});
                    count++;
                }
            }
        });

        if (count === 0) {
            alert("No assets (images/audio) found to download.");
            setIsZipping(false);
            return;
        }

        const langName = SUPPORTED_LANGUAGES.find(l => l.code === currentTargetLang)?.name || 'English';
        const content = await zip.generateAsync({type: "blob"});
        saveAs(content, `${currentAppName}_${langName}_assets.zip`);

      } catch (err) {
          console.error("Zip Error", err);
          alert("Failed to create zip file.");
      } finally {
          setIsZipping(false);
      }
  };

  // --- UI Helpers ---

  const handleToggleCheck = (id: string) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCheckedItems(newSet);
  };

  const isAllSelected = filteredItems.length > 0 && filteredItems.every(i => checkedItems.has(i.id));

  const handleToggleSelectAll = () => {
    const newSet = new Set(checkedItems);
    if (isAllSelected) filteredItems.forEach(i => newSet.delete(i.id));
    else filteredItems.forEach(i => newSet.add(i.id));
    setCheckedItems(newSet);
  };

  // --- RENDER ---

  if (!currentUser) {
      return (
        <LoginScreen 
            onLogin={handleLogin} 
            darkMode={darkMode} 
            toggleDarkMode={() => setDarkMode(!darkMode)}
            lang={uiLanguage}
            toggleLanguage={toggleLanguage}
        />
      );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden dark:bg-slate-950 transition-colors duration-200">
      
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} lang={uiLanguage} />}
      {showAdminPanel && <AdminUserModal onClose={() => setShowAdminPanel(false)} lang={uiLanguage} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImportComplete={handleImportComplete} lang={uiLanguage} />}

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shrink-0 h-16">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm">
               <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight hidden md:block">{t.app_name}</h1>
            
            {/* Context Selectors */}
            <div className="flex items-center ml-4 pl-4 border-l border-slate-200 dark:border-slate-700 gap-4">
                
                {/* App Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.product}</span>
                    <div className="relative group">
                        <select 
                            value={currentAppName}
                            onChange={(e) => {
                                setCurrentAppName(e.target.value);
                                setSelectedItem(null);
                                // Save Context immediately
                                CloudService.saveContext(e.target.value, currentTargetLang);
                            }}
                            className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm py-1.5 pl-3 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-300 transition min-w-[120px]"
                        >
                            {apps.map(app => (
                                <option key={app.id} value={app.name}>{app.name}</option>
                            ))}
                            {apps.length === 0 && <option value="">No Apps</option>}
                        </select>
                        <Layers size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Target Language Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.target}</span>
                    <div className="relative group">
                        <select 
                            value={currentTargetLang}
                            onChange={(e) => {
                                setCurrentTargetLang(e.target.value as LanguageCode);
                                setSelectedItem(null);
                                // Save Context
                                CloudService.saveContext(currentAppName, e.target.value);
                            }}
                            className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm py-1.5 pl-3 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-300 transition min-w-[120px]"
                        >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                        <Globe size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

            </div>
          </div>
          
          <div className="flex items-center gap-3">
            
            <button onClick={toggleLanguage} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition font-bold text-xs uppercase border border-slate-200 dark:border-slate-700 rounded-lg">
                {uiLanguage === 'en' ? 'EN' : '中文'}
            </button>

            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button onClick={() => setShowHelpModal(true)} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <HelpCircle size={20} />
            </button>

            {/* User Profile / Admin Controls */}
            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-4">
                {isAdmin && (
                    <button 
                        onClick={() => setShowAdminPanel(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition"
                    >
                        <Shield size={16} />
                        {t.user_admin}
                    </button>
                )}
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                    {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition" title="Logout">
                    <LogOut size={18} />
                </button>
            </div>

            
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Empty State / Import (Only Admin can import) */}
        {status === AppStatus.IDLE && filteredItems.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in-up overflow-y-auto">
             <div className="text-center mb-10 max-w-2xl">
                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">{t.status_no_data_title}</h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    {currentAppName ? (
                        <>{t.product}: <span className="font-bold text-indigo-600">{currentAppName}</span> &bull; <span className="font-bold text-indigo-600">{SUPPORTED_LANGUAGES.find(l=>l.code===currentTargetLang)?.name}</span></>
                    ) : (
                        t.status_no_data_desc
                    )}
                </p>
                <div className="mt-4 text-sm text-slate-500">{t.status_no_data_sub}</div>
             </div>
             
             {isAdmin && (
                 <div className="flex flex-col gap-4">
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none font-bold text-lg flex items-center gap-3 transition transform hover:scale-105"
                    >
                        <LayoutGrid size={24} />
                        {t.btn_import_new}
                    </button>
                 </div>
             )}
          </div>
        )}

        {/* ACTIVE STATE */}
        {(filteredItems.length > 0 || status === AppStatus.REVIEW || status === AppStatus.PROCESSING || currentAppName) && (
          <>
            <div className="w-80 sm:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                    
                    {/* Stats & Downloads */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                             <div>
                                 <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                     {currentAppName} ({currentTargetLang})
                                 </div>
                                 <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{filteredItems.filter(i => i.status === ItemStatus.COMPLETED).length} <span className="text-slate-400 text-sm font-normal">/ {filteredItems.length}</span></div>
                             </div>
                             {isAdmin && (
                                <div className="flex gap-1">
                                    <button 
                                        onClick={handleExport}
                                        className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                                        title="Export Excel/JSON"
                                    >
                                        <FileText size={16} className="text-slate-600 dark:text-slate-300"/>
                                    </button>
                                    <button 
                                        onClick={handleBatchDownloadAssets}
                                        disabled={isZipping}
                                        className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                                        title="Download All Assets (Images/Audio)"
                                    >
                                        {isZipping ? <Loader2 size={16} className="animate-spin text-indigo-500"/> : <Download size={16} className="text-indigo-500"/>}
                                    </button>
                                </div>
                             )}
                        </div>
                    </div>

                    {/* Batch Actions (Admin Only for Delete) */}
                    {checkedItems.size > 0 ? (
                        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-top-1">
                            <span className="text-xs font-bold flex-1">{checkedItems.size} {t.list_selected}</span>
                            <button onClick={() => setCheckedItems(new Set())} className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-400 dark:text-indigo-300 hover:text-indigo-700 rounded transition"><X size={16} /></button>
                            {isAdmin && (
                                <button onClick={handleBatchDelete} disabled={isDeleting} className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded transition shadow-sm disabled:opacity-50">
                                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {t.btn_delete}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {isAdmin && filteredItems.some(i => i.status === ItemStatus.PENDING) && (
                                <button onClick={handleStartProcessing} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold transition shadow-sm">
                                    <Play size={16} fill="currentColor" /> {t.btn_start_process}
                                </button>
                            )}
                            {isAdmin && (
                                <button onClick={() => setShowImportModal(true)} className="flex items-center justify-center px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg" title="Import More">
                                    <Plus size={20} />
                                </button>
                            )}
                            {status === AppStatus.PROCESSING && (
                                <button disabled className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-400 px-4 py-2.5 rounded-lg font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700">
                                    <Loader2 size={16} className="animate-spin" /> {t.btn_processing}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Filter Bar */}
                    <div className="flex items-center gap-2">
                         <div className="relative group flex-1">
                            <select 
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as FilterType)}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-2 pl-3 pr-8 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:border-indigo-300 transition"
                            >
                                <option value="all">{t.filter_all}</option>
                                <option value="missing_img">{t.filter_missing_img}</option>
                                <option value="missing_audio">{t.filter_missing_audio}</option>
                                <option value="missing_trans">{t.filter_missing_trans}</option>
                            </select>
                            <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Search & Select */}
                    <div className="flex gap-2 items-center">
                        <button 
                            onClick={handleToggleSelectAll}
                            disabled={filteredItems.length === 0}
                            className={`p-2 rounded-lg border transition-colors ${isAllSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-300 hover:text-indigo-50'} disabled:opacity-50`}
                        >
                            {isAllSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={14} className="text-slate-400" /></div>
                            <input 
                              type="text" 
                              placeholder={t.search_placeholder}
                              value={searchTerm} 
                              onChange={(e) => setSearchTerm(e.target.value)} 
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-400" 
                            />
                        </div>
                        {isAdmin && (
                            <button onClick={handleAddSingleItem} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg transition"><Plus size={20} /></button>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">{t.status_no_data_sub}</div>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredItems.map((item) => (
                                <li 
                                    key={item.id} 
                                    onClick={() => setSelectedItem(item)}
                                    className={`group relative p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start 
                                        ${selectedItem?.id === item.id ? 'bg-indigo-50/60 dark:bg-indigo-900/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30' : ''} 
                                        ${checkedItems.has(item.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                >
                                    {selectedItem?.id === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 dark:bg-indigo-400"></div>}
                                    
                                    <div onClick={(e) => { e.stopPropagation(); handleToggleCheck(item.id); }} className={`mt-0.5 mr-3 shrink-0 rounded transition-colors hover:text-indigo-500 ${checkedItems.has(item.id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                        {checkedItems.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </div>

                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-semibold text-sm truncate pr-2 ${selectedItem?.id === item.id ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>{item.term}</span>
                                            <div className="shrink-0 ml-1 flex items-center">
                                                {item.status === ItemStatus.COMPLETED && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                {item.status === ItemStatus.ERROR && <AlertTriangle size={14} className="text-red-500" />}
                                                {item.status === ItemStatus.LOADING && <Loader2 size={14} className="text-indigo-500 animate-spin" />}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400 font-mono">ID: {item.intId}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{item.translations['en'] || '...'}</span>
                                            </div>
                                            
                                            {/* Status Indicators (Red/Green) */}
                                            <div className="flex gap-1.5 items-center">
                                                <div className={`w-1.5 h-1.5 rounded-full ${Object.keys(item.translations).length > 0 ? 'bg-emerald-400' : 'bg-red-400'}`} title="Translations" />
                                                <div className={`w-1.5 h-1.5 rounded-full ${item.imageUrl ? 'bg-emerald-400' : 'bg-red-400'}`} title="Image" />
                                                <div className={`w-1.5 h-1.5 rounded-full ${item.audioUrl ? 'bg-emerald-400' : 'bg-red-400'}`} title="Audio" />
                                            </div>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => handleDeleteItem(item.id, e)} 
                                            disabled={isDeleting}
                                            className="hidden group-hover:block p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors absolute right-2 top-1/2 -translate-y-1/2"
                                            title={t.btn_delete}
                                        >
                                            {isDeleting && selectedItem?.id === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Detail View */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-200">
                {selectedItem ? (
                    <WordEditorModal 
                        item={selectedItem}
                        currentUser={currentUser}
                        onUpdate={updateItem}
                        onDelete={(id) => handleDeleteItem(id)}
                        targetLangName={SUPPORTED_LANGUAGES.find(l => l.code === selectedItem.targetLang)?.name || 'English'}
                        lang={uiLanguage}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                            <BookOpen size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Select a word to view details</p>
                    </div>
                )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
