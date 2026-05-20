
import React, { useState, useEffect } from 'react';
import { useRefetchOnFocus } from '../contexts/AuthContext';
import { walletService } from '../services/walletService';
import Shell from '../components/layout/Shell';
import { Trophy, Calendar, Medal, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { formatCurrencyDynamic, formatDate, cn } from '../lib/utils';
import LoadingState from '../components/ui/LoadingState';
import { WinRecord } from '../types/finance';
import { Link } from 'react-router-dom';

export default function WinnerHistory() {
  const isInitialLoad = React.useRef(true);
  useRefetchOnFocus(loadWins);
  const [wins, setWins] = useState<WinRecord[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWins();
  }, []);

  async function loadWins() {
    try {
      if (isInitialLoad.current) {
        setLoading(true);
      }
      const data = await walletService.getWinnerHistory();
      setWins(data.wins);
      setUsername(data.username);
    } catch (err) {
      console.error('Win history load error:', err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }

  if (loading) return (
    <Shell>
      <LoadingState message="Fetching Hall of Fame..." />
    </Shell>
  );

  return (
    <Shell>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              {username ? `${username}'s Winner History` : 'Winner History'}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Your tournament glory and rewards</p>
          </div>
          <div className="bg-primary/20 border border-primary/30 px-4 py-2 rounded-xl flex items-center space-x-3">
             <Trophy className="w-5 h-5 text-primary" />
             <span className="text-xl font-black text-white italic tracking-tighter">{wins.length} Victories</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {wins.length > 0 ? (
            wins.map((win) => (
              <WinCard key={win.prize_id} win={win} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center card bg-[#1c1f3e] border-white/5 space-y-6">
               <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800 shadow-2xl">
                 <Medal className="w-12 h-12 text-slate-700" />
               </div>
               <div className="space-y-2">
                 <p className="text-slate-400 font-black uppercase italic tracking-tighter text-xl">The Stage is Waiting</p>
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">You haven't won any tournaments yet. Enter one to compete for prizes!</p>
               </div>
               <Link to="/tournaments" className="inline-flex items-center space-x-2 bg-primary text-black px-6 py-3 rounded-xl font-black uppercase italic tracking-tighter hover:bg-primary-dark transition-all">
                 <span>Find Tournaments</span>
                 <ArrowRight className="w-4 h-4" />
               </Link>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

interface WinCardProps {
  win: WinRecord;
  key?: React.Key;
}

function WinCard({ win }: WinCardProps) {
  return (
    <div className="card bg-[#0a0b1e] border-white/5 overflow-hidden group hover:border-primary/30 transition-all shadow-xl">
       <div className="relative h-40 overflow-hidden">
          {win.banner_url ? (
            <img src={win.banner_url} alt={win.tournament_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-[#1c1f3e] flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-slate-800" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b1e] to-transparent" />
          <div className="absolute top-4 right-4">
             <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-lg text-white font-black uppercase italic tracking-widest text-[10px]">
                {win.tournament_type}
             </div>
          </div>
          <div className="absolute bottom-4 left-4 flex items-center space-x-2">
             <span className="text-2xl">{win.position_label.split(' ')[0]}</span>
             <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">{win.tournament_name}</h3>
          </div>
       </div>

       <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
             <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Prize Awarded</p>
                <div className="text-2xl font-black text-primary italic tracking-tighter leading-none">
                  ${win.prize_amount_usd.toFixed(2)} USD
                </div>
             </div>
             <div className="text-right space-y-1">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Date Won</p>
                <div className="flex items-center justify-end space-x-1.5 text-slate-300 font-bold text-xs uppercase tracking-tighter">
                   <Calendar className="w-3.5 h-3.5" />
                   <span>{formatDate(win.date_won)}</span>
                </div>
             </div>
          </div>

          <Link 
            to={`/tournaments/${win.tournament_id}`}
            className="flex items-center justify-between w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-black uppercase italic tracking-tighter text-xs"
          >
            <span>Platform Recap</span>
            <ArrowRight className="w-4 h-4 text-primary" />
          </Link>
       </div>
    </div>
  );
}
