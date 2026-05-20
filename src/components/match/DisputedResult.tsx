import React from 'react';
import { AlertTriangle, ShieldAlert, Users, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StorageImage from '../common/StorageImage';

interface DisputedResultProps {
  submissions: any[];
  matchId: string;
}

export function DisputedResult({ submissions, matchId }: DisputedResultProps) {
  return (
    <div className="bg-slate-900 border border-red-500/30 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
      <div className="bg-red-600 p-8 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
          <ShieldAlert className="w-10 h-10 text-white" />
        </div>
        <div>
          <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Conflict Detected</h3>
          <p className="text-white/80 font-bold uppercase tracking-widest text-[10px]">Signal Collision • Result Discrepancy Found</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start space-x-4">
          <div className="bg-orange-500/20 p-2 rounded-xl">
            <Info className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-white uppercase italic tracking-widest">Admin Extraction Required</h4>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
              Scores submitted by both operators do not match. An automated dispute ticket has been generated for admin review.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissions.map((sub, idx) => (
            <div key={sub.id} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4 relative overflow-hidden group">
              {/* Submission Number Decor */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-slate-900/50 rounded-full flex items-center justify-center">
                <span className="text-4xl font-black text-slate-800/10 italic">0{idx + 1}</span>
              </div>

              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-white block leading-tight">
                    {sub.username || `Operator ${idx + 1}`}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 block leading-tight">Submitted Score</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                <span className="text-5xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-lg">
                  {(sub.player1_score ?? sub.score1) ?? 0} – {(sub.player2_score ?? sub.score2) ?? 0}
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Intel Evidence</span>
                <div className="aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative group-hover:border-primary/30 transition-all">
                  <StorageImage 
                    bucket="result-screenshots" 
                    path={sub.screenshot_url} 
                    alt="Proof" 
                    className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-3 py-1 bg-primary text-black text-[8px] font-black uppercase tracking-widest rounded-lg">View Full Intel</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
            Establishing connection to Moderation HQ... No further action required.
          </p>
        </div>
      </div>
    </div>
  );
}
