
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CreditCard, ChevronRight, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, Smartphone
} from 'lucide-react';
import { walletService } from '../../services/walletService';
import { PaymentProvider, SupportedCurrency, RequestDepositResponse } from '../../types/finance';
import { formatCurrencyDynamic, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  environment: 'sandbox' | 'production';
  exchangeRate: number;
}

export default function DepositModal({ isOpen, onClose, onSuccess, environment, exchangeRate }: DepositModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [currency, setCurrency] = useState<SupportedCurrency>('KES');
  const [amount, setAmount] = useState<string>('');
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<RequestDepositResponse | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen, currency]);

  async function loadProviders() {
    try {
      const data = await walletService.getAvailablePaymentProviders(currency);
      setProviders(data);
      if (data.length > 0) setSelectedProvider(data[0].name);
    } catch (err) {
      console.error('Provider load error:', err);
    }
  }

  const usdEquivalent = amount ? parseFloat(amount) / exchangeRate : 0;
  const currentProvider = providers.find(p => p.name === selectedProvider);

  async function handleRequest() {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');
    if (!selectedProvider) return toast.error('Select a payment method');
    
    if (currentProvider) {
      if (usdEquivalent < currentProvider.min_deposit_usd) return toast.error(`Min deposit is $${currentProvider.min_deposit_usd}`);
      if (usdEquivalent > currentProvider.max_deposit_usd) return toast.error(`Max deposit is $${currentProvider.max_deposit_usd}`);
    }

    try {
      setLoading(true);
      const res = await walletService.requestDeposit({
        amount: parseFloat(amount),
        currency,
        provider: selectedProvider,
        idempotencyKey
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      setRequest(res);
      setStep(2);
    } catch (err: any) {
      toast.error('Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulate(success: boolean) {
    if (!request?.payment_request_id) return;
    try {
      setLoading(true);
      if (success) {
        await walletService.simulatePaymentSuccess(request.payment_request_id, crypto.randomUUID());
        setPolling(true);
      } else {
        await walletService.simulatePaymentFailure(request.payment_request_id, 'user_cancelled');
        setPolling(true);
      }
    } catch (err) {
      toast.error('Simulation failed');
      setLoading(false);
    }
  }

  // Polling for status
  useEffect(() => {
    if (!polling || !request?.payment_request_id) return;

    const interval = setInterval(async () => {
      try {
        const status = await walletService.getPaymentRequestStatus(request.payment_request_id!);
        if (status.status === 'completed') {
          setPolling(false);
          setLoading(false);
          toast.success('Funds added successfully!');
          onSuccess();
          onClose();
        } else if (status.status === 'failed' || status.status === 'cancelled') {
          setPolling(false);
          setLoading(false);
          toast.error('Payment request failed');
          setStep(1);
          setRequest(null);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000);

    const timeout = setTimeout(() => {
      if (polling) {
        setPolling(false);
        setLoading(false);
        toast.error('Verification timed out. Check balance in 1 min.');
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [polling, request, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-[#0a0b1e] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Add Funds</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                    <span>Amount & Currency</span>
                    <span>1 USD ≈ {exchangeRate} {currency}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                      className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-black uppercase italic tracking-tighter outline-none focus:border-primary/50"
                    >
                      <option value="KES">KES</option>
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                      <option value="GHS">GHS</option>
                      <option value="ZAR">ZAR</option>
                    </select>
                    <div className="flex-1 relative">
                       <input 
                         type="number"
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         placeholder="Enter amount"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-16 py-4 text-white font-black italic tracking-tighter text-xl outline-none focus:border-primary/50 placeholder:text-slate-700"
                       />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-primary italic uppercase tracking-tighter">
                         ≈ ${usdEquivalent.toFixed(2)}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Select Payment Provider</p>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {providers.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setSelectedProvider(p.name)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                          selectedProvider === p.name 
                            ? "bg-primary border-primary text-black" 
                            : "bg-white/5 border-white/10 text-white hover:border-white/30"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                           <Smartphone className={cn("w-5 h-5", selectedProvider === p.name ? "text-black" : "text-primary")} />
                           <div>
                             <p className="text-xs font-black uppercase italic tracking-tighter leading-none">{p.display_name}</p>
                             <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60")}>
                               Fee: {p.fee_percent}% + ${p.fee_fixed_usd}
                             </p>
                           </div>
                        </div>
                        {selectedProvider === p.name && <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={loading || !amount}
                  onClick={handleRequest}
                  className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 py-5 rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-primary/20 transition-all active:scale-95"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-black" />
                  ) : (
                    <>
                      <span className="text-black font-black uppercase italic tracking-tighter text-lg">Secure Deposit</span>
                      <ChevronRight className="w-5 h-5 text-black" />
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-6 space-y-8 text-center"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                  <Clock className="w-10 h-10 text-primary animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-tight">Payment Initiated</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest px-8">
                    Follow the instructions on your {request?.provider} app to complete the transaction.
                  </p>
                </div>

                <div className="card p-4 bg-white/5 border-white/10 mx-auto max-w-[280px]">
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Expected Amount</p>
                   <p className="text-2xl font-black text-white italic tracking-tighter">
                     {request?.original_amount} {request?.original_currency}
                   </p>
                   <p className="text-[10px] text-primary font-black uppercase italic mt-1 group">
                     Reference: {request?.payment_request_id?.split('-')[0].toUpperCase()}
                   </p>
                </div>

                {/* Sandbox Simulation */}
                {environment === 'sandbox' && (
                  <div className="space-y-4 pt-4">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">Sandbox Simulator</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleSimulate(true)}
                        disabled={loading || polling}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all disabled:opacity-50"
                      >
                        Simulate Success
                      </button>
                      <button
                        onClick={() => handleSimulate(false)}
                        disabled={loading || polling}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all disabled:opacity-50"
                      >
                        Simulate Failure
                      </button>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setStep(1)}
                  className="text-[10px] font-black text-slate-500 hover:text-white uppercase italic tracking-widest pt-4"
                >
                  Cancel and try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Security */}
        <div className="bg-white/5 px-8 py-4 flex items-center justify-between border-t border-white/5">
           <div className="flex items-center space-x-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[9px] font-black text-emerald-500 uppercase italic tracking-widest">End-to-end encrypted</span>
           </div>
           <CreditCard className="w-4 h-4 text-slate-700" />
        </div>
      </motion.div>

      {/* Block interactions when polling */}
      {(loading || polling) && (
        <div className="absolute inset-0 z-[101] bg-black/20 flex flex-col items-center justify-center space-y-4 rounded-[2.5rem]">
           <RefreshCw className="w-10 h-10 text-primary animate-spin" />
           <p className="text-[10px] font-black text-primary uppercase italic tracking-[0.2em] animate-pulse">Verifying Transaction...</p>
        </div>
      )}
    </div>
  );
}
