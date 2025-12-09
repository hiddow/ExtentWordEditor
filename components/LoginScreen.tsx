import React, { useState } from 'react';
import { CloudService } from '../services/cloudService';
import { User } from '../types';
import { Lock, User as UserIcon, Loader2, Moon, Sun } from 'lucide-react';
import { translations, UILanguage } from '../translations';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  lang: UILanguage;
  toggleLanguage: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, darkMode, toggleDarkMode, lang, toggleLanguage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await CloudService.login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError(t.login_error);
      }
    } catch (e) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-200">
      
      {/* Toggles */}
      <div className="absolute top-6 right-6 flex gap-2">
         <button 
            onClick={toggleLanguage}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition font-bold text-xs"
         >
            {lang === 'en' ? 'EN' : '中文'}
         </button>
         <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
         >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
         </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 transition-colors duration-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t.app_name}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t.login_title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-800 dark:text-indigo-300 mb-4 transition-colors">
            <p className="font-bold mb-1">{t.login_demo}</p>
            <div className="flex justify-between opacity-80">
               <span>Admin: <strong>admin / admin</strong></span>
               <span>User: <strong>editor / editor</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.login_username}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon size={18} className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.login_password}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm text-center font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : t.login_btn}
          </button>
        </form>
      </div>
    </div>
  );
};
