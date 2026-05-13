import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Users, Search, Shield, ShieldOff, 
  Wallet, Mail, Calendar, MoreVertical,
  Activity, ArrowUpRight, Ban, CheckCircle2
} from 'lucide-react';
import { formatCurrency, cn, getPublicIdentity } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';

export default function AdminPlayers() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, wallets(balance)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleBan = async (id: string, currentStatus: string) => {
    const newRole = currentStatus === 'banned' ? 'player' : 'banned';
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ role: newRole })
        .eq('id', id);
      
      if (error) throw error;
      setPlayers(players.map(p => p.id === id ? { ...p, role: newRole } : p));
    } catch (err) {
      alert('Failed to update player status');
    }
  };

  const filtered = players.filter(p => 
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Contender <span className="text-primary italic">Database</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Registry and Access Authority</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Query by username, unique ID, or clearance level..." 
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white font-bold placeholder:text-slate-700 outline-none focus:border-primary/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card overflow-hidden border-white/5 bg-surface/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Contender</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">Clearance</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-right">Balance</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-24">
                      <LoadingState message="Deciphering Identity Records..." />
                    </td>
                  </tr>
                ) : filtered.map((player) => (
                  <tr key={player.id} className="group hover:bg-white/5 transition-all duration-300">
                    <td className="px-6 py-6">
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-primary font-black text-xl group-hover:border-primary/30 transition-colors">
                          {(player.username || 'U')[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">{getPublicIdentity(player)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <span className={cn(
                         "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border italic",
                         player.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 
                         player.role === 'banned' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                         'bg-slate-800 text-slate-500 border-slate-700'
                       )}>
                         {player.role || 'Player'}
                       </span>
                    </td>
                    <td className="px-6 py-6 text-right font-mono">
                      <span className="text-sm font-black text-emerald-400 italic tracking-tighter">
                        {formatCurrency(player.wallets?.[0]?.balance || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => toggleBan(player.id, player.role)}
                          disabled={player.role === 'admin'}
                          className={cn(
                            "p-3 rounded-xl transition-all border disabled:opacity-30 disabled:cursor-not-allowed",
                            player.role === 'banned' 
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/10"
                              : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/10"
                          )}
                          title={player.role === 'banned' ? "Revoke Ban" : "Authorize Ban"}
                        >
                          {player.role === 'banned' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button className="p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700/50">
                          <Wallet className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
