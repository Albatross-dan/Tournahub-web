import React, { useState } from 'react';
import { X, Calendar, Clock, Loader2 } from 'lucide-react';
import { matchService } from '../../services/matchService';
import { useAuth } from '../../contexts/AuthContext';

interface MatchScheduleModalProps {
  match: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const MatchScheduleModal: React.FC<MatchScheduleModalProps> = ({ match, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [scheduledAt, setScheduledAt] = useState(
    match.scheduled_at 
      ? new Date(new Date(match.scheduled_at).getTime() - new Date(match.scheduled_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) 
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const date = new Date(scheduledAt);
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      
      if (date > maxDate) {
        throw new Error('Limit exceeded: Cannot schedule matches more than 90 days in advance.');
      }

      await matchService.scheduleMatch(match.id, date.toISOString(), user.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Calendar className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Schedule Match</h3>
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest italic leading-none">deployment sequence</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 flex items-center justify-between">
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Battle Context</p>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-black text-white uppercase italic tracking-tighter">
                    {match.player1_profile?.username || 'TBD'}
                  </span>
                  <span className="text-[10px] font-black text-primary italic">VS</span>
                  <span className="text-sm font-black text-white uppercase italic tracking-tighter">
                    {match.player2_profile?.username || 'TBD'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic text-right">Round</p>
                <span className="text-sm font-black text-primary italic">{match.round}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Operation Timestamp (LOCAL)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold tracking-tight focus:border-primary/50 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-tight italic">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
             <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 text-xs font-black uppercase tracking-widest italic text-slate-500 hover:text-white transition-all"
             >
                Abort
             </button>
             <button
                type="submit"
                disabled={loading}
                className="flex-[2] btn-primary py-4 text-lg font-black italic uppercase tracking-tighter rounded-2xl flex items-center justify-center space-x-2"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Confirm Schedule</span>}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};
