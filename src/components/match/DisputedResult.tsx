import React from 'react';
import { AlertTriangle, ShieldAlert, Users, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import StorageImage from '../common/StorageImage';
import GuideTip from '../../guide/GuideTip';

interface DisputedResultProps {
  submissions: any[];
  matchId: string;
  tournamentId?: string;
}

export function DisputedResult({ submissions, matchId, tournamentId }: DisputedResultProps) {
  return (
    <div className="bg-zinc-900 border border-red-500/30 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
      <div className="bg-red-600 px-4 py-3 sm:py-4 flex items-center gap-3 text-white">
        <div className="w-8 h-8 bg-black/20 rounded-lg flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black italic uppercase tracking-wider leading-none">Score Conflict</h3>
          <p className="text-white/80 font-bold uppercase tracking-wider text-[10px] mt-0.5 truncate">
            An admin will review both submissions
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <GuideTip id="disputes" />

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-3">
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-[10px] font-bold text-zinc-300 leading-tight">
            Scores submitted by both players do not match. An automated dispute ticket has been generated for admin review.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {submissions.map((sub, idx) => (
            <div key={sub.id} className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl space-y-2.5 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <span className="text-xs font-black uppercase text-white truncate">
                    {sub.username || `Player ${idx + 1}`}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500">#{idx + 1}</span>
              </div>

              <div className="flex items-center justify-center py-2 bg-zinc-900 border border-zinc-800/80 rounded-lg">
                <span className="text-2xl sm:text-3xl font-black italic tracking-tight text-white tabular-nums">
                  {(sub.player1_score ?? sub.score1) ?? 0} – {(sub.player2_score ?? sub.score2) ?? 0}
                </span>
              </div>

              {sub.screenshot_url && (
                <div className="aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                  <StorageImage 
                    bucket="result-screenshots" 
                    path={sub.screenshot_url} 
                    alt="Proof" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-zinc-800">
          <Link 
            to={tournamentId ? `/tournaments/${tournamentId}` : "/tournaments"}
            className="w-full h-11 bg-white text-black rounded-xl flex items-center justify-center font-black uppercase italic tracking-wider hover:bg-primary transition-all active:scale-95 text-xs"
          >
            Back to Tournament
          </Link>
        </div>
      </div>
    </div>
  );
}
