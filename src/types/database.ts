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
          preferred_currency: string
          country_code: string | null
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string | null
          role?: string | null
          preferred_currency?: string
          country_code?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string | null
          role?: string | null
          preferred_currency?: string
          country_code?: string | null
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
          category: string | null
          payout_status: string
          prize_currency: string
          current_stage: string | null
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
          category?: string | null
          payout_status?: string
          prize_currency?: string
          current_stage?: string | null
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
          category?: string | null
          payout_status?: string
          prize_currency?: string
          current_stage?: string | null
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
          status: 'pending' | 'ongoing' | 'completed' | 'awaiting_result' | 'match_in_progress' | 'lobby_open' | 'under_review' | null
          result_verification_status: 'none' | 'single_submission' | 'matched' | 'disputed' | 'verified' | null
          locked: boolean | null
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
          status?: 'pending' | 'ongoing' | 'completed' | 'awaiting_result' | 'match_in_progress' | 'lobby_open' | 'under_review' | null
          result_verification_status?: 'none' | 'single_submission' | 'matched' | 'disputed' | 'verified' | null
          locked?: boolean | null
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
          status?: 'pending' | 'ongoing' | 'completed' | 'awaiting_result' | 'match_in_progress' | 'lobby_open' | 'under_review' | null
          result_verification_status?: 'none' | 'single_submission' | 'matched' | 'disputed' | 'verified' | null
          locked?: boolean | null
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
          status_updated_at: string | null
          wallet_transaction_id: string | null
          entry_fee_snapshot: number | null
          currency_snapshot: string | null
          exchange_rate_snapshot: number | null
          prize_pool_snapshot: number | null
        }
        Insert: {
          id?: string
          tournament_id?: string | null
          user_id?: string | null
          created_at?: string | null
          status?: string | null
          seed?: number | null
          checked_in?: boolean | null
          status_updated_at?: string | null
          wallet_transaction_id?: string | null
          entry_fee_snapshot?: number | null
          currency_snapshot?: string | null
          exchange_rate_snapshot?: number | null
          prize_pool_snapshot?: number | null
        }
        Update: {
          id?: string
          tournament_id?: string | null
          user_id?: string | null
          created_at?: string | null
          status?: string | null
          seed?: number | null
          checked_in?: boolean | null
          status_updated_at?: string | null
          wallet_transaction_id?: string | null
          entry_fee_snapshot?: number | null
          currency_snapshot?: string | null
          exchange_rate_snapshot?: number | null
          prize_pool_snapshot?: number | null
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
          swiss_rounds: number | null
          swiss_current_round: number | null
          group_stage_mode: string | null
          qualify_count: number | null
          double_round_robin: boolean | null
        }
        Insert: {
          id?: string
          tournament_id: string
          format: string
          points_win?: number | null
          points_draw?: number | null
          points_loss?: number | null
          max_rounds?: number | null
          tie_breaker_rules?: Json
          auto_generate_fixtures?: boolean | null
          seeding_method?: string | null
          created_at?: string | null
          updated_at?: string | null
          swiss_rounds?: number | null
          swiss_current_round?: number | null
          group_stage_mode?: string | null
          qualify_count?: number | null
          double_round_robin?: boolean | null
        }
        Update: {
          id?: string
          tournament_id?: string
          format?: string
          points_win?: number | null
          points_draw?: number | null
          points_loss?: number | null
          max_rounds?: number | null
          tie_breaker_rules?: Json
          auto_generate_fixtures?: boolean | null
          seeding_method?: string | null
          created_at?: string | null
          updated_at?: string | null
          swiss_rounds?: number | null
          swiss_current_round?: number | null
          group_stage_mode?: string | null
          qualify_count?: number | null
          double_round_robin?: boolean | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          message_type: string
          content: string
          created_at: string
          read_by: Json
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          message_type?: string
          content: string
          created_at?: string
          read_by?: Json
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          message_type?: string
          content?: string
          created_at?: string
          read_by?: Json
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
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          badge_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          badge_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      standings: {
        Row: {
          id: string
          tournament_id: string | null
          player_id: string | null
          played: number | null
          wins: number | null
          draws: number | null
          losses: number | null
          goals_for: number | null
          goals_against: number | null
          points: number | null
          goal_difference: number | null
          rank: number | null
          updated_at: string | null
          group_name: string | null
          buchholz_score: number
          sonneborn_berger_score: number
          group_rank: number | null
        }
        Insert: {
          id?: string
          tournament_id?: string | null
          player_id?: string | null
          played?: number | null
          wins?: number | null
          draws?: number | null
          losses?: number | null
          goals_for?: number | null
          goals_against?: number | null
          points?: number | null
          goal_difference?: number | null
          rank?: number | null
          updated_at?: string | null
          group_name?: string | null
          buchholz_score?: number
          sonneborn_berger_score?: number
          group_rank?: number | null
        }
        Update: {
          id?: string
          tournament_id?: string | null
          player_id?: string | null
          played?: number | null
          wins?: number | null
          draws?: number | null
          losses?: number | null
          goals_for?: number | null
          goals_against?: number | null
          points?: number | null
          goal_difference?: number | null
          rank?: number | null
          updated_at?: string | null
          group_name?: string | null
          buchholz_score?: number
          sonneborn_berger_score?: number
          group_rank?: number | null
        }
      }
      swiss_pairings: {
        Row: {
          id: string
          tournament_id: string
          round: number
          player1_id: string
          player2_id: string | null
          match_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round: number
          player1_id: string
          player2_id?: string | null
          match_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round?: number
          player1_id?: string
          player2_id?: string | null
          match_id?: string | null
          created_at?: string
        }
      }
      tournament_champions: {
        Row: {
          id: string
          tournament_id: string
          winner_id: string
          winner_username: string
          winner_avatar_url: string | null
          winner_badge_id: string | null
          runner_up_id: string | null
          runner_up_username: string | null
          runner_up_avatar_url: string | null
          runner_up_badge_id: string | null
          tournament_name: string
          tournament_type: string
          is_paid: boolean
          final_match_id: string | null
          winner_score: number | null
          runner_up_score: number | null
          prize_pool: number | null
          prize_currency: string | null
          winner_prize_amount: number | null
          runner_up_prize_amount: number | null
          winnings_awarded: boolean | null
          champion_title: string | null
          completed_at: string
          declared_at: string
          declaration_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          winner_id: string
          winner_username: string
          winner_avatar_url?: string | null
          winner_badge_id?: string | null
          runner_up_id?: string | null
          runner_up_username?: string | null
          runner_up_avatar_url?: string | null
          runner_up_badge_id?: string | null
          tournament_name: string
          tournament_type: string
          is_paid?: boolean
          final_match_id?: string | null
          winner_score?: number | null
          runner_up_score?: number | null
          prize_pool?: number | null
          prize_currency?: string | null
          winner_prize_amount?: number | null
          runner_up_prize_amount?: number | null
          winnings_awarded?: boolean | null
          champion_title?: string | null
          completed_at?: string
          declared_at?: string
          declaration_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          winner_id?: string
          winner_username?: string
          winner_avatar_url?: string | null
          winner_badge_id?: string | null
          runner_up_id?: string | null
          runner_up_username?: string | null
          runner_up_avatar_url?: string | null
          runner_up_badge_id?: string | null
          tournament_name?: string
          tournament_type?: string
          is_paid?: boolean
          final_match_id?: string | null
          winner_score?: number | null
          runner_up_score?: number | null
          prize_pool?: number | null
          prize_currency?: string | null
          winner_prize_amount?: number | null
          runner_up_prize_amount?: number | null
          winnings_awarded?: boolean | null
          champion_title?: string | null
          completed_at?: string
          declared_at?: string
          declaration_metadata?: Json | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string | null
          action_type: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          environment: string
        }
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          joined_at: string
        }
      }
      currency_rates: {
        Row: {
          id: string
          currency_code: string
          currency_name: string
          symbol: string
          rate_to_usd: number
          is_active: boolean
          updated_at: string
          buy_rate: number | null
          sell_rate: number | null
          min_amount: number | null
          max_amount: number | null
          source: string | null
          created_at: string
        }
      }
      payment_providers: {
        Row: {
          id: string
          name: string
          display_name: string
          currencies: string[]
          is_active: boolean
          config: Json
          created_at: string
          environment: string
          webhook_secret: string | null
          api_base_url: string | null
          supports_refunds: boolean
          supports_payouts: boolean
          min_deposit_usd: number
          max_deposit_usd: number
          fee_percent: number
          fee_fixed_usd: number
          updated_at: string
        }
      }
      payment_requests: {
        Row: {
          id: string
          user_id: string
          provider_name: string
          request_type: string
          original_amount: number
          original_currency: string
          usd_amount: number
          exchange_rate: number
          status: string
          provider_reference: string | null
          provider_response: Json
          wallet_transaction_id: string | null
          created_at: string
          processed_at: string | null
          metadata: Json
          external_transaction_id: string | null
          expires_at: string | null
          retry_count: number
          last_error: string | null
          environment: string
          idempotency_key: string | null
          checkout_url: string | null
          verification_required: boolean
          verification_status: string
          verification_attempts: number
          last_verified_at: string | null
          order_tracking_id: string | null
          merchant_reference: string | null
        }
      }
      prize_distributions: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          position: number
          amount: number
          distributed_at: string | null
          wallet_transaction_id: string | null
          status: string
          currency: string
        }
      }
      user_notification_preferences: {
        Row: {
          user_id: string
          in_app_enabled: boolean
          push_enabled: boolean
          email_enabled: boolean
          sms_enabled: boolean
          tournament_notifications: boolean
          wallet_notifications: boolean
          marketing_notifications: boolean
          security_notifications: boolean
          quiet_hours_enabled: boolean
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          timezone: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      user_push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: string
          device_name: string | null
          app_version: string | null
          last_seen_at: string | null
          revoked_at: string | null
          created_at: string | null
        }
      }
      wallet_balance_snapshots: {
        Row: {
          id: string
          user_id: string
          snapshot_at: string
          balance_usd: number
          ledger_sum_usd: number
          is_balanced: boolean
          delta: number | null
          run_id: string | null
        }
      }
      pesapal_auth_cache: {
        Row: {
          id: string
          environment: string
          access_token: string
          token_type: string
          expires_at: string
          issued_at: string
          status: string
          created_at: string
          updated_at: string
        }
      }
      platform_config: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string
          updated_by: string | null
        }
      }
      provider_ipn_registrations: {
        Row: {
          id: string
          provider: string
          environment: string
          ipn_id: string
          ipn_url: string
          registered_at: string
          verified_at: string | null
          last_used_at: string | null
          status: string
          notification_type: string | null
          raw_response: Json
          created_at: string
          updated_at: string
        }
      }
      provider_verification_log: {
        Row: {
          id: string
          payment_request_id: string | null
          webhook_event_id: string | null
          provider: string
          environment: string
          provider_reference: string | null
          merchant_reference: string | null
          verification_status: string
          provider_raw_status: string | null
          verified_amount: number | null
          verified_currency: string | null
          amount_matches: boolean | null
          currency_matches: boolean | null
          raw_response: Json
          error_message: string | null
          attempt_number: number
          verified_at: string
          processing_duration_ms: number | null
          triggered_by: string
        }
      }
      reconciliation_runs: {
        Row: {
          id: string
          run_type: string
          triggered_by: string | null
          status: string
          started_at: string
          completed_at: string | null
          duration_ms: number | null
          wallets_checked: number
          mismatches_found: number
          orphans_found: number
          duplicates_found: number
          findings: Json
          summary: string | null
          environment: string
        }
      }
    }
    Views: {
      v_tournaments_with_creator: {
        Row: {
          id: string
          name: string
          type: string
          max_players: number
          entry_fee: number | null
          prize_pool: number | null
          status: string | null
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
          category: string | null
          payout_status: string | null
          prize_currency: string | null
          current_stage: string | null
          creator_username: string | null
          creator_avatar_url: string | null
        }
      }
      v_fixtures_with_badges: {
        Row: {
          id: string
          match_id: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          timezone: string | null
          location: string | null
          stream_url: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          tournament_id: string | null
          player1_badge_id: string | null
          player2_badge_id: string | null
          group_name: string | null
          stage: string | null
        }
      }
      v_match_results: {
        Row: {
          id: string
          match_id: string | null
          submitted_by: string | null
          player1_score: number | null
          player2_score: number | null
          screenshot_url: string | null
          status: string | null
          created_at: string | null
          verified_by: string | null
          verified_at: string | null
          disputed: boolean | null
          dispute_reason: string | null
          admin_notes: string | null
          is_active: boolean | null
          submission_attempt: number | null
          tournament_id: string | null
          player1: string | null
          player2: string | null
          match_status: string | null
          group_name: string | null
          stage: string | null
        }
      }
      v_messages_with_sender: {
        Row: {
          id: string
          conversation_id: string | null
          sender_id: string | null
          message_type: string | null
          content: string | null
          created_at: string | null
          read_by: Json | null
          username: string | null
          avatar_url: string | null
        }
      }
      v_wallet_transactions: {
        Row: {
          id: string
          user_id: string | null
          type: string | null
          amount: number | null
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
          metadata: Json | null
          registration_id: string | null
          base_currency: string | null
          original_currency: string | null
          original_amount: number | null
          exchange_rate: number | null
          transaction_reference: string | null
          processed_at: string | null
          provider_fee: number | null
          platform_fee: number | null
          net_amount: number | null
          reconciliation_status: string | null
          reconciled_at: string | null
          idempotency_key: string | null
          payment_request_id: string | null
          environment: string | null
        }
      }
      v_registrations_with_users: {
        Row: {
          id: string
          tournament_id: string | null
          user_id: string | null
          created_at: string | null
          status: string | null
          seed: number | null
          checked_in: boolean | null
          status_updated_at: string | null
          wallet_transaction_id: string | null
          entry_fee_snapshot: number | null
          currency_snapshot: string | null
          exchange_rate_snapshot: number | null
          prize_pool_snapshot: number | null
          username: string | null
          avatar_url: string | null
        }
      }
      v_wallets_admin: {
        Row: {
          id: string
          user_id: string | null
          balance: number | null
          updated_at: string | null
          created_at: string | null
          is_locked: boolean | null
          locked_reason: string | null
          locked_at: string | null
          locked_by: string | null
          risk_level: string | null
          last_large_tx_at: string | null
          total_deposited_usd: number | null
          total_withdrawn_usd: number | null
          daily_withdrawal_limit: number | null
          single_tx_limit: number | null
          withdrawal_cooldown_hrs: number | null
          environment: string | null
        }
      }
      v_tournament_players: {
        Row: {
          id: string
          tournament_id: string | null
          user_id: string | null
          joined_at: string | null
          status: string | null
        }
      }
      v_conversation_participants: {
        Row: {
          id: string
          conversation_id: string | null
          user_id: string | null
          joined_at: string | null
        }
      }
      v_audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string | null
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          created_at: string | null
          action_type: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          environment: string | null
        }
      }
      match_overview: {
        Row: {
          id: string | null
          tournament_id: string | null
          round: number | null
          status: string | null
          score1: number | null
          score2: number | null
          player1_name: string | null
          player2_name: string | null
          winner_name: string | null
          scheduled_at: string | null
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
