import { SupportedCurrency, CurrencyConfig } from '../types/payment';

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  NGN: { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", subunit_multiplier: 100, approx_usd_rate: 1600 },
  GHS: { code: "GHS", name: "Ghanaian Cedi",  flag: "🇬🇭", subunit_multiplier: 100, approx_usd_rate: 15 },
  ZAR: { code: "ZAR", name: "South African Rand", flag: "🇿🇦", subunit_multiplier: 100, approx_usd_rate: 18 },
  USD: { code: "USD", name: "US Dollar",       flag: "🇺🇸", subunit_multiplier: 100, approx_usd_rate: 1 },
  KES: { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", subunit_multiplier: 100, approx_usd_rate: 130 },
};
