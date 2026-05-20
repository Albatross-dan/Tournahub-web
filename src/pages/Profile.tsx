import React, { useState, useEffect } from 'react';
import { useAuth, useRefetchOnFocus } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { matchService } from '../services/matchService';
import Shell from '../components/layout/Shell';
import { Link } from 'react-router-dom';
import { 
  User as UserIcon, Camera, Save, 
  Settings, Shield, Loader2, Trophy,
  Star, Target, Zap, LogOut, CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import TrophyWall from '../components/profile/TrophyWall';
import SettingsMenu from '../components/profile/SettingsMenu';

export default function Profile() {
  const { profile, user, signOut } = useAuth();
  useRefetchOnFocus(loadStats);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [username, setUsername] = useState(profile?.username || '');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalMatches: 0, wins: 0, winRate: 0, totalTournaments: 0 });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const initial = (profile?.username || user?.email || 'U')[0].toUpperCase();

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  async function loadStats() {
    if (!user) return;
    try {
      const matchStats = await matchService.getUserStats(user.id);
      
      const { count } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        ...matchStats,
        totalTournaments: count || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  const updateProfile = async () => {
    if (!profile) return;
    setLoading(true);
    setMessage(null);
    try {
      await profileService.updateProfile(profile.id, { username });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-text-main uppercase italic tracking-tighter">Profile</h1>
          
          <div className="flex bg-surface/50 p-1 rounded-xl border border-border-main">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-all",
                activeTab === 'overview' ? "bg-primary text-slate-900 shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" : "text-text-muted hover:text-text-main"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-all",
                activeTab === 'settings' ? "bg-primary text-slate-900 shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" : "text-text-muted hover:text-text-main"
              )}
            >
              Settings
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            <div className="card p-10 bg-gradient-to-br from-surface to-background border-border-main shadow-2xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
              
              <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                <div className="w-28 h-28 rounded-full bg-surface border-4 border-border-main flex items-center justify-center text-primary font-black text-4xl shadow-xl">
                  {initial}
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-text-main italic uppercase tracking-tighter truncate max-w-[300px]">
                    {profile?.username || user?.email?.split('@')[0]}
                  </h2>
                  <p className="text-text-muted text-xs font-bold uppercase tracking-widest">{user?.email}</p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="px-5 py-2 bg-sky-500/10 text-sky-400 border border-sky-400/30 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">{profile?.role || 'User'}</span>
                  <span className="px-5 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-400/30 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">{stats.totalMatches > 50 ? 'Veteran' : stats.totalMatches > 10 ? 'Pro' : 'Amateur'}</span>
                  <span className="px-5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-400/30 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">{stats.winRate}% WR</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="card p-6 bg-sky-500/5 border-sky-500/10 flex flex-col items-center justify-center text-center space-y-1">
                 <span className="text-3xl font-black text-sky-400 italic tracking-tighter">{stats.totalTournaments}</span>
                 <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-tight">Tournaments</span>
              </div>
              <div className="card p-6 bg-indigo-500/5 border-indigo-500/10 flex flex-col items-center justify-center text-center space-y-1">
                 <span className="text-3xl font-black text-indigo-400 italic tracking-tighter">{stats.totalMatches}</span>
                 <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-tight">Matches</span>
              </div>
              <div className="card p-6 bg-emerald-500/5 border-emerald-500/10 flex flex-col items-center justify-center text-center space-y-1">
                 <span className="text-3xl font-black text-emerald-400 italic tracking-tighter">{stats.wins}</span>
                 <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-tight">Wins</span>
              </div>
            </div>

            {/* Trophy Wall Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter">Achievement Wall</h3>
                <Link to="/profile/wins" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center">
                  View All History <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
              {user && <TrophyWall userId={user.id} />}
            </div>

            {/* Operations */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-text-main uppercase italic tracking-tighter">Operations</h3>
              
              {profile?.role === 'admin' && (
                <Link to="/admin" className="card p-6 bg-primary/10 border-primary/20 flex items-center justify-between group hover:bg-primary/20 transition-all cursor-pointer mb-4">
                  <div className="flex items-center space-x-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-text-main italic uppercase tracking-tighter leading-tight">Admin Control</h4>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">Access Management Hub</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              )}

              <div 
                onClick={() => setActiveTab('settings')}
                className="card p-6 bg-surface/30 border-border-main flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-6">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                    <Settings className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-text-main italic uppercase tracking-tighter leading-tight">Preference Settings</h4>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Theme, Region & Notification</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-text-muted group-hover:text-primary transition-colors" />
              </div>
            </div>
          </>
        ) : (
          <SettingsMenu />
        )}

        {/* Logout Button */}
        <button 
          onClick={signOut}
          className="w-full bg-[#ef4444] hover:bg-[#dc2626] transition-all py-5 rounded-[2rem] flex items-center justify-center shadow-lg shadow-red-500/20 active:scale-[0.98]"
        >
          <span className="text-white font-black text-xl uppercase italic tracking-tighter">Logout</span>
        </button>
      </div>
    </Shell>
  );
}


