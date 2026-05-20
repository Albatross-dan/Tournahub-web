import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { matchService } from '../../services/matchService';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Gamepad2, Search, Trophy, FilterIcon, 
  Play, CheckCircle2, ChevronRight,
  Zap, Save, RefreshCcw, User as UserIcon,
  Eye, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { formatCurrency, cn, getSignedUrl, getPublicIdentity } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';
import StorageImage from '../../components/common/StorageImage';

export default function AdminFixtures() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchMatches(selectedTournament);
    } else {
      setMatches([]);
    }
  }, [selectedTournament]);

  async function fetchTournaments() {
    try {
      const { data, error } = await supabase
        .from('v_tournaments_with_creator')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTournaments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMatches(id: string) {
    setLoading(true);
    try {
      const data = await matchService.getByTournament(id);
      setMatches(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = async () => {
    if (!selectedTournament) return;
    const t = tournaments.find(x => x.id === selectedTournament);
    if (!t) return;

    setBusy(true);
    try {
      await matchService.generateFixtures(selectedTournament, t.type || 'round_robin');
      fetchMatches(selectedTournament);
    } catch (err: any) {
      alert(err.message || 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const updateScore = async (matchId: string, s1: number, s2: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    
    const winnerId = s1 > s2 ? match.player1.id : 
                     s2 > s1 ? match.player2.id : null;
    
    if (!winnerId && s1 === s2) {
      alert('Draws are not supported for verification yet. Please set a winner.');
      return;
    }

    setBusy(true);
    try {
      await (matchService as any).verifyResult(matchId, winnerId, s1, s2);
      await fetchMatches(selectedTournament!);
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Fixture <span className="text-primary italic">Engine</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Match Generation and Score Validation</p>
          </div>

          <div className="flex items-center space-x-4">
            <select 
              value={selectedTournament || ''} 
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl px-6 py-4 font-black uppercase italic tracking-tighter outline-none focus:border-primary/50"
            >
              <option value="">Select Tournament</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {selectedTournament && matches.length === 0 && (
              <button 
                onClick={handleGenerate}
                disabled={busy}
                className="btn-primary px-8 py-4 flex items-center group disabled:opacity-50"
              >
                <Zap className="w-5 h-5 mr-3 stroke-[3px] group-hover:animate-pulse" />
                Generate
              </button>
            )}
          </div>
        </div>

        {!selectedTournament ? (
          <div className="card p-20 text-center space-y-6 border-dashed border-2 border-slate-800">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-700">
              <Gamepad2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">No Operation Selected</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Select a tournament from the decrypted logs above to view fixtures.</p>
            </div>
          </div>
        ) : loading ? (
          <LoadingState message="Scanning Encrypted Fixture Logs..." />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => (
                <FixtureCard 
                  key={match.id} 
                  match={match} 
                  onUpdate={updateScore}
                />
              ))}
            </div>
            {matches.length === 0 && (
              <div className="card p-20 text-center border-dashed border-2 border-slate-800">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No matches have been deployed for this operation yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function FixtureCard({ match, onUpdate }: { match: any; onUpdate: (id: string, s1: number, s2: number) => Promise<void> | void; key?: any }) {
  const [s1, setS1] = useState(match.score1 || 0);
  const [s2, setS2] = useState(match.score2 || 0);
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchResult();
  }, [match.id]);

  const fetchResult = async () => {
    const { data } = await (supabase as any)
      .from('match_results')
      .select('*, profiles:submitted_by(username)')
      .eq('match_id', match.id)
      .maybeSingle();
    
    if (data) {
      setResult({
        ...data,
        submitter_username: data.profiles?.username
      });
    }
  };

  return (
    <div className={cn(
      "card p-6 border-white/5 bg-surface/20 hover:border-primary/20 transition-all",
      match.status === 'completed' ? 'opacity-80' : ''
    )}>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Round {match.round} • {match.stage?.replace('_', ' ')}</span>
        {match.status === 'completed' ? (
          <div className="flex items-center text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
          </div>
        ) : result ? (
          <div className="flex items-center text-amber-500 text-[10px] font-black uppercase tracking-widest italic">
            <Play className="w-3 h-3 mr-1" /> Pending Proof
          </div>
        ) : (
          <div className="flex items-center text-blue-500 text-[10px] font-black uppercase tracking-widest italic">
            <Play className="w-3 h-3 mr-1" /> Pending Submission
          </div>
        )}
      </div>

      <div className="space-y-4">
        {[
          { id: match.player1?.id, profile: match.player1, score: s1, setScore: setS1, isWinner: match.winner === match.player1?.id },
          { id: match.player2?.id, profile: match.player2, score: s2, setScore: setS2, isWinner: match.winner === match.player2?.id }
        ].map((p, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border transition-all",
                p.isWinner ? "bg-primary/20 text-primary border-primary/30" : "bg-slate-900 text-slate-500 border-slate-800"
              )}>
                {(getPublicIdentity(p.profile) || 'U')[0].toUpperCase()}
              </div>
              <span className={cn(
                "text-sm font-black uppercase tracking-tight truncate max-w-[120px]",
                p.isWinner ? "text-primary" : "text-white"
              )}>
                {getPublicIdentity(p.profile)}
              </span>
            </div>
            
            {editing ? (
              <input 
                type="number" 
                value={p.score} 
                onChange={(e) => p.setScore(parseInt(e.target.value) || 0)}
                className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-black text-white outline-none focus:border-primary"
              />
            ) : (
              <span className="text-xl font-black text-white italic">{p.score}</span>
            )}
          </div>
        ))}
      </div>

      {result && (
        <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5 space-y-2 text-center">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Submitted Scores: {result.player1_score} - {result.player2_score}</p>
          {result.screenshot_url && (
            <div className="relative group">
              <StorageImage 
                bucket="result-screenshots" 
                path={result.screenshot_url} 
                className="w-full aspect-video rounded-lg border border-white/5 object-cover grayscale group-hover:grayscale-0 transition-all" 
                alt="Proof" 
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                <span className="text-[10px] font-black text-white uppercase italic">Click to zoom in admin tools</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
        {editing ? (
          <div className="flex space-x-2">
            <button 
              onClick={() => { setEditing(false); onUpdate(match.id, s1, s2); }}
              className="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all"
            >
              <Save size={16} />
            </button>
            <button 
              onClick={() => setEditing(false)}
              className="p-2 bg-slate-800 text-slate-500 rounded-lg hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setEditing(true)}
            className="text-[10px] font-black text-primary uppercase tracking-widest italic hover:underline"
          >
            Review Entry
          </button>
        )}
      </div>
    </div>
  );
}

import { X } from 'lucide-react';
