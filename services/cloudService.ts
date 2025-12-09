import { VocabItem, User, UserRole, PermissionMap, AppDefinition, ItemStatus } from '../types';

const apiFromEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
  ? (import.meta as any).env.VITE_API_URL
  : undefined;
const API_URL = apiFromEnv || 'http://localhost:3002';
const SESSION_KEY = 'vocab_forge_token';
const KEY_APPS = 'vocab_forge_apps';
const KEY_VOCAB = 'vocab_forge_items';

const DEMO_USERS: Array<User & { password: string }> = [
  { id: 'admin-demo', username: 'admin', password: 'admin', role: 'admin', permissions: {} },
  { id: 'editor-demo', username: 'editor', password: 'editor', role: 'editor', permissions: { 'LingoDeer': ['common', 'es'] } }
];
const DEFAULT_APPS: AppDefinition[] = [
  { id: 'app-lingodeer', name: 'LingoDeer' },
  { id: 'app-chineseskill', name: 'ChineseSkill' }
];

const normalizePermissions = (perms: any): PermissionMap => {
  if (!perms) return {};
  if (typeof perms === 'string') {
    try {
      return JSON.parse(perms) as PermissionMap;
    } catch {
      return {};
    }
  }
  return perms as PermissionMap;
};

const generateId = (prefix = 'id') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}`;
};

const normalizeUser = (raw: any): User => {
  const { password: _pw, ...rest } = raw || {};
  return {
    id: rest?.id || generateId('user'),
    username: rest?.username || '',
    role: (rest?.role as UserRole) || 'editor',
    permissions: normalizePermissions(rest?.permissions)
  };
};

const normalizeApp = (raw: any): AppDefinition => ({
  id: raw?.id || generateId('app'),
  name: raw?.name || ''
});

const safeParse = (text: string | undefined | null) => {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const normalizeVocabItem = (raw: any): VocabItem => ({
  id: raw?.id || generateId('vocab'),
  intId: typeof raw?.intId === 'number' ? raw.intId : 0,
  appName: raw?.appName || '',
  targetLang: raw?.targetLang || 'en',
  term: raw?.term || '',
  originalIndex: typeof raw?.originalIndex === 'number' ? raw.originalIndex : 0,
  status: (raw?.status as ItemStatus) || ItemStatus.PENDING,
  translations: typeof raw?.translations === 'string' ? safeParse(raw.translations) : (raw?.translations || {}),
  exampleTranslations: typeof raw?.exampleTranslations === 'string' ? safeParse(raw.exampleTranslations) : (raw?.exampleTranslations || {}),
  script: raw?.script,
  phonetic: raw?.phonetic,
  variant: raw?.variant,
  partOfSpeech: raw?.partOfSpeech,
  imageUrl: raw?.imageUrl,
  audioUrl: raw?.audioUrl,
  exampleSentence: raw?.exampleSentence,
  exampleSentenceTokens: raw?.exampleSentenceTokens,
  exampleScript: raw?.exampleScript,
  exampleTranslation: raw?.exampleTranslation
});

const loadLocalVocab = (): VocabItem[] => {
  const stored = localStorage.getItem(KEY_VOCAB);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeVocabItem) : [];
  } catch (err) {
    console.error('Failed to parse cached vocab', err);
    return [];
  }
};

const saveLocalVocab = (items: VocabItem[]) => {
  let nextInt = items.reduce((max, i) => Math.max(max, i.intId || 0), 0);
  const normalized = items.map(item => {
    const clean = normalizeVocabItem(item);
    if (!clean.intId || clean.intId === 0) {
      nextInt += 1;
      clean.intId = nextInt;
    }
    return clean;
  });
  localStorage.setItem(KEY_VOCAB, JSON.stringify(normalized));
};

const mergeVocabLists = (primary: VocabItem[], secondary: VocabItem[]) => {
  const map = new Map<string, VocabItem>();
  primary.forEach(item => map.set(item.id, normalizeVocabItem(item)));
  secondary.forEach(item => {
    if (!map.has(item.id)) map.set(item.id, normalizeVocabItem(item));
  });
  return Array.from(map.values());
};

const mergeApps = (apps: AppDefinition[]): AppDefinition[] => {
  const seen = new Set<string>();
  const normalized: AppDefinition[] = [];
  apps.forEach(app => {
    const clean = normalizeApp(app);
    const key = clean.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(clean);
  });
  return normalized;
};

const loadLocalApps = (): AppDefinition[] => {
  const stored = localStorage.getItem(KEY_APPS);
  if (!stored) return [];
  try {
    return mergeApps(JSON.parse(stored));
  } catch (err) {
    console.error('Failed to parse cached apps', err);
    return [];
  }
};

const saveLocalApps = (apps: AppDefinition[]) => {
  localStorage.setItem(KEY_APPS, JSON.stringify(mergeApps(apps)));
};

const persistSession = (user: User) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const CloudService = {
  // --- APPS ---
  async getApps(): Promise<AppDefinition[]> {
    try {
        const res = await fetch(`${API_URL}/apps`);
        if (res.ok) {
          const list = mergeApps(await res.json());
          if (list.length > 0) {
            saveLocalApps(list);
            return list;
          }
        }
    } catch (e) {
        console.error(e);
    }
    // 后端不可用或数据为空时，回退到本地缓存或默认 Product，避免下拉为空
    const cached = loadLocalApps();
    if (cached.length > 0) return cached;
    saveLocalApps(DEFAULT_APPS);
    return DEFAULT_APPS;
  },

  async createApp(name: string): Promise<AppDefinition> {
    const cleanName = name.trim();
    const fallbackExisting = (): AppDefinition => {
      const current = loadLocalApps();
      const existing = current.find(a => a.name.toLowerCase() === cleanName.toLowerCase());
      if (existing) return existing;
      const newApp = normalizeApp({ name: cleanName });
      saveLocalApps([...current, newApp]);
      return newApp;
    };

    try {
        const res = await fetch(`${API_URL}/apps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: cleanName })
        });
        if (res.ok) {
            const created = normalizeApp(await res.json());
            const cached = loadLocalApps();
            saveLocalApps([...cached, created]);
            return created;
        }
        // 如果重名或后端拒绝，尝试返回已存在的记录，避免用户看不到已有 Product
        if (res.status === 400 || res.status === 409) {
          return fallbackExisting();
        }
        throw new Error('Failed to create app');
    } catch (err) {
        console.error(err);
        // 网络失败时也回退到本地列表
        return fallbackExisting();
    }
  },

  // --- AUTH & USERS ---

  async login(username: string, password: string): Promise<User | null> {
    const tryDemoLogin = () => {
      const demo = DEMO_USERS.find(u => u.username === username && u.password === password);
      if (demo) {
        const normalized = normalizeUser(demo);
        persistSession(normalized);
        return normalized;
      }
      return null;
    };

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (res.ok) {
            const user = await res.json();
            const normalized = normalizeUser(user);
            persistSession(normalized);
            return normalized;
        }
        // 如果服务端不可用或认证失败，允许回落到演示账号
        return tryDemoLogin();
    } catch (e) {
        console.error(e);
        return tryDemoLogin();
    }
  },

  logout(): void {
      localStorage.removeItem(SESSION_KEY);
  },

  restoreSession(): User | null {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      try {
        return normalizeUser(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to restore session', err);
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
  },

  async getUsers(): Promise<User[]> {
      // Mock: no API for list users yet, or restricted
      return [];
  },

  async createUser(username: string, password: string, role: UserRole, permissions: PermissionMap): Promise<User> {
    // Mock: no API for create user yet
    throw new Error("Not implemented on server yet");
  },

  async updateUserPermissions(userId: string, permissions: PermissionMap): Promise<void> {
    // Mock
  },

  async deleteUser(id: string): Promise<void> {
    // Mock
  },


  // --- CONTEXT PERSISTENCE ---
  saveContext(appName: string, langCode: string) {
      localStorage.setItem('vocab_forge_last_context', JSON.stringify({ appName, langCode }));
  },

  getLastContext(): { appName: string, langCode: string } | null {
      const stored = localStorage.getItem('vocab_forge_last_context');
      return stored ? JSON.parse(stored) : null;
  },

  // --- VOCAB DATA ---

  async getVocabItems(appName?: string): Promise<VocabItem[]> {
    const fallback = () => {
      const cached = loadLocalVocab();
      if (appName) return cached.filter(i => i.appName === appName);
      return cached;
    };

    try {
        let url = `${API_URL}/vocab`;
        if (appName) url += `?appName=${encodeURIComponent(appName)}`;
        
        const res = await fetch(url);
        if (!res.ok) return fallback();
        const data = await res.json();
        const normalized = Array.isArray(data) ? data.map(normalizeVocabItem) : [];
        const merged = mergeVocabLists(normalized, loadLocalVocab());
        saveLocalVocab(merged);
        return appName ? merged.filter(i => i.appName === appName) : merged;
    } catch (e) {
        console.error(e);
        return fallback();
    }
  },

  async saveVocabItems(items: VocabItem[]): Promise<void> {
    // Replaced by individual CRUD, but kept for compatibility if needed.
    // In this refactor, we usually use specific methods.
  },

  // This is used for "Import" which adds multiple items
  async addVocabItems(newItems: VocabItem[]): Promise<VocabItem[]> {
    const persistLocally = () => {
      const cached = loadLocalVocab();
      let nextInt = cached.reduce((max, i) => Math.max(max, i.intId || 0), 0) + 1;
      const merged = [
        ...cached,
        ...newItems.map(item => {
          const normalized = normalizeVocabItem(item);
          const ensuredIntId = normalized.intId && normalized.intId > 0 ? normalized.intId : nextInt++;
          return { ...normalized, intId: ensuredIntId };
        })
      ];
      saveLocalVocab(merged);
      return loadLocalVocab();
    };

    try {
        const res = await fetch(`${API_URL}/vocab`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItems)
        });
        
        if (!res.ok) throw new Error('Failed to add items');
        
        await res.json(); // Wait for completion
        return this.getVocabItems(); // Re-fetch all. 
    } catch (err) {
        console.error('Add vocab failed, saving locally.', err);
        return persistLocally();
    }
  },

  async updateVocabItem(item: VocabItem): Promise<void> {
    const updateLocal = () => {
      const cached = loadLocalVocab();
      let nextInt = cached.reduce((max, i) => Math.max(max, i.intId || 0), 0) + 1;
      let found = false;
      const updated = cached.map(existing => {
        if (existing.id === item.id) {
          found = true;
          const normalized = normalizeVocabItem({ ...existing, ...item });
          if (!normalized.intId || normalized.intId === 0) normalized.intId = existing.intId || nextInt++;
          return normalized;
        }
        return existing;
      });

      if (!found) {
        const normalized = normalizeVocabItem(item);
        if (!normalized.intId || normalized.intId === 0) normalized.intId = nextInt++;
        updated.push(normalized);
      }
      saveLocalVocab(updated);
    };

    try {
      await fetch(`${API_URL}/vocab/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
      });
      updateLocal();
    } catch (err) {
      console.error('Update vocab failed, syncing locally.', err);
      updateLocal();
    }
  },

  async deleteVocabItems(ids: Set<string>): Promise<VocabItem[]> {
    const idArray = Array.from(ids);
    const applyLocal = () => {
      const cached = loadLocalVocab();
      const remaining = cached.filter(item => !ids.has(item.id));
      saveLocalVocab(remaining);
      return loadLocalVocab();
    };

    try {
      await fetch(`${API_URL}/vocab`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idArray })
      });
      return this.getVocabItems();
    } catch (err) {
      console.error('Delete vocab failed, applying locally.', err);
      return applyLocal();
    }
  },
  
  async clearAllVocab(): Promise<void> {
      // Mock
  }
};
