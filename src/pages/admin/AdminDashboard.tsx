import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Trophy, Users, Activity, Wallet, 
  Plus, Search, MoreVertical, Edit2, 
  Trash2, ExternalLink, ArrowUpRight,
  TrendingUp, Clock, Gamepad2, Radio
} from 'lucide-react';
import { Tournament } from '../../types/database';
import { Link } from 'react-router-dom';
import { formatCurrency, cn, getStorageUrl } from '../../lib/utils';
import { useRealtimeTournaments } from '../../hooks/useRealtimeTournaments';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activeTournaments: 0,
    pendingVerifications: 0,
    totalPrizePool: 0
  });
  const { tournaments, loading: tournamentsLoading } = useRealtimeTournaments();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, [tournaments]);

  async function loadAdminData() {
    try {
      const [players, results] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('match_results').select('*', { count: 'exact', head: true }).eq('status', 'submitted')
      ]);

      const pool = tournaments.reduce((acc, curr) => acc + (curr.prize_pool || 0), 0);

      setStats({
        totalPlayers: (players as any)?.count || 0,
        activeTournaments: (tournaments || []).filter(t => t?.status === 'ongoing').length,
        pendingVerifications: (results as any)?.count || 0,
        totalPrizePool: pool || 0
      });
    } catch (err) {
      console.error('Error loading admin stats:', err);
    } finally {
      setLoading(false);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
