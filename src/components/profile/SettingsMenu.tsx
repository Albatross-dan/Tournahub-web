import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { profileService } from '../../services/profileService';
import { requestNotificationPermission } from '../../lib/notifications';
import { toast } from 'react-hot-toast';
import { 
  Moon, Sun, Monitor, Globe, Bell, 
  Languages, Clock, Check, ChevronDown,
  Mail, Smartphone, Shield, Zap, RefreshCw,
  CircleDollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'ar', name: 'العربية' }
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'Pound (£)' },
  { code: 'KES', name: 'Kenya Shilling (Ksh)' },
  { code: 'NGN', name: 'Nigeria Naira (₦)' }
];

interface UserPreferences {
  in_app_enabled: boolean;
  email_enabled: boolean;
  tournament_notifications: boolean;
  security_notifications: boolean;
  timezone?: string;
  [key: string]: any;
}

const getTimezones = () => {
  let list: string[] = [];
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      list = Intl.supportedValuesOf('timeZone');
    }
  } catch (e) {
    console.error('Error fetching timezones via Intl:', e);
  }
  if (!list || list.length === 0) {
    list = [
      'Africa/Nairobi',
      'UTC',
      'Africa/Lagos',
      'Africa/Johannesburg',
      'Africa/Cairo',
      'Europe/London',
      'Europe/Paris',
      'America/New_York',
      'America/Los_Angeles',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Australia/Sydney'
    ];
  }
  if (!list.includes('Africa/Nairobi')) {
    list.push('Africa/Nairobi');
  }
  return [...list].sort();
};

const SYSTEM_TIMEZONES = getTimezones();


