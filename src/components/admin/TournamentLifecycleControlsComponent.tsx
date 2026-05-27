import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Play, Ban, Award, Trash2, HelpCircle, 
  RefreshCw, AlertTriangle, FileText, Loader2, Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Tournament {
  id: string;
  name: string;
  status: 'draft' | 'registration_open' | 'ready' | 'active' | 'completed' | 'cancelled';
  payout_status: 'none' | 'processing' | 'completed' | 'failed';
  entry_fee: number;
}

interface TournamentLifecycleControlsProps {
  tournament: Tournament;
  onUpdate: () => void;
}

export default function TournamentLifecycleControlsComponent({ tournament, onUpdate }: TournamentLifecycleControlsProps) {
  const { profile: loggedInProfile } = useAuth();
  const navigate = useNavigate();
  
  const [isBusy, setIsBusy] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [activeDialog, setActiveDialog] = useState<'start' | 'champion' | 'delete' | null>(null);

  // Status mapping checks
  const canStart = tournament.status === 'ready';
  const canCancel = ['draft', 'registration_open', 'ready', 'active'].includes(tournament.status);
  const canDeclareChampion = tournament.status === 'active';
  const canDelete = ['draft', 'cancelled'].includes(tournament.status);

  const handleStartTournament = async () => {
    if (!loggedInProfile?.id) return;
    setIsBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('start_tournament', {
        p_tournament_id: tournament.id,
        p_admin_id: loggedInProfile.id
      });
      if (error) {
        toast.error(`Start error: ${error.message}`);
      } else {
        toast.success('✓ Tournament is now active! Fixtures generated.');
        onUpdate();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred starting tournament.');
    } finally {
      setIsBusy(false);
      setActiveDialog(null);
    }
  };

  const handleCancelTournament = async () => {
    if (!loggedInProfile?.id) return;
    if (!cancellationReason.trim()) {
      toast.error('Reason for cancellation is required.');
      return;
    }
    setIsBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('admin_cancel_tournament', {
        p_admin_id: loggedInProfile.id,
        p_tournament_id: tournament.id,
        p_reason: cancellationReason.trim()
      });
      if (error) {
        toast.error(`Cancellation error: ${error.message}`);
      } else {
        toast.success('✓ Tournament has been cancelled. Entry fee refunds dispersed.');
        setShowCancelModal(false);
        setCancellationReason('');
        onUpdate();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred cancelling tournament.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeclareChampion = async () => {
    setIsBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('fn_declare_tournament_champion', {
        p_tournament_id: tournament.id
      });
      if (error) {
        toast.error(`Champion declaration error: ${error.message}`);
      } else {
        toast.success('✓ Standings evaluated & champion declared successfully!');
        onUpdate();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred declaring champion.');
    } finally {
      setIsBusy(false);
      setActiveDialog(null);
    }
  };

  const handleDeleteTournament = async () => {
    setIsBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('delete_tournament_cascade', {
        p_tournament_id: tournament.id
      });
      if (error) {
        toast.error(`Cascade deletion failed: ${error.message}`);
      } else {
        toast.success('✓ Tournament successfully deleted cascade.');
        navigate('/admin/tournaments');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred executing delete cascade.');
    } finally {
      setIsBusy(false);
      setActiveDialog(null);
    }
  };

  return (
    <div className="card p-8 bg-slate-900/40 border border-white/5 space-y-6 relative overflow-hidden animate-in fade-in duration-300">
      
      {/* Decorative Title */}
      <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
        <div className="w-1.5 h-6 bg-primary rounded-full" />
        <div>
          <h4 className="text-md font-black uppercase text-white italic tracking-tight">Lifecycle Protocols</h4>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Execute main sequence transitions and gateway directives</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* START TOURNAMENT BUTTON */}
        <button
          onClick={() => setActiveDialog('start')}
          disabled={!canStart || isBusy}
          className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all h-36 ${
            canStart 
              ? 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 cursor-pointer' 
              : 'bg-slate-950/40 border-slate-900 text-slate-650 opacity-40 cursor-not-allowed'
          }`}
        >
          <Play className="w-8 h-8 mb-3" />
          <span className="text-[11px] font-black uppercase tracking-wider">Start Tournament</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Status: READY Only</span>
        </button>

        {/* CANCEL TOURNAMENT BUTTON */}
        <button
          onClick={() => setShowCancelModal(true)}
          disabled={!canCancel || isBusy}
          className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all h-36 ${
            canCancel 
              ? 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 text-amber-500 cursor-pointer' 
              : 'bg-slate-950/40 border-slate-900 text-slate-650 opacity-40 cursor-not-allowed'
          }`}
        >
          <Ban className="w-8 h-8 mb-3 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider">Cancel Tournament</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Includes fee refunds</span>
        </button>

        {/* DECLARE CHAMPION BUTTON */}
        <button
          onClick={() => setActiveDialog('champion')}
          disabled={!canDeclareChampion || isBusy}
          className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all h-36 ${
            canDeclareChampion 
              ? 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40 text-blue-400 cursor-pointer' 
              : 'bg-slate-950/40 border-slate-900 text-slate-650 opacity-40 cursor-not-allowed'
          }`}
        >
          <Award className="w-8 h-8 mb-3" />
          <span className="text-[11px] font-black uppercase tracking-wider">Declare Champion</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Resolves standings</span>
        </button>

        {/* CASCADE DELETE BUTTON */}
        <button
          onClick={() => setActiveDialog('delete')}
          disabled={!canDelete || isBusy}
          className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all h-36 ${
            canDelete 
              ? 'bg-red-500/10 border-red-500/20 hover:border-red-500/40 text-red-500 cursor-pointer' 
              : 'bg-slate-950/40 border-slate-900 text-slate-650 opacity-40 cursor-not-allowed'
          }`}
        >
          <Trash2 className="w-8 h-8 mb-3" />
          <span className="text-[11px] font-black uppercase tracking-wider">Cascade Delete</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Soft cascading only</span>
        </button>

      </div>

      {/* CANCEL TOURNAMENT MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-md font-black italic uppercase text-white tracking-widest">Cancel Tournament</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Warning: This action triggers auto-refund of all entry fees</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">
              Cancelling is irreversible. Entry fees will immediately be refunded to the wallets of all registered contenders.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block mb-1.5">Official Reason for Cancellation</label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={3}
                  maxLength={180}
                  placeholder="e.g. Server failures, insufficient contender turnout, or rescheduled date..."
                  className="w-full bg-slate-950/45 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-xs font-semibold resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end items-center text-[10px] font-black uppercase tracking-wider">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-lg font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isBusy || !cancellationReason.trim()}
                  onClick={handleCancelTournament}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg flex items-center space-x-1.5 font-bold"
                >
                  {isBusy ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM LIFECYCLE DIALOGS */}
      {activeDialog === 'start' && (
        <ConfirmActionDialog
          title="Start Tournament Sequence"
          description="Do you wish to begin the tournament? This shifts the status from READY to ACTIVE, generating matches and locking the rosters absolutely."
          confirmText="Start"
          colorClass="bg-emerald-600 hover:bg-emerald-500"
          isBusy={isBusy}
          onCancel={() => setActiveDialog(null)}
          onConfirm={handleStartTournament}
        />
      )}

      {activeDialog === 'champion' && (
        <ConfirmActionDialog
          title="Declare Champion standings"
          description="Verify that all matching operational fixtures have been solved. Clicking confirm declares champion credentials and prepares payout gateways."
          confirmText="Declare"
          colorClass="bg-blue-600 hover:bg-blue-500"
          isBusy={isBusy}
          onCancel={() => setActiveDialog(null)}
          onConfirm={handleDeclareChampion}
        />
      )}

      {activeDialog === 'delete' && (
        <ConfirmActionDialog
          title="Cascade Cascade Deletion"
          description="Are you absolutely sure you want to permanently delete this tournament entity? This is completely destructive and will wipe cascaded database tables."
          confirmText="Wipe Entity"
          colorClass="bg-red-650 hover:bg-red-500"
          isBusy={isBusy}
          onCancel={() => setActiveDialog(null)}
          onConfirm={handleDeleteTournament}
        />
      )}

    </div>
  );
}

// Internal reusable confirmation dialog
function ConfirmActionDialog({ 
  title, description, confirmText, colorClass, isBusy, onCancel, onConfirm 
}: { 
  title: string; description: string; confirmText: string; colorClass: string; isBusy: boolean; onCancel: () => void; onConfirm: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in duration-200">
        <h3 className="text-md font-black italic uppercase text-white tracking-widest mb-2">{title}</h3>
        <p className="text-xs text-slate-400 font-semibold mb-6 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-white/[0.01]">
          {description}
        </p>
        <div className="flex gap-3 justify-end items-center text-[10px] font-black uppercase tracking-wider">
          <button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-lg font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg flex items-center space-x-1.5 font-bold ${colorClass}`}
          >
            {isBusy ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
