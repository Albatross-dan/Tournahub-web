export type TopUpStep = "idle" | "initializing" | "awaiting_payment" | "verifying" | "success" | "error";

export type SupportedCurrency = "NGN" | "GHS" | "ZAR" | "USD" | "KES";

export interface CurrencyConfig {
  code: SupportedCurrency;
  name: string;
  flag: string;
  subunit_multiplier: number;
  approx_usd_rate: number;
}

export interface TopUpParams {
  amountSubunit: number; // e.g. amount in kobo (500 Naira = 50000)
  currency: SupportedCurrency;
  amountUsd: number;
  userEmail: string;
  userName: string;
}

export interface InitializePaymentResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
  payment_request_id: string;
  success?: boolean;
  message?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  already_processed: boolean;
  amount_usd: number;
  reference: string;
  message: string;
}

export interface PaystackPopConfig {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  label?: string;
  callback: (response: { reference: string; status: string }) => void;
  onClose: () => void;
}

export interface PaystackPopInstance {
  openIframe: () => void;
}

// Global Declaration of PaystackPop for TS compiler
declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: PaystackPopConfig) => PaystackPopInstance;
    };
  }
}
