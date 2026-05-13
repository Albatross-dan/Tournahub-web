import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { storageService } from '../../services/storageService';
import { supabase } from '../../lib/supabase';
import { Upload, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import LoadingState from '../ui/LoadingState';

interface SubmitResultFormProps {
  matchId: string;
  currentUserId: string;
  onSuccess?: () => void;
}

export default function SubmitResultForm({ matchId, currentUserId, onSuccess }: SubmitResultFormProps) {
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMatchVerified, setIsMatchVerified] = useState(false);

  useEffect(() => {
    checkExistingResult();
  }, [matchId]);

  async function checkExistingResult() {
    try {
      const { data, error } = await supabase
        .from('match_results')
        .select('*')
        .eq('match_id', matchId)
        .eq('status', 'verified')
        .maybeSingle();

      if (data) setIsMatchVerified(true);
    } catch (err) {
      console.error('Error checking match status:', err);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot must be smaller than 5MB');
        return;
      }
      setScreenshot(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshot) return setError('Please upload a screenshot for verification');
    
    setLoading(true);
    setError(null);

    try {
      // 1. Upload screenshot using service
      const screenshotPath = await storageService.uploadScreenshot(screenshot);

      // 2. Submit result via RPC-based service
      await matchService.submitResult(matchId, currentUserId, score1, score2, screenshotPath);

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit result');
    } finally {
      setLoading(false);
    }
  };

  if (isMatchVerified) {
    return (
      <div className="card p-8 text-center bg-emerald-500/5 border-emerald-500/20">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Result Verified</h3>
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-2">The official score has been locked for this match.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="card p-12 text-center bg-primary/5 border-primary/20">
        <LoadingState message="Verification Protocol..." />
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-6">Awaiting human authority for match clearance.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card p-6 bg-zinc-900 border-zinc-800 shadow-2xl"
    >
      <div className="flex items-center space-x-3 mb-6 border-b border-zinc-800 pb-4">
        <Upload className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Submit Match Result</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-8 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Home Score</label>
            <input 
              type="number" 
              value={score1}
              onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
              className="w-full bg-black border-2 border-zinc-800 rounded-xl px-4 py-4 text-3xl font-black text-white italic text-center focus:border-primary transition-colors outline-none"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Away Score</label>
            <input 
              type="number" 
              value={score2}
              onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
              className="w-full bg-black border-2 border-zinc-800 rounded-xl px-4 py-4 text-3xl font-black text-white italic text-center focus:border-primary transition-colors outline-none"
              min="0"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Upload Screenshot (Proof)</label>
          <div className="relative group">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={cn(
              "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all",
              screenshot ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-800 group-hover:border-zinc-600 bg-black/40"
            )}>
              {screenshot ? (
                <div className="flex items-center space-x-3 text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-bold text-sm truncate max-w-[200px]">{screenshot.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-primary transition-colors" />
                  <p className="text-zinc-500 text-xs font-bold uppercase">Drop JPG/PNG proof here</p>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-sm font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-4 text-lg font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Confirm Submission'}
        </button>
      </form>
    </motion.div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
