export type TournamentType = 'knockout' | 'league' | 'group_stage' | 'hybrid' | 'swiss' | 'champions_league';
export type ChampionTitle = 'Tournament Champion' | 'Pro Champion' | 'Legendary Champion';
export type PrizeCurrency = 'USD' | 'KES' | 'NGN' | 'GHS' | 'UGX' | 'ZAR';

export interface ChampionWinner {
  id: string;
  username: string;
  avatar_url: string | null;
  badge_id: string | null;
  score: number | null;
  prize_amount: number;
}

export interface ChampionCardData {
  champion_id: string;
  tournament_id: string;
  tournament_name: string;
  tournament_type: TournamentType;
  is_paid: boolean;
  champion_title: ChampionTitle;
  prize_pool: number;
  prize_currency: PrizeCurrency;
  winnings_awarded: boolean;
  final_match_id: string | null;
  completed_at: string;
  declared_at: string;
  winner: ChampionWinner;
  runner_up: ChampionWinner | null;
  meta: {
    tournament_category: 'Amateur' | 'Pro' | 'Legend';
    max_players: number;
    prize_1st_pct: number;
    prize_2nd_pct: number;
  };
  poster_image_url?: string | null;
  poster_ready?: boolean;
  poster_theme?: string | null;
}

export interface UserChampionHistory {
  tournament_id: string;
  tournament_name: string;
  tournament_type: TournamentType;
  is_paid: boolean;
  champion_title: ChampionTitle;
  winner_prize_amount: number;
  prize_currency: PrizeCurrency;
  completed_at: string;
  runner_up_username: string | null;
  winner_badge_id: string | null;
}

export interface RecentChampionFeedItem {
  tournament_id: string;
  tournament_name: string;
  champion_title: ChampionTitle;
  winner_id: string;
  winner_username: string;
  winner_avatar_url: string | null;
  completed_at: string;
}
