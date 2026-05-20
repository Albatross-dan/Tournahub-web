
export type TransactionType = 'deposit' | 'withdrawal' | 'entry_fee' | 'prize' | 'refund' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentRequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type WalletRiskLevel = 'normal' | 'elevated' | 'high' | 'blocked';
export type SupportedCurrency = 'USD' | 'KES' | 'NGN' | 'GHS' | 'UGX' | 'ZAR';

export interface WalletSummary {
  balance_usd: number;
  balance_display: number;
  display_currency: SupportedCurrency;
  display_symbol: string;
  exchange_rate: number;
  total_deposited_usd: number;
  total_withdrawn_usd: number;
  total_entry_fees_usd: number;
  total_prizes_usd: number;
  total_refunds_usd: number;
  net_tournament_spend: number;
  environment: 'sandbox' | 'production';
}

export interface WalletLimits {
  balance_usd: number;
  is_locked: boolean;
  locked_reason: string | null;
  locked_by_username?: string | null;
  risk_level: WalletRiskLevel;
  daily_deposit_limit_usd: number;
  daily_withdrawal_limit_usd: number;
  single_tx_limit_usd: number;
  today_deposited_usd: number;
  today_withdrawn_usd: number;
  remaining_deposit_usd: number;
  remaining_withdrawal_usd: number;
  withdrawal_cooldown_hours: number;
  environment: 'sandbox' | 'production';
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount_usd: number;
  amount_display: number;
  direction: 'credit' | 'debit';
  original_amount: number;
  original_currency: string;
  status: TransactionStatus;
  description: string;
  tournament_id: string | null;
  tournament_name: string | null;
  created_at: string;
  processed_at: string | null;
  display_currency: string;
  display_symbol: string;
}

export interface TransactionHistory {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
  display_currency: string;
  display_symbol: string;
  exchange_rate: number;
}

export interface FinancialActivity {
  type: TransactionType;
  amount_usd: number;
  direction: 'credit' | 'debit';
  description: string;
  tournament_name: string | null;
  created_at: string;
  icon: string;
}

export interface WinRecord {
  prize_id: string;
  tournament_id: string;
  position: number;
  prize_amount_usd: number;
  date_won: string;
  tournament_name: string;
  tournament_type: string;
  tournament_category: string;
  banner_url: string | null;
  total_prize_pool: number;
  position_label: string;
}

export interface WinnerHistory {
  username: string;
  win_count: number;
  wins: WinRecord[];
}

export interface PaymentProvider {
  name: string;
  display_name: string;
  currencies: string[];
  fee_percent: number;
  fee_fixed_usd: number;
  min_deposit_usd: number;
  max_deposit_usd: number;
  supports_refunds: boolean;
  environment: 'sandbox' | 'production';
}

export interface PaymentRequestStatusResponse {
  id: string;
  status: PaymentRequestStatus;
  provider: string;
  original_amount: number;
  original_currency: string;
  usd_amount: number;
  processed_at: string | null;
  expires_at: string | null;
  message: string | null;
  environment: 'sandbox' | 'production';
}

export interface RequestDepositResponse {
  success: boolean;
  payment_request_id?: string;
  original_amount?: number;
  original_currency?: string;
  usd_equivalent?: number;
  exchange_rate?: number;
  provider?: string;
  environment?: 'sandbox' | 'production';
  expires_at?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface RequestWithdrawalResponse {
  success: boolean;
  payment_request_id?: string;
  amount_usd?: number;
  status?: string;
  message?: string;
  error?: string;
}

export interface FinancialSummary {
  wallets: {
    total_balance_usd: number;
    active_wallets: number;
    locked_wallets: number;
  };
  transactions_30d: {
    deposits_usd: number;
    withdrawals_usd: number;
    entry_fees_usd: number;
    prizes_usd: number;
  };
  payment_requests_30d: {
    pending: number;
    completed: number;
    failed: number;
  };
  webhook_events_24h: {
    processed: number;
    failed: number;
  };
  last_reconciliation: {
    run_at: string;
    status: string;
    mismatches: number;
  };
}

export interface WalletActivity {
  type: string;
  amount_usd: number;
  status: string;
  created_at: string;
  note: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  username: string;
  email: string;
  amount: number;
  currency: string;
  amount_usd: number;
  provider: string;
  destination: any;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}
