import type { PaystackPopConfig } from '../types/payment';

let scriptLoadPromise: Promise<void> | null = null;

export function loadPaystackScript(): Promise<void> {
  // Already loaded
  if (typeof window !== 'undefined' && window.PaystackPop) {
    return Promise.resolve();
  }
  // Already loading — return same promise
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    // Check again in case loaded between checks
    if (window.PaystackPop) {
      resolve();
      return;
    }

    const existing = document.getElementById('paystack-inline-js');
    if (existing) {
      // Script tag exists but PaystackPop not ready yet — wait for it
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => 
        reject(new Error('Paystack script failed to load'))
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;

    script.onload = () => {
      console.log('[Paystack] Script loaded successfully');
      resolve();
    };
    script.onerror = (e) => {
      console.error('[Paystack] Script failed to load:', e);
      scriptLoadPromise = null;  // allow retry
      reject(new Error(
        'Could not load Paystack. Check your internet connection and try again.'
      ));
    };

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function openPaystackPopup(config: PaystackPopConfig): void {
  if (!window.PaystackPop) {
    throw new Error('Paystack is not loaded yet. Please try again.');
  }
  const handler = window.PaystackPop.setup(config);
  handler.openIframe();
}

