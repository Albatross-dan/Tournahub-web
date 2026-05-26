import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loadPaystackScript, openPaystackPopup } from '../lib/paystack';
import type { TopUpStep, TopUpParams, InitializePaymentResponse, VerifyPaymentResponse } from '../types/payment';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;

interface UseWalletTopUpReturn {
  step:          TopUpStep;
  errorMessage:  string | null;
  successAmount: number | null;    // USD amount credited
  reference:     string | null;    // Paystack reference used
  initiateTopUp: (params: TopUpParams) => Promise<void>;
  reset:         () => void;
}

export function useWalletTopUp(): UseWalletTopUpReturn {
  const [step, setStep] = useState<TopUpStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAmount, setSuccessAmount] = useState<number | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setErrorMessage(null);
    setSuccessAmount(null);
    setReference(null);
  }, []);

  // Internal verification function helper
  const verifyPayment = async (refStr: string) => {
    if (!isMountedRef.current) return;
    setStep('verifying');

    try {
      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { reference: refStr }
      });

      if (!isMountedRef.current) return;

      if (!error && data && data.success) {
        setStep('success');
        setSuccessAmount(data.amount_usd || 0);
      } else {
        setStep('error');
        const errDetail = error?.message || data?.error || data?.message || 'Payment verification failed or was not completed.';
        setErrorMessage(errDetail);
      }
    } catch (err: any) {
      console.error('[VerifyPayment Error]:', err);
      if (isMountedRef.current) {
        setStep('error');
        setErrorMessage('Failed to connect to verification service. Please contact support.');
      }
    }
  };

  const initiateTopUp = useCallback(async (params: TopUpParams): Promise<void> => {
    try {
      setStep('initializing');
      setErrorMessage(null);
      setSuccessAmount(null);

      // STEP 2: Load script
      console.log('[Paystack SDK] Loading inline script...');
      await loadPaystackScript();

      // STEP 3: Verify session exists
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (isMountedRef.current) {
          setStep('error');
          setErrorMessage('Please log in again. Your session has expired.');
        }
        return;
      }

      // STEP 4: Call /paystack-initialize
      console.log('[Paystack SDK] Initializing payment intent on DB...');
      const { data: initData, error: initError } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          amount_subunit: params.amountSubunit,
          currency: params.currency,
          amount_usd: params.amountUsd,
          idempotency_key: crypto.randomUUID()
        }
      });

      if (!isMountedRef.current) return;

      if (initError || !initData) {
        setStep('error');
        const errDetail = initError?.message || initData?.error || initData?.message || 'Initialization failed.';
        setErrorMessage(errDetail);
        return;
      }

      const { reference: checkoutRef } = initData as InitializePaymentResponse;
      setReference(checkoutRef);

      // STEP 5: Set step and open Paystack popup iframe
      setStep('awaiting_payment');
      console.log(`[Paystack SDK] Spawning checkout popup frame with reference: ${checkoutRef}`);

      openPaystackPopup({
        key: PAYSTACK_PUBLIC_KEY,
        email: params.userEmail,
        amount: params.amountSubunit,
        currency: params.currency,
        ref: checkoutRef,
        label: params.username,
        onSuccess: (transaction) => {
          console.log('[Paystack SDK] Successful popup payment action. Verifying with API...', transaction);
          verifyPayment(transaction.reference);
        },
        onCancel: () => {
          console.log('[Paystack SDK] Popup closed prematurely by customer.');
          if (isMountedRef.current) {
            setStep('idle');
          }
        }
      });

    } catch (err: any) {
      console.error('[useWalletTopUp] Initialization exception caught:', err);
      if (isMountedRef.current) {
        setStep('error');
        setErrorMessage(err.message || 'Something went wrong. Please try again.');
      }
    }
  }, []);

  return {
    step,
    errorMessage,
    successAmount,
    reference,
    initiateTopUp,
    reset
  };
}
