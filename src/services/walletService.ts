import { supabase } from '../lib/supabase';
import { 
  WalletSummary, WalletLimits, TransactionHistory, FinancialActivity, 
  WinnerHistory, PaymentProvider, PaymentRequestStatusResponse, 
  RequestDepositResponse, RequestWithdrawalResponse, SupportedCurrency,
  FinancialSummary, WithdrawalRequest
} from '../types/finance';

export const walletService = {
  /**
   * USER-FACING RPCs
   */

  async getWalletSummary(displayCurrency: SupportedCurrency = 'USD'): Promise<WalletSummary> {
    const { data, error } = await (supabase as any).rpc('get_wallet_summary', {
      p_display_currency: displayCurrency
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getWalletLimits(): Promise<WalletLimits> {
    const { data, error } = await (supabase as any).rpc('get_wallet_limits');
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getTransactionHistory(params: {
    limit?: number;
    offset?: number;
    type?: string | null;
    displayCurrency?: SupportedCurrency;
  }): Promise<TransactionHistory> {
    const { data, error } = await (supabase as any).rpc('get_transaction_history', {
      p_limit: params.limit || 20,
      p_offset: params.offset || 0,
      p_type: params.type || null,
      p_display_currency: params.displayCurrency || 'USD'
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getRecentFinancialActivity(limit: number = 5): Promise<FinancialActivity[]> {
    const { data, error } = await (supabase as any).rpc('get_recent_financial_activity', {
      p_limit: limit
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return (data as any).activity || [];
  },

  async getWinnerHistory(): Promise<WinnerHistory> {
    const { data, error } = await (supabase as any).rpc('get_winner_history');
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getAvailablePaymentProviders(currency?: SupportedCurrency): Promise<PaymentProvider[]> {
    const { data, error } = await (supabase as any).rpc('get_available_payment_providers', {
      p_currency: currency
    });
    if (error) throw error;
    return data || [];
  },

  async getPaymentRequestStatus(requestId: string): Promise<PaymentRequestStatusResponse> {
    const { data, error } = await (supabase as any).rpc('get_payment_request_status', {
      p_request_id: requestId
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async requestDeposit(params: {
    amount: number;
    currency: SupportedCurrency;
    provider: string;
    idempotencyKey: string;
  }): Promise<RequestDepositResponse> {
    const { data, error } = await (supabase as any).rpc('request_deposit', {
      p_original_amount: params.amount,
      p_original_currency: params.currency,
      p_provider_name: params.provider,
      p_idempotency_key: params.idempotencyKey
    });
    if (error) throw error;
    return data;
  },

  async requestWithdrawal(params: {
    amount: number;
    currency: SupportedCurrency;
    provider: string;
    destination: any;
    idempotencyKey: string;
  }): Promise<RequestWithdrawalResponse> {
    const { data, error } = await (supabase as any).rpc('request_withdrawal', {
      p_amount: params.amount,
      p_currency: params.currency,
      p_provider_name: params.provider,
      p_destination: params.destination,
      p_idempotency_key: params.idempotencyKey
    });
    if (error) throw error;
    return data;
  },

  /**
   * SANDBOX ONLY
   */

  async simulatePaymentSuccess(requestId: string, idempotencyKey: string) {
    const { data, error } = await (supabase as any).rpc('simulate_payment_success', {
      p_payment_request_id: requestId,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw error;
    return data;
  },

  async simulatePaymentFailure(requestId: string, reason: string) {
    const { data, error } = await (supabase as any).rpc('simulate_payment_failure', {
      p_payment_request_id: requestId,
      p_reason: reason
    });
    if (error) throw error;
    return data;
  },

  /**
   * ADMIN-ONLY RPCs
   */

  async getFinancialSummary(): Promise<FinancialSummary> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).rpc('get_financial_summary', {
      p_admin_id: user?.id
    });
    if (error) throw error;
    return data;
  },

  async getWithdrawalRequests(status: string = 'pending'): Promise<WithdrawalRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).rpc('get_withdrawal_requests', {
      p_admin_id: user?.id,
      p_status: status
    });
    if (error) throw error;
    return data?.requests || data || [];
  },

  async approveWithdrawal(requestId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).rpc('approve_withdrawal', {
      p_admin_id: user?.id,
      p_request_id: requestId,
      p_provider_reference: `MANUAL-${crypto.randomUUID().slice(0, 8)}`
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async rejectWithdrawal(requestId: string, reason: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).rpc('reject_withdrawal', {
      p_admin_id: user?.id,
      p_request_id: requestId,
      p_reason: reason
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getUserWalletAudit(targetUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).rpc('get_user_wallet_audit', {
      p_admin_id: user?.id,
      p_target_user_id: targetUserId
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async toggleWalletLock(targetUserId: string, lock: boolean, reason?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    let res;
    if (lock) {
      res = await (supabase as any).rpc('lock_wallet', {
        p_admin_id: user?.id,
        p_user_id: targetUserId,
        p_reason: reason || 'Manual Admin Lock',
        p_risk_level: 'flagged'
      });
    } else {
      res = await (supabase as any).rpc('unlock_wallet', {
        p_admin_id: user?.id,
        p_user_id: targetUserId,
        p_notes: reason || 'Manual Admin Unlock'
      });
    }
    if (res.error) throw res.error;
    return res.data;
  },

  async adjustWalletBalance(targetUserId: string, amount: number, type: string, note: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).rpc('admin_adjust_wallet', {
      p_admin_id: user?.id,
      p_user_id: targetUserId,
      p_amount_usd: amount,
      p_type: type,
      p_note: note
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }
};
