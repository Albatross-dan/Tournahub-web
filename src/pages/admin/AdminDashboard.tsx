import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Trophy, Users, Activity, Wallet, Coins,
  Plus, Search, MoreVertical, Edit2, 
  Trash2, ExternalLink, ArrowUpRight,
  TrendingUp, Clock, Gamepad2, Radio,
  Shield, Gavel, ShieldAlert, FileText, UserCheck,
  Loader2, Wrench, Megaphone, AlertTriangle
} from 'lucide-react';
import { Tournament } from '../../types/database';
import { Link } from 'react-router-dom';
import { formatCurrency, cn, getStorageUrl } from '../../lib/utils';
import { useRealtimeTournaments } from '../../hooks/useRealtimeTournaments';
import { moderationService } from '../../services/moderationService';
import { platformService } from '../../services/platformService';
import { usePlatformStatus } from '../../contexts/PlatformStatusContext';
import { toast } from 'react-hot-toast';

function formatRelativeTime(isoString: string) {
  if (!isoString) return 'Never';
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDays}d ago`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activeTournaments: 0,
    pendingVerifications: 0,
    totalPrizePool: 0,
    totalPlatformRevenue: 0
  });

  // Maintenance & Announcement States
  const { status: globalStatus, checkStatus } = usePlatformStatus();
  const { user } = useAuth();
  
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndEstimate, setMaintenanceEndEstimate] = useState('');
  const [maintenanceScheduledAt, setMaintenanceScheduledAt] = useState('');
  
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfirmToggle, setShowConfirmToggle] = useState<boolean | null>(null); // true = confirm enable, false = confirm disable
  
  // Announcement states
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'high' | 'urgent'>('urgent');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Helper formats
  const toLocalInputFormat = (isoString: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (err) {
      return '';
    }
  };

  const toUTCISOString = (inputValue: string): string | null => {
    if (!inputValue) return null;
    try {
      const d = new Date(inputValue);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch (err) {
      return null;
    }
  };

  // Sync state with global polled state
  useEffect(() => {
    if (globalStatus) {
      setMaintenanceMode(globalStatus.maintenance_mode);
      setMaintenanceMessage(globalStatus.maintenance_message || '');
      setMaintenanceEndEstimate(toLocalInputFormat(globalStatus.maintenance_end_estimate));
      setMaintenanceScheduledAt(toLocalInputFormat(globalStatus.maintenance_scheduled_at));
    }
  }, [globalStatus]);
  const { tournaments, loading: tournamentsLoading } = useRealtimeTournaments();
  const [loading, setLoading] = useState(true);
  
  // Moderation summary states
  const [modSummary, setModSummary] = useState<any>(null);
  const [modLoading, setModLoading] = useState(true);

  useEffect(() => {
    const loadAllSequential = async () => {
      setLoading(true);
      // Load the most critical section first (moderation disputes/verifications summary)
      await loadModSummary();
      // Unblock UI immediately after the first priority fetch
      setLoading(false);

      // Then load other platform stats sequentially in the background
      await loadAdminStatsSeq();
    };
    loadAllSequential();
  }, [tournaments]);

  async function loadModSummary() {
    try {
      setModLoading(true);
      const data = await moderationService.getModerationSummary();
      setModSummary(data);
    } catch (err) {
      console.error('Error loading moderation summary:', err);
    } finally {
      setModLoading(false);
    }
  }

  async function loadAdminStatsSeq() {
    try {
      // Fetch stats sequentially rather than wrapping them in Promise.all to avoid blocking UI with multiple concurrent queries
      const playersRes = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const resultsRes = await supabase.from('match_results').select('*', { count: 'exact', head: true }).eq('status', 'submitted');
      const platformRevRes = await supabase.from('platform_revenue').select('amount_usd').eq('status', 'completed');

      const pool = tournaments.reduce((acc, curr) => acc + (curr.prize_pool || 0), 0);
      const totalRev = platformRevRes.data ? (platformRevRes.data as any[]).reduce((sum, r) => sum + (r.amount_usd || 0), 0) : 0;

      setStats({
        totalPlayers: (playersRes as any)?.count || 0,
        activeTournaments: (tournaments || []).filter(t => t?.status === 'ongoing').length,
        pendingVerifications: (resultsRes as any)?.count || 0,
        totalPrizePool: pool || 0,
        totalPlatformRevenue: totalRev
      });
    } catch (err) {
      console.error('Error loading admin stats sequentially:', err);
    }
  }

  const recentTournaments = Array.isArray(tournaments) ? tournaments.slice(0, 5) : [];


  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Control <span className="text-primary italic">Center</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-3 flex items-center">
              <Activity className="w-3 h-3 mr-2 text-primary animate-pulse" />
              Live Platform Metrics & Oversight
            </p>
          </div>
          <Link to="/admin/tournaments/create" className="group relative px-8 py-4 bg-primary text-slate-900 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:scale-105 hover:-rotate-1 active:scale-95 shadow-xl shadow-primary/20">
            <div className="flex items-center">
              <Plus className="w-5 h-5 mr-2 stroke-[3px]" />
              New Tournament
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <AdminStatCard 
            title="Total Contenders" 
            value={(stats.totalPlayers || 0).toLocaleString()} 
            icon={<Users />} 
            color="bg-blue-500/10 text-blue-400 border-blue-500/20"
            trend="+12% this week"
          />
          <Link to="/admin/tournaments" className="block h-full">
            <AdminStatCard 
              title="Active Operations" 
              value={(stats.activeTournaments || 0).toString()} 
              icon={<Trophy />} 
              color="bg-primary/10 text-primary border-primary/20"
              trend="View Deployment Registry"
            />
          </Link>
          <Link to="/admin/moderation" className="block h-full">
            <AdminStatCard 
              title="Approvals Required" 
              value={(stats.pendingVerifications || 0).toString()} 
              icon={<Activity />} 
              color="bg-amber-500/10 text-amber-400 border-amber-500/20"
              trend="Moderate Results"
            />
          </Link>
          <AdminStatCard 
            title="War Chest (Prizes)" 
            value={formatCurrency(stats.totalPrizePool || 0)} 
            icon={<Wallet />} 
            color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            trend="Locked & Ready"
          />
          <Link to="/admin/wallet" className="block h-full">
            <AdminStatCard 
              title="Platform Revenue" 
              value={formatCurrency(stats.totalPlatformRevenue || 0)} 
              icon={<Coins />} 
              color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              trend="Oversight Revenue"
            />
          </Link>
        </div>

        {/* User Moderation Section */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-red-500 rounded-full" />
            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">User Moderation</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AdminStatCard 
              title="Total Users" 
              value={modLoading ? "..." : (modSummary?.user_counts?.total ?? 0).toLocaleString()} 
              icon={<Users />} 
              color="bg-slate-800 text-slate-300 border-slate-700"
              trend="Global registered accounts"
            />
            <AdminStatCard 
              title="Active Users" 
              value={modLoading ? "..." : (modSummary?.user_counts?.active ?? 0).toLocaleString()} 
              icon={<UserCheck className="text-emerald-500" />} 
              color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              trend="Accounts in good standing"
            />
            <AdminStatCard 
              title="Banned Users" 
              value={modLoading ? "..." : (modSummary?.user_counts?.banned ?? 0).toLocaleString()} 
              icon={<ShieldAlert className="text-red-500" />} 
              color="bg-red-500/10 text-red-400 border-red-500/20"
              trend="Permanent disqualifications"
            />
            <AdminStatCard 
              title="Suspended Users" 
              value={modLoading ? "..." : (modSummary?.user_counts?.suspended ?? 0).toLocaleString()} 
              icon={<Clock className="text-amber-500" />} 
              color="bg-amber-500/10 text-amber-400 border-amber-500/20"
              trend="Temporary penalty box"
            />
          </div>

          {/* Recent Moderation Activity List */}
          <div className="card border-white/5 bg-surface/20 p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary animate-pulse" />
              Recent Moderation Activity Feed
            </h3>

            {modLoading ? (
              <div className="py-6 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">
                Syncing COMMS...
              </div>
            ) : modSummary?.recent_actions?.length > 0 ? (
              <div className="divide-y divide-slate-800/50">
                {modSummary.recent_actions.slice(0, 10).map((act: any) => {
                  let badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
                  const actionType = (act.action_type || '').toLowerCase();
                  if (['ban', 'banned'].includes(actionType)) {
                    badgeClass = 'bg-red-500/15 text-red-400 border-red-500/20';
                  } else if (['suspend', 'suspended'].includes(actionType)) {
                    badgeClass = 'bg-orange-500/15 text-orange-400 border-orange-500/20';
                  } else if (['restore', 'active'].includes(actionType)) {
                    badgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
                  } else if (['soft_delete', 'deleted'].includes(actionType)) {
                    badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
                  } else if (['permanent_delete'].includes(actionType)) {
                    badgeClass = 'bg-red-950 text-red-500 border-red-900';
                  } else if (['note'].includes(actionType)) {
                    badgeClass = 'bg-blue-500/15 text-blue-400 border-blue-500/20';
                  }

                  const reasonToShow = act.reason
                    ? act.reason.length > 60
                      ? act.reason.substring(0, 60) + '...'
                      : act.reason
                    : 'No reason provided';

                  return (
                    <div key={act.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-medium">
                      <div className="flex items-center space-x-3 flex-wrap gap-2">
                        <span className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md border", badgeClass)}>
                          {act.action_type?.toUpperCase() || 'ACTION'}
                        </span>
                        <span className="text-white font-bold">
                          {act.admin_username}
                        </span>
                        <span className="text-slate-500">targeted</span>
                        <span className="text-primary font-bold">
                          @{act.target_username}
                        </span>
                        <span className="text-slate-400 hidden md:inline">•</span>
                        <span className="text-slate-400 italic text-[11px]">
                          "{reasonToShow}"
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {formatRelativeTime(act.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-6 text-slate-500 font-bold uppercase tracking-widest text-xs">
                No recent moderation activity.
              </p>
            )}
          </div>
        </div>

        {/* PLATFORM CONFIGURATION & BROADCAST CONTROL CENTER */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Platform Configuration & Broadcasts</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CARD 1: Maintenance Control Panel */}
            <div className="card p-8 border-white/5 bg-slate-900/40 relative flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                      <span className="text-amber-500">🔧</span> Maintenance Mode Config
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Schedule downtime and restrict client entry
                    </p>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="text-right">
                    {!globalStatus ? (
                      <span className="text-xs text-slate-500 font-black animate-pulse uppercase tracking-wider">Syncing status...</span>
                    ) : globalStatus.maintenance_mode ? (
                      <span className="inline-flex items-center px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg animate-pulse">
                        🔴 MAINTENANCE ACTIVE
                      </span>
                    ) : globalStatus.upcoming_maintenance ? (
                      <span className="inline-flex items-center px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        🟡 SCHEDULED MAINTENANCE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        🟢 PLATFORM IS LIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub status subtitle */}
                <div className="p-3 bg-slate-950/40 rounded-xl border border-white/[0.02] text-xs font-semibold text-slate-400 mb-6">
                  {(!globalStatus) ? (
                    "Retrieving central configuration..."
                  ) : globalStatus.maintenance_mode ? (
                    "🔴 Maintenance Mode Active: non-admin users are blockaded from access."
                  ) : globalStatus.upcoming_maintenance ? (
                    `🟡 Scheduled maintenance warning active for ${globalStatus.maintenance_scheduled_at ? new Date(globalStatus.maintenance_scheduled_at).toLocaleString() : ''}`
                  ) : (
                    "🟢 Platform is Live: all users have full operational access."
                  )}
                </div>

                {/* Instant Toggle Control */}
                <div className="flex items-center justify-between p-4 bg-slate-950/20 rounded-2xl border border-white/5 mb-6">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">Operational Gate Toggle</span>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Instant override. Triggers confirmation dialog.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!user) return;
                      // Toggle action
                      setShowConfirmToggle(!maintenanceMode);
                    }}
                    className={cn(
                      "px-5 py-2.5 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all shadow-md cursor-pointer",
                      maintenanceMode 
                        ? "bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20" 
                        : "bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                    )}
                  >
                    {maintenanceMode ? "● Maintenance ON" : "● Live Mode"}
                  </button>
                </div>

                {/* Text Messages & Date inputs form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      Maintenance Message (Shown to users)
                    </label>
                    <textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      rows={3}
                      placeholder="TournaHub is currently undergoing scheduled maintenance..."
                      className="w-full bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        Estimated Back Online (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={maintenanceEndEstimate}
                        onChange={(e) => setMaintenanceEndEstimate(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        Schedule Warning Banner (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={maintenanceScheduledAt}
                        onChange={(e) => setMaintenanceScheduledAt(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save changes action */}
              <div className="mt-8 pt-6 border-t border-white/[0.03]">
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return;
                    setSavingConfig(true);
                    try {
                      // Save sequentially as requested: Message, EndEstimate, ScheduledAt
                      const resMsg = await platformService.setMaintenanceMessage(user.id, maintenanceMessage);
                      if (resMsg?.error) {
                        toast.error(`Message saving error: ${resMsg.error}`);
                        return;
                      }

                      const endEstimIso = toUTCISOString(maintenanceEndEstimate);
                      const resEnd = await platformService.setMaintenanceEndEstimate(user.id, endEstimIso);
                      if (resEnd?.error) {
                        toast.error(`End expectation saving error: ${resEnd.error}`);
                        return;
                      }

                      const schedAtIso = toUTCISOString(maintenanceScheduledAt);
                      const resSched = await platformService.setMaintenanceScheduledAt(user.id, schedAtIso);
                      if (resSched?.error) {
                        toast.error(`Schedule banner saving error: ${resSched.error}`);
                        return;
                      }

                      toast.success("✓ Platform status updated");
                      await checkStatus();
                    } catch (err: any) {
                      toast.error(err.message || "An exception occurred while updating configurations");
                    } finally {
                      setSavingConfig(false);
                    }
                  }}
                  disabled={savingConfig}
                  className="w-full relative group overflow-hidden rounded-2xl cursor-pointer disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-primary" />
                  <div className="relative h-12 flex items-center justify-center space-x-2">
                    {savingConfig ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                    ) : (
                      <span className="text-slate-900 text-xs font-black italic uppercase tracking-wider">
                        Save Maintenance Settings
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Custom Confirmation Modals for Toggle */}
              {showConfirmToggle !== null && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center rounded-[1.5rem]">
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/20 mb-4 animate-bounce">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black italic uppercase text-slate-100 tracking-wider mb-2">
                    Admin Confirmation Required
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold mb-6 max-w-xs leading-relaxed">
                    {showConfirmToggle 
                      ? "You are about to enable maintenance mode. All non-admin users will immediately see the maintenance screen and cannot use the app. Continue?" 
                      : "Are you sure you want to disable maintenance mode? All registered players will regain full real-time access to the platform."
                    }
                  </p>
                  <div className="flex space-x-3 w-full max-w-xs justify-center font-bold">
                    <button
                      onClick={() => setShowConfirmToggle(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!user) return;
                        const targetVal = showConfirmToggle;
                        setShowConfirmToggle(null);
                        setSavingConfig(true);
                        try {
                          const res = await platformService.setMaintenanceMode(user.id, targetVal);
                          if (res?.error) {
                            toast.error(`Toggle error: ${res.error}`);
                          } else {
                            toast.success(`✓ Maintenance mode is now ${targetVal ? 'ENABLED' : 'DISABLED'}`);
                            await checkStatus();
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Failed to toggle mode");
                        } finally {
                          setSavingConfig(false);
                        }
                      }}
                      className="px-4 py-2 bg-primary hover:opacity-90 text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      {showConfirmToggle ? "Enable Maintenance" : "Disable & Go Live"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: Send Announcement Section */}
            <div className="card p-8 border-white/5 bg-slate-900/40 relative flex flex-col justify-between">
              <div>
                <div className="space-y-1 mb-6">
                  <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                    <span className="text-blue-500">📢</span> Broadcast Messages
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Dispatch real-time notification alerts to all participants
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Title field */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      Announcement Title
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Maintenance Over / Huge Tournament Added..."
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1"
                    />
                  </div>

                  {/* Message field */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      Message Content
                    </label>
                    <textarea
                      maxLength={500}
                      rows={3}
                      placeholder="Please note that TournaHub has upgraded matches. Check out the latest lobbies..."
                      value={annBody}
                      onChange={(e) => setAnnBody(e.target.value)}
                      className="w-full bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1 resize-none"
                    />
                  </div>

                  {/* Priority Selector */}
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      Priority Level
                    </span>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {(['normal', 'high', 'urgent'] as const).map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => setAnnPriority(pr)}
                          className={cn(
                            "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-all",
                            annPriority === pr 
                              ? pr === 'urgent' 
                                ? 'bg-red-500/10 border-red-500/50 text-red-400 font-extrabold' 
                                : pr === 'high' 
                                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 font-extrabold'
                                  : 'bg-slate-700 border-slate-600 text-slate-200 font-extrabold'
                              : 'bg-slate-950/20 border-white/5 text-slate-400 hover:bg-white/5'
                          )}
                        >
                          {pr === 'urgent' ? '🚨 Urgent' : pr === 'high' ? '📢 High' : '🔔 Normal'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Interactive Preview Box */}
                  <div className="space-y-1 bg-slate-950/20 p-4 border border-white/[0.02] rounded-2xl">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Player Preview</span>
                    
                    {annPriority === 'normal' ? (
                      <p className="text-[11px] italic font-semibold text-slate-400 uppercase tracking-widest mt-1">
                        💭 Will appear in notification bell only.
                      </p>
                    ) : annPriority === 'high' ? (
                      <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-blue-200 rounded-lg text-xs font-semibold leading-normal">
                        📢 <strong className="text-blue-300 font-black uppercase tracking-wide">
                          {annTitle || 'Title Placeholder'}
                        </strong>: {annBody ? (annBody.length > 120 ? annBody.substring(0, 120) + '...' : annBody) : 'Truncated message content placeholder will sit here'}
                      </div>
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-200">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <h4 className="text-xs font-black italic uppercase text-red-400 tracking-wider">
                              🚨 {annTitle || 'Title Placeholder'}
                            </h4>
                            <p className="text-[11px] font-medium leading-relaxed text-red-300 mt-1">
                              {annBody || 'This is the full announcement message content. It does not suffer from truncation and is persistent until explicitly marked as read by the player.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Broadcast button */}
              <div className="mt-8 pt-6 border-t border-white/[0.03]">
                <button
                  type="button"
                  disabled={sendingAnnouncement || !annTitle || !annBody}
                  onClick={() => {
                    // Check validity
                    if (annTitle.trim().length < 3 || annTitle.trim().length > 100) {
                      toast.error("Title must be between 3 and 100 characters");
                      return;
                    }
                    if (annBody.trim().length < 10 || annBody.trim().length > 500) {
                      toast.error("Message must be between 10 and 500 characters");
                      return;
                    }
                    setShowConfirmSend(true);
                  }}
                  className="w-full relative group overflow-hidden rounded-2xl cursor-pointer disabled:opacity-40"
                >
                  <div className="absolute inset-0 bg-primary" />
                  <div className="relative h-12 flex items-center justify-center space-x-2">
                    {sendingAnnouncement ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                    ) : (
                      <span className="text-slate-900 text-xs font-black italic uppercase tracking-wider">
                        Send to All Users
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Confirmation pop-over for Sending */}
              {showConfirmSend && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center rounded-[1.5rem]">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center border border-blue-500/20 mb-4 animate-bounce">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black italic uppercase text-slate-100 tracking-wider mb-2">
                    Confirm Broadcast Distribution
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold mb-6 max-w-xs leading-relaxed">
                    Send this announcement to ALL registered users on TournaHub?<br />
                    Priority: <span className="text-primary font-black uppercase italic tracking-wider">{annPriority}</span>.<br />
                    <span className="text-red-400 font-bold">This operation cannot be unsent.</span>
                  </p>
                  <div className="flex space-x-3 w-full max-w-xs justify-center font-bold">
                    <button
                      onClick={() => setShowConfirmSend(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        setShowConfirmSend(false);
                        setSendingAnnouncement(true);
                        try {
                          await platformService.sendAnnouncement(annTitle.trim(), annBody.trim(), annPriority);
                          toast.success("✓ Announcement sent to all users");
                          // Clear the form
                          setAnnTitle('');
                          setAnnBody('');
                        } catch (err: any) {
                          toast.error(err.message || "Failed to broadcast announcement");
                        } finally {
                          setSendingAnnouncement(false);
                        }
                      }}
                      className="px-4 py-2 bg-primary hover:opacity-90 text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      Send Announcement
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Deployment Activity</h2>
              </div>
              <Link to="/admin/fixtures" className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline flex items-center group">
                All Results <ArrowUpRight className="ml-1 w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
            
            <div className="card overflow-hidden border-white/5 bg-surface/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Operation Intel</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none text-center">Status</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none text-right text-primary">Prize Feed</th>
                      <th className="px-6 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {recentTournaments.map((t, idx) => (
                      <tr key={t?.id || idx} className="group hover:bg-white/5 transition-all">
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                              {t?.banner_url ? (
                                <img 
                                  src={getStorageUrl('tournament-banners', t.banner_url)} 
                                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200';
                                  }}
                                />
                              ) : (
                                <Trophy className="w-4 h-4 text-slate-700" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-sm text-white uppercase tracking-tight group-hover:text-primary transition-colors">{t?.name || 'Untitled'}</span>
                              <span className="text-[10px] text-slate-600 font-mono italic">#{t?.id?.slice(0, 8) || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                            t?.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'
                          )}>
                            {t?.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="text-sm font-black text-emerald-400 italic tracking-tighter">
                            {formatCurrency(t?.prize_pool || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`/admin/tournaments/${t?.id}/manage`} className="p-2 hover:bg-primary/20 text-primary rounded-lg transition-colors" title="Manage Operations">
                              <TrendingUp className="w-4 h-4" />
                            </Link>
                            <Link to={`/admin/tournaments/${t?.id}`} className="p-2 hover:bg-white/10 text-slate-400 rounded-lg transition-colors" title="Edit Intel">
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {recentTournaments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-600 font-bold uppercase tracking-widest italic">
                          No active operations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
             <div className="space-y-4">
               <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Moderation Desk</h3>
               <div className="card p-6 bg-surface/40 border-amber-500/20 space-y-4 shadow-xl shadow-amber-500/5">
                 <div className="flex items-center space-x-3 text-amber-500">
                   <Clock className="w-5 h-5" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Queue</span>
                 </div>
                 <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-4xl font-black text-white italic tracking-tighter leading-none">{stats.pendingVerifications}</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Pending Result Validations</span>
                    </div>
                 </div>
                 <Link to="/admin/moderation" className="btn-primary w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary/80">
                   Enter Moderation Desk
                 </Link>
               </div>
             </div>

             <div className="card p-6 border-white/5 space-y-6 bg-slate-900/40">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Operations HQ</h4>
                <div className="space-y-3">
                  <AdminUtilLink to="/admin/moderation" icon={<Activity className="text-amber-500" />} label="Moderation HQ" />
                  <AdminUtilLink to="/admin/tournaments" icon={<Trophy />} label="Event Registry" />
                  <AdminUtilLink to="/admin/players" icon={<Users />} label="Contender List" />
                  <AdminUtilLink to="/admin/fixtures" icon={<Gamepad2 />} label="Results Engine" />
                  <AdminUtilLink to="/admin/standings" icon={<TrendingUp />} label="Intel Standings" />
                  <AdminUtilLink to="/admin/wallet" icon={<Wallet />} label="Financial Logs" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function AdminStatCard({ title, value, icon, color, trend }: { title: string; value: string; icon: React.ReactElement; color: string; trend: string }) {
  return (
    <div className="card p-8 border-white/5 bg-surface/30 group hover:border-white/10 transition-all overflow-hidden relative">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-primary/5 transition-colors" />
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border mb-6 transition-transform group-hover:scale-110", color)}>
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
      </div>
      <div className="space-y-1 relative z-10">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
        <div className="pt-3 flex items-center text-[9px] font-black uppercase tracking-[0.1em] text-primary/60">
          <TrendingUp className="w-3 h-3 mr-1.5" />
          {trend}
        </div>
      </div>
    </div>
  );
}

function AdminUtilLink({ to, icon, label }: { to: string; icon: React.ReactElement; label: string }) {
  return (
    <Link to={to} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all group border border-transparent hover:border-white/5">
      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:text-primary group-hover:border-primary/20 transition-all">
        {React.cloneElement(icon, { size: 16 })}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </Link>
  );
}
