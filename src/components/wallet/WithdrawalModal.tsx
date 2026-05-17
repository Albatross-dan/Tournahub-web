
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ArrowUpRight, ChevronRight, CheckCircle2, 
  AlertTriangle, RefreshCw, Landmark, Phone, Landmark as BankIcon
} from 'lucide-react';
import { walletService } from '../../services/walletService';
import { PaymentProvider, SupportedCurrency, RequestWithdrawalResponse, WalletLimits } from '../../types/finance';
import { formatCurrencyDynamic, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  limits: WalletLimits | null;
  balanceUsd: number;
  exchangeRate: number;
}

export default function WithdrawalModal({ isOpen, onClose, onSuccess, limits, balanceUsd, exchangeRate }: WithdrawalModalProps) {
  const [currency, setCurrency] = useState<SupportedCurrency>('KES');
  const [amount, setAmount] = useState<string>('');
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [destination, setDestination] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen, currency]);

  async function loadProviders() {
    try {
      const data = await walletService.getAvailablePaymentProviders(currency);
      // Filter for providers that support withdrawals if possible, or just use available
      setProviders(data);
      if (data.length > 0) setSelectedProvider(data[0].name);
    } catch (err) {
      console.error('Provider load error:', err);
    }
  }

  const currentProvider = providers.find(p => p.name === selectedProvider);
  const usdAmount = amount ? parseFloat(amount) / exchangeRate : 0;

  async function handleWithdraw() {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');
    if (!selectedProvider) return toast.error('Select a withdrawal method');
    
    // Validations
    if (usdAmount > balanceUsd) return toast.error('Insufficient balance');
    if (limits && usdAmount > limits.remaining_withdrawal_usd) return toast.error('Daily withdrawal limit reached');
    if (limits && usdAmount > limits.single_tx_limit_usd) return toast.error(`Max single withdrawal is $${limits.single_tx_limit_usd}`);

    // Provider specific destination validation
    if (selectedProvider === 'mpesa' && !destination.phone) return toast.error('Enter M-PESA phone number');
    if (selectedProvider === 'flutterwave' && (!destination.account_number || !destination.bank_code)) return toast.error('Enter bank details');

    try {
      setLoading(true);
      const res = await walletService.requestWithdrawal({
        amount: parseFloat(amount),
        currency,
        provider: selectedProvider,
        destination,
        idempotencyKey
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message || 'Withdrawal submitted for processing');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to initiate withdrawal');
    } finally {
      setLoading(false);
    }
  }

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
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Withdraw Funds</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                <span>Withdrawal Amount</span>
                <span>Max: ${limits?.remaining_withdrawal_usd.toFixed(2)} USD</span>
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
                     placeholder="0.00"
                     className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-16 py-4 text-white font-black italic tracking-tighter text-xl outline-none focus:border-primary/50 placeholder:text-slate-700"
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-primary italic uppercase tracking-tighter">
                     ≈ ${usdAmount.toFixed(2)}
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Select Withdrawal Method</p>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
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
                       <Landmark className={cn("w-5 h-5", selectedProvider === p.name ? "text-black" : "text-primary")} />
                       <div>
                         <p className="text-xs font-black uppercase italic tracking-tighter leading-none">{p.display_name}</p>
                         <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60")}>
                           Available for {currency}
                         </p>
                       </div>
                    </div>
                    {selectedProvider === p.name && <CheckCircle2 className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Destination Fields */}
            {selectedProvider && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Destination Details</p>
                {selectedProvider === 'mpesa' ? (
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                    <input 
                      type="text"
                      placeholder="+254XXXXXXXXX"
                      value={destination.phone || ''}
                      onChange={(e) => setDestination({ ...destination, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-black italic tracking-tighter text-lg outline-none focus:border-primary/50"
                    />
                  </div>
                ) : selectedProvider === 'flutterwave' ? (
                  <div className="grid grid-cols-1 gap-3">
                    <input 
                      type="text"
                      placeholder="Account Number"
                      value={destination.account_number || ''}
                      onChange={(e) => setDestination({ ...destination, account_number: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-black italic tracking-tighter outline-none focus:border-primary/50"
                    />
                    <input 
                      type="text"
                      placeholder="Bank Code"
                      value={destination.bank_code || ''}
                      onChange={(e) => setDestination({ ...destination, bank_code: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-black italic tracking-tighter outline-none focus:border-primary/50"
                    />
                  </div>
                ) : (
                  <textarea 
                    placeholder="Enter full bank details here"
                    value={destination.details || ''}
                    onChange={(e) => setDestination({ ...destination, details: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-black italic tracking-tighter outline-none focus:border-primary/50 min-h-[100px] resize-none"
                  />
                )}
              </motion.div>
            )}

            <button
              disabled={loading || !amount || !selectedProvider}
              onClick={handleWithdraw}
              className="w-full bg-white hover:bg-slate-200 disabled:opacity-50 py-5 rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-white/5 transition-all active:scale-95"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-black" />
              ) : (
                <>
                  <span className="text-black font-black uppercase italic tracking-tighter text-lg">Process Withdrawal</span>
                  <ArrowUpRight className="w-5 h-5 text-black" />
                </>
              )}
            </button>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center italic">
              Withdrawals are processed within 24 hours after admin approval.
            </p>
          </div>
        </div>

        <div className="bg-white/5 px-8 py-4 flex items-center justify-between border-t border-white/5">
           <div className="flex items-center space-x-2">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             <span className="text-[9px] font-black text-primary uppercase italic tracking-widest">Real-time processing</span>
           </div>
           <BankIcon className="w-4 h-4 text-slate-700" />
        </div>
      </motion.div>
    </div>
  );
}
