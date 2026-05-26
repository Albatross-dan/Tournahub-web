import type { PaystackPopConfig } from '../types/payment';

let loadingPromise: Promise<void> | null = null;

export function loadPaystackScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window context is required to load Paystack'));
  }

  // If already loaded on the window object, resolve immediately
  if (window.PaystackPop) {
    return Promise.resolve();
  }

  // If already loading, return the existing loading promise
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise<void>((resolve, reject) => {
    // Check if script element is already in the document
    const existingScript = document.getElementById('paystack-js');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-js';
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = (err) => {
      loadingPromise = null; // Reset promise on failure so we can try again
      reject(new Error('Failed to load Paystack inline SDK script.'));
    };

    document.head.appendChild(script);
  });

  return loadingPromise;
}

export function openPaystackPopup(config: PaystackPopConfig): void {
  if (typeof window === 'undefined' || !window.PaystackPop) {
    throw new Error('Paystack inline SDK is not loaded. Please call loadPaystackScript() first.');
  }

  const handler = window.PaystackPop.setup(config);
  handler.openIframe();
}
