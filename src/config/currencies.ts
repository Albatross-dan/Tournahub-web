import type { CurrencyConfig, SupportedCurrency } from '../types/payment';

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  NGN: {
    code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', symbol: '₦',
    subunit_multiplier: 100,
    approx_usd_rate: 1600,
    min_amount: 500,           // NGN 500 minimum
    max_amount: 8_000_000,     // NGN 8,000,000 maximum (~$5000)
    suggested_amounts: [1000, 2000, 5000, 10000, 20000, 50000],
  },
  GHS: {
    code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭', symbol: 'GH₵',
    subunit_multiplier: 100,
    approx_usd_rate: 15,
    min_amount: 15,
    max_amount: 75_000,
    suggested_amounts: [15, 50, 100, 200, 500, 1000],
  },
  ZAR: {
    code: 'ZAR', name: 'South African Rand', flag: '🇿🇦', symbol: 'R',
    subunit_multiplier: 100,
    approx_usd_rate: 18,
    min_amount: 18,
    max_amount: 90_000,
    suggested_amounts: [20, 50, 100, 200, 500, 1000],
  },
  USD: {
    code: 'USD', name: 'US Dollar', flag: '🇺🇸', symbol: '$',
    subunit_multiplier: 100,
    approx_usd_rate: 1,
    min_amount: 1,
    max_amount: 5000,
    suggested_amounts: [5, 10, 20, 50, 100, 200],
  },
  KES: {
    code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪', symbol: 'KSh',
    subunit_multiplier: 100,
    approx_usd_rate: 130,
    min_amount: 130,
    max_amount: 650_000,
    suggested_amounts: [200, 500, 1000, 2000, 5000, 10000],
  },
};

export const DEFAULT_CURRENCY: SupportedCurrency = 'NGN';

// Converts local currency amount to USD (display only — backend recalculates)
export function toUsd(amount: number, currency: SupportedCurrency): number {
  return Math.round((amount / CURRENCIES[currency].approx_usd_rate) * 100) / 100;
}

// Converts amount to Paystack subunit (multiply by 100)
export function toSubunit(amount: number, currency: SupportedCurrency): number {
  return Math.round(amount * CURRENCIES[currency].subunit_multiplier);
}

// Formats amount in local currency for display
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const config = CURRENCIES[currency];
  return `${config.symbol}${amount.toLocaleString('en', { minimumFractionDigits: 0 })}`;
}
