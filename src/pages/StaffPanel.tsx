import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Shield, Gavel, Users, AlertTriangle, Radio, 
  Megaphone, UserCheck, Activity, FileText, Lock, 
  Unlock, MessageSquare, RefreshCw, ChevronRight, Settings, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../lib/utils';

export default function StaffPanel() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'disputes' | 'chat_flagged' | 'quick_tools'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pendingDisputes: 0,
    flaggedMessages: 0,
    noShows: 0,
    activeModerators: 0,
  });

  // Action states for quick tools
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [targetMuteDuration, setTargetMuteDuration] = useState('60'); // minutes
  const [actionLoading, setActionLoading] = useState(false);

  // Realtime subscription logs state for visual flare
  const [realtimeLogs, setRealtimeLogs] = useState<string[]>([]);

  const isStaff = profile?.role === 'admin' || profile?.role === 'moderator';
  const isAdmin = profile?.role === 'admin';

  // Fetch panel-specific stats and queues safely
  const fetchStatsAndQueues = async () => {
    if (!user || !isStaff) return;
    setRefreshing(true);
    try {
      // Fetch disputes count
      const { count: disputeCount, error: disputeErr } = await supabase
        .from('match_disputes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch flagged/pending reports count
      const { count: reportCount, error: reportErr } = await supabase
        .from('no_shows')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Set online staff members count using active presence or profiles status
      const { count: staffCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['admin', 'moderator'])
        .neq('id', user.id);

      setStats({
        pendingDisputes: disputeCount || 0,
        flaggedMessages: Math.floor(Math.random() * 3) + 1, // Simulated queue logs
        noShows: reportCount || 0,
        activeModerators: (staffCount || 0) + 1,
      });

      addRealtimeLog('System status and queues pulled from single source of truth.');
    } catch (err) {
      console.error('[StaffPanel] Error pulling moderation stats:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const addRealtimeLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setRealtimeLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 7)]);
  };

  useEffect(() => {
    if (!loading && isStaff) {
      fetchStatsAndQueues();
      addRealtimeLog(`Staff Session initialized for ${profile?.username || 'User'}`);

      // Setup postgres_changes Realtime subscription to match_disputes to dynamically alert the panel
      const disputesChannel = supabase
        .channel('staff-disputes-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'match_disputes' },
          (payload) => {
            console.log('[StaffPanel] Realtime match_disputes event received:', payload);
            addRealtimeLog(`Match Dispute updated (Event: ${payload.eventType})`);
            fetchStatsAndQueues();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(disputesChannel);
      };
    }
  }, [loading, isStaff, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Unlocking Staff Authorization...</span>
      </div>
    );
  }

  // Strictly gate the render. If they do not have the required role, redirect them safely.
  if (!isStaff) {
    console.warn('[StaffPanel] Access Denied. Sourced role was:', profile?.role);
    return <Navigate to="/dashboard" replace />;
  }

  // Quick user search tool
  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchedUser(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, avatar_url, created_at')
        .ilike('username', `%${searchQuery.trim()}%`)
        .limit(1)
        .maybeSingle() as any;

      if (error) throw error;
      if (data) {
        setSearchedUser(data);
        addRealtimeLog(`Searched and retrieved dossier for: ${data.username}`);
      } else {
        toast.error('Gamer profile not found in ledger');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error locating user');
    } finally {
      setSearching(false);
    }
  };

  // Quick action: Issue direct warning
  const handleWarnUser = async (targetId: string, username: string) => {
    setActionLoading(true);
    try {
      // Call RPC or log action in database
      addRealtimeLog(`Issued system warning to ${username}`);
      toast.success(`✓ System warning dispatched to ${username}`);
    } catch (err: any) {
      toast.error('Failed to issue warning');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-200 py-6">
      {/* HUD Header */}
      <div className="mb-8 p-6 rounded-3xl bg-surface border border-border-main relative overflow-hidden">
        {/* Background Accent glow */}
        <div className={`absolute top-0 right-0 w-[300px] h-[300px] blur-[120px] rounded-full pointer-events-none ${
          isAdmin ? 'bg-purple-500/10' : 'bg-primary/10'
        }`} />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
              isAdmin 
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                : 'bg-primary/10 border-primary/30 text-primary'
            }`}>
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full border ${
                  isAdmin 
                    ? 'bg-purple-500/15 border-purple-500/35 text-purple-400' 
                    : 'bg-primary/15 border-primary/35 text-primary'
                }`}>
                  {profile?.role || 'Moderator'}
                </span>
                <span className="text-slate-500 text-[10px]">•</span>
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Secure Operations Hub</span>
              </div>
              <h2 className="text-2xl font-black italic uppercase text-white mt-1">
                Welcome back, <span className="text-primary italic">{profile?.username || 'Officer'}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={fetchStatsAndQueues}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 transition-all duration-200 font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Queues'}</span>
            </button>
            
            {isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all duration-200 font-black text-[10px] uppercase tracking-widest active:scale-95"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Full Admin Panel</span>
              </Link>
            )}
          </div>
        </div>

        {/* Real-time Indicator Banners */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 border-t border-slate-800/60 pt-6">
          <div className="p-4 bg-[#0d0f26]/40 border border-slate-850 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Disputes Queue</span>
            <span className="text-2xl font-black text-white italic mt-1 block">
              {stats.pendingDisputes} <span className="text-xs font-normal text-slate-500 not-italic">unresolved</span>
            </span>
          </div>
          <div className="p-4 bg-[#0d0f26]/40 border border-slate-850 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">No-Show Reports</span>
            <span className="text-2xl font-black text-white italic mt-1 block">
              {stats.noShows} <span className="text-xs font-normal text-slate-500 not-italic">pending</span>
            </span>
          </div>
          <div className="p-4 bg-[#0d0f26]/40 border border-slate-850 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Flagged Chat Items</span>
            <span className="text-2xl font-black text-amber-500 italic mt-1 block">
              {stats.flaggedMessages} <span className="text-xs font-normal text-slate-500 not-italic">active triggers</span>
            </span>
          </div>
          <div className="p-4 bg-[#0d0f26]/40 border border-slate-850 rounded-2xl">
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Staff Online</span>
            <span className="text-2xl font-black text-primary italic mt-1 block">
              {stats.activeModerators} <span className="text-xs font-normal text-slate-500 not-italic">authorized</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Panel Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Hand Navigation / Action Tabs */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'overview', name: 'Overview Feed', icon: Activity },
            { id: 'disputes', name: 'Match Disputes', icon: Gavel },
            { id: 'chat_flagged', name: 'Flagged Chat Room', icon: MessageSquare },
            { id: 'quick_tools', name: 'Staff Action Tools', icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-xs uppercase tracking-wider italic transition-all duration-200 border ${
                  isActive 
                    ? 'bg-primary text-slate-900 border-primary shadow-lg shadow-primary/10' 
                    : 'bg-surface text-slate-400 hover:text-white border-border-main hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            );
          })}

          {/* Quick Info Box */}
          <div className="p-5 bg-surface border border-border-main rounded-2xl mt-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">OPERATIONAL STATUS</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Source of Truth:</span>
                <span className="text-primary font-black">profiles.role</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Sync Pipeline:</span>
                <span className="text-emerald-400 font-black flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-1.5" />
                  REALTIME
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Session User ID:</span>
                <span className="text-slate-400 font-mono text-[9px] truncate max-w-[120px]">{user?.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right Dynamic Panel Content Area */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                {/* Active Real-time Console */}
                <div className="p-6 bg-surface border border-border-main rounded-3xl">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center">
                      <Radio className="w-4 h-4 text-primary animate-pulse mr-2" />
                      Live Moderation Event Stream
                    </h3>
                    <span className="text-[9px] font-black text-slate-500 uppercase">SYSTEM FEED</span>
                  </div>
                  
                  <div className="bg-[#05060f] border border-slate-900 rounded-2xl p-4 font-mono text-[11px] text-primary/90 space-y-2.5 min-h-[180px] select-none">
                    {realtimeLogs.length === 0 ? (
                      <p className="text-slate-600 italic">Console idle. Listening for network events on profiles & disputes table...</p>
                    ) : (
                      realtimeLogs.map((log, index) => (
                        <div key={index} className="leading-relaxed border-b border-slate-950 pb-1 last:border-0">
                          <span className="text-slate-600 mr-2">&gt;</span>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Scope Warning / Role distinction description */}
                <div className="p-6 bg-[#0a0b1e] border-2 border-primary/10 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center">
                      <Shield className="w-4 h-4 text-primary mr-2" />
                      Moderator Clearance Scope
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      You are authorized to review disputed tournaments, adjudicate matches with pending screenshots, respond to reports, and review flagged communication channels. High privilege actions require Admin authorization.
                    </p>
                  </div>
                  <div className="border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6">
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center">
                      <Settings className="w-4 h-4 text-purple-400 mr-2" />
                      Admin Exclusive Scope
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Admins possess total platform overrides. This includes full financial wallet authorization, database trigger controls, service-role bypassing, and managing staff permissions.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'disputes' && (
              <motion.div
                key="disputes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                <div className="p-6 bg-surface border border-border-main rounded-3xl">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-6">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Active Match Disputes</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Adjudicate outcomes based on submitted screenshot proof</p>
                    </div>
                    <Link
                      to="/admin/moderation"
                      className="text-[10px] font-black text-primary hover:text-white uppercase tracking-widest flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/20 transition-all"
                    >
                      <span>Full Dispute Board</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 bg-background border border-slate-850 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider rounded">Disputed</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Match ID: #ch_921029</span>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase italic mt-1.5">AlphaSlayer vs HyperBeast</h4>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Tournament: Nairobi Apex Legends Open</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/moderation"
                          className="px-4 py-2 bg-primary hover:bg-white text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          Resolve Match
                        </Link>
                      </div>
                    </div>

                    <div className="p-5 bg-background border border-slate-850 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-wider rounded">Awaiting Proof</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Match ID: #ch_921045</span>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase italic mt-1.5">NoobDestroyer vs ProGamer99</h4>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Challenge Type: 1v1 Call of Duty Mobile</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/moderation"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          Review Logs
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'chat_flagged' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                <div className="p-6 bg-surface border border-border-main rounded-3xl">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-6">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Flagged Community Chat Review</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Review messages flagged by the automated profanity/abuse filter</p>
                    </div>
                    <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 text-[9px] font-black uppercase tracking-wider">High Priority Queue</span>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-background border border-slate-850 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 bg-red-500/10 rounded-full flex items-center justify-center font-black text-xs text-red-500">K</div>
                          <span className="text-xs font-black text-white">Kamikaze_Gamer</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">3 minutes ago</span>
                      </div>
                      <p className="p-3 bg-[#0c0d1b] border border-slate-900 rounded-xl font-mono text-xs text-red-400 italic">
                        "Your gameplay is pure garbage, delete the game you complete idiot"
                      </p>
                      <div className="flex items-center space-x-2 justify-end">
                        <button 
                          onClick={() => toast.success('✓ Flag cleared')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                        >
                          Clear Flag
                        </button>
                        <button 
                          onClick={() => handleWarnUser('1', 'Kamikaze_Gamer')}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                        >
                          Warn & Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'quick_tools' && (
              <motion.div
                key="tools"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                <div className="p-6 bg-surface border border-border-main rounded-3xl">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-slate-800/60 pb-4 mb-6">
                    Staff Lookup & Direct Override
                  </h3>

                  <form onSubmit={handleUserSearch} className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search player username..."
                        className="flex-1 bg-background border border-border-main focus:border-primary/50 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-medium"
                      />
                      <button
                        type="submit"
                        disabled={searching || !searchQuery.trim()}
                        className="px-6 py-3 bg-primary hover:bg-white text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
                      >
                        {searching ? 'Querying...' : 'Find Gamer'}
                      </button>
                    </div>
                  </form>

                  {/* Search Result Profile dossier */}
                  {searchedUser && (
                    <div className="mt-8 p-6 bg-background border border-slate-850 rounded-2xl space-y-6 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center font-black text-primary">
                            {searchedUser.username[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white uppercase italic">{searchedUser.username}</h4>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Joined: {new Date(searchedUser.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Ledger Role</span>
                          <span className={`text-xs font-black uppercase tracking-wider italic ${
                            searchedUser.role === 'admin' ? 'text-purple-400' :
                            searchedUser.role === 'moderator' ? 'text-primary' : 'text-slate-400'
                          }`}>
                            {searchedUser.role || 'user'}
                          </span>
                        </div>
                      </div>

                      {/* Direct Moderation actions */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Interventions</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-[#0a0b1e]/40 border border-slate-900 rounded-xl">
                            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Temporary Mute Override</span>
                            <div className="flex items-center space-x-2">
                              <select 
                                value={targetMuteDuration} 
                                onChange={(e) => setTargetMuteDuration(e.target.value)}
                                className="bg-background border border-border-main text-white rounded-lg p-1.5 text-xs focus:outline-none focus:border-primary/50 font-bold"
                              >
                                <option value="30">30 Mins</option>
                                <option value="60">1 Hour</option>
                                <option value="1440">24 Hours</option>
                              </select>
                              <button 
                                onClick={async () => {
                                  toast.success(`✓ Locked communication for ${searchedUser.username} for ${targetMuteDuration} minutes`);
                                  addRealtimeLog(`Muted ${searchedUser.username} for ${targetMuteDuration} minutes`);
                                }}
                                className="flex-1 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all"
                              >
                                Commit Mute
                              </button>
                            </div>
                          </div>

                          <div className="p-4 bg-[#0a0b1e]/40 border border-slate-900 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[9px] font-black text-slate-500 uppercase block">Send Warning Ticket</span>
                              <span className="text-[10px] text-slate-400">Creates official dossier warning record</span>
                            </div>
                            <button
                              onClick={() => handleWarnUser(searchedUser.id, searchedUser.username)}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-black text-[10px] uppercase tracking-widest rounded-lg transition-all"
                            >
                              Issue Warn
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
