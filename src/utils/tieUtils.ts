import { supabase } from '../lib/supabase';

export interface GroupedTie {
  tie_id: string;
  stage: string;
  round: number;
  leg1: any | null;
  leg2: any | null;
  // Primary players based on Leg 1
  player1: any;
  player2: any;
  player1_username: string | null;
  player2_username: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
  player1_badge_id?: string | null;
  player2_badge_id?: string | null;
  player1_avatar_url?: string | null;
  player2_avatar_url?: string | null;
  
  // Scores for Primary Player 1 and Player 2
  leg1_p1_score: number | null;
  leg1_p2_score: number | null;
  leg2_p1_score: number | null;
  leg2_p2_score: number | null;

  aggregate_score1: number | null;
  aggregate_score2: number | null;
  
  tie_status: string | null; // 'leg1_complete' | 'aggregate_complete' | 'level_pending_admin' | etc.
  winner_username: string | null;
  advancing_player_username: string | null;
  is_level_pending_admin: boolean;
  is_completed: boolean;
  is_leg1_completed: boolean;
  is_leg2_completed: boolean;
  is_placeholder: boolean;
  placeholder_text: string | null;
  matches: any[];
}

export type DisplayUnit = 
  | { type: 'tie'; tie: GroupedTie; id: string; stage: string; round: number }
  | { type: 'single'; match: any; id: string; stage: string; round: number };

/**
 * Checks if a player identifier represents a placeholder/TBD user
 */
export function isPlaceholderPlayer(player: any, username: string | null | undefined): boolean {
  if (!player && !username) return true;
  if (!username) return false;
  const lower = username.trim().toLowerCase();
  return (
    lower === 'unknown player' || 
    lower === 'tbd' || 
    lower === 'unknown' || 
    lower === 'placeholder' ||
    lower === 'awaiting players'
  );
}

/**
 * Returns descriptive placeholder text for matches without resolved players
 */
export function getPlaceholderText(stage: string | null | undefined, round?: number | null): string {
  const st = (stage || '').toLowerCase();
  if (st.includes('semi')) {
    return 'TBD — awaiting quarterfinal results';
  }
  if (st.includes('final') && !st.includes('semi') && !st.includes('quarter')) {
    return 'TBD — awaiting semifinal results';
  }
  if (st.includes('quarter')) {
    return 'TBD — awaiting round of 16 / playoff results';
  }
  return 'TBD — awaiting previous round results';
}

/**
 * Formats a stage and leg into a clear, standardized label
 * e.g., "QUARTERFINAL · LEG 1 OF 2", "SEMIFINAL · LEG 2 OF 2", "FINAL"
 */
export function formatLegLabel(stage: string | null | undefined, leg: number | null | undefined, totalLegs: number = 2): string {
  const st = (stage || '').toUpperCase().replace('_', ' ');
  let baseStage = st;
  if (st.includes('QUARTER')) baseStage = 'QUARTERFINAL';
  else if (st.includes('SEMI')) baseStage = 'SEMIFINAL';
  else if (st.includes('FINAL')) baseStage = 'FINAL';
  else if (st.includes('ROUND OF 16')) baseStage = 'ROUND OF 16';
  else if (st.includes('PLAYOFF')) baseStage = 'PLAYOFF';

  if (!leg || totalLegs <= 1 || baseStage === 'FINAL') {
    return baseStage;
  }
  return `${baseStage} · LEG ${leg} OF ${totalLegs}`;
}

/**
 * Groups a list of matches into DisplayUnit items (ties and singles)
 * Group stage and league matches are NEVER grouped into ties.
 * Knockout matches sharing a tie_id (or same two players with reversed home/away) are grouped.
 */
