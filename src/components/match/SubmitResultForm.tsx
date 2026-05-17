import React, { useState } from 'react';
import { CirclePlus, CircleMinus, Image as ImageIcon, XCircle, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface SubmitResultFormProps {
  matchId: string;
  submitterId: string;
  player1Id: string;
  player2Id: string;
  player1Username: string;
  player2Username: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (score1: number, score2: number, screenshotUrl?: string) => void;
}

export default function SubmitResultForm({
  matchId,
  submitterId,
  player1Username,
  player2Username,
  isSubmitting,
  error,
  onSubmit
}: SubmitResultFormProps) {
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(png|jpeg|webp|gif)/)) {
      setLocalError('Invalid file type. Only images are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setLocalError('File too large. Max size 10MB.');
      return;
    }

    setUploading(true);
    setLocalError(null);
    setUploadProgress(10);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${matchId}/${submitterId}_${Date.now()}.${ext}`;
      
      const { data, error } = await (supabase.storage
        .from('result-screenshots') as any)
        .upload(fileName, file, {
          onUploadProgress: (progress: any) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        });

      if (error) throw error;
      setScreenshotUrl(data.path);
      setUploadProgress(100);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to upload screenshot');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (score1 < 0 || score2 < 0) {
      setLocalError('Scores cannot be negative.');
      return;
    }
    onSubmit(score1, score2, screenshotUrl || undefined);
  };

  const getStorageUrl = (path: string) => {
    return supabase.storage.from('result-screenshots').getPublicUrl(path).data.publicUrl;
  };

  return (
    <motion.form 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4 text-center">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{player1Username}</label>
          <div className="flex items-center justify-center space-x-4">
            <button 
              type="button"
              onClick={() => setScore1(Math.max(0, score1 - 1))}
              className="p-2 hover:text-primary transition-colors"
            >
              <CircleMinus className="w-8 h-8" />
            </button>
            <input 
              type="number"
              value={score1}
              onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
              className="w-24 bg-transparent text-5xl font-black text-white italic text-center outline-none"
            />
            <button 
              type="button"
              onClick={() => setScore1(score1 + 1)}
              className="p-2 hover:text-primary transition-colors"
            >
              <CirclePlus className="w-8 h-8" />
            </button>
          </div>
        </div>

        <div className="space-y-4 text-center">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{player2Username}</label>
          <div className="flex items-center justify-center space-x-4">
            <button 
              type="button"
              onClick={() => setScore2(Math.max(0, score2 - 1))}
              className="p-2 hover:text-primary transition-colors"
            >
              <CircleMinus className="w-8 h-8" />
            </button>
            <input 
              type="number"
              value={score2}
              onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
              className="w-24 bg-transparent text-5xl font-black text-white italic text-center outline-none"
            />
            <button 
              type="button"
              onClick={() => setScore2(score2 + 1)}
              className="p-2 hover:text-primary transition-colors"
            >
              <CirclePlus className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Match Screenshot (recommended)</label>
        <div className="relative">
          {screenshotUrl ? (
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-emerald-500/50">
              <img src={getStorageUrl(screenshotUrl)} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => setScreenshotUrl(null)}
                className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full aspect-video bg-black/40 border-2 border-dashed border-white/5 rounded-3xl cursor-pointer hover:border-primary/50 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="bg-white/5 p-4 rounded-full mb-4 group-hover:bg-primary/20 transition-colors">
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-primary" />
                </div>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Click to upload or drag & drop</p>
                <p className="text-[10px] text-slate-600 mt-2">PNG, JPG, WEBP (Max 10MB)</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>
          )}

          {uploading && (
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {(error || localError) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-500"
        >
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-bold uppercase tracking-tight">{error || localError}</p>
        </motion.div>
      )}

      <button 
        type="submit"
        disabled={isSubmitting || uploading}
        className="w-full py-6 bg-primary text-slate-900 rounded-3xl font-black uppercase italic tracking-tighter text-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            Submitting...
          </>
        ) : (
          'Submit Result'
        )}
      </button>
    </motion.form>
  );
}
