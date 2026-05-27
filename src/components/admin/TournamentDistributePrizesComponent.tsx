import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Trophy, HelpCircle, Users, AlertTriangle, CheckCircle, 
  Settings, Loader2, ArrowRight, ShieldCheck, X, Award
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Tournament {
  id: string;
  name: string;
  type: string;
  status: string;
  entry_fee: number;
  escrow_balance_usd: number;
  platform_fee_percent: number;
  payout_status: 'none' | 'processing' | 'completed' | 'failed';
}

interface TournamentDistributePrizesProps {
  tournament: Tournament;
  onUpdate: () => void;
}

const formatUSD = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);

export default function TournamentDistributePrizesComponent({ tournament, onUpdate }: TournamentDistributePrizesProps) {
  const { profile: loggedInProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboardPrizes();
  }, [tournament.id, tournament.payout_status]);

  async function fetchLeaderboardPrizes() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_tournament_leaderboard_with_prizes', {
        p_tournament_id: tournament.id
      });
      if (error) {
        console.error('Error fetching leaderboard with prizes:', error);
      } else {
        setLeaderboardData(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleStartDistribution = () => {
    // Basic business validation before modal
    if (!loggedInProfile?.id) {
      toast.error('Unauthorized administrator session.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmDistribution = async () => {
    if (!loggedInProfile?.id) return;

    setIsBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('distribute_prizes', {
        p_tournament_id: tournament.id,
        p_admin_id: loggedInProfile.id
      });

      if (error) {
        toast.error(`Transaction Failure: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success(data?.message || '✓ Prizes ledgered and distributed to player wallets successfully!');
        setShowConfirmModal(false);
        onUpdate();
        await fetchLeaderboardPrizes();
      } else {
        toast.error(data?.error || 'Business validation error occurred.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Unexpected network failure executing prize distributions.');
    } finally {
      setIsBusy(false);
    }
  };

  // Conditions check
  const isPaid = (tournament.entry_fee || 0) > 0;
  const isCompleted = tournament.status === 'completed';
  const hasEscrow = (tournament.escrow_balance_usd || 0) > 0;
  const isPayoutEligible = tournament.payout_status === 'none' || tournament.payout_status === 'failed';

  // Return empty block if free entry
  if (!isPaid) return null;

  // Render a banner if payout is already completed
  if (tournament.payout_status === 'completed') {
    return (
      <div className="card p-8 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in duration-350">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase text-emerald-400 italic tracking-tight">Ledger Settled & Closed</h4>
            <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">All prize reserves have been successfully distributed to qualified winners.</p>
          </div>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Released Reserves</span>
          <span className="text-md font-black text-white font-mono italic leading-none">{formatUSD(leaderboardData?.distributable_usd || 0)}</span>
        </div>
      </div>
    );
  }

  // Render warnings if completed condition or balance is not met
  if (!isCompleted || !hasEscrow || !isPayoutEligible) {
    let warningMsg = '';
    if (!isCompleted) warningMsg = 'Tournament status must be marked "completed" to enable distribution ledgering.';
    else if (!hasEscrow) warningMsg = 'Escrow vault reserves are currently empty ($0.00).';
    else if (!isPayoutEligible) warningMsg = 'Payments are already queued or being settled.';

    return (
      <div className="card p-6 bg-slate-900/20 border border-slate-800/80 rounded-2xl flex items-center space-x-4 text-slate-500 text-xs">
        <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0" />
        <span className="font-bold uppercase tracking-wider text-[10px]">{warningMsg}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 space-x-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Syncing distribution schedules...</span>
      </div>
    );
  }

  const escrowBalance = tournament.escrow_balance_usd || 0;
  const platformFeePct = tournament.platform_fee_percent || 0;
  const platformCutVal = escrowBalance * (platformFeePct / 100);
  const playerDistributableVal = escrowBalance - platformCutVal;

  const leaderboardList = leaderboardData?.leaderboard || [];
  const prizeWinnersList = leaderboardList.filter((item: any) => 
    (item.projected_prize_usd !== null && item.projected_prize_usd > 0) || 
    (item.prize_amount_usd !== null && item.prize_amount_usd > 0)
  );

  return (
    <div className="card p-8 bg-slate-900/40 border border-white/5 space-y-6 relative overflow-hidden animate-in fade-in duration-300">
      
      {/* Decorative Title */}
      <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
        <div className="w-1.5 h-6 bg-primary rounded-full" />
        <div>
          <h4 className="text-md font-black uppercase text-white italic tracking-tight font-black">Distribute Rewards Dashboard</h4>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Finalize standings and authorize client wallet deposits</p>
        </div>
      </div>

      {/* Summary Row inside Distribute */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-950/40 border border-white/[0.03] rounded-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Gross Escrow</span>
          <p className="text-md font-black text-slate-300 italic tracking-tighter mt-1">{formatUSD(escrowBalance)}</p>
        </div>
        <div className="p-4 bg-slate-950/40 border border-white/[0.03] rounded-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Platform Cut ({platformFeePct}%)</span>
          <p className="text-md font-black text-emerald-400 italic tracking-tighter mt-1">{formatUSD(platformCutVal)}</p>
        </div>
        <div className="p-4 bg-slate-950/40 border border-white/[0.03] rounded-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Winner Allocation Pot</span>
          <p className="text-md font-black text-primary italic tracking-tighter mt-1">{formatUSD(playerDistributableVal)}</p>
        </div>
        <div className="p-4 bg-slate-950/40 border border-white/[0.03] rounded-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Award Recipients</span>
          <p className="text-md font-black text-white italic tracking-tighter mt-1">{prizeWinnersList.length} Operators</p>
        </div>
      </div>

      {/* Eligible Recipients Miniature Grid */}
      <div className="space-y-3">
        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Target Distribution Map</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {prizeWinnersList.map((winner: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/[0.02] rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                    {winner.avatar_url ? (
                      <img src={winner.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-extrabold text-[10px] text-primary">{winner.username?.[0].toUpperCase() || 'P'}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded bg-primary text-slate-900 text-[8px] font-extrabold flex items-center justify-center">
                    {winner.prize_position ?? winner.rank}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-white italic uppercase tracking-tight">{winner.username}</p>
                  <p className="text-[8px] text-slate-500 uppercase font-bold">Rank #{winner.rank}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold font-mono text-primary">
                  {formatUSD(winner.projected_prize_usd || winner.prize_amount_usd || 0)}
                </span>
                <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider block">Est. Prize</span>
              </div>
            </div>
          ))}

          {prizeWinnersList.length === 0 && (
            <p className="col-span-full text-center py-6 text-slate-600 font-bold uppercase tracking-widest text-[9px] italic">
              No qualified players mapped to distribution list. Please verify custom split config values.
            </p>
          )}
        </div>
      </div>

      {/* Primary Trigger Button */}
      <div className="pt-2">
        <button
          onClick={handleStartDistribution}
          disabled={isBusy || prizeWinnersList.length === 0}
          className="w-full h-14 bg-red-650 hover:bg-red-500 text-white font-black italic uppercase tracking-tighter disabled:opacity-40 transition-all rounded-xl text-md flex items-center justify-center space-x-2 shadow-xl shadow-red-900/20 cursor-pointer border border-red-500/20"
        >
          <Award className="w-5 h-5 animate-pulse" />
          <span>disburse prize allocations</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-bounce-short">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-md font-black italic uppercase text-white tracking-widest">Authorize Final Distribution?</h3>
                <p className="text-[9px] text-red-400 font-black uppercase tracking-wider">Warning: This transaction path is irreversible.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/[0.01] space-y-4 text-xs font-semibold">
                <div className="flex justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-555">Aggregated Escrow:</span>
                  <span className="text-white font-mono font-black">{formatUSD(escrowBalance)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-555">Platform Fee Cut ({platformFeePct}%):</span>
                  <span className="text-emerald-400 font-mono font-black">{formatUSD(platformCutVal)}</span>
                </div>
                <div className="flex justify-between pt-1 font-extrabold">
                  <span className="text-slate-400">Net Distribution to Winners:</span>
                  <span className="text-primary font-mono font-black text-sm">{formatUSD(playerDistributableVal)}</span>
                </div>
              </div>

              {/* Mini Scrollable list */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Wallet Disbursements Blueprint</span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {prizeWinnersList.map((win: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950/40 rounded-xl border border-white/[0.01]">
                      <span className="text-slate-300 font-bold uppercase tracking-tight flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
                        {win.username}
                      </span>
                      <span className="text-primary font-black font-mono">{formatUSD(win.projected_prize_usd || win.prize_amount_usd || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 justify-end text-[10px] font-black uppercase tracking-wider pt-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 h-11 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleConfirmDistribution}
                  className="px-6 h-11 bg-red-650 hover:bg-red-500 text-white rounded-xl flex items-center space-x-1.5 font-bold transition-all"
                >
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm Distribution Ledger</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
