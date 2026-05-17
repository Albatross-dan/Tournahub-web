import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { storageService } from '../../services/storageService';
import { supabase } from '../../lib/supabase';
import { Upload, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import LoadingState from '../ui/LoadingState';

import VerificationStatusWidget from './VerificationStatusWidget';
import { MatchVerificationState } from '../../types/verification';

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
  const [verificationState, setVerificationState] = useState<MatchVerificationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const hasAlreadySubmitted = verificationState?.submissions.some(s => s.submitted_by === currentUserId);
  const isFinalised = verificationState?.locked || 
                      verificationState?.verification_status === 'verified' || 
                      verificationState?.verification_status === 'matched';

  useEffect(() => {
    loadState();
  }, [matchId]);

  async function loadState() {
    try {
      setInitialLoading(true);
      const data = await matchService.getMatchVerificationState(matchId);
      setVerificationState(data);
    } catch (err) {
      console.error('Error loading verification state:', err);
    } finally {
      setInitialLoading(false);
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
    
    // Front-end validation
    if (score1 < 0 || score2 < 0) {
      return setError('Scores cannot be negative');
    }
    
    setLoading(true);
    setError(null);

    try {
      let screenshotPath = null;
      if (screenshot) {
        // 1. Upload screenshot
        screenshotPath = await storageService.uploadScreenshot(screenshot, matchId, currentUserId);
      }

      // 2. Submit result via RPC
      await matchService.submitResult(matchId, score1, score2, screenshotPath);

      if (onSuccess) onSuccess();
      await loadState();
    } catch (err: any) {
      console.error('Submission error:', err);
      // 8. Error handling map
      const errMsg = err.message || '';
      if (errMsg.includes('Match not found')) {
        setError('Match not found. Please refresh.');
      } else if (errMsg.includes('You are not a player')) {
        setError('Authorization error: You are not a player in this match.');
      } else if (errMsg.includes('Match status is')) {
        setError(`Invalid match status for submission: ${errMsg}`);
      } else if (errMsg.includes('already been finalised')) {
        setError('This match has already been finalised.');
      } else if (errMsg.includes('already submitted')) {
        setError('You have already submitted a result for this match.');
        loadState();
      } else if (errMsg.includes('Scores cannot be negative')) {
        setError('Scores cannot be negative.');
      } else if (errMsg.includes('Screenshot not found')) {
        setError('Evidence file lost during transmission. Please re-upload and retry.');
      } else {
        setError(errMsg || 'Transmission failure. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="card p-8 text-center bg-zinc-900 border-zinc-800">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Checking Submission Status...</p>
      </div>
    );
  }

  // If the user already submitted OR the match is finalised, show the VerificationStatusWidget
  if (hasAlreadySubmitted || isFinalised) {
    return (
      <VerificationStatusWidget 
        matchId={matchId} 
        onStateChange={setVerificationState}
      />
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