export default function SettingsMenu() {
  const { profile, user } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [language, setLanguage] = useState(() => localStorage.getItem('settings_lang') || 'en');
  const [currency, setCurrency] = useState(profile?.preferred_currency || 'USD');
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    return localStorage.getItem('settings_sounds') !== 'false';
  });
  const [reduceMotion, setReduceMotion] = useState(() => {
    return localStorage.getItem('settings_reduce_motion') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('settings_sounds', String(soundsEnabled));
  }, [soundsEnabled]);

  useEffect(() => {
    localStorage.setItem('settings_reduce_motion', String(reduceMotion));
    if (reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  useEffect(() => {
    localStorage.setItem('settings_lang', language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  async function loadPreferences() {
    try {
      const data = await profileService.getNotificationPreferences(user!.id) as UserPreferences;
      if (data) {
        setPreferences(data);
        if (data.timezone) setTimezone(data.timezone);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference(updates: any) {
    if (!user) return;
    setSaving(true);
    try {
      // If updating currency, update profile table
      if (updates.preferred_currency) {
        await profileService.updateProfile(user.id, { preferred_currency: updates.preferred_currency });
      }

      // If updating timezone, ALSO update the profiles table so it remains perfectly in sync!
      if (updates.timezone) {
        await profileService.updateProfile(user.id, { timezone: updates.timezone });
      }
      
      const data = await profileService.updateNotificationPreferences(user.id, updates);
      setPreferences(data);
    } catch (err) {
      console.error('Error saving preference:', err);
    } finally {
      setSaving(false);
    }
  }

  const handleAutoDetectTimezone = () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);
    updatePreference({ timezone: tz });
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div id="settings-menu" className="space-y-12 pb-12">
      {/* Visual Identity Section */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center">
          <Sun className="w-5 h-5 mr-3 text-primary" /> Visual Identity
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTheme(item.id as any)}
              className={cn(
                "p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-3 shadow-sm",
                theme === item.id 
                  ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]" 
                  : "bg-surface border-border-main text-text-muted hover:border-primary/30"
              )}
            >
              <item.icon className="w-8 h-8" />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Localization Section */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center">
          <Globe className="w-5 h-5 mr-3 text-sky-400" /> Localization
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Language Selection */}
          <div className="card p-6 bg-surface border-border-main space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Languages className="w-4 h-4 text-text-muted" />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Interface Language</span>
                </div>
             </div>
             <select 
               value={language}
               onChange={(e) => setLanguage(e.target.value)}
               className="w-full bg-background border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-main focus:outline-none focus:border-primary transition-colors appearance-none"
             >
               {LANGUAGES.map(lang => (
                 <option key={lang.code} value={lang.code}>{lang.name}</option>
               ))}
             </select>
          </div>

          {/* Timezone Selection */}
          <div className="card p-6 bg-surface border-border-main space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Region & Timezone</span>
                </div>
                <button 
                  onClick={handleAutoDetectTimezone}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  Auto Detect
                </button>
             </div>
             <div className="relative">
                <select
                  value={timezone}
                  onChange={(e) => {
                    const nextTz = e.target.value;
                    setTimezone(nextTz);
                    updatePreference({ timezone: nextTz });
                  }}
                  className="w-full bg-background border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-main focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                >
                  {SYSTEM_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} className="bg-[#111218] text-white">
                      {tz}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                  <ChevronDown className="w-4 h-4" />
                </div>
             </div>
          </div>

          {/* Currency Selection */}
          <div className="card p-6 bg-surface border-border-main space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CircleDollarSign className="w-4 h-4 text-text-muted" />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Preferred Currency</span>
                </div>
             </div>
             <select 
               value={currency}
               onChange={(e) => {
                 setCurrency(e.target.value);
                 updatePreference({ preferred_currency: e.target.value });
               }}
               className="w-full bg-background border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-main focus:outline-none focus:border-primary transition-colors appearance-none"
             >
               {CURRENCIES.map(curr => (
                 <option key={curr.code} value={curr.code}>{curr.name}</option>
               ))}
             </select>
          </div>
        </div>
      </section>

      {/* Communication Preferences */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center">
          <Bell className="w-5 h-5 mr-3 text-indigo-400" /> Notifications
        </h3>

        <div className="space-y-3">
          {[
            { id: 'in_app_enabled', label: 'Push Notifications', desc: 'Receive real-time match & tournament alerts', icon: Smartphone },
            { id: 'email_enabled', label: 'Email Reports', desc: 'Financial summaries and tournament results', icon: Mail },
            { id: 'tournament_notifications', label: 'Tournament Updates', desc: 'Alerts when your joined tournaments start', icon: Zap },
            { id: 'security_notifications', label: 'Security Alerts', desc: 'Important account and login notifications', icon: Shield }
          ].map((pref) => (
            <button
              key={pref.id}
              onClick={async () => {
                if (!user) return;
                const nextValue = !preferences?.[pref.id];
                
                if (pref.id === 'in_app_enabled' && nextValue) {
                  console.log('[SettingsMenu] Push Notifications toggle turned ON by user:', user.id);
                  console.log('[SettingsMenu] Requesting permission dynamically...');
                  const token = await requestNotificationPermission(user!.id);
                  const currentPerm = 'Notification' in window ? Notification.permission : 'not_supported';
                  console.log('[SettingsMenu] Permission request completed. Resulting status:', currentPerm);
                  
                  if (!token) {
                    console.warn('[SettingsMenu] No token retrieved. Permission denied or initialization failed.');
                    if ('Notification' in window && Notification.permission === 'denied') {
                      toast.error('Notification access is blocked in this browser. Please enable notifications in your browser settings to allow updates.');
                      return;
                    } else if (!('serviceWorker' in navigator) || !('Notification' in window)) {
                      toast.error('System notifications are not supported in this environment.');
                      return;
                    }
                  } else {
                    console.log('[SettingsMenu] Token acquired and saved successfully:', token.substring(0, 10) + '...');
                    toast.success('System notifications successfully authorized!');
                  }
                }
                
                updatePreference({ [pref.id]: nextValue });
              }}
              disabled={saving}
              className={cn(
                "w-full card p-5 text-left border-2 transition-all flex items-center justify-between group",
                preferences?.[pref.id] 
                  ? "bg-indigo-500/5 border-indigo-500/30" 
                  : "bg-surface border-border-main grayscale"
              )}
            >
              <div className="flex items-center space-x-5">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  preferences?.[pref.id] ? "bg-indigo-500/20 text-indigo-400" : "bg-background text-text-muted"
                )}>
                  <pref.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-text-main uppercase italic tracking-tighter">{pref.label}</h4>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mt-1">{pref.desc}</p>
                </div>
              </div>
              
              <Toggle active={!!preferences?.[pref.id]} color="indigo" />
            </button>
          ))}
        </div>
      </section>

      {/* Experience Section */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center">
          <Zap className="w-5 h-5 mr-3 text-amber-400" /> Interface Experience
        </h3>

        <div className="space-y-3">
          {/* Sounds Toggle */}
          <button
            onClick={() => setSoundsEnabled(!soundsEnabled)}
            className={cn(
              "w-full card p-5 text-left border-2 transition-all flex items-center justify-between group",
              soundsEnabled 
                ? "bg-amber-500/5 border-amber-500/30" 
                : "bg-surface border-border-main grayscale"
            )}
          >
            <div className="flex items-center space-x-5">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                soundsEnabled ? "bg-amber-500/20 text-amber-400" : "bg-background text-text-muted"
              )}>
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-text-main uppercase italic tracking-tighter">UI Sound Effects</h4>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mt-1">Enable tactile feedback and game result sounds</p>
              </div>
            </div>
            
            <Toggle active={soundsEnabled} color="amber" />
          </button>

          {/* Reduce Motion Toggle */}
          <button
            onClick={() => setReduceMotion(!reduceMotion)}
            className={cn(
              "w-full card p-5 text-left border-2 transition-all flex items-center justify-between group",
              reduceMotion 
                ? "bg-emerald-500/5 border-emerald-500/30" 
                : "bg-surface border-border-main grayscale"
            )}
          >
            <div className="flex items-center space-x-5">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                reduceMotion ? "bg-emerald-500/20 text-emerald-400" : "bg-background text-text-muted"
              )}>
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-text-main uppercase italic tracking-tighter">Reduce Motion</h4>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mt-1">Simplify animations for a smoother performance</p>
              </div>
            </div>
            
            <Toggle active={reduceMotion} color="emerald" />
          </button>
        </div>
      </section>
    </div>
  );
}

function Toggle({ active, color = 'indigo' }: { active: boolean; color?: 'indigo' | 'amber' | 'emerald' }) {
  const colorClasses = {
    indigo: "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]",
    amber: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
    emerald: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
  };

  return (
    <div className={cn(
      "w-12 h-6 rounded-full relative transition-all duration-300",
      active ? colorClasses[color] : "bg-background"
    )}>
      <div className={cn(
        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
        active ? "left-7" : "left-1"
      )} />
    </div>
  );
}
