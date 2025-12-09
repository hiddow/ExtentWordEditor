
import { VocabItem, User, UserRole, PermissionMap, AppDefinition } from '../types';

// STORAGE KEYS
const KEY_VOCAB = 'vocab_forge_data';
const KEY_USERS = 'vocab_forge_users';
const KEY_APPS = 'vocab_forge_apps';
const KEY_ID_SEQ = 'vocab_forge_id_seq'; // Sequence for Integer IDs
const KEY_SESSION = 'vocab_forge_session';
const KEY_CONTEXT = 'vocab_forge_last_context';

// DEFAULT SEED DATA
const DEFAULT_USERS: any[] = [
  { 
    id: 'admin-1', 
    username: 'admin', 
    password: 'admin', 
    role: 'admin', 
    permissions: {} 
  },
  { 
    id: 'editor-1', 
    username: 'editor', 
    password: 'editor', 
    role: 'editor', 
    // Example: Can edit common + Spanish in "LingoDeer" app
    permissions: { 'LingoDeer': ['common', 'es'] } 
  }
];

const DEFAULT_APPS: AppDefinition[] = [
  { id: 'lingodeer', name: 'LingoDeer' },
  { id: 'chineseskill', name: 'ChineseSkill' }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const CloudService = {
  // --- APPS ---
  async getApps(): Promise<AppDefinition[]> {
    const stored = localStorage.getItem(KEY_APPS);
    if (!stored) {
        localStorage.setItem(KEY_APPS, JSON.stringify(DEFAULT_APPS));
        return DEFAULT_APPS;
    }
    return JSON.parse(stored);
  },

  async createApp(name: string): Promise<AppDefinition> {
    const apps = await this.getApps();
    if (apps.find(a => a.name.toLowerCase() === name.toLowerCase())) {
        throw new Error("App name already exists");
    }
    const newApp = { id: crypto.randomUUID(), name };
    apps.push(newApp);
    localStorage.setItem(KEY_APPS, JSON.stringify(apps));
    return newApp;
  },

  // --- AUTH & USERS ---

  async login(username: string, password: string): Promise<User | null> {
    await delay(300);
    const users = this.getUsersRaw();
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      const { password, ...safeUser } = user;
      // Persist Session
      localStorage.setItem(KEY_SESSION, JSON.stringify(safeUser));
      return safeUser as User;
    }
    return null;
  },

  logout(): void {
      localStorage.removeItem(KEY_SESSION);
  },

  restoreSession(): User | null {
      const stored = localStorage.getItem(KEY_SESSION);
      return stored ? JSON.parse(stored) : null;
  },

  async getUsers(): Promise<User[]> {
    const users = this.getUsersRaw();
    return users.map((u: any) => {
      // Return users with passwords (in this mock environment only) so Admins can copy them
      // In a real app, never return passwords.
      return u; 
    });
  },

  async createUser(username: string, password: string, role: UserRole, permissions: PermissionMap): Promise<User> {
    const users = this.getUsersRaw();
    if (users.find((u: any) => u.username === username)) {
      throw new Error("Username exists");
    }
    const newUser = {
      id: crypto.randomUUID(),
      username,
      password,
      role,
      permissions
    };
    users.push(newUser);
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
    
    return newUser; // Return full object so we can copy password immediately if needed
  },

  async updateUserPermissions(userId: string, permissions: PermissionMap): Promise<void> {
      const users = this.getUsersRaw();
      const idx = users.findIndex((u: any) => u.id === userId);
      if (idx !== -1) {
          users[idx].permissions = permissions;
          localStorage.setItem(KEY_USERS, JSON.stringify(users));
      }
  },

  async deleteUser(id: string): Promise<void> {
    const users = this.getUsersRaw();
    const newUsers = users.filter((u: any) => u.id !== id);
    localStorage.setItem(KEY_USERS, JSON.stringify(newUsers));
  },

  getUsersRaw() {
    const stored = localStorage.getItem(KEY_USERS);
    if (!stored) {
      localStorage.setItem(KEY_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(stored);
  },

  // --- CONTEXT PERSISTENCE ---
  saveContext(appName: string, langCode: string) {
      localStorage.setItem(KEY_CONTEXT, JSON.stringify({ appName, langCode }));
  },

  getLastContext(): { appName: string, langCode: string } | null {
      const stored = localStorage.getItem(KEY_CONTEXT);
      return stored ? JSON.parse(stored) : null;
  },

  // --- VOCAB DATA ---

  // Helper to get next ID
  getNextIntId(count = 1): number {
      const current = parseInt(localStorage.getItem(KEY_ID_SEQ) || '0', 10);
      const next = current + count;
      localStorage.setItem(KEY_ID_SEQ, next.toString());
      return current + 1; // Return the first new ID
  },

  async getVocabItems(appName?: string): Promise<VocabItem[]> {
    await delay(200);
    const stored = localStorage.getItem(KEY_VOCAB);
    const allItems: VocabItem[] = stored ? JSON.parse(stored) : [];
    
    if (appName) {
        return allItems.filter(i => i.appName === appName || (!i.appName && appName === 'General'));
    }
    return allItems;
  },

  async saveVocabItems(items: VocabItem[]): Promise<void> {
    localStorage.setItem(KEY_VOCAB, JSON.stringify(items));
  },

  // When adding items, we read ALL items, append new ones, and save back
  async addVocabItems(newItems: VocabItem[]): Promise<VocabItem[]> {
    const currentAll = await this.getVocabItems(); 
    
    // Assign Integer IDs
    let startId = this.getNextIntId(newItems.length);
    const itemsWithIds = newItems.map((item, index) => ({
        ...item,
        intId: startId + index
    }));
    
    const updated = [...currentAll, ...itemsWithIds];
    await this.saveVocabItems(updated);
    return updated; 
  },

  async updateVocabItem(item: VocabItem): Promise<void> {
    const current = await this.getVocabItems();
    const index = current.findIndex(i => i.id === item.id);
    if (index !== -1) {
      current[index] = item;
      await this.saveVocabItems(current);
    }
  },

  async deleteVocabItems(ids: Set<string>): Promise<VocabItem[]> {
    const current = await this.getVocabItems();
    const updated = current.filter(i => !ids.has(i.id));
    await this.saveVocabItems(updated);
    return updated;
  },
  
  async clearAllVocab(): Promise<void> {
      localStorage.removeItem(KEY_VOCAB);
  }
};
