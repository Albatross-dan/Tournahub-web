export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          created_at: string | null
          role: string | null
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string | null
          role?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string | null
          role?: string | null
        }
      }
      tournaments: {
        Row: {
          id: string
          name: string
          type: 'league' | 'knockout' | 'swiss' | 'group_stage' | 'hybrid'
          max_players: number
          entry_fee: number | null
          prize_pool: number | null
          status: 'draft' | 'registration_open' | 'registration_closed' | 'seeding' | 'fixture_generation' | 'ready' | 'ongoing' | 'completed' | 'cancelled' | null
          created_at: string | null
          created_by: string | null
          start_date: string | null
          end_date: string | null
          description: string | null
          banner_url: string | null
          prize_1st_percent: number | null
          prize_2nd_percent: number | null
          prize_3rd_percent: number | null
          group_count: number | null
          teams_per_group: number | null
        }
        Insert: {
          id?: string
          name: string
          type: 'league' | 'knockout' | 'swiss' | 'group_stage' | 'hybrid'
          max_players: number
          entry_fee?: number | null
          prize_pool?: number | null
          status?: 'draft' | 'registration_open' | 'registration_closed' | 'seeding' | 'fixture_generation' | 'ready' | 'ongoing' | 'completed' | 'cancelled' | null
          created_at?: string | null
          created_by?: string | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          banner_url?: string | null
          prize_1st_percent?: number | null
          prize_2nd_percent?: number | null
          prize_3rd_percent?: number | null
          group_count?: number | null
          teams_per_group?: number | null
        }
        Update: {
          id?: string
          name?: string
          type?: 'league' | 'knockout' | 'swiss' | 'group_stage' | 'hybrid'
          max_players?: number
          entry_fee?: number | null
          prize_pool?: number | null
          status?: 'draft' | 'registration_open' | 'registration_closed' | 'seeding' | 'fixture_generation' | 'ready' | 'ongoing' | 'completed' | 'cancelled' | null
          created_at?: string | null
          created_by?: string | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          banner_url?: string | null
          prize_1st_percent?: number | null
          prize_2nd_percent?: number | null
          prize_3rd_percent?: number | null
          group_count?: number | null
          teams_per_group?: number | null
        }
      }
      matches: {
        Row: {
          id: string
          tournament_id: string | null
          round: number | null
          player1: string | null
          player2: string | null
          score1: number | null
          score2: number | null
          winner: string | null
          status: 'pending' | 'ongoing' | 'completed' | null
          created_at: string | null
          stage: string | null
          bracket_slot: number | null
          next_match_id: string | null
          match_order: number | null
          scheduled_at: string | null
          group_name: string | null
        }
        Insert: {
          id?: string
          tournament_id?: string | null
          round?: number | null
          player1?: string | null
          player2?: string | null
          score1?: number | null
          score2?: number | null
          winner?: string | null
          status?: 'pending' | 'ongoing' | 'completed' | null
          created_at?: string | null
          stage?: string | null
          bracket_slot?: number | null
          next_match_id?: string | null
          match_order?: number | null
          scheduled_at?: string | null
          group_name?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string | null
          round?: number | null
          player1?: string | null
          player2?: string | null
          score1?: number | null
          score2?: number | null
          winner?: string | null
          status?: 'pending' | 'ongoing' | 'completed' | null
          created_at?: string | null
          stage?: string | null
          bracket_slot?: number | null
          next_match_id?: string | null
          match_order?: number | null
          scheduled_at?: string | null
          group_name?: string | null
        }
      }
      match_results: {
        Row: {
          id: string
          match_id: string
          submitted_by: string
          player1_score: number
          player2_score: number
          screenshot_url: string | null
          status: 'submitted' | 'pending_confirmation' | 'verified' | 'rejected' | 'disputed' | null
          created_at: string | null
          verified_by: string | null
          verified_at: string | null
          disputed: boolean | null
          dispute_reason: string | null
          admin_notes: string | null
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string | null
          balance: number | null
        }
      }
      wallet_transactions: {
        Row: {
          id: string
          user_id: string
          type: string
          amount: number
          currency: string | null
          tournament_id: string | null
          match_id: string | null
          status: string | null
          description: string | null
          created_at: string | null
          updated_at: string | null
          tournament_name: string | null
          timestamp: string | null
          reference_id: string | null
          metadata: Json
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          data: Json
          read: boolean | null
          created_at: string | null
        }
      }
      registrations: {
        Row: {
          id: string
          tournament_id: string | null
          user_id: string | null
          created_at: string | null
          status: string | null
          seed: number | null
          checked_in: boolean | null
        }
        Insert: {
          id?: string
          tournament_id?: string | null
          user_id?: string | null
          created_at?: string | null
          status?: string | null
          seed?: number | null
          checked_in?: boolean | null
        }
        Update: {
          id?: string
          tournament_id?: string | null
          user_id?: string | null
          created_at?: string | null
          status?: string | null
          seed?: number | null
          checked_in?: boolean | null
        }
      }
      tournament_settings: {
        Row: {
          id: string
          tournament_id: string
          format: string
          points_win: number | null
          points_draw: number | null
          points_loss: number | null
          max_rounds: number | null
          tie_breaker_rules: Json
          auto_generate_fixtures: boolean | null
          seeding_method: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          message_type: 'text'
          content: string
          created_at: string
          read_by: Json
        }
      }
      match_conversations: {
        Row: {
          id: string
          tournament_id: string
          match_id: string
          created_at: string
        }
      }
      tournament_badge_selections: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          badge_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          badge_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          badge_id?: string
          created_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type MatchResult = Database['public']['Tables']['match_results']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Registration = Database['public']['Tables']['registrations']['Row']
export type TournamentSettings = Database['public']['Tables']['tournament_settings']['Row']
