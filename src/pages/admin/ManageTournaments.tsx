import React, { useState } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { Tournament } from '../../types/database';
import AdminShell from '../../components/layout/AdminShell';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, FilterIcon, 
  Edit3, Trash2, Eye,
  Play, CheckCircle, Clock, Trophy, Gamepad2,
  Calendar, Layers, MoreVertical, X
} from 'lucide-react';
import { formatCurrency, cn, getStorageUrl } from '../../lib/utils';
import { useRealtimeTournaments } from '../../hooks/useRealtimeTournaments';
import LoadingState from '../../components/ui/LoadingState';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ManageTournaments() {
  const [search, setSearch] = useState('');
  const { tournaments, loading } = useRealtimeTournaments();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await tournamentService.delete(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert(err.message || 'Delete failed: Have players already registered?');
      setConfirmDeleteId(null);
    }
  };

  const filtered = tournaments.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Manage <span className="text-primary italic">Events</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Strategic Tournament Lifecycle Management</p>
          </div>

          <Link to="/admin/tournaments/create" className="group relative px-8 py-4 bg-primary text-slate-900 rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20">
            <div className="flex items-center">
              <Plus className="w-5 h-5 mr-2 stroke-[3px]" />
              Deploy New Operation
            </div>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search by operation name, code, or deployment tag..." 
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white font-bold placeholder:text-slate-700 outline-none focus:border-primary/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="px-6 py-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-3 text-slate-400 hover:text-white transition-all">
            <FilterIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none pt-0.5">Filter Intel</span>
          </button>
        </div>

        <div className="card overflow-hidden border-white/5 bg-surface/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Operation Intel</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Format / Payload</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Prizes</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Status</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-24">
                      <LoadingState message="Fetching Global Tournament Repository..." />
                    </td>
                  </tr>
                ) : filtered.map((t) => (
                  <tr key={t.id} className="group hover:bg-white/5 transition-all duration-300">
                    <td className="px-6 py-6">
                      <div className="flex items-center space-x-5">
                        <div className="w-14 h-14 rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 flex-shrink-0 relative group-hover:border-primary/30 transition-colors">
                          {t.banner_url ? (
                            <img 
                              src={getStorageUrl('tournament-banners', t.banner_url)} 
                              className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" 
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900">
                              <Trophy className="w-6 h-6 text-slate-800 group-hover:text-primary transition-colors" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-tight mb-1">{t.name}</span>
                          <span className="text-[10px] text-slate-600 font-mono italic">#{t.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center text-xs font-black text-slate-300 uppercase tracking-tight">
                          <Layers className="w-3.5 h-3.5 mr-2 text-primary" />
                          {t.type.split('_').join(' ')}
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {t.max_players} Available Slots
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-mono">
                      <p className="text-sm font-black text-emerald-400 italic tracking-tighter">
                        {formatCurrency(t.prize_pool || 0)}
                      </p>
                    </td>
                    <td className="px-6 py-6">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                         {confirmDeleteId === t.id ? (
                           <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-2 duration-300">
                             <button 
                               onClick={() => handleDelete(t.id)}
                               className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
                             >
                               Confirm
                             </button>
                             <button 
                               onClick={() => setConfirmDeleteId(null)}
                               className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                             >
                               <X className="w-4 h-4" />
                             </button>
                           </div>
                         ) : (
                           <>
                             <Link to={`/admin/tournaments/${t.id}/manage`} className="p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all border border-primary/10" title="Manage Matches">
                               <Gamepad2 className="w-4 h-4 stroke-[2.5px]" />
                             </Link>
                             <Link to={`/admin/tournaments/${t.id}`} className="p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700/50" title="Edit">
                               <Edit3 className="w-4 h-4" />
                             </Link>
                             <button 
                               onClick={() => setConfirmDeleteId(t.id)} 
                               className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/10" 
                               title="Delete"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </>
                         )}
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
