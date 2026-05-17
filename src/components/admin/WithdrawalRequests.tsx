
import React, { useState, useEffect } from 'react';
import { walletService } from '../../services/walletService';
import { WithdrawalRequest } from '../../types/finance';
import { 
  CheckCircle2, XCircle, Clock, ExternalLink, 
  Search, Filter, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { formatCurrencyDynamic, formatDate, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function WithdrawalRequests() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  async function loadRequests() {
    try {
      setLoading(true);
      const data = await walletService.getWithdrawalRequests(filter);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    if (!confirm(`Are you sure you want to ${action} this withdrawal?`)) return;

    try {
      setProcessing(id);
      let success = false;
      if (action === 'approve') {
        const res = await walletService.approveWithdrawal(id);
        success = res.success;
      } else {
        const res = await walletService.rejectWithdrawal(id, 'Admin rejected');
        success = res.success;
      }

      if (success) {
        toast.success(`Withdrawal ${action}d`);
        loadRequests();
      } else {
        toast.error(`Failed to ${action} withdrawal`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Withdrawal Pipeline</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage outbound fund requests</p>
        </div>

        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
           {(['pending', 'completed', 'failed'] as const).map((s) => (
             <button
               key={s}
               onClick={() => setFilter(s)}
               className={cn(
                 "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                 filter === s ? "bg-primary text-black" : "text-slate-500 hover:text-white"
               )}
             >
               {s}
             </button>
           ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
           <RefreshCw className="w-8 h-8 text-primary animate-spin" />
           <p className="text-[10px] font-black text-primary uppercase italic animate-pulse">Syncing Treasury...</p>
        </div>
      ) : requests.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((req) => (
            <diV key={req.id} className="card bg-[#0a0b1e] border-white/5 p-6 hover:border-white/10 transition-all group">
               <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* User Profile */}
                  <div className="flex items-center space-x-4 min-w-[200px]">
                     <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                        <Landmark className="w-6 h-6 text-slate-600" />
                     </div>
                     <diV>
                        <p className="text-xs font-black text-white uppercase italic tracking-tighter leading-none">{req.username}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">{req.email}</p>
                     </diV>
                  </div>

                  {/* Amount Info */}
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6">
                     <div>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Request Amount</p>
                        <div className="flex items-baseline space-x-2">
                           <span className="text-xl font-black text-white italic tracking-tighter">{req.amount} {req.currency}</span>
                           <span className="text-[10px] font-bold text-primary italic">(${req.amount_usd.toFixed(2)})</span>
                        </div>
                     </div>
                     <div>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Destination</p>
                        <p className="text-xs font-black text-slate-300 uppercase italic tracking-tighter truncate max-w-[150px]">
                           {req.provider.toUpperCase()} : {JSON.stringify(req.destination)}
                        </p>
                     </div>
                     <div className="hidden lg:block">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Requested On</p>
                        <div className="flex items-center space-x-2 text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
                           <Clock className="w-3 h-3" />
                           <span>{formatDate(req.created_at)}</span>
                        </div>
                     </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2">
                     {req.status === 'pending' ? (
                       <>
                         <button
                           disabled={processing === req.id}
                           onClick={() => handleAction(req.id, 'reject')}
                           className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
                         >
                           <XCircle className="w-5 h-5" />
                         </button>
                         <button
                           disabled={processing === req.id}
                           onClick={() => handleAction(req.id, 'approve')}
                           className="flex-1 lg:flex-none px-6 py-3 bg-emerald-500 text-black rounded-xl font-black uppercase italic tracking-tighter flex items-center justify-center space-x-2 hover:bg-emerald-400 transition-all disabled:opacity-50"
                         >
                           {processing === req.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                             <>
                               <span>Approve</span>
                               <CheckCircle2 className="w-4 h-4" />
                             </>
                           )}
                         </button>
                       </>
                     ) : (
                       <div className={cn(
                         "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                         req.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                       )}>
                         {req.status}
                       </div>
                     )}
                  </div>
               </div>
            </diV>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center card bg-[#0a0b1e] border-white/5 border-dashed border-2">
           <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
              <CheckCircle2 className="w-8 h-8 text-slate-800" />
           </div>
           <p className="text-slate-500 font-black uppercase italic tracking-tighter text-xl">Queue is Clean</p>
           <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">No pending withdrawal requests at the moment.</p>
        </div>
      )}
    </div>
  );
}

function Landmark({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="3" y1="22" x2="21" y2="22"></line>
      <line x1="6" y1="18" x2="6" y2="11"></line>
      <line x1="10" y1="18" x2="10" y2="11"></line>
      <line x1="14" y1="18" x2="14" y2="11"></line>
      <line x1="18" y1="18" x2="18" y2="11"></line>
      <polygon points="12 2 20 7 4 7 12 2"></polygon>
    </svg>
  );
}
