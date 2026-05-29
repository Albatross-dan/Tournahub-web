import { ensureAuthenticated, supabase } from '../lib/supabase';

export interface PaystackBank {
  id: number;
  name: string;
  code: string;
  type: string;
  active: boolean;
  currency: string;
}

export interface ResolveAccountResponse {
  status: boolean;
  account_name?: string;
  account_number?: string;
  error?: string;
  message?: string;
}

export interface PaystackWithdrawResponse {
  message: string;
  withdrawal_id: string;
  wallet_transaction_id: string;
  transfer_reference: string;
  status: 'success' | 'pending' | 'failed';
  amount_usd: number;
  amount_kes: number;
  usd_to_kes_rate: number;
  note?: string;
  error?: string;
}

export interface PaystackWithdrawalRequest {
  id: string;
  amount_usd: number;
  amount_subunit: number;
  currency: string;
  status: string;
  transfer_reference: string;
  created_at: string;
}

export interface PaystackTransferRecipient {
  id: string;
  name: string;
  account_number: string;
  bank_name: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

// Simple in-memory cache for available banks
let cachedBanks: PaystackBank[] | null = null;

export const paystackWithdrawService = {
  /**
   * Fetch mobile money provider banks from Paystack Edge Function.
   * Call once and cache.
   */
  async getBanks(currency: string = 'KES', type: string = 'mobile_money'): Promise<PaystackBank[]> {
    if (cachedBanks) {
      return cachedBanks;
    }

    const session = await ensureAuthenticated();
    const token = session?.access_token;
    if (!token) {
      throw new Error('User is not authenticated');
    }

    const baseUrl = (supabase as any).functions?.url || `${(supabase as any).supabaseUrl}/functions/v1`;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBase}/paystack-banks?currency=${encodeURIComponent(currency)}&type=${encodeURIComponent(type)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || `Failed to fetch banks: ${res.status}`);
    }

    const body = await res.json();
    if (body.status && Array.isArray(body.data)) {
      cachedBanks = body.data;
      return body.data;
    } else {
      throw new Error(body.error || 'Invalid bank response format');
    }
  },

  /**
   * Resolve and verify target mobile money account name.
   */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<ResolveAccountResponse> {
    const session = await ensureAuthenticated();
    const token = session?.access_token;
    if (!token) {
      throw new Error('User is not authenticated');
    }

    const baseUrl = (supabase as any).functions?.url || `${(supabase as any).supabaseUrl}/functions/v1`;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBase}/paystack-resolve-account`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account_number: accountNumber,
        bank_code: bankCode
      })
    });

    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || `Account verification failed: ${res.status}`);
    }

    const body = await res.json();
    return body;
  },

  /**
   * Initiate Paystack Mobile Money Withdrawal.
   */
  async withdraw(params: {
    amountUsd: number;
    accountNumber: string;
    bankCode: string;
    bankName: string;
    accountName: string;
    type: string;
    idempotencyKey: string;
  }): Promise<PaystackWithdrawResponse> {
    const session = await ensureAuthenticated();
    const token = session?.access_token;
    if (!token) {
      throw new Error('User is not authenticated');
    }

    const baseUrl = (supabase as any).functions?.url || `${(supabase as any).supabaseUrl}/functions/v1`;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBase}/paystack-withdraw`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount_usd: params.amountUsd,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        bank_name: params.bankName,
        account_name: params.accountName,
        type: params.type,
        idempotency_key: params.idempotencyKey
      })
    });

    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || errRes.message || `Withdrawal request failed: ${res.status}`);
    }

    const body = await res.json();
    return body;
  },

  /**
   * Fetch withdrawal history from paystack_withdrawal_requests database table.
   */
  async getWithdrawalHistory(): Promise<PaystackWithdrawalRequest[]> {
    await ensureAuthenticated();
    const { data, error } = await supabase
      .from('paystack_withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading paystack withdrawal requests:', error);
      throw error;
    }

    return (data || []) as PaystackWithdrawalRequest[];
  },

  /**
   * Fetch saved transfer recipients from paystack_transfer_recipients database table.
   */
  async getSavedRecipients(): Promise<PaystackTransferRecipient[]> {
    await ensureAuthenticated();
    const { data, error } = await supabase
      .from('paystack_transfer_recipients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading saved transfer recipients:', error);
      throw error;
    }

    return (data || []) as PaystackTransferRecipient[];
  }
};
