/**
 * Centralized utility to manage production overrides for completed tournaments
 * to fix any database evaluation discrepancies (e.g. third-place match vs finals mismatch).
 */

const UEFA_ID = '8ae4b47a-7362-453c-8900-ef51c9c313eb';

export const UEFA_OVERRIDE_RECORD = {
  id: "c7632924-9a27-44d1-abf0-a347b36cadd8",
  tournament_id: UEFA_ID,
  tournament_name: "UEFA CHAMPIONS LEAGUE ",
  tournament_type: "knockout",
  is_paid: false,
  champion_title: "Tournament Champion",
  completed_at: "2026-06-13T15:10:23.641075+00:00",
  declared_at: "2026-06-13T15:10:23.641075+00:00",
  created_at: "2026-06-13T15:10:23.641075+00:00",
  
  // Real Final Winners
  winner_id: 'd9f4a04f-9ebe-4bd3-9c82-bff1cf69028f', // sedrickindeje7
  winner_username: 'sedrickindeje7',
  winner_avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocLKivyY9U9LvbG8wlI-H-lsw23NnwmGkflQSgI_GsWY6WTJDw=s96-c',
  winner_badge_id: 'everton.football-logos.cc.png',
  winner_score: 3,
  winner_prize_amount: 0,
  winnings_awarded: false,
  prize_pool: 0,
  prize_currency: "USD",
  
  // Real Final Runners-up
  runner_up_id: '0e8c8da1-fadd-4289-b9ac-31a06c89d5f6', // jmkoshe
  runner_up_username: 'jmkoshe',
  runner_up_avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocLe2Lhpe_068RPiPpA7Fq0igdo-KmMmliCsprovJEVJqMTujQ=s96-c',
  runner_up_badge_id: 'ajax.football-logos.cc.png',
  runner_up_score: 0,
  runner_up_prize_amount: 0,
  
  final_match_id: 'de31a122-7cce-4c86-887f-14eaae2194ff',
  declaration_metadata: {
    max_players: 8,
    resolved_at: "2026-06-13 15:10:23.641075+00",
    prize_1st_pct: 60,
    prize_2nd_pct: 30,
    tournament_category: "Pro",
    override: true,
    override_reason: "Manual correction to fix knockout bracket third-place game vs final game round 3 conflict"
  }
};

/**
 * Checks and overrides a single tournament champion record from database.
 */
export function overrideTournamentChampion(tournamentId: string, originalData: any): any {
  if (tournamentId === UEFA_ID) {
    console.log(`[Override] Replacing UEFA tournament champion data with corrected winner @sedrickindeje7`);
    return { ...originalData, ...UEFA_OVERRIDE_RECORD };
  }
  return originalData;
}

/**
 * Checks and overrides recent champions feed array.
 */
export function overrideRecentChampionsFeed(feedItems: any[]): any[] {
  if (!Array.isArray(feedItems)) return feedItems;
  return feedItems.map((item) => {
    if (item && item.tournament_id === UEFA_ID) {
      console.log(`[Override] Replacing UEFA champion feed item with corrected winner @sedrickindeje7`);
      return {
        ...item,
        winner_id: UEFA_OVERRIDE_RECORD.winner_id,
        winner_username: UEFA_OVERRIDE_RECORD.winner_username,
        winner_avatar_url: UEFA_OVERRIDE_RECORD.winner_avatar_url,
        completed_at: UEFA_OVERRIDE_RECORD.completed_at
      };
    }
    return item;
  });
}
