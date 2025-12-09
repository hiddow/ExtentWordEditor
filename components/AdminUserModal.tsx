
import React, { useEffect, useState } from 'react';
import { User, SUPPORTED_LANGUAGES, UserRole, PermissionMap, AppDefinition, LanguageCode } from '../types';
import { CloudService } from '../services/cloudService';
import { X, UserPlus, Trash2, Shield, Copy, Check } from 'lucide-react';
import { translations, UILanguage } from '../translations';

interface AdminUserModalProps {
  onClose: () => void;
  lang: UILanguage;
}

export const AdminUserModal: React.FC<AdminUserModalProps> = ({ onClose, lang }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [apps, setApps] = useState<AppDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  // New User Form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('editor');
  
  // Permission Editor State (Map of AppName -> Langs)
  const [editingPermissions, setEditingPermissions] = useState<PermissionMap>({});
  
  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const t = translations[lang];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [uList, aList] = await Promise.all([
      CloudService.getUsers(),
      CloudService.getApps()
    ]);
    setUsers(uList);
    setApps(aList);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    try {
      await CloudService.createUser(newUsername, newPassword, newRole, editingPermissions);
      setNewUsername('');
      setNewPassword('');
      setEditingPermissions({});
      loadData();
    } catch (err) {
      alert("Error creating user (username might be taken)");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Delete this user?')) {
      await CloudService.deleteUser(id);
      loadData();
    }
  };

  const handleCopyCredentials = (user: any) => {
      const text = `Username: ${user.username}\nPassword: ${user.password}`;
      navigator.clipboard.writeText(text);
      setCopiedId(user.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePermission = (appName: string, code: LanguageCode | 'common') => {
    setEditingPermissions(prev => {
      const appPerms = prev[appName] || [];
      const exists = appPerms.includes(code);
      const newAppPerms = exists 
        ? appPerms.filter(c => c !== code) 
        : [...appPerms, code];
      
      return { ...prev, [appName]: newAppPerms };
    });
  };

  const selectAllForApp = (appName: string) => {
    const allCodes: (LanguageCode | 'common')[] = ['common', ...SUPPORTED_LANGUAGES.map(l => l.code)];
    setEditingPermissions(prev => ({
        ...prev,
        [appName]: allCodes
    }));
  };

  const clearAllForApp = (appName: string) => {
    setEditingPermissions(prev => ({
        ...prev,
        [appName]: []
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-200">
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.admin_title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.admin_subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Create Form */}
            <div className="lg:col-span-5 bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl h-fit border border-indigo-100 dark:border-indigo-800/50">
              <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
                <UserPlus size={18} /> {t.admin_add_user}
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-xs font-bold uppercase text-indigo-400 dark:text-indigo-300 mb-1">{t.login_username}</label>
                    <input 
                        className="w-full p-2 rounded border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newUsername} onChange={e => setNewUsername(e.target.value)} required
                    />
                    </div>
                    <div>
                    <label className="block text-xs font-bold uppercase text-indigo-400 dark:text-indigo-300 mb-1">{t.login_password}</label>
                    <input 
                        type="text" className="w-full p-2 rounded border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                        placeholder="Visible Password"
                    />
                    </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-indigo-400 dark:text-indigo-300 mb-1">{t.admin_role}</label>
                  <select 
                    className="w-full p-2 rounded border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}
                  >
                    <option value="editor">Editor (Restricted)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>

                {newRole === 'editor' && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold uppercase text-indigo-400 dark:text-indigo-300 mb-2">{t.admin_perms}</label>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-700 overflow-hidden max-h-[400px] overflow-y-auto">
                        {apps.length === 0 && <p className="p-4 text-sm text-slate-400">No Apps defined. Import data to create apps.</p>}
                        {apps.map(app => {
                            const perms = editingPermissions[app.name] || [];
                            return (
                                <div key={app.id} className="border-b border-indigo-100 dark:border-indigo-800 last:border-0">
                                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/40 flex justify-between items-center">
                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{app.name}</span>
                                        <div className="flex gap-2 text-xs">
                                            <button type="button" onClick={() => selectAllForApp(app.name)} className="text-indigo-600 dark:text-indigo-400 hover:underline">All</button>
                                            <button type="button" onClick={() => clearAllForApp(app.name)} className="text-slate-400 hover:text-red-500 hover:underline">None</button>
                                        </div>
                                    </div>
                                    <div className="p-3 grid grid-cols-2 gap-2">
                                        <label className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer transition ${perms.includes('common') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                            <input type="checkbox" checked={perms.includes('common')} onChange={() => togglePermission(app.name, 'common')} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                            <span className="font-semibold">Metadata / Image</span>
                                        </label>
                                        {SUPPORTED_LANGUAGES.map(lang => (
                                            <label key={lang.code} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer transition ${perms.includes(lang.code) ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                                <input type="checkbox" checked={perms.includes(lang.code)} onChange={() => togglePermission(app.name, lang.code)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                                <span>{lang.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition shadow-sm">
                  {t.admin_create_btn}
                </button>
              </form>
            </div>

            {/* User List */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Shield size={18} className="text-slate-400" /> {t.admin_existing}
              </h3>
              <div className="grid gap-3">
                  {users.map(user => (
                    <div key={user.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0
                            ${user.role === 'admin' ? 'bg-purple-600' : 'bg-emerald-500'}
                            `}>
                            {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{user.username}</span>
                                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border font-bold ${user.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}`}>
                                        {user.role}
                                    </span>
                                    <button 
                                        onClick={() => handleCopyCredentials(user)}
                                        className="ml-2 flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-0.5 rounded text-slate-500 dark:text-slate-300 transition"
                                        title="Copy Username & Password"
                                    >
                                        {copiedId === user.id ? <Check size={10} className="text-emerald-500"/> : <Copy size={10} />}
                                        {copiedId === user.id ? t.admin_copied : t.admin_copy}
                                    </button>
                                </div>
                                {user.role === 'editor' && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {Object.keys(user.permissions).length === 0 ? (
                                            <span className="italic text-slate-400">No permissions assigned</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {Object.entries(user.permissions).map(([appName, langs]) => {
                                                    const list = langs as (LanguageCode | 'common')[];
                                                    return (
                                                      <div key={appName} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1">
                                                          <span className="font-bold text-slate-700 dark:text-slate-300 block text-[10px] mb-0.5">{appName}</span>
                                                          <div className="flex flex-wrap gap-1">
                                                              {list.slice(0, 5).map(l => (
                                                                  <span key={l} className="text-[9px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 rounded text-slate-600 dark:text-slate-400">{l === 'common' ? 'Meta' : l}</span>
                                                              ))}
                                                              {list.length > 5 && <span className="text-[9px] text-slate-400">+{list.length - 5}</span>}
                                                          </div>
                                                      </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        {user.username !== 'admin' && (
                            <button onClick={() => handleDeleteUser(user.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
