import type { PaystackPopConfig } from '../types/payment';

let scriptLoadPromise: Promise<void> | null = null;

export function loadPaystackScript(): Promise<void> {
  // Already available — resolve immediately
  if (typeof window !== 'undefined' && window.PaystackPop) {
    return Promise.resolve();
  }

  // Already loading — return the same promise
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    // Double-check inside the promise (race condition guard)
    if (window.PaystackPop) {
      resolve();
      return;
    }

    // Remove any broken previous attempt
    const existing = document.getElementById('paystack-inline-js');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id     = 'paystack-inline-js';
    script.src    = 'https://js.paystack.co/v2/inline.js';
    script.async  = true;

    script.onload = () => {
      // Paystack script loaded but PaystackPop may not be on window yet.
      // Poll for up to 5 seconds in 100ms intervals.
      let attempts = 0;
      const maxAttempts = 50;  // 50 × 100ms = 5 seconds

      const poll = setInterval(() => {
        attempts++;
        if (window.PaystackPop) {
          clearInterval(poll);
          console.log('[Paystack] PaystackPop ready after', attempts * 100, 'ms');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          scriptLoadPromise = null;
          reject(new Error(
            'Paystack loaded but PaystackPop is not available. ' +
            'Please refresh the page and try again.'
          ));
        }
      }, 100);
    };

    script.onerror = () => {
      scriptLoadPromise = null;
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
    throw new Error(
      'Paystack is not ready. Please wait a moment and try again.'
    );
  }
  try {
    const handler = window.PaystackPop.setup(config);
    handler.openIframe();
  } catch (err) {
    console.error('[Paystack] openIframe error:', err);
    throw new Error(
      'Could not open payment window. Please try again.'
    );
  }
}
