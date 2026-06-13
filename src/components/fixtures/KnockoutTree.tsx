import React, { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { motion } from 'motion/react';
import { cn, getPublicIdentity } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { PlayerBadge } from '../ui/PlayerBadge';
import { useMatchCompletionSync } from '../../hooks/useMatchCompletionSync';
import { Trophy, Shield, HelpCircle, CornerDownRight, Compass } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { overrideTournamentChampion } from '../../utils/tournamentOverrides';

interface KnockoutTreeProps {
  tournamentId: string;
}

export default function KnockoutTree({ tournamentId }: KnockoutTreeProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [dbChampion, setDbChampion] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshCount } = useMatchCompletionSync(tournamentId);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel(`fixtures-badges-tree-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_badge_selections',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchMatches();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_champions',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refreshCount]);

  async function fetchMatches() {
    try {
      const [matchesData, champRes] = await Promise.all([
        tournamentService.getFixturesWithBadges(tournamentId),
        (supabase as any).from('tournament_champions').select('*').eq('tournament_id', tournamentId).maybeSingle()
      ]);
      
      const rawMatches = matchesData || [];
      const seenIds = new Set();
      const uniqueData = [];
      for (const m of rawMatches) {
        if (!m) continue;
        const mId = m.match_id || m.id;
        if (mId) {
          if (!seenIds.has(mId)) {
            seenIds.add(mId);
            uniqueData.push(m);
          }
        } else {
          uniqueData.push(m);
        }
      }
      
      setMatches(uniqueData);
      if (champRes && champRes.data) {
        const mappedChamp = overrideTournamentChampion(tournamentId, champRes.data);
        setDbChampion(mappedChamp);
      } else {
        // Since we created an override, we can check if tournamentId matches the UEFA ID
        // even if the DB returned null (champRes.data is null)
        const mappedChamp = overrideTournamentChampion(tournamentId, null);
        if (mappedChamp) {
          setDbChampion(mappedChamp);
        } else {
          setDbChampion(null);
        }
      }
    } catch (err) {
      console.error('Error fetching matches for bracket:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div id="bracket-loading" className="card p-12 bg-surface/50 border-border-main text-center shadow-sm">
        <LoadingState message="Mapping Brackets..." />
      </div>
    );
  }

  // Filter tournament bracket matches to knockout and playoffs stages only (excluding third_place)
  let bracketMatches = matches.filter(
    (m) => m && m.stage && (
      m.stage === 'knockout' || 
      m.stage === 'playoffs' || 
      m.stage === 'stage-playoffs' ||
      m.stage.toLowerCase().includes('knockout') ||
      m.stage.toLowerCase().includes('playoff') ||
      m.stage.toLowerCase().includes('quarter') ||
      m.stage.toLowerCase().includes('semi') ||
      m.stage.toLowerCase().includes('final') ||
      m.stage.toLowerCase().includes('main')
    ) && 
    !m.stage.toLowerCase().includes('group') && 
    !m.stage.toLowerCase().includes('league') && 
    !m.stage.toLowerCase().includes('third')
  );

  // Fallback: If no matches are found using the strict filters but we have matches, use all non-group, non-third matches
  if (bracketMatches.length === 0 && matches.length > 0) {
    bracketMatches = matches.filter(
      (m) => m && (!m.stage || (
        !m.stage.toLowerCase().includes('group') && 
        !m.stage.toLowerCase().includes('league') && 
        !m.stage.toLowerCase().includes('third')
      ))
    );
  }

  const thirdPlaceMatch = matches.find(
    (m) => m && m.stage && (m.stage === 'third_place' || m.stage === 'third-place' || m.stage.toLowerCase().includes('third'))
  );

  // Group by round
  const roundMap = bracketMatches.reduce((acc: any, match) => {
    const r = match.round || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(match);
    return acc;
  }, {});

  const roundKeys = Object.keys(roundMap)
    .map(Number)
    .sort((a, b) => a - b);

  if (roundKeys.length === 0) {
    return (
      <div id="bracket-no-rounds" className="py-20 text-center text-text-muted italic border-2 border-dashed border-border-main rounded-3xl">
        No tournament bracket rounds scheduled yet.
      </div>
    );
  }

  // Measurements
  const cardHeight = 110;
  const baseGap = 32;
  const colWidth = 220;
  const connWidth = 48;
  const colStep = colWidth + connWidth; // 268px

  // The first round has the most matches
  const col0MatchesCount = (roundMap[roundKeys[0]] || []).length || 1;
  const totalHeight = col0MatchesCount * cardHeight + (col0MatchesCount - 1) * baseGap + 48;

  // Let's formatting labels
  const getRoundLabel = (roundKey: number, isFinalCol: boolean) => {
    if (isFinalCol) return 'Grand Final';
    const totalRounds = roundKeys.length;
    const diff = totalRounds - roundKeys.indexOf(roundKey) - 1;
    if (diff === 1) return 'Semifinals';
    if (diff === 2) return 'Quarterfinals';
    return `Round ${roundKey}`;
  };

  const finalColIdx = roundKeys.length - 1;
  const finalMatches = roundMap[roundKeys[finalColIdx]] || [];
  const finalMatch = finalMatches[0];

  const finalFirstOffset = (Math.pow(2, finalColIdx) - 1) * (cardHeight / 2) + (Math.pow(2, finalColIdx) - 1) * (baseGap / 2);
  const finalCenterY = finalFirstOffset + cardHeight / 2;

  // Compute champion details
  const isFinalCompleted = (finalMatch && finalMatch.status === 'completed') || !!dbChampion;
  const finalScore1 = finalMatch?.score1;
  const finalScore2 = finalMatch?.score2;

  const finalWinner1 = (finalMatch && finalMatch.status === 'completed') && (
    (finalMatch.winner && finalMatch.winner === finalMatch.player1) ||
    (finalScore1 !== null && finalScore2 !== null && finalScore1 > finalScore2)
  );
  const finalWinner2 = (finalMatch && finalMatch.status === 'completed') && (
    (finalMatch.winner && finalMatch.winner === finalMatch.player2) ||
    (finalScore1 !== null && finalScore2 !== null && finalScore2 > finalScore1)
  );

  const championUsername = dbChampion 
    ? dbChampion.winner_username 
    : (finalWinner1 
        ? finalMatch.player1_username 
        : finalWinner2 
          ? finalMatch.player2_username 
          : null);

  const championBadgeId = dbChampion 
    ? dbChampion.winner_badge_id 
    : (finalWinner1 
        ? finalMatch.player1_badge_id 
        : finalWinner2 
          ? finalMatch.player2_badge_id 
          : null);

  const championName = championUsername ? getPublicIdentity(championUsername) : null;

  return (
    <div id="knockout-tree-container" className="w-full relative bg-gradient-to-b from-surface/25 to-background rounded-3xl border border-border-main p-4 md:p-8 overflow-hidden shadow-2xl">
      {/* Light glow effects */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Bracket Header with interactive manual scroll indicator */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-4 border-b border-border-main/20 gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight uppercase italic flex items-center justify-center sm:justify-start gap-3">
            <Trophy className="w-7 h-7 text-primary animate-pulse" />
            <span>CHAMPIONSHIP BRACKET</span>
          </h2>
          <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mt-1">
            Standard single elimination pathing • Interactive fixture nodes
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">
          <Compass className="w-4.5 h-4.5 text-primary" />
          <span>Swipe or Scroll Horizonally to view full path ➔</span>
        </div>
      </div>

      {/* Horizontal Scroll Stage */}
      <div id="bracket-scroll-stage" className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-border-main select-none animate-fade-in">
        {/* Relative Positioning Base matches the dynamic total height */}
        <div 
          style={{ height: `${totalHeight}px`, minWidth: `${(roundKeys.length + 1) * colStep + 64}px` }} 
          className="relative py-4 px-2"
        >
          {/* Columns & Connectors */}
          {roundKeys.map((roundKey, colIdx) => {
            const rawColMatches = roundMap[roundKey] || [];
            // Sort matches to pair correctly by slot
            const colMatches = [...rawColMatches].sort((a, b) => {
              const aSlot = a.bracket_slot !== undefined && a.bracket_slot !== null ? a.bracket_slot : 0;
              const bSlot = b.bracket_slot !== undefined && b.bracket_slot !== null ? b.bracket_slot : 0;
              if (aSlot !== bSlot) return aSlot - bSlot;

              const aOrder = a.match_order !== undefined && a.match_order !== null ? a.match_order : 0;
              const bOrder = b.match_order !== undefined && b.match_order !== null ? b.match_order : 0;
              return aOrder - bOrder;
            });

            // Calculate expected number of matches in this round
            const expectedCount = Math.pow(2, roundKeys.length - 1 - colIdx);
            
            // Build the padded list of match objects
            const paddedColMatches = Array.from({ length: expectedCount }, () => null as any);
            
            // First pass: assign matches with valid bracket_slot
            const unassignedMatches: any[] = [];
            colMatches.forEach((match) => {
              const slot = match.bracket_slot;
              if (slot !== undefined && slot !== null && slot >= 1 && slot <= expectedCount) {
                if (!paddedColMatches[slot - 1]) {
                  paddedColMatches[slot - 1] = match;
                } else {
                  unassignedMatches.push(match);
                }
              } else {
                unassignedMatches.push(match);
              }
            });
            
            // Second pass: fill remaining null slots with unassigned matches
            let unassignedIdx = 0;
            for (let i = 0; i < expectedCount; i++) {
              if (!paddedColMatches[i] && unassignedIdx < unassignedMatches.length) {
                paddedColMatches[i] = unassignedMatches[unassignedIdx];
                unassignedIdx++;
              }
            }
            
            // Third pass: fill remaining slots with placeholder objects to prevent missing branches
            const isFinalCol = colIdx === finalColIdx;
            for (let i = 0; i < expectedCount; i++) {
              if (!paddedColMatches[i]) {
                const isSemi = (roundKeys.length - 1 - colIdx) === 1;
                let tbdPlayer1 = 'TBD';
                let tbdPlayer2 = 'TBD';
                
                if (isSemi) {
                  tbdPlayer1 = `Winner QF Match ${i * 2 + 1}`;
                  tbdPlayer2 = `Winner QF Match ${i * 2 + 2}`;
                } else if (isFinalCol) {
                  tbdPlayer1 = `Winner SF Match 1`;
                  tbdPlayer2 = `Winner SF Match 2`;
                }

                paddedColMatches[i] = {
                  id: `placeholder-match-${roundKey}-${i + 1}`,
                  status: 'scheduled',
                  round: roundKey,
                  bracket_slot: i + 1,
                  player1_username: tbdPlayer1,
                  player2_username: tbdPlayer2,
                  score1: null,
                  score2: null,
                  is_placeholder: true
                };
              }
            }

            const xOffset = colIdx * colStep;

            return (
              <React.Fragment key={`round-col-fragment-${roundKey}`}>
                {/* Column Column Headers */}
                <div 
                  className="absolute z-20 text-center"
                  style={{ left: `${xOffset}px`, width: `${colWidth}px`, top: '0px' }}
                >
                  <span className="inline-block text-[9px] font-black text-primary uppercase tracking-widest italic bg-primary/10 border border-primary/20 px-3 py-1 rounded-full shadow-sm">
                    {getRoundLabel(roundKey, isFinalCol)}
                  </span>
                </div>

                {/* Match Cards of the current round */}
                {paddedColMatches.map((match, i) => {
                  const childFirstOffset = (Math.pow(2, colIdx) - 1) * (cardHeight / 2) + (Math.pow(2, colIdx) - 1) * (baseGap / 2);
                  const childGap = (Math.pow(2, colIdx) - 1) * cardHeight + Math.pow(2, colIdx) * baseGap;
                  const topPos = childFirstOffset + i * (cardHeight + childGap);

                  return (
                    <div 
                      key={`match-[${match.id || match.match_id}]`}
                      className="absolute"
                      style={{ left: `${xOffset}px`, width: `${colWidth}px`, top: `${topPos}px` }}
                    >
                      <MatchNode match={match} roundLabel={getRoundLabel(roundKey, isFinalCol)} />
                    </div>
                  );
                })}

                {/* SVG Connections to the next column */}
                {!isFinalCol && (
                  <svg 
                    className="absolute pointer-events-none"
                    style={{ 
                      left: `${xOffset + colWidth}px`, 
                      width: `${connWidth}px`, 
                      height: `${totalHeight}px`,
                      top: '0px'
                    }}
                  >
                    {paddedColMatches.map((childMatch, i) => {
                      const parentIdx = Math.floor(i / 2);
                      const parentColIdx = colIdx + 1;

                      // Compute positions
                      const childFirstOffset = (Math.pow(2, colIdx) - 1) * (cardHeight / 2) + (Math.pow(2, colIdx) - 1) * (baseGap / 2);
                      const childGap = (Math.pow(2, colIdx) - 1) * cardHeight + Math.pow(2, colIdx) * baseGap;
                      const childCenterY = childFirstOffset + i * (cardHeight + childGap) + cardHeight / 2;

                      const parentFirstOffset = (Math.pow(2, parentColIdx) - 1) * (cardHeight / 2) + (Math.pow(2, parentColIdx) - 1) * (baseGap / 2);
                      const parentGap = (Math.pow(2, parentColIdx) - 1) * cardHeight + Math.pow(2, parentColIdx) * baseGap;
                      const parentCenterY = parentFirstOffset + parentIdx * (cardHeight + parentGap) + cardHeight / 2;

                      const isCompleted = childMatch.status === 'completed';
                      const isWinnerP1 = isCompleted && childMatch.score1 > childMatch.score2;
                      const isWinnerP2 = isCompleted && childMatch.score2 > childMatch.score1;
                      const winnerUser = isWinnerP1 ? childMatch.player1_username : isWinnerP2 ? childMatch.player2_username : null;

                      // Path is highlighted if this child match has completed and successfully feeds its champion
                      const isPathActive = isCompleted && !!winnerUser;
                      const strokeColor = isPathActive ? 'rgba(59, 130, 246, 0.75)' : 'rgba(51, 65, 85, 0.25)';
                      const strokeWidth = isPathActive ? 2.5 : 1.5;
                      const strokeDash = isPathActive ? 'none' : '3,3';

                      return (
                        <g key={`path-${colIdx}-${i}`}>
                          {/* Shadow Background Line */}
                          <path 
                            d={`M 0,${childCenterY} H ${connWidth / 2} V ${parentCenterY} H ${connWidth}`}
                            fill="none"
                            stroke="rgba(15, 23, 42, 0.5)"
                            strokeWidth={strokeWidth + 1}
                          />
                          {/* Main Colored Connector line */}
                          <path 
                            d={`M 0,${childCenterY} H ${connWidth / 2} V ${parentCenterY} H ${connWidth}`}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDash}
                            className="transition-all duration-300"
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}
              </React.Fragment>
            );
          })}

          {/* CHAMPION / WINNER COLUMN (Emeges separately on the exact right) */}
          <div 
            className="absolute z-20 text-center"
            style={{ left: `${roundKeys.length * colStep}px`, width: `${colWidth}px`, top: '0px' }}
          >
            <span className="inline-block text-[9px] font-black text-amber-500 uppercase tracking-widest italic bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full shadow-sm">
              Winner Track
            </span>
          </div>

          {/* Connector Line from Grand Final to Champion details */}
          <svg
            className="absolute pointer-events-none"
            style={{
              left: `${(roundKeys.length - 1) * colStep + colWidth}px`,
              width: `${connWidth}px`,
              height: `${totalHeight}px`,
              top: '0px'
            }}
          >
            <g>
              <path 
                d={`M 0,${finalCenterY} H ${connWidth}`}
                fill="none"
                stroke={isFinalCompleted ? 'rgba(245, 158, 11, 0.8)' : 'rgba(51, 65, 85, 0.25)'}
                strokeWidth={isFinalCompleted ? 3 : 1.5}
                strokeDasharray={isFinalCompleted ? 'none' : '3,3'}
                className="transition-all duration-300"
              />
            </g>
          </svg>

          {/* Champion card node */}
          <div 
            className="absolute flex flex-col justify-center"
            style={{
              left: `${roundKeys.length * colStep}px`,
              width: `${colWidth}px`,
              top: `${finalCenterY - 60}px` // Centered on finalCenterY with height 120px
            }}
          >
            {isFinalCompleted && championName ? (
              <div className="relative group p-[2px] rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-2xl shadow-yellow-500/20 animate-fade-in hover:scale-[1.04] transition-all duration-300">
                <div className="bg-[#1e1503]/95 backdrop-blur-md border border-amber-400/40 rounded-[22px] p-4 text-center overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-1 bg-amber-500 text-black rounded-bl-xl text-[8px] font-black uppercase tracking-wider">
                    CHAMP
                  </div>
                  
                  {/* Glowing amber aura */}
                  <div className="absolute -inset-10 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center border-2 border-yellow-300 shadow-md mb-2">
                      <Trophy className="w-5.5 h-5.5 text-black" />
                    </div>

                    <PlayerBadge badgeId={championBadgeId} username={championUsername || 'TBD'} size="sm" className="w-7 h-7 rounded-sm mb-1" />
                    
                    <h3 className="font-sans font-black text-xs text-amber-200 uppercase tracking-tight truncate max-w-full">
                      {championName}
                    </h3>
                    <p className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest mt-0.5">
                      Tournament Winner 🏆
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-amber-500/30 bg-surface/30 rounded-3xl p-6 text-center select-none w-full h-[120px] flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-slate-900/60 border border-slate-800 text-slate-500 flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">
                  TBD Champion
                </span>
                <span className="text-[7px] text-text-muted font-bold tracking-wider uppercase mt-1">
                  Awaiting Grand Final
                </span>
              </div>
            )}
          </div>

          {/* Third Place Match positioned beautifully below the grand finals region */}
          {thirdPlaceMatch && (
            <div 
              className="absolute"
              style={{
                left: `${(roundKeys.length - 1) * colStep}px`,
                width: `${colWidth}px`,
                top: `${finalCenterY + cardHeight + 24}px` // Directly below the grand final
              }}
            >
              <div className="text-center mb-1.5">
                <span className="inline-block text-[8px] font-black text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full select-none uppercase tracking-widest">
                  3rd Place Track
                </span>
              </div>
              <MatchNode match={thirdPlaceMatch} roundLabel="3rd Place Match" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function MatchNode({ match, roundLabel, isFinal }: { match: any; roundLabel?: string; isFinal?: boolean }) {
  const navigate = useNavigate();
  const isCompleted = match.status === 'completed';
  const score1 = match.score1;
  const score2 = match.score2;
  const isWinner1 = isCompleted && score1 !== null && score2 !== null && score1 > score2;
  const isWinner2 = isCompleted && score1 !== null && score2 !== null && score2 > score1;

  const rawCleanLabel = roundLabel 
    ? (roundLabel.endsWith('s') ? roundLabel.slice(0, -1) : roundLabel) 
    : (match.stage === 'third_place' || match.stage === 'third-place' ? '3rd Place' : `Round ${match.round}`);

  const cleanLabel = rawCleanLabel.replace('-Finals', '-Final').replace('finals', 'final').replace('Finals', 'Final');

  const p1Name = match.player1_username ? getPublicIdentity(match.player1_username) : 'TBD';
  const p2Name = match.player2_username ? getPublicIdentity(match.player2_username) : 'TBD';

  const championName = isFinal && isCompleted
    ? (isWinner1 ? p1Name : isWinner2 ? p2Name : null)
    : null;

  return (
    <div 
      onClick={() => {
        if (match.is_placeholder || !match.id || String(match.id).startsWith('placeholder')) {
          return;
        }
        navigate(`/matches/${match.match_id || match.id}`);
      }}
      className={cn(
        "bg-surface/90 backdrop-blur-md border rounded-2xl w-full shadow-lg transition-all duration-300 relative z-10 overflow-hidden group/card",
        match.is_placeholder 
          ? "border-dashed border-border-main/50 cursor-default opacity-50 bg-[#1e293b]/10" 
          : "cursor-pointer hover:scale-[1.03]" + (isFinal 
              ? (isCompleted ? " border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-[#1e1503]/90" : " border-amber-500/40 hover:border-amber-400")
              : (isCompleted ? " border-border-main hover:border-primary/40" : " border-primary/20 hover:border-primary")
            )
      )}
    >
      {isFinal && isCompleted && championName && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black text-[9px] font-black uppercase tracking-[0.2em] py-1.5 text-center font-bold flex items-center justify-center gap-1 shadow-md select-none">
          <Trophy className="w-3.5 h-3.5 text-black animate-bounce" />
          <span>CHAMPION: {championName} 🏆</span>
        </div>
      )}

      {/* Top Status Header */}
      <div className="px-3 py-1 bg-background/50 border-b border-border-main flex justify-between items-center text-[9px] font-black tracking-wider text-text-muted">
        <span className="uppercase italic">
          {cleanLabel}
        </span>
        <span className={cn(
          "uppercase tracking-widest px-1 py-0.2 rounded font-black",
          match.status === 'completed' ? "text-emerald-500" : "text-primary animate-pulse"
         )}>
          {match.status}
        </span>
      </div>

      {/* Player 1 Row */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 transition-all duration-300",
        isWinner1 ? "bg-emerald-500/5" : isWinner2 ? "opacity-30 blur-[1px] filter grayscale saturate-50" : ""
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <PlayerBadge badgeId={match.player1_badge_id} username={match.player1_username || 'TBD'} size="xs" className="w-5 h-5 rounded" />
          <span className={cn(
            "font-black text-[11px] truncate uppercase tracking-tight",
            isWinner1 ? "text-primary" : "text-text-main"
          )}>
            {p1Name}
          </span>
        </div>
        {isCompleted && score1 !== null ? (
          <span className={cn(
            "font-black text-xs px-1.5 py-0.5 rounded bg-background/60 min-w-[20px] text-center",
            isWinner1 ? "text-primary border border-primary/20" : "text-text-muted"
          )}>
            {score1}
          </span>
        ) : (
          <span className="text-text-muted opacity-30 text-[10px] font-bold italic">-</span>
        )}
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-border-main w-full" />

      {/* Player 2 Row */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 transition-all duration-300",
        isWinner2 ? "bg-emerald-500/5" : isWinner1 ? "opacity-30 blur-[1px] filter grayscale saturate-50" : ""
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <PlayerBadge badgeId={match.player2_badge_id} username={match.player2_username || 'TBD'} size="xs" className="w-5 h-5 rounded" />
          <span className={cn(
            "font-black text-[11px] truncate uppercase tracking-tight",
            isWinner2 ? "text-primary" : "text-text-main"
          )}>
            {p2Name}
          </span>
        </div>
        {isCompleted && score2 !== null ? (
          <span className={cn(
            "font-black text-xs px-1.5 py-0.5 rounded bg-background/60 min-w-[20px] text-center",
            isWinner2 ? "text-primary border border-primary/20" : "text-text-muted"
          )}>
            {score2}
          </span>
        ) : (
          <span className="text-text-muted opacity-30 text-[10px] font-bold italic">-</span>
        )}
      </div>
    </div>
  );
}
