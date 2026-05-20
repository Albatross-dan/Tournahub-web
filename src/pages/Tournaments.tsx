import React, { useState } from 'react';
import { Tournament } from '../types/database';
import Shell from '../components/layout/Shell';
import { Link } from 'react-router-dom';
import { Trophy, Users, Search, Calendar, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { formatCurrency, getStorageUrl, cn } from '../lib/utils';
import { useRealtimeTournaments } from '../hooks/useRealtimeTournaments';
import { useUserRegistrations } from '../hooks/useUserRegistrations';
import { motion, AnimatePresence } from 'motion/react';
import LoadingState from '../components/ui/LoadingState';
import StatusBadge from '../components/ui/StatusBadge';
import { TournamentStatus } from '../constants';

export default function Tournaments() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'registration_open' | 'ongoing' | 'completed'>('all');
  const { tournaments, loading } = useRealtimeTournaments('all', 24); 
  const { userRegistrations } = useUserRegistrations();

  const filteredTournaments = (tournaments || []).filter(t => {
    const matchesSearch = (t.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === 'all') return true;
    
    const status = (t.status || '').toLowerCase();
    
    if (filter === 'registration_open') {
      return status === TournamentStatus.REGISTRATION_OPEN;
    }
    if (filter === 'ongoing') {
      return status === TournamentStatus.ONGOING || status === 'live' || status === 'ongoing';
    }
    if (filter === 'completed') {
      return status === TournamentStatus.COMPLETED || status === 'finished';
    }
    return true;
  });

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-3xl font-black text-text-main uppercase italic tracking-tighter">Tournaments</h1>
          
          <div className="flex items-center space-x-2 bg-surface p-1 rounded-xl border border-border-main">
            {[
              { id: 'all', label: 'All' },
              { id: 'registration_open', label: 'Open' },
              { id: 'ongoing', label: 'Live' },
              { id: 'completed', label: 'Final' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === f.id ? "bg-primary text-slate-900" : "text-text-muted hover:text-text-main"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <Search className="w-5 h-5 text-primary group-focus-within:scale-110 transition-transform" />
          </div>
          <input
            type="text"
            placeholder="Search tournaments, game typ..."
            className="w-full bg-surface border border-border-main rounded-3xl py-6 pl-20 pr-6 text-text-main font-bold placeholder:text-text-muted focus:border-primary/50 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-6">
           <div className="inline-flex items-center space-x-3 px-6 py-4 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-2xl">
              <div className="w-2 h-2 bg-[#0ea5e9] rounded-full animate-pulse" />
              <span className="text-sm font-black text-[#0ea5e9] uppercase tracking-widest italic">
                Available Tournaments ({filteredTournaments.length})
              </span>
           </div>

           <div className="flex items-center space-x-2">
             <span className="text-[12px] font-bold text-text-muted uppercase tracking-widest">{filteredTournaments.length} Tournaments</span>
             <div className="flex items-center text-[10px] text-text-muted opacity-60 font-bold uppercase tracking-widest ml-4">
                <RefreshCw className="w-3 h-3 mr-2 animate-spin-slow" />
                Last updated just now
             </div>
           </div>

           {loading ? (
             <LoadingState message="Scanning Circuits..." />
           ) : (
             <div className="space-y-6">
                {filteredTournaments.map((tournament) => (
                  <TournamentCard 
                    key={tournament.id} 
                    tournament={tournament} 
                    isJoined={userRegistrations.has(tournament.id)}
                  />
                ))}
             </div>
           )}
        </div>
      </div>
    </Shell>
  );
}

function TournamentCard({ tournament, isJoined }: { tournament: Tournament; isJoined?: boolean; key?: string }) {
  const bannerUrl = tournament.banner_url ? getStorageUrl('tournament-banners', tournament.banner_url) : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800';
  const regCount = typeof (tournament as any).registrations_count === 'object' 
    ? (tournament as any).registrations_count?.count ?? 0 
    : (tournament as any).registrations_count ?? 0;

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block card bg-surface border-border-main hover:border-primary/30 transition-all duration-300 group overflow-hidden shadow-sm">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
        <img 
          src={bannerUrl} 
          alt="" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        
        <div className="absolute top-6 left-6 flex items-center space-x-2">
          <span className="px-4 py-1.5 bg-[#d4e157] text-slate-900 text-[10px] font-black rounded-full uppercase tracking-widest shadow-md">
            {tournament.type.toUpperCase()}
          </span>
          <StatusBadge status={tournament.status} />
        </div>

        {!tournament.banner_url && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
             <div className="w-16 h-16 bg-surface/50 backdrop-blur-md rounded-2xl border border-border-main flex items-center justify-center shadow-lg">
                <ImageIcon className="w-8 h-8 text-text-muted opacity-50" />
             </div>
          </div>
        )}
      </div>

      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-3xl font-black text-text-main italic uppercase tracking-tighter leading-none group-hover:text-primary transition-colors">
              {tournament.name}
           </h3>
           {isJoined && (
             <div className="bg-[#d4e157]/20 border border-[#d4e157]/30 px-5 py-2 rounded-xl text-text-main text-xs font-black uppercase tracking-widest italic animate-in fade-in zoom-in duration-300">
                Joined
             </div>
           )}
        </div>

        <div className="grid grid-cols-3 gap-8 py-4 border-y border-border-main">
           <div className="space-y-1">
              <div className="flex items-center text-primary space-x-2">
                 <Trophy className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Prize Pool</span>
              </div>
              <p className="text-lg font-black text-text-main italic tracking-tighter uppercase leading-none mt-1">
                {tournament.prize_pool ? formatCurrency(tournament.prize_pool) : 'N/A'}
              </p>
           </div>
           <div className="space-y-1">
              <div className="flex items-center text-primary space-x-2">
                 <div className="w-4 h-4 bg-primary/20 text-primary rounded-full flex items-center justify-center text-[10px] font-black">$</div>
                 <span className="text-[10px] font-bold uppercase tracking-widest">Entry Fee</span>
              </div>
              <p className="text-lg font-black text-text-main italic tracking-tighter uppercase leading-none mt-1">
                {tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free'}
              </p>
           </div>
           <div className="space-y-1">
              <div className="flex items-center text-primary space-x-2">
                 <Users className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Contenders</span>
              </div>
              <p className="text-lg font-black text-text-main italic tracking-tighter uppercase leading-none mt-1">
                {String(regCount)}/{tournament.max_players}
              </p>
           </div>
        </div>

        <div className="flex items-center justify-between pt-2">
           <p className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] italic">
             {String(regCount)} of {tournament.max_players} contenders joined
           </p>
           <div className="text-primary text-xs font-black uppercase tracking-widest italic">
             {(tournament.max_players || 0) - Number(regCount)} available
           </div>
        </div>
      </div>
    </Link>
  );
}

function StatMini({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">{label}</p>
      <div className="flex items-center text-sm font-black text-text-main italic truncate">
        <div className="w-4 flex justify-center mr-2 opacity-80">{icon}</div>
        {value}
      </div>
    </div>
  );
}
