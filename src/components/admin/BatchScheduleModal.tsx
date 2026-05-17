import React, { useState } from 'react';
import { X, Calendar, Clock, Loader2, CheckSquare, Square } from 'lucide-react';
import { matchService } from '../../services/matchService';
import { useAuth } from '../../contexts/AuthContext';

interface BatchScheduleModalProps {
  matches: any[];
  roundName: string;
  onClose: () => void;
  onSuccess: (results: { scheduled: number; failed: number; errors: string[] }) => void;
}

export const BatchScheduleModal: React.FC<BatchScheduleModalProps> = ({ matches, roundName, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(matches.map(m => m.id));

  const toggleMatch = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(prev => 
      prev.length === matches.length ? [] : matches.map(m => m.id)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedIds.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const date = new Date(scheduledAt);
      const res = await matchService.batchScheduleMatches(selectedIds, date.toISOString(), user.id);
      
      onSuccess({
        scheduled: res.scheduled,
        failed: res.failed,
        errors: res.errors || []
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Calendar className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Batch Schedule</h3>
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest italic leading-none">{roundName} Deployment</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Select Matches</span>
                <button 
                   type="button"
                   onClick={toggleAll}
                   className="text-[10px] font-black text-primary uppercase tracking-widest italic hover:underline"
                >
                   {selectedIds.length === matches.length ? 'Deselect All' : 'Select All'}
                </button>
             </div>

             <div className="grid grid-cols-1 gap-2">
                {matches.map(m => (
                   <div 
                      key={m.id}
                      onClick={() => toggleMatch(m.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                         selectedIds.includes(m.id) 
                         ? 'bg-primary/5 border-primary/20' 
                         : 'bg-slate-900 border-slate-800 opacity-60'
                      }`}
                   >
                      <div className="flex items-center space-x-3">
                         {selectedIds.includes(m.id) ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                         ) : (
                            <Square className="w-4 h-4 text-slate-700" />
                         )}
                         <div className="text-left">
                            <p className="text-[10px] font-black text-slate-500 uppercase italic leading-none mb-1">Match #{m.match_order}</p>
                            <p className="text-xs font-black text-white italic tracking-tight">
                               {m.player1_profile?.username || 'TBD'} <span className="text-primary italic">vs</span> {m.player2_profile?.username || 'TBD'}
                            </p>
                         </div>
                      </div>
                   </div>
                ))}
             </div>

            <div className="space-y-2 pt-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Global Timestamp (LOCAL)</label>
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
                disabled={loading || selectedIds.length === 0}
                className="flex-[2] btn-primary py-4 text-lg font-black italic uppercase tracking-tighter rounded-2xl flex items-center justify-center space-x-2 disabled:opacity-50"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Schedule {selectedIds.length} Matches</span>}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};
