export type SupportedCurrency = 'NGN' | 'GHS' | 'ZAR' | 'USD' | 'KES';

export type TopUpStep =
  | 'idle'
  | 'initializing'    // calling /paystack-initialize
  | 'awaiting_payment' // Paystack popup is open
  | 'verifying'       // calling /paystack-verify
  | 'success'
  | 'error';

export interface TopUpParams {
  amountSubunit: number;       // integer in smallest currency unit
  currency:      SupportedCurrency;
  amountUsd:     number;       // float USD equivalent
  userEmail:     string;
  username:      string;
}

export interface InitializePaymentResponse {
  authorization_url:  string;
  access_code:        string;
  reference:          string;
  payment_request_id: string;
  is_duplicate:       boolean;
}

export interface VerifyPaymentResponse {
  success:           boolean;
  already_processed: boolean;
  amount_usd:        number;
  reference:         string;
  message:           string;
  error?:            string;
  status?:           string;
}

export interface CurrencyConfig {
  code:               SupportedCurrency;
  name:               string;
  flag:               string;     // emoji
  symbol:             string;     // e.g. '₦', 'GH₵', 'R', '$', 'KSh'
  subunit_multiplier: number;     // always 100 for these currencies
  approx_usd_rate:    number;     // local units per 1 USD (approximate, display only)
  min_amount:         number;     // minimum top-up in local currency
  max_amount:         number;     // maximum top-up in local currency
  suggested_amounts:  number[];   // preset quick-select amounts in local currency
}

export interface Wallet {
  id:                   string;
  user_id:              string;
  balance:              number;
  balance_usd?:         number;     // Compatibility companion matching db column alias
  remaining_withdrawal_usd?: number; // Compatibility companion
  is_locked:            boolean;
  locked_reason:        string | null;
  risk_level:           'normal' | 'elevated' | 'blocked';
  total_deposited_usd:  number;
  total_withdrawn_usd:  number;
  daily_withdrawal_limit: number;
  single_tx_limit:      number;
  environment:          string;
  created_at:           string;
  updated_at:           string;
}

export type WalletTransactionType =
  | 'deposit'
  | 'entry_fee'
  | 'prize'
  | 'refund'
  | 'adjustment';

export interface WalletTransaction {
  id:                   string;
  user_id:              string;
  type:                 WalletTransactionType;
  amount:               number;    // positive = credit, negative = debit
  original_amount:      number | null;
  original_currency:    string;
  exchange_rate:        number;
  currency:             string;
  tournament_id:        string | null;
  tournament_name:      string | null;
  status:               'pending' | 'completed' | 'failed' | 'refunded' | 'reversed';
  description:          string | null;
  transaction_reference: string | null;
  net_amount:           number | null;
  provider_fee:         number;
  platform_fee:         number;
  processed_at:         string | null;
  environment:          string;
  metadata:             Record<string, unknown>;
  created_at:           string;
}

export interface AppNotification {
  id:           string;
  user_id:      string;
  type:         string;
  title:        string;
  body:         string;
  data:         Record<string, unknown> | null;
  read:         boolean;
  read_at:      string | null;
  created_at:   string;
  category:     string;
  priority:     string;
  status:       string;
}

export interface PaystackTransaction {
  reference: string;
  status:    string;
  trans:     string;
  trxref:    string;
}

export interface PaystackPopConfig {
  key:        string;
  email:      string;
  amount:     number;      // in subunit (kobo etc.)
  currency:   string;
  ref:        string;      // ALWAYS use the reference from /paystack-initialize
  label?:     string;
  metadata?:  Record<string, unknown>;
  onSuccess:  (transaction: PaystackTransaction) => void;
  onCancel:   () => void;
}

export interface PaystackPopInstance {
  openIframe(): void;
}

export interface PaystackPopConstructor {
  setup(config: PaystackPopConfig): PaystackPopInstance;
}

declare global {
  interface Window {
    PaystackPop: PaystackPopConstructor;
  }
}