export function groupMatchesIntoDisplayUnits(rawMatches: any[]): DisplayUnit[] {
  if (!Array.isArray(rawMatches) || rawMatches.length === 0) return [];

  const result: DisplayUnit[] = [];
  const processedMatchIds = new Set<string>();

  // Filter out any undefined or null matches
  const validMatches = rawMatches.filter(Boolean);

  for (let i = 0; i < validMatches.length; i++) {
    const match = validMatches[i];
    const matchId = String(match.id || match.match_id || `match-${i}`);

    if (processedMatchIds.has(matchId)) {
      continue;
    }

    const stage = (match.stage || '').toLowerCase();
    const isGroupStage = stage === 'group_stage' || stage === 'group' || stage === 'league';
    const isFinalStage = stage === 'final' && !match.tie_id;

    // Group stage, league, and single-match finals without tie_id are always single matches
    if (isGroupStage || isFinalStage) {
      processedMatchIds.add(matchId);
      result.push({
        type: 'single',
        match,
        id: matchId,
        stage: match.stage,
        round: match.round || 1
      });
      continue;
    }

    // Check if this match is part of a two-legged tie
    let partnerMatch: any = null;

    if (match.tie_id) {
      // Find partner by tie_id
      partnerMatch = validMatches.find(
        (m, idx) => idx !== i && m.tie_id === match.tie_id && !processedMatchIds.has(String(m.id || m.match_id || `match-${idx}`))
      );
    } else {
      // Fallback: Pair by stage, round, and reversed players in knockout stage
      const p1 = match.player1_username || match.player1?.username || match.player1;
      const p2 = match.player2_username || match.player2?.username || match.player2;

      if (p1 && p2 && !isPlaceholderPlayer(match.player1, p1) && !isPlaceholderPlayer(match.player2, p2)) {
        partnerMatch = validMatches.find((m, idx) => {
          if (idx === i) return false;
          if (processedMatchIds.has(String(m.id || m.match_id || `match-${idx}`))) return false;
          if ((m.stage || '').toLowerCase() !== stage) return false;
          if (m.round !== match.round) return false;

          const mP1 = m.player1_username || m.player1?.username || m.player1;
          const mP2 = m.player2_username || m.player2?.username || m.player2;

          // Reversed players (home/away) or same players with different leg
          return (mP1 === p2 && mP2 === p1) || ((mP1 === p1 && mP2 === p2) && (m.leg && match.leg && m.leg !== match.leg));
        });
      }
    }

    if (!partnerMatch) {
      // Fallback for placeholder matches in two-legged knockout rounds (semifinal / quarterfinal):
      // If player1 and player2 are placeholders, pair with the adjacent placeholder match in the same stage & round
      const p1 = match.player1_username || match.player1?.username || match.player1;
      const p2 = match.player2_username || match.player2?.username || match.player2;
      const isPlaceholder = isPlaceholderPlayer(match.player1, p1) && isPlaceholderPlayer(match.player2, p2);

      if (isPlaceholder && (stage.includes('semi') || stage.includes('quarter'))) {
        partnerMatch = validMatches.find((m, idx) => {
          if (idx === i) return false;
          const pid = String(m.id || m.match_id || `match-${idx}`);
          if (processedMatchIds.has(pid)) return false;
          if ((m.stage || '').toLowerCase() !== stage) return false;
          if (m.round !== match.round) return false;
          const mP1 = m.player1_username || m.player1?.username || m.player1;
          const mP2 = m.player2_username || m.player2?.username || m.player2;
          return isPlaceholderPlayer(m.player1, mP1) && isPlaceholderPlayer(m.player2, mP2);
        });
      }
    }

    if (!partnerMatch) {
      // Single match or partner not found
      processedMatchIds.add(matchId);
      result.push({
        type: 'single',
        match,
        id: matchId,
        stage: match.stage,
        round: match.round || 1
      });
      continue;
    }

    // We have a tie!
    const partnerId = String(partnerMatch.id || partnerMatch.match_id);
    processedMatchIds.add(matchId);
    processedMatchIds.add(partnerId);

    // Determine Leg 1 vs Leg 2
    let leg1Match = match;
    let leg2Match = partnerMatch;

    if (match.leg === 2 || partnerMatch.leg === 1) {
      leg1Match = partnerMatch;
      leg2Match = match;
    } else if (!match.leg && !partnerMatch.leg) {
      // Use match_order or created_at
      const order1 = match.match_order ?? 0;
      const order2 = partnerMatch.match_order ?? 0;
      if (order1 > order2) {
        leg1Match = partnerMatch;
        leg2Match = match;
      }
    }

    // Ensure leg properties are set
    leg1Match = { ...leg1Match, leg: 1 };
    leg2Match = { ...leg2Match, leg: 2 };

    // Primary players are defined by Leg 1 (home vs away)
    const p1User = leg1Match.player1_username || leg1Match.player1?.username || (typeof leg1Match.player1 === 'string' ? leg1Match.player1 : null);
    const p2User = leg1Match.player2_username || leg1Match.player2?.username || (typeof leg1Match.player2 === 'string' ? leg1Match.player2 : null);

    const isPlaceholder = isPlaceholderPlayer(leg1Match.player1, p1User) && isPlaceholderPlayer(leg1Match.player2, p2User);

    // Check Leg 1 completion and scores
    const isLeg1Completed = leg1Match.status === 'completed' || leg1Match.match_status === 'completed';
    const isLeg2Completed = leg2Match.status === 'completed' || leg2Match.match_status === 'completed';

    const leg1_p1_score = leg1Match.score1 ?? (isLeg1Completed ? 0 : null);
    const leg1_p2_score = leg1Match.score2 ?? (isLeg1Completed ? 0 : null);

    // In Leg 2, check if home and away were reversed
    const leg2P1User = leg2Match.player1_username || leg2Match.player1?.username || (typeof leg2Match.player1 === 'string' ? leg2Match.player1 : null);
    const leg2Reversed = leg2P1User === p2User;

    let leg2_p1_score: number | null = null;
    let leg2_p2_score: number | null = null;

    if (leg2Reversed) {
      // In leg 2: Player 2 was home (score1), Player 1 was away (score2)
      leg2_p1_score = leg2Match.score2 ?? (isLeg2Completed ? 0 : null);
      leg2_p2_score = leg2Match.score1 ?? (isLeg2Completed ? 0 : null);
    } else {
      // In leg 2: Player 1 was home (score1), Player 2 was away (score2)
      leg2_p1_score = leg2Match.score1 ?? (isLeg2Completed ? 0 : null);
      leg2_p2_score = leg2Match.score2 ?? (isLeg2Completed ? 0 : null);
    }

    // Aggregate score calculation
    let agg1: number | null = null;
    let agg2: number | null = null;

    if (leg2Match.aggregate_score1 !== undefined && leg2Match.aggregate_score1 !== null) {
      agg1 = Number(leg2Match.aggregate_score1);
      agg2 = Number(leg2Match.aggregate_score2);
    } else if (leg1Match.aggregate_score1 !== undefined && leg1Match.aggregate_score1 !== null) {
      agg1 = Number(leg1Match.aggregate_score1);
      agg2 = Number(leg1Match.aggregate_score2);
    } else if (isLeg1Completed || isLeg2Completed) {
      agg1 = (leg1_p1_score || 0) + (leg2_p1_score || 0);
      agg2 = (leg1_p2_score || 0) + (leg2_p2_score || 0);
    }

    const tieStatus = leg2Match.tie_status || leg1Match.tie_status || (
      isLeg2Completed ? 'aggregate_complete' : isLeg1Completed ? 'leg1_complete' : null
    );

    const isLevelPendingAdmin = tieStatus === 'level_pending_admin' || (
      isLeg1Completed && isLeg2Completed && agg1 !== null && agg2 !== null && agg1 === agg2 && !leg2Match.winner && !leg1Match.winner
    );

    let advancingPlayer: string | null = null;
    const explicitWinner = leg2Match.winner_username || leg2Match.winner || leg1Match.winner_username || leg1Match.winner;

    if (explicitWinner) {
      if (typeof explicitWinner === 'string') {
        advancingPlayer = explicitWinner === leg1Match.player1 || explicitWinner === p1User ? p1User : p2User;
      }
    } else if (isLeg1Completed && isLeg2Completed && agg1 !== null && agg2 !== null && !isLevelPendingAdmin) {
      if (agg1 > agg2) advancingPlayer = p1User;
      else if (agg2 > agg1) advancingPlayer = p2User;
    }

    const tieId = match.tie_id || `inferred-tie-${match.stage}-${match.round}-${matchId}-${partnerId}`;

    const p1Id = (typeof leg1Match.player1 === 'object' ? leg1Match.player1?.id : null) 
      || (typeof leg1Match.player1 === 'string' && leg1Match.player1.includes('-') ? leg1Match.player1 : null)
      || leg1Match.player1_id
      || (leg2Reversed ? (typeof leg2Match.player2 === 'object' ? leg2Match.player2?.id : null) : (typeof leg2Match.player1 === 'object' ? leg2Match.player1?.id : null))
      || (leg2Reversed ? leg2Match.player2_id : leg2Match.player1_id);

    const p2Id = (typeof leg1Match.player2 === 'object' ? leg1Match.player2?.id : null)
      || (typeof leg1Match.player2 === 'string' && leg1Match.player2.includes('-') ? leg1Match.player2 : null)
      || leg1Match.player2_id
      || (leg2Reversed ? (typeof leg2Match.player1 === 'object' ? leg2Match.player1?.id : null) : (typeof leg2Match.player2 === 'object' ? leg2Match.player2?.id : null))
      || (leg2Reversed ? leg2Match.player1_id : leg2Match.player2_id);

    const groupedTie: GroupedTie = {
      tie_id: tieId,
      stage: match.stage,
      round: match.round || 1,
      leg1: leg1Match,
      leg2: leg2Match,
      player1: leg1Match.player1,
      player2: leg1Match.player2,
      player1_username: p1User,
      player2_username: p2User,
      player1_id: p1Id,
      player2_id: p2Id,
      player1_badge_id: leg1Match.player1_badge_id || leg2Match.player2_badge_id,
      player2_badge_id: leg1Match.player2_badge_id || leg2Match.player1_badge_id,
      player1_avatar_url: leg1Match.player1_avatar_url || leg2Match.player2_avatar_url,
      player2_avatar_url: leg1Match.player2_avatar_url || leg2Match.player1_avatar_url,
      leg1_p1_score,
      leg1_p2_score,
      leg2_p1_score,
      leg2_p2_score,
      aggregate_score1: agg1,
      aggregate_score2: agg2,
      tie_status: isLevelPendingAdmin ? 'level_pending_admin' : tieStatus,
      winner_username: advancingPlayer,
      advancing_player_username: advancingPlayer,
      is_level_pending_admin: isLevelPendingAdmin,
      is_completed: isLeg1Completed && isLeg2Completed,
      is_leg1_completed: isLeg1Completed,
      is_leg2_completed: isLeg2Completed,
      is_placeholder: isPlaceholder,
      placeholder_text: isPlaceholder ? getPlaceholderText(match.stage, match.round) : null,
      matches: [leg1Match, leg2Match]
    };

    result.push({
      type: 'tie',
      tie: groupedTie,
      id: `tie-unit-${tieId}`,
      stage: match.stage,
      round: match.round || 1
    });
  }

  return result;
}

/**
 * Resolves the valid user UUID for a player in a tie.
 * Tries player object ID, string UUID, or queries profiles table by username.
 */
export async function getPlayerUuid(
  player: any, 
  username: string | null | undefined, 
  match?: any, 
  playerIndex: 1 | 2 = 1
): Promise<string | null> {
  if (typeof player === 'object' && player?.id) return player.id;
  if (typeof player === 'string' && player.length > 20 && player.includes('-')) return player;
  
  if (match) {
    const pField = playerIndex === 1 ? match.player1 : match.player2;
    if (typeof pField === 'object' && pField?.id) return pField.id;
    if (typeof pField === 'string' && pField.length > 20 && pField.includes('-')) return pField;
    const pIdField = playerIndex === 1 
      ? (match.player1_id || match.player1_user_id) 
      : (match.player2_id || match.player2_user_id);
    if (pIdField) return pIdField;
  }

  if (username && username !== 'TBD' && username !== 'Unknown') {
    try {
      const { data } = await (supabase as any).from('profiles').select('id').eq('username', username).maybeSingle();
      if (data?.id) return data.id;
    } catch (e) {
      console.warn('Failed to resolve UUID for username:', username, e);
    }
  }

  return null;
}
