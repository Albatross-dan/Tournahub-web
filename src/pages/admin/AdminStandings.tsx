import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Trophy, Search, TrendingUp, BarChart3,
  ChevronRight, FilterIcon, RefreshCcw, Star
} from 'lucide-react';
import { cn } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';

export default function AdminStandings() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchStandings(selectedTournament);
    }
  }, [selectedTournament]);

  async function fetchTournaments() {
    try {
      const { data, error } = await (supabase as any)
        .from('tournaments')
        .select('*')
        .eq('type', 'league')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTournaments(data || []);
      if (data && (data as any[]).length > 0) setSelectedTournament((data as any[])[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStandings(id: string) {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('league_standings')
        .select('*')
        .eq('tournament_id', id)
        .order('points', { ascending: false })
        .order('goal_difference', { ascending: false });
      
      if (error) throw error;
      setStandings(data || []);
    } catch (err) {
      console.error('Error fetching standings:', err);
      // Fallback if view doesn't exist or error - manual calculation would go here if needed
      setStandings([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Strategic <span className="text-primary italic">Standings</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Real-time League Table Analysis</p>
          </div>

          <div className="flex items-center space-x-4">
            <select 
              value={selectedTournament || ''} 
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl px-6 py-4 font-black uppercase italic tracking-tighter outline-none focus:border-primary/50"
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              {tournaments.length === 0 && <option value="">No Active Leagues</option>}
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Processing League Points & Data Sets..." />
        ) : (
          <div className="card overflow-hidden border-white/5 bg-surface/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-900/50 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center w-20">Rank</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Operative</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">Played</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">W</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">D</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">L</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">GD</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {standings.map((row, index) => (
                    <tr key={row.user_id} className={cn(
                      "group hover:bg-white/5 transition-all duration-300",
                      index < 4 ? "bg-primary/5" : ""
                    )}>
                      <td className="px-6 py-6 text-center">
                        <span className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm italic mx-auto",
                          index === 0 ? "bg-primary text-slate-900 scale-110 shadow-lg shadow-primary/30" : 
                          index < 4 ? "bg-slate-800 text-primary border border-primary/20" : 
                          "bg-slate-900 text-slate-500 border border-slate-800"
                        )}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-primary font-black group-hover:border-primary/30 transition-colors">
                            {(row.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{row.username || 'Anonymous'}</span>
                            {index === 0 && <span className="text-[8px] text-primary font-black uppercase tracking-widest flex items-center mt-0.5"><Star size={8} className="mr-1 fill-primary" /> Top Seed</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center font-mono text-slate-400 font-black">{row.played || 0}</td>
                      <td className="px-6 py-6 text-center font-mono text-emerald-500 font-bold">{row.won || 0}</td>
                      <td className="px-6 py-6 text-center font-mono text-blue-400 font-bold">{row.drawn || 0}</td>
                      <td className="px-6 py-6 text-center font-mono text-red-500 font-bold">{row.lost || 0}</td>
                      <td className="px-6 py-6 text-center font-mono text-slate-300 font-bold italic">{row.goal_difference || 0}</td>
                      <td className="px-6 py-6 text-center">
                        <span className="text-xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{row.points || 0}</span>
                      </td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-24 text-center ">
                        <div className="flex flex-col items-center space-y-4">
                          <TrendingUp className="w-12 h-12 text-slate-800" />
                          <p className="text-slate-600 font-black uppercase tracking-widest italic text-xs">No personnel data logged for this operation yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
