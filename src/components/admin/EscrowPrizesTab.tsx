import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Trophy, Coins, Scale, RefreshCw, Plus, Trash2, 
  AlertTriangle, Check, Clock, UserCheck, AlertCircle, X, ShieldAlert 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Tournament {
  id: string;
  name: string;
  type: string;
  status: 'draft' | 'registration_open' | 'ready' | 'active' | 'completed' | 'cancelled';
  max_players: number;
  entry_fee: number;
  prize_pool: number;
  prize_currency: string;
  prize_percentages: Record<string, number> | null;
  platform_fee_percent: number;
  collected_fees_usd: number;
  escrow_balance_usd: number;
  payout_status: 'none' | 'processing' | 'completed' | 'failed';
  start_date: string | null;
  end_date: string | null;
}

interface EscrowPrizesTabProps {
  tournament: Tournament;
  onRefresh: () => void;
}

const formatUSD = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);

const formatPercent = (value: number) =>
  `${value.toFixed(2).replace(/\.00$/, '')}%`;

export default function EscrowPrizesTab({ tournament, onRefresh }: EscrowPrizesTabProps) {
  const { user } = useAuth();
  
  // Tab State
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Edit config state
  const [isEditing, setIsEditing] = useState(false);
  const [platformFee, setPlatformFee] = useState<number>(tournament.platform_fee_percent ?? 10);
  const [positions, setPositions] = useState<{ position: string; percentage: number }[]>([]);
  
  // Validation State
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: string[];
    sum_prize_pct?: number;
    platform_fee_pct?: number;
    total_pct?: number;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Distribute Prizes Modal State
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // Parse existing percentages in edit mode
  useEffect(() => {
    if (tournament.prize_percentages) {
      const formatted = Object.entries(tournament.prize_percentages)
        .map(([pos, percent]) => ({ position: pos, percentage: percent }))
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));
      setPositions(formatted);
    } else {
      // Default standard layout (Top 3 with 10% platform fee)
      setPositions([
        { position: '1', percentage: 54 },
        { position: '2', percentage: 27 },
        { position: '3', percentage: 9 }
      ]);
    }
    setPlatformFee(tournament.platform_fee_percent ?? 10);
    setValidationResult(null);
  }, [tournament, isEditing]);

  useEffect(() => {
    fetchLeaderboardPrizes();
  }, [tournament.id, tournament.payout_status]);

  async function fetchLeaderboardPrizes() {
    setLoadingLeaderboard(true);
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
      console.error('Leaderboard fetch exception:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }

  // Value derivations
  const escrowLive = tournament.escrow_balance_usd ?? 0;
  const isPaid = tournament.entry_fee > 0;
  const platformCut = escrowLive * (tournament.platform_fee_percent / 100);
  const distributablePot = escrowLive - platformCut;

  const currentSumPercentages = positions.reduce((sum, item) => sum + item.percentage, 0);
  const currentTotalSum = currentSumPercentages + platformFee;

  // Edit Position handlers
  const handleAddPosition = () => {
    if (positions.length >= 10) {
      toast.error('Maximum of 10 prize distribution tiers permitted.');
      return;
    }
    const nextPos = (positions.length + 1).toString();
    setPositions([...positions, { position: nextPos, percentage: 0 }]);
    setValidationResult(null);
  };

  const handleRemovePosition = (index: number) => {
    const updated = positions.filter((_, i) => i !== index);
    // Renumber remaining sequentially
    const renumbered = updated.map((item, idx) => ({
      position: (idx + 1).toString(),
      percentage: item.percentage
    }));
    setPositions(renumbered);
    setValidationResult(null);
  };

  const handlePercentageChange = (index: number, val: number) => {
    const updated = [...positions];
    updated[index].percentage = Math.max(0, parseFloat(val.toFixed(2)) || 0);
    setPositions(updated);
    setValidationResult(null);
  };

  // Validate Prize configuration on backend
  const handleValidateConfig = async () => {
    setValidating(true);
    try {
      // Build Jsonb representation
      const prizePercentagesJson: Record<string, number> = {};
      positions.forEach(p => {
        prizePercentagesJson[p.position] = p.percentage;
      });

      const { data, error } = await (supabase as any).rpc('validate_prize_config', {
        p_prize_percentages: prizePercentagesJson,
        p_platform_fee_pct: platformFee,
        p_max_position: 10
      });

      if (error) {
        toast.error(`Validation Engine Error: ${error.message}`);
        setValidationResult({ valid: false, errors: [error.message] });
      } else {
        setValidationResult(data as any);
        if (data && (data as any).valid) {
          toast.success('Prize configuration validated successfully!');
        } else {
          toast.error('Validation failed. Review requirements.');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error executing RPC validation');
    } finally {
      setValidating(false);
    }
  };

  // Save Config on server
  const handleSaveConfig = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const prizePercentagesJson: Record<string, number> = {};
      positions.forEach(p => {
        prizePercentagesJson[p.position] = p.percentage;
      });

      const { data, error } = await (supabase as any).rpc('set_tournament_prize_config', {
        p_admin_id: user.id,
        p_tournament_id: tournament.id,
        p_prize_percentages: prizePercentagesJson,
        p_platform_fee_pct: platformFee
      });

      if (error) {
        toast.error(`Database Error: ${error.message}`);
      } else if (data && !(data as any).success) {
        toast.error((data as any).error || 'Failed to save configuration');
        if ((data as any).details) {
          console.error('Save Failure Details:', (data as any).details);
        }
      } else {
        toast.success('✓ Prize configuration established successfully!');
        setIsEditing(false);
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Operation exception');
    } finally {
      setSaving(false);
    }
  };

  // Payout prize distribution trigger
  const handleDistributePrizes = async () => {
    if (!user) return;
    setDistributing(true);
    try {
      const { data, error } = await (supabase as any).rpc('distribute_prizes', {
        p_tournament_id: tournament.id,
        p_admin_id: user.id
      });

      if (error) {
        toast.error(`Transport Failure: ${error.message}`);
      } else if (data && !(data as any).success) {
        toast.error((data as any).error || 'Distribution algorithm declined clearance.');
      } else {
        toast.success((data as any).message || '✓ Financial distribution completed successfully!');
        setShowDistributeModal(false);
        onRefresh();
        fetchLeaderboardPrizes();
      }
    } catch (err: any) {
      toast.error(err.message || 'Distribution execution failure');
    } finally {
      setDistributing(false);
    }
  };

  // Position Rank Helpers
  const getPositionLabel = (pos: string) => {
    if (pos === '1') return '🥇 1st Place';
    if (pos === '2') return '🥈 2nd Place';
    if (pos === '3') return '🥉 3rd Place';
    return `#${pos} Standings`;
  };

  // Validate presets load handler
  const loadPreset = (presetType: 'top3' | 'top5' | 'top10') => {
    setValidationResult(null);
    if (presetType === 'top3') {
      setPositions([
        { position: '1', percentage: 54 },
        { position: '2', percentage: 27 },
        { position: '3', percentage: 9 }
      ]);
      setPlatformFee(10);
    } else if (presetType === 'top5') {
      setPositions([
        { position: '1', percentage: 45 },
        { position: '2', percentage: 25 },
        { position: '3', percentage: 12 },
        { position: '4', percentage: 5 },
        { position: '5', percentage: 3 }
      ]);
      setPlatformFee(10);
    } else if (presetType === 'top10') {
      setPositions([
        { position: '1', percentage: 35 },
        { position: '2', percentage: 20 },
        { position: '3', percentage: 12 },
        { position: '4', percentage: 8 },
        { position: '5', percentage: 5 },
        { position: '6', percentage: 4 },
        { position: '7', percentage: 3 },
        { position: '8', percentage: 2 },
        { position: '9', percentage: 1 },
        { position: '10', percentage: 0 }
      ]);
      setPlatformFee(10);
    }
  };

  // Check if payout distribution can be initiated
  const canDistribute = 
    tournament.status === 'completed' &&
    (tournament.payout_status === 'none' || tournament.payout_status === 'failed') &&
    isPaid &&
    escrowLive > 0;

  // Check if config editing can occur
  const canEditConfig = 
    isPaid && 
    (tournament.payout_status === 'none' || tournament.payout_status === 'failed');

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* Escrow Status Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card p-6 bg-slate-900/40 border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Escrow Balance</span>
            <p className="text-3xl font-black italic tracking-tighter text-emerald-400 mt-2">
              {formatUSD(escrowLive)}
            </p>
          </div>
          <span className="text-[9px] text-slate-500 font-bold uppercase mt-2">Held securely in ledger router</span>
        </div>

        <div className="card p-6 bg-slate-900/40 border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Platform Split Fee</span>
            <p className="text-3xl font-black italic tracking-tighter text-slate-100 mt-2">
              {formatPercent(tournament.platform_fee_percent ?? 0)}
            </p>
          </div>
          <span className="text-[9px] text-slate-500 font-bold uppercase mt-2">Cut rate set for match facilitation</span>
        </div>

        <div className="card p-6 bg-slate-900/40 border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Platform Cut USD</span>
            <p className="text-3xl font-black italic tracking-tighter text-amber-500 mt-2">
              {formatUSD(platformCut)}
            </p>
          </div>
          <span className="text-[9px] text-slate-500 font-bold uppercase mt-2">Estimated processing levy</span>
        </div>

        <div className="card p-6 bg-slate-900/40 border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Contender Share Pot</span>
            <p className="text-3xl font-black italic tracking-tighter text-primary mt-2">
              {formatUSD(distributablePot)}
            </p>
          </div>
          <span className="text-[9px] text-slate-500 font-bold uppercase mt-2">To be split amongst winners</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        
        {/* LEFT COMPONENT: Prize configuration & Management Panel */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scale className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-black uppercase text-white italic tracking-tight">Prize Slicing Allocation</h3>
            </div>
            {canEditConfig && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-primary/35 text-primary text-[10px] uppercase font-black tracking-widest rounded-xl transition-all"
              >
                Modify Allocation
              </button>
            )}
          </div>

          <div className="card p-6 border-white/5 bg-slate-900/10 space-y-6">
            {!isEditing ? (
              // READ-ONLY PRIZE BREAKDOWN TABLE
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="border-b border-white/5 text-[9px] text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="pb-3">Placement</th>
                        <th className="pb-3 text-right">Pre-tax Cut</th>
                        <th className="pb-3 text-right">Projected Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {tournament.prize_percentages && Object.entries(tournament.prize_percentages).length > 0 ? (
                        Object.entries(tournament.prize_percentages)
                          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                          .map(([pos, percent]) => {
                            const estPayout = (distributablePot * percent) / 100;
                            return (
                              <tr key={pos}>
                                <td className="py-3.5 font-bold uppercase tracking-tight text-white">
                                  {getPositionLabel(pos)}
                                </td>
                                <td className="py-3.5 text-right font-mono text-slate-400">
                                  {formatPercent(percent)}
                                </td>
                                <td className="py-3.5 text-right font-mono font-black text-emerald-400">
                                  {formatUSD(estPayout)}
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-600 font-bold uppercase italic">
                            Zero prize tiers declared. Using fallback static model.
                          </td>
                        </tr>
                      )}
                      
                      {/* Platform row */}
                      <tr className="bg-slate-950/20 text-slate-400 font-bold border-t border-white/10">
                        <td className="py-3 px-2 uppercase text-[9px] tracking-wider text-slate-500">
                          Platform Administration Fee
                        </td>
                        <td className="py-3 text-right font-mono">
                          {formatPercent(tournament.platform_fee_percent ?? 0)}
                        </td>
                        <td className="py-3 text-right font-mono text-amber-500">
                          {formatUSD(platformCut)}
                        </td>
                      </tr>

                      {/* Cumulative total row */}
                      <tr className="bg-slate-950/40 text-white font-black border-t-2 border-white/15">
                        <td className="py-3 px-2 uppercase text-[10px] tracking-wider italic">
                          Total Budget Distribution
                        </td>
                        <td className="py-3 text-right font-mono text-primary">
                          {formatPercent((tournament.prize_percentages ? Object.values(tournament.prize_percentages).reduce((s, p) => s + p, 0) : 0) + (tournament.platform_fee_percent ?? 0))}
                        </td>
                        <td className="py-3 text-right font-mono text-emerald-400 font-extrabold">
                          {formatUSD(escrowLive)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {tournament.payout_status && tournament.payout_status !== 'none' && (
                  <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-xl text-xs font-bold uppercase tracking-[0.05em] flex items-center space-x-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Payout Matrix Status: {tournament.payout_status.toUpperCase()}</span>
                  </div>
                )}
              </div>
            ) : (
              // EDITABLE PRIZE BREAKDOWN FORM
              <div className="space-y-6">
                
                {/* Presets Grid */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Available Matrix Blueprints</span>
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-black uppercase tracking-wider">
                    <button 
                      type="button" 
                      onClick={() => loadPreset('top3')}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 hover:border-slate-700"
                    >
                      Top 3 (10% Fee)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => loadPreset('top5')}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 hover:border-slate-700"
                    >
                      Top 5 (10% Fee)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => loadPreset('top10')}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 hover:border-slate-700"
                    >
                      Top 10 (10% Fee)
                    </button>
                  </div>
                </div>

                {/* Platform Levy Settings */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Platform Levy Cut Percent (%)</label>
                  <input 
                    type="number"
                    value={platformFee}
                    onChange={(e) => {
                      setPlatformFee(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)));
                      setValidationResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold italic font-mono focus:border-primary/50 outline-none transition-all"
                  />
                </div>

                {/* Individual Positions Layout */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Tiers & Percentage Weights</span>
                    <button 
                      type="button"
                      onClick={handleAddPosition}
                      className="inline-flex items-center space-x-1 hover:text-primary text-[9px] text-slate-500 uppercase font-black tracking-widest"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Position Tier</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {positions.map((item, index) => (
                      <div key={item.position} className="flex items-center gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                        <span className="text-[11px] font-extrabold uppercase italic tracking-tight text-slate-300 w-32 whitespace-nowrap">
                          {getPositionLabel(item.position)}
                        </span>
                        
                        <div className="flex-1 flex items-center space-x-2">
                          <input 
                            type="number"
                            step="0.1"
                            value={item.percentage}
                            onChange={(e) => handlePercentageChange(index, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs font-mono font-bold text-right"
                          />
                          <span className="text-slate-500 font-bold font-mono text-xs">%</span>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleRemovePosition(index)}
                          className="p-1 px-2.5 bg-red-950/20 text-red-500 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/30 rounded-lg transition-all"
                          title="Remove payout tier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {positions.length === 0 && (
                      <p className="text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest py-4 italic">
                        Empty distribution roster. Add positions above.
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Math Balance */}
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <div className="flex justify-between">
                    <span>Sum of Winner Cuts:</span>
                    <span className="font-mono font-black text-slate-300">{currentSumPercentages.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Admin Cut:</span>
                    <span className="font-mono font-black text-slate-300">{platformFee.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 font-black text-xs">
                    <span className="text-slate-300">Cumulative Weighted Sum:</span>
                    <span className={`font-mono ${currentTotalSum === 100 ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`}>
                      {currentTotalSum.toFixed(2)}% <span className="text-[10px]">/ 100.00%</span>
                    </span>
                  </div>
                </div>

                {/* Validation result warnings block */}
                {validationResult && (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 font-medium ${
                    validationResult.valid 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <div className="flex items-center space-x-2 font-black uppercase text-[10px] tracking-wider mb-1">
                      {validationResult.valid ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Validation Cleared</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span>Validation Discrepancies</span>
                        </>
                      )}
                    </div>
                    {validationResult.errors && validationResult.errors.map((err, i) => (
                      <p key={i} className="pl-1 flex gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{err}</p>
                    ))}
                    {validationResult.valid && (
                      <p>Matrix totals are balanced, conforming to exactly 100.00% sum validation guidelines.</p>
                    )}
                  </div>
                )}

                {/* Configuration controls */}
                <div className="flex gap-3 justify-end text-[10px] uppercase font-black tracking-widest pt-3 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setValidationResult(null);
                    }}
                    className="px-4 py-2.5 bg-slate-950 text-slate-400 hover:text-white border border-slate-850 hover:border-slate-800 rounded-xl"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="button"
                    disabled={validating}
                    onClick={handleValidateConfig}
                    className="px-4 py-2.5 bg-slate-900 border border-slate-850 hover:border-slate-800 hover:text-white rounded-xl flex items-center space-x-1"
                  >
                    {validating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Scale className="w-3.5 h-3.5 text-primary" />
                        <span>Validate Matrix</span>
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    disabled={saving || !validationResult?.valid}
                    onClick={handleSaveConfig}
                    className="px-5 py-2.5 bg-primary text-slate-900 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 rounded-xl flex items-center space-x-1"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-900" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        <span>Apply Allocation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT: Payout/Distribution Panel & Ledger */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-black uppercase text-white italic tracking-tight">Active Disbursements</h3>
          </div>

          <div className="space-y-6">
            
            {/* Action Card */}
            {canDistribute ? (
              <div className="card p-6 border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.04] transition-all space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl animate-pulse">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black italic uppercase tracking-wider text-white">Disbursement Authorization Unlocked</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold mt-1">
                      This tournament is officially COMPLETED. Live escrow is securely accrued. Click below to distribute player cuts and platform splits.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <div className="p-3 bg-slate-950/60 border border-white/[0.01] rounded-xl font-medium">
                    <span>Total Distribution:</span>
                    <span className="block text-slate-100 font-mono font-black text-sm mt-1">{formatUSD(escrowLive)}</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-white/[0.01] rounded-xl font-medium">
                    <span>Platform Levy Earned:</span>
                    <span className="block text-amber-500 font-mono font-black text-sm mt-1">{formatUSD(platformCut)}</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setShowDistributeModal(true)}
                  className="w-full py-4.5 bg-emerald-600 hover:bg-emerald-500 text-white select-none shadow-xl hover:shadow-emerald-600/10 rounded-xl text-xs uppercase font-extrabold tracking-widest transition-transform hover:scale-[1.01] active:scale-[0.99] text-center"
                >
                  Initiate Prize Distribution
                </button>
              </div>
            ) : (
              <div className="card p-6 border-slate-850 bg-slate-900/10 space-y-3">
                <div className="flex gap-4">
                  <div className="p-3 bg-slate-950 text-slate-500 rounded-xl border border-slate-850 shrink-0">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Payout Clearance Locked</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-normal mt-1">
                      {tournament.status !== 'completed' ? (
                        <span>The tournament status is actively '{tournament.status}'. Disbursements can only be unlocked once marked as 'completed' and all matches finish.</span>
                      ) : escrowLive <= 0 ? (
                        <span>Escrow reserves are empty ($0.00). Payout splits are only applicable on paid tournaments.</span>
                      ) : (
                        <span>Distribution completed. All player ledger books settled.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Leaderboard with Prize Preview (4C) */}
            <div className="space-y-3">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">Leaderboard & Prizes Auditing Matrix</span>
              
              <div className="card border-white/5 bg-slate-950/40 overflow-hidden">
                {loadingLeaderboard ? (
                  <div className="flex flex-col items-center justify-center p-12 space-y-2 text-[10px] font-black uppercase text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span className="tracking-widest">Compiling winner rosters...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-950 border-b border-white/5 text-[9px] text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Rank</th>
                          <th className="px-4 py-3">Player Identity</th>
                          <th className="px-4 py-3 text-right">Placement Prize</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-semibold text-slate-350">
                        {leaderboardData && leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0 ? (
                          leaderboardData.leaderboard.map((player: any, idx: number) => {
                            const isPaidOut = leaderboardData.payout_status === 'completed';
                            const amt = isPaidOut ? player.prize_amount_usd : player.projected_prize_usd;
                            
                            return (
                              <tr key={idx} className="hover:bg-white/[0.01]">
                                <td className="px-4 py-3 font-bold font-mono text-white text-xs">{player.rank || idx + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="text-white uppercase tracking-tight text-[11px] font-bold">
                                      {player.username || 'System User'}
                                    </span>
                                    <span className="text-[8px] text-slate-600 font-mono">
                                      Group: {player.group_name || 'Main Bracket'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center space-x-1.5 font-mono text-xs font-black">
                                    {isPaidOut ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3px]" />
                                        <span className="text-emerald-400">{formatUSD(amt ?? 0)}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-amber-500">{formatUSD(amt ?? player.projected_prize_usd ?? 0)}</span>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-12 text-center text-slate-600 font-bold uppercase tracking-widest italic text-[11px]">
                              Zero placement entries compiled in ledger.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Confirmation Modal (4B) before prize distribution */}
      {showDistributeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowDistributeModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black italic uppercase text-white tracking-widest">Disbursement Authorization Clearance</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Execute ledger transfer to winning contenders</p>
              </div>
            </div>

            <div className="p-4 bg-red-950/25 border border-red-900/30 text-red-400 text-xs font-bold uppercase tracking-[0.05em] rounded-xl flex items-center gap-3 mb-6">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 animate-pulse" />
              <span>WARNING: This action is irreversible. All funds settle instantly once cleared.</span>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2.5 text-xs text-slate-400 uppercase font-bold tracking-wider">
                <div className="flex justify-between">
                  <span>Total Escrow Reserves:</span>
                  <span className="font-mono font-black text-white">{formatUSD(escrowLive)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Cut ({tournament.platform_fee_percent}%):</span>
                  <span className="font-mono font-black text-amber-500">{formatUSD(platformCut)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 font-black text-sm text-slate-350">
                  <span className="text-slate-100">Contenders Net Split Amount:</span>
                  <span className="font-mono tracking-tight text-emerald-400">{formatUSD(distributablePot)}</span>
                </div>
              </div>

              {/* Individual payouts list */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">Recipient Ledger breakdown</span>
                <div className="max-h-36 overflow-y-auto pr-1 space-y-1 text-xs">
                  {leaderboardData && leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0 ? (
                    leaderboardData.leaderboard.map((item: any, id: number) => {
                      const prizeAmt = (distributablePot * (tournament.prize_percentages?.[item.rank?.toString() || (id+1).toString()] ?? 0)) / 100;
                      return (
                        <div key={id} className="p-2.5 bg-slate-950/20 border border-slate-850/40 rounded-lg flex justify-between items-center font-medium">
                          <span className="font-bold text-slate-300">{getPositionLabel(item.rank?.toString() || (id+1).toString())}: {item.username}</span>
                          <span className="font-mono text-[11px] font-black text-emerald-400">{formatUSD(prizeAmt)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-600 font-bold py-2 uppercase italic text-[10px]">No recipients calculated.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end items-center text-[10px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setShowDistributeModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={distributing}
                onClick={handleDistributePrizes}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg flex items-center space-x-1.5 font-bold cursor-pointer"
              >
                {distributing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Authorize Disbursement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
