import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Trophy, Percent, ShieldCheck, AlertCircle, Plus, Trash2, 
  RefreshCw, CheckCircle2, DollarSign, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import StatusBadge from '../ui/StatusBadge';

interface Tournament {
  id: string;
  name: string;
  entry_fee: number;
  escrow_balance_usd: number;
  platform_fee_percent: number;
  prize_percentages: Record<string, number> | null;
  payout_status: 'none' | 'processing' | 'completed' | 'failed';
}

interface TournamentPrizeConfigProps {
  tournament: Tournament;
  onUpdate: () => void;
}

const formatUSD = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);

export default function TournamentPrizeConfigComponent({ tournament, onUpdate }: TournamentPrizeConfigProps) {
  const { profile: loggedInProfile } = useAuth();
  
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(tournament.platform_fee_percent ?? 10);
  const [prizePercentages, setPrizePercentages] = useState<{ position: string; percent: number }[]>([]);
  
  const [isBusy, setIsBusy] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: string[];
    sum_prize_pct?: number;
    platform_fee_pct?: number;
    total_pct?: number;
  } | null>(null);

  // Initialize from tournament data
  useEffect(() => {
    setPlatformFeePercent(tournament.platform_fee_percent ?? 10);
    
    if (tournament.prize_percentages) {
      const parsed = Object.entries(tournament.prize_percentages)
        .map(([pos, pct]) => ({ position: pos, percent: pct as number }))
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));
      setPrizePercentages(parsed);
    } else {
      // Default to standard top 3 config
      setPrizePercentages([
        { position: '1', percent: 54 },
        { position: '2', percent: 27 },
        { position: '3', percent: 9 },
      ]);
    }
    setValidationResult(null);
  }, [tournament]);

  // Derived values for live projections
  const totalEscrow = tournament.escrow_balance_usd || 0;
  const platformCut = totalEscrow * (platformFeePercent / 100);
  const distributablePot = totalEscrow - platformCut;

  const currentPercentagesSum = prizePercentages.reduce((sum, item) => sum + item.percent, 0);
  const currentTotalSum = currentPercentagesSum + platformFeePercent;

  const handleAddPosition = () => {
    // Find next sequential position
    const existingPos = prizePercentages.map(p => parseInt(p.position)).filter(n => !isNaN(n));
    const nextPos = existingPos.length > 0 ? Math.max(...existingPos) + 1 : 1;
    if (nextPos > 10) {
      toast.error('Maximum limit of 10 prize positions reached.');
      return;
    }
    setPrizePercentages([...prizePercentages, { position: nextPos.toString(), percent: 0 }]);
    setValidationResult(null);
  };

  const handleRemovePosition = (index: number) => {
    const updated = [...prizePercentages];
    updated.splice(index, 1);
    setPrizePercentages(updated);
    setValidationResult(null);
  };

  const handlePercentChange = (index: number, val: number) => {
    const updated = [...prizePercentages];
    updated[index].percent = Number(val);
    setPrizePercentages(updated);
    setValidationResult(null);
  };

  const handlePositionNameChange = (index: number, val: string) => {
    const updated = [...prizePercentages];
    updated[index].position = val;
    setPrizePercentages(updated);
    setValidationResult(null);
  };

  const runValidation = async (showSuccessMsg: boolean = false) => {
    setIsValidating(true);
    try {
      // Build JSON record
      const percentagesRecord: Record<string, number> = {};
      prizePercentages.forEach(p => {
        if (p.position.trim()) {
          percentagesRecord[p.position.trim()] = p.percent;
        }
      });

      const { data, error } = await (supabase as any).rpc('validate_prize_config', {
        p_prize_percentages: percentagesRecord,
        p_platform_fee_pct: platformFeePercent,
        p_max_position: 10
      });

      if (error) {
        toast.error(`RPC validation error: ${error.message}`);
        setValidationResult({ valid: false, errors: [error.message] });
        return false;
      }

      setValidationResult(data);
      if (data?.valid) {
        if (showSuccessMsg) toast.success('✓ Prize configuration layout is perfectly valid!');
        return true;
      } else {
        if (showSuccessMsg) toast.error('🚫 Split layout errors found. Please correct percentages.');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Unexpected error validating prize config.');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!loggedInProfile?.id) {
      toast.error('Unauthorized administrator identity.');
      return;
    }

    // Always validate first
    const isValid = await runValidation(false);
    if (!isValid) {
      toast.error('Validation failed. Please correct configuration distribution percentages first.');
      return;
    }

    setIsBusy(true);
    try {
      const percentagesRecord: Record<string, number> = {};
      prizePercentages.forEach(p => {
        if (p.position.trim()) {
          percentagesRecord[p.position.trim()] = p.percent;
        }
      });

      const { data, error } = await (supabase as any).rpc('set_tournament_prize_config', {
        p_admin_id: loggedInProfile.id,
        p_tournament_id: tournament.id,
        p_prize_percentages: percentagesRecord,
        p_platform_fee_pct: platformFeePercent
      });

      if (error) {
        toast.error(`Error saving: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success('✓ Tournament prize configuration saved successfully!');
        onUpdate();
        setValidationResult(null);
      } else {
        const errorMsg = data?.error || 'Business validation rejected';
        toast.error(`Configuration rejected: ${errorMsg}`);
        if (data?.details) {
          setValidationResult({ valid: false, errors: data.details });
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Unexpected network error saving configurations.');
    } finally {
      setIsBusy(false);
    }
  };

  // Only show for paid tournaments (entry_fee >0) where payout_status is 'none' or 'failed'
  const isPaid = (tournament.entry_fee || 0) > 0;
  const isEligibleForEdit = tournament.payout_status === 'none' || tournament.payout_status === 'failed';

  if (!isPaid) {
    return (
      <div className="card p-8 border-white/5 bg-slate-900/10 text-center space-y-2">
        <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
        <h4 className="text-sm font-black uppercase text-slate-400 italic tracking-wider">Free Entry Event</h4>
        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
          This tournament does not require an entry fee. There are no escrow reserves, platform commissions, or dynamic payouts to config.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-8 bg-slate-900/40 border border-white/10 space-y-6 relative overflow-hidden animate-in fade-in duration-300">
      
      {/* Decorative Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          <div>
            <h4 className="text-md font-black uppercase text-white italic tracking-tight">Prize Configuration Board</h4>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Configure platform commission & player split values</p>
          </div>
        </div>
        <StatusBadge status={tournament.payout_status === 'none' ? 'unpaid' : tournament.payout_status} />
      </div>

      {/* Escrow Balance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-950/40 border border-white/[0.03] rounded-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Escrow Reserves (Live)</span>
          <p className="text-xl font-black text-white italic tracking-tighter mt-1">{formatUSD(totalEscrow)}</p>
        </div>
        <div className="p-4 bg-slate-950/40 border border-white/[0.03] rounded-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Platform Cut ({platformFeePercent}%)</span>
          <p className="text-xl font-black text-emerald-400/80 italic tracking-tighter mt-1">{formatUSD(platformCut)}</p>
        </div>
        <div className="p-4 bg-slate-950/40 border border-white/[0.03] rounded-2xl">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Client Distribution Pot</span>
          <p className="text-xl font-black text-primary italic tracking-tighter mt-1">{formatUSD(distributablePot)}</p>
        </div>
      </div>

      {/* Form Area - Disabled if payout settled */}
      {!isEligibleForEdit ? (
        <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-400 font-bold flex gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-extrabold uppercase mb-0.5">Payout Cycle Completed</p>
            <p className="font-medium text-slate-400">
              Prize money has been fully ledgered and distributed to player wallets. Settings are locked.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Platform fee picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-primary" />
                Administrative Platform Commission Percent (%)
              </label>
              <span className="text-xs font-black text-white italic">{platformFeePercent}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="50" 
              step="1"
              value={platformFeePercent}
              onChange={(e) => {
                setPlatformFeePercent(Number(e.target.value));
                setValidationResult(null);
              }}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1 block">
              Deducted at completion before individual position distributions. Recommended standard is 10%.
            </span>
          </div>

          {/* Position percentages rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Custom Position Splits</h5>
              <button
                type="button"
                onClick={handleAddPosition}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-950 border border-slate-800 hover:border-primary/40 rounded-lg text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>Add Position</span>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {prizePercentages.map((p, idx) => {
                const projectedVal = (distributablePot * p.percent) / 100;
                return (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-slate-950/40 p-3 border border-white/[0.02] rounded-xl">
                    <div className="w-full sm:w-1/4">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Rank Position Key</label>
                      <input 
                        type="text"
                        value={p.position}
                        onChange={(e) => handlePositionNameChange(idx, e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-black text-xs text-center focus:border-primary/40 outline-none"
                      />
                    </div>

                    <div className="w-full sm:w-1/4">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Prize Split %</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={p.percent}
                        onChange={(e) => handlePercentChange(idx, Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-black text-xs text-center focus:border-primary/40 outline-none"
                      />
                    </div>

                    <div className="w-full sm:w-2/5 flex items-center justify-between px-3 bg-slate-950/60 rounded-lg h-9">
                      <span className="text-[8px] font-bold uppercase text-slate-500 tracking-wider">Projected Output:</span>
                      <span className="text-xs font-black font-mono text-primary">{formatUSD(projectedVal)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePosition(idx)}
                      className="p-2 bg-red-600/10 hover:bg-red-600/30 text-red-500 border border-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {prizePercentages.length === 0 && (
                <p className="text-center py-6 text-slate-600 font-bold uppercase tracking-widest text-[10px] italic">No active position splits defined.</p>
              )}
            </div>
          </div>

          {/* Aggregators Display */}
          <div className="p-4 bg-slate-950 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-white/[0.01]">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider space-y-1">
              <p>Player Pot Splits Sum: <span className="font-mono text-slate-300 font-black">{currentPercentagesSum.toFixed(2).replace(/\.00$/, '')}%</span></p>
              <p>Admin Commission: <span className="font-mono text-slate-300 font-black">{platformFeePercent}%</span></p>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Consolidated Aggregator Total</span>
              <span className={`text-xl font-black italic tracking-tighter ${currentTotalSum === 100 ? 'text-emerald-400' : 'text-amber-500'}`}>
                {currentTotalSum.toFixed(2).replace(/\.00$/, '')}% <span className="text-[10px] font-bold text-slate-500">of 100%</span>
              </span>
            </div>
          </div>

          {/* Validation Report Area */}
          {validationResult && (
            <div className={`p-4 border rounded-2xl ${
              validationResult.valid 
                ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-950/20 border-red-500/20 text-red-400'
            }`}>
              <div className="flex items-start space-x-3 text-xs leading-relaxed">
                {validationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h5 className="font-black uppercase tracking-wider text-[11px] mb-1">
                    {validationResult.valid ? 'Clear' : 'Structure Issues Identified'}
                  </h5>
                  {validationResult.valid ? (
                    <p className="font-medium text-[11px]">Consolidated split is perfect for deployment safety. You can now save changes.</p>
                  ) : (
                    <ul className="list-disc pl-4 space-y-1 font-medium text-[11px]">
                      {validationResult.errors?.map((errMsg, i) => (
                        <li key={i}>{errMsg}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 justify-end text-[10px] font-black uppercase tracking-widest text-center mt-4">
            <button
              type="button"
              disabled={isBusy || isValidating}
              onClick={() => runValidation(true)}
              className="px-5 py-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all font-bold flex items-center space-x-1.5"
            >
              {isValidating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Validate Setup</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isBusy || isValidating}
              onClick={handleSaveConfig}
              className="px-6 py-3.5 bg-primary text-slate-900 rounded-xl hover:scale-103 active:scale-97 shadow-xl shadow-primary/20 transition-all font-black flex items-center space-x-1.5"
            >
              {isBusy ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Set Split Rule</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
