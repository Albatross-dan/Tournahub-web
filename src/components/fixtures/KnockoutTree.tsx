import React, { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { motion } from 'motion/react';
import { cn, getPublicIdentity } from '../../lib/utils';
import LoadingState from '../ui/LoadingState';
import { PlayerBadge } from '../ui/PlayerBadge';
import { useMatchCompletionSync } from '../../hooks/useMatchCompletionSync';
import { Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface KnockoutTreeProps {
  tournamentId: string;
}

export default function KnockoutTree({ tournamentId }: KnockoutTreeProps) {
  const [matches, setMatches] = useState<any[]>([]);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refreshCount]);

  async function fetchMatches() {
    try {
      const matchesData = await tournamentService.getFixturesWithBadges(tournamentId);
      setMatches(matchesData || []);
    } catch (err) {
      console.error('Error fetching matches for bracket:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-12 bg-surface/50 border-border-main text-center shadow-sm">
        <LoadingState message="Mapping Brackets..." />
      </div>
    );
  }

  const height = 660; // Standard bracket height for perfect alignment

  // Filter tournament bracket matches to knockout and playoffs stages only (excluding third_place)
  const bracketMatches = matches.filter(
    (m) => (m.stage === 'knockout' || m.stage === 'playoffs' || m.stage === 'stage-playoffs')
  );

  const thirdPlaceMatch = matches.find(
    (m) => (m.stage === 'third_place' || m.stage === 'third-place')
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
      <div className="py-20 text-center text-text-muted italic border-2 border-dashed border-border-main rounded-3xl">
        No tournament bracket rounds scheduled yet.
      </div>
    );
  }

  const finalRoundKey = roundKeys[roundKeys.length - 1];
  const finalMatches = roundMap[finalRoundKey] || [];
  const finalMatch = finalMatches[0];

  const previousRoundKeys = roundKeys.filter(k => k !== finalRoundKey);

  const leftColumns: { roundKey: number; label: string; matches: any[] }[] = [];
  const rightColumns: { roundKey: number; label: string; matches: any[] }[] = [];

  const getRoundLabelByCount = (roundKey: number, totalRounds: number, matchesCount: number) => {
    if (roundKey === finalRoundKey) return 'Grand Final';
    // If double sided, total matches in round = matchesCount * 2
    const totalRoundMatches = matchesCount * 2;
    if (totalRoundMatches === 8) return 'Quarterfinals';
    if (totalRoundMatches === 4) return 'Quarterfinals';
    if (totalRoundMatches === 2) return 'Semifinals';
    return `Round ${roundKey}`;
  };

  previousRoundKeys.forEach(roundKey => {
    const roundMatches = roundMap[roundKey] || [];
    // Sort to ensure stable position assignment
    const sortedRoundMatches = [...roundMatches].sort((a, b) => {
      const aId = a?.match_id || a?.id || '';
      const bId = b?.match_id || b?.id || '';
      return aId.localeCompare(bId);
    });
    const half = Math.ceil(sortedRoundMatches.length / 2);
    const leftPart = sortedRoundMatches.slice(0, half);
    const rightPart = sortedRoundMatches.slice(half);

    leftColumns.push({
      roundKey,
      label: getRoundLabelByCount(roundKey, roundKeys.length, sortedRoundMatches.length),
      matches: leftPart
    });

    rightColumns.push({
      roundKey,
      label: getRoundLabelByCount(roundKey, roundKeys.length, sortedRoundMatches.length),
      matches: rightPart
    });
  });

  // Right side columns go symmetrically from inside-out: Semifinals -> Quarterfinals -> Round of 16
  const rightColumnsSymmetric = [...rightColumns].reverse();

  return (
    <div className="w-full relative bg-radial-gradient from-surface/20 to-background rounded-3xl border border-border-main p-4 md:p-8 overflow-hidden">
      {/* Visual neon ambient decoration light */}
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Bracket Title */}
      <div className="text-center mb-8 border-b border-border-main/20 pb-4">
        <h2 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight uppercase italic flex items-center justify-center gap-3">
          <Trophy className="w-7 h-7 text-primary animate-pulse" />
          <span>KNOCKOUT TREE</span>
        </h2>
        <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mt-1">
          Championship bracket pathing • Click any match node to chat & resolve
        </p>
      </div>

      {/* Responsive Horizontal Scroll Stage Container */}
      <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-border-main select-none animate-fade-in">
        <div className="flex items-center justify-center min-w-[1000px] gap-6 xl:gap-10 py-4 px-2">
          
          {/* LEFT COLUMN TREE BRACKETS INWARD (Ascending, e.g. R1 -> R2 -> Semis) */}
          <div className="flex items-center gap-6 xl:gap-8 justify-end">
            {leftColumns.map((col, colIdx) => (
              <div key={`left-col-${col.roundKey}`} className="flex flex-col items-center">
                {/* Column header label */}
                <span className="text-[9px] font-black text-primary uppercase tracking-widest italic mb-4 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  {col.label}
                </span>
                
                {/* Vertical aligned blocks list */}
                <div 
                  style={{ height: `${height}px` }} 
                  className="flex flex-col justify-around relative py-2 w-[190px] sm:w-[220px]"
                >
                  {col.matches.map((match, matchIdx) => (
                    <div key={`left-node-${match.match_id || match.id || matchIdx}`} className="relative flex items-center py-1">
                      <MatchNode match={match} roundLabel={col.label} />
                      <MatchConnector 
                        side="left" 
                        colIdx={colIdx} 
                        totalCols={leftColumns.length} 
                        matchIdx={matchIdx} 
                        matchesCount={col.matches.length} 
                        height={height} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CENTRAL STAGE FOCAL POINT (The Grand Final & 3rd Place with the Championship Cup) */}
          <div className="flex flex-col items-center justify-center gap-6 min-w-[280px] relative px-4">
            <div className="absolute w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="flex flex-col items-center text-center space-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/10 border-2 border-yellow-300 animate-bounce">
                <Trophy className="w-8 h-8 text-background font-bold" />
              </div>
              <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase tracking-widest italic animate-pulse">
                FINALS STAGE
              </h3>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Championship & Podium showdowns</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
              {/* Grand Final Column */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-[0.2em] bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full select-none">
                  Grand Final
                </span>
                {finalMatch ? (
                  <div className="relative group p-1 rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 scale-[1.03] shadow-xl shadow-yellow-500/15">
                    <MatchNode match={finalMatch} roundLabel="Grand Final" isFinal={true} />
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-border-main rounded-2xl text-xs italic text-text-muted uppercase text-center font-bold tracking-widest bg-surface/30 w-[190px] sm:w-[220px]">
                    TBD Finalists
                  </div>
                )}
              </div>

              {/* 3rd Place (Bronze) Column */}
              {thirdPlaceMatch && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[8px] font-black text-teal-400 uppercase tracking-[0.2em] bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full select-none">
                    3rd Place Match
                  </span>
                  <div className="relative group p-1 rounded-3xl bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 scale-[1.03] shadow-xl">
                    <MatchNode match={thirdPlaceMatch} roundLabel="3rd Place Track" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN TREE BRACKETS INWARD (Descending, e.g. Semis <- R2 <- R1) */}
          <div className="flex items-center gap-6 xl:gap-8 justify-start">
            {rightColumnsSymmetric.map((col, colIdx) => (
              <div key={`right-col-${col.roundKey}`} className="flex flex-col items-center">
                {/* Column header label */}
                <span className="text-[9px] font-black text-primary uppercase tracking-widest italic mb-4 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  {col.label}
                </span>

                {/* Vertical aligned blocks list */}
                <div 
                  style={{ height: `${height}px` }} 
                  className="flex flex-col justify-around relative py-2 w-[190px] sm:w-[220px]"
                >
                  {col.matches.map((match, matchIdx) => (
                    <div key={`right-node-${match.match_id || match.id || matchIdx}`} className="relative flex items-center py-1">
                      <MatchConnector 
                        side="right" 
                        colIdx={rightColumns.length - 1 - colIdx} 
                        totalCols={rightColumns.length} 
                        matchIdx={matchIdx} 
                        matchesCount={col.matches.length} 
                        height={height} 
                      />
                      <MatchNode match={match} roundLabel={col.label} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

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

  // Singularize e.g. Quarter-Finals to Quarter-Final
  const cleanLabel = rawCleanLabel.replace('-Finals', '-Final').replace('finals', 'final').replace('Finals', 'Final');

  const p1Name = match.player1_username ? getPublicIdentity(match.player1_username) : 'TBD';
  const p2Name = match.player2_username ? getPublicIdentity(match.player2_username) : 'TBD';

  const championName = isFinal && isCompleted
    ? (isWinner1 ? p1Name : isWinner2 ? p2Name : null)
    : null;

  return (
    <div 
      onClick={() => navigate(`/matches/${match.match_id || match.id}`)}
      className={cn(
        "bg-surface/90 backdrop-blur-md border rounded-2xl w-[190px] sm:w-[220px] shadow-lg transition-all duration-300 hover:scale-[1.03] relative z-10 cursor-pointer overflow-hidden group/card",
        isFinal 
          ? (isCompleted ? "border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-[#1e1503]/90" : "border-amber-500/40 hover:border-amber-400")
          : (isCompleted ? "border-border-main hover:border-primary/40" : "border-primary/20 hover:border-primary")
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

function MatchConnector({ 
  side, 
  colIdx, 
  totalCols, 
  matchIdx, 
  matchesCount, 
  height 
}: { 
  side: 'left' | 'right'; 
  colIdx: number; 
  totalCols: number; 
  matchIdx: number; 
  matchesCount: number; 
  height: number;
}) {
  if (colIdx === totalCols - 1) {
    const isLeft = side === 'left';
    return (
      <div 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-0 pointer-events-none flex items-center w-5 sm:w-8 xl:w-10 h-[2px] bg-primary/25",
          isLeft ? "right-0 translate-x-full" : "left-0 -translate-x-full"
        )}
      />
    );
  }

  const isTop = matchIdx % 2 === 0;
  const isLeft = side === 'left';
  const vertHeight = height / (matchesCount * 2);

  return (
    <div 
      className={cn(
        "absolute top-1/2 -translate-y-1/2 z-0 pointer-events-none flex items-center w-5 sm:w-8",
        isLeft ? "right-0 translate-x-full h-[2px]" : "left-0 -translate-x-full h-[2px]"
      )}
    >
      <div className="w-full h-[2px] bg-primary/25 relative">
        <div 
          style={{ height: `${vertHeight}px` }}
          className={cn(
            "absolute w-[2px] bg-primary/25",
            isLeft ? "right-0" : "left-0",
            isTop ? "top-0" : "bottom-0"
          )}
        />
        <div 
          className={cn(
            "absolute w-5 sm:w-8 h-[2px] bg-primary/25",
            isLeft ? "right-[-18px] sm:right-[-32px]" : "left-[-18px] sm:left-[-32px]"
          )}
          style={isTop ? { top: `${vertHeight}px` } : { bottom: `${vertHeight}px` }}
        />
      </div>
    </div>
  );
}
