import { useState, useEffect, useRef } from 'react';
import { walletService } from '../services/walletService';
import { TopUpStep, TopUpParams, VerifyPaymentResponse } from '../types/payment';

export function useWalletTopUp() {
  const [step, setStep] = useState<TopUpStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAmount, setSuccessAmount] = useState<number | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const scriptLoaded = useRef(false);

  // Dynamic injection of Paystack script tag
  useEffect(() => {
    if (scriptLoaded.current) return;

    const existingScript = document.getElementById('paystack-inline-js');
    if (existingScript) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.type = 'text/javascript';
    script.onload = () => {
      scriptLoaded.current = true;
      console.log('[Paystack SDK] Inline popup SDK script successfully loaded.');
    };
    script.onerror = (e) => {
      console.error('[Paystack SDK] Failed to load inline popup SDK script:', e);
    };

    document.body.appendChild(script);

    return () => {
      // Keep it loaded, or clean up if needed. Keeping it is fine, but guard against duplicates using ID check.
    };
  }, []);

  const reset = () => {
    setStep("idle");
    setErrorMessage(null);
    setSuccessAmount(null);
    setReference(null);
  };

  const verifyPayment = async (ref: string): Promise<VerifyPaymentResponse> => {
    setStep("verifying");
    console.log(`[Paystack TOP-UP] Actively verifying reference in database via confirmPaymentRequest: ${ref}`);

    // Confirm that transaction exists and is processed in the database
    const confirmRes = await walletService.confirmPaymentRequest(ref, {
      reference: ref,
      status: 'success'
    });

    // Obtain the actual credited amounts and details
    const statusRes = await walletService.getPaymentRequestStatus(ref);

    return {
      success: statusRes.status === 'completed',
      already_processed: statusRes.status === 'completed',
      amount_usd: statusRes.usd_amount || 0,
      reference: ref,
      message: statusRes.message || 'Payment successfully verified.'
    };
  };

  const initiateTopUp = async (params: TopUpParams): Promise<void> => {
    try {
      setStep("initializing");
      setErrorMessage(null);

      // Verify Paystack global object exists
      if (!window.PaystackPop) {
        throw new Error('Paystack SDK is currently offline or loading. Please wait a moment and try again.');
      }

      const paystackPubKey = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!paystackPubKey) {
        throw new Error('Paystack configuration is incomplete. Public key not defined.');
      }

      // 1. Generate unique idempotency key
      const idempotencyKey = crypto.randomUUID();

      // Calculating original unit amount (e.g. 500 NGN instead of 50000 subunit kobo)
      const amountUnit = params.amountSubunit / 100;

      // 2. Call secure boundary Database RPC to register and receive signed reference
      console.log('[Paystack TOP-UP] Registering transaction in database...');
      const requestRes = await walletService.requestDeposit({
        amount: amountUnit,
        currency: params.currency as any,
        provider: 'paystack',
        idempotencyKey: idempotencyKey
      });

      if (!requestRes || !requestRes.success || !requestRes.payment_request_id) {
        throw new Error(requestRes?.message || requestRes?.error || 'Server refused payment init request.');
      }

      const transactionRef = requestRes.payment_request_id;
      setReference(transactionRef);
      setStep("awaiting_payment");

      // 3. Setup and open Paystack pop
      console.log('[Paystack TOP-UP] Opening Paystack Inline Popup screen');
      const paystack = window.PaystackPop.setup({
        key: paystackPubKey,
        email: params.userEmail,
        amount: params.amountSubunit,
        currency: params.currency,
        ref: transactionRef, // Secured and authenticated reference
        label: params.userName || params.userEmail,
        callback: async (response: any) => {
          try {
            console.log('[Paystack TOP-UP] Payment authorized on pop. Completing reference: ', response.reference);
            setStep("verifying");

            // Complete deposit locally in DB through SQL schema trigger 
            await walletService.confirmPaymentRequest(transactionRef, response);

            const creditedUsd = requestRes.usd_equivalent || params.amountUsd;
            setSuccessAmount(creditedUsd);
            setStep("success");
          } catch (verifyErr: any) {
            console.error('[Paystack TOP-UP] Real-time reference verification failure:', verifyErr);
            setErrorMessage(verifyErr.message || 'Payment verification failed. Please contact Support with your reference.');
            setStep("error");
          }
        },
        onClose: () => {
          console.log('[Paystack TOP-UP] Interactive payment screen closed.');
          setStep("idle");
        }
      });

      paystack.openIframe();
    } catch (err: any) {
      console.error('[Paystack TOP-UP] Initialization exception caught:', err);
      setErrorMessage(err.message || 'Failed to initialize secure checkout session.');
      setStep("error");
    }
  };

  return {
    step,
    errorMessage,
    successAmount,
    reference,
    initiateTopUp,
    reset
  };
}
