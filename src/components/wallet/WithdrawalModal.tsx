import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ArrowUpRight, ChevronRight, CheckCircle2, 
  AlertTriangle, RefreshCw, Landmark, Phone, 
  Landmark as BankIcon, Wifi, Ban, Scale, Clock, 
  FileText, PlusCircle, User, Check, ShieldAlert, Sparkles, Plus, ArrowLeft, History
} from 'lucide-react';
import { 
  paystackWithdrawService, 
  PaystackBank, 
  PaystackTransferRecipient, 
  PaystackWithdrawalRequest 
} from '../../services/paystackWithdrawService';
import { WalletLimits, SupportedCurrency } from '../../types/finance';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  limits: WalletLimits | null;
  balanceUsd: number;
  exchangeRate: number;
}

// Browser-safe fallback UUID generator in case crypto.randomUUID is not present
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function WithdrawalModal({ isOpen, onClose, onSuccess, limits, balanceUsd }: WithdrawalModalProps) {
  // Modal layout view: 'withdraw' or 'history'
  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');

  // Withdrawal Step state: 1 = Setup details & Resolve, 2 = Enter amount & Withdraw, 3 = Confirmation receipts
  const [wpStep, setWpStep] = useState<1 | 2 | 3>(1);

  // Loaded metadata
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [savedRecipients, setSavedRecipients] = useState<PaystackTransferRecipient[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<PaystackWithdrawalRequest[]>([]);
  
  // Loaders
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Step 1 input state
  const [selectedBank, setSelectedBank] = useState<PaystackBank | null>(null);
  const [accountNumber, setAccountNumber] = useState<string>('');
  
  // Step 1 resolution state
  const [resolving, setResolving] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // Step 2 input state
  const [amountUsd, setAmountUsd] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUUID());
  
  // Step 2 output success state
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  // Trigger loads on mount/open
  useEffect(() => {
    if (isOpen) {
      loadBanks();
      loadSavedRecipients();
      loadHistory();
      resetForm();
    }
  }, [isOpen]);

  // If any critical criteria changes, refresh the idempotency key so we protect different runs
  useEffect(() => {
    setIdempotencyKey(generateUUID());
  }, [selectedBank, accountNumber, amountUsd]);

  const resetForm = () => {
    setWpStep(1);
    setSelectedBank(null);
    setAccountNumber('');
    setResolvedName(null);
    setResolutionError(null);
    setAmountUsd('');
    setWithdrawError(null);
    setReceipt(null);
    setIdempotencyKey(generateUUID());
  };

  const loadBanks = async () => {
    try {
      setLoadingBanks(true);
      const data = await paystackWithdrawService.getBanks('KES', 'mobile_money');
      setBanks(data);
      if (data.length > 0) {
        setSelectedBank(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load Paystack banks:', err);
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadSavedRecipients = async () => {
    try {
      setLoadingRecipients(true);
      const data = await paystackWithdrawService.getSavedRecipients();
      setSavedRecipients(data);
    } catch (err: any) {
      console.error('Failed to load saved recipients:', err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await paystackWithdrawService.getWithdrawalHistory();
      setWithdrawalHistory(data);
    } catch (err: any) {
      console.error('Failed to load withdrawal history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Step 1 Action: Resolve account name
  const handleResolveAccount = async () => {
    if (!selectedBank) {
      return toast.error('Please select a payment provider');
    }
    if (!accountNumber || accountNumber.trim().length < 5) {
      return toast.error('Please enter a valid account or phone number');
    }

    try {
      setResolving(true);
      setResolutionError(null);
      setResolvedName(null);

      const res = await paystackWithdrawService.resolveAccount(accountNumber.trim(), selectedBank.code);
      
      if (res.status && res.account_name) {
        setResolvedName(res.account_name);
        toast.success(`Account verified: ${res.account_name}`);
      } else {
        setResolutionError(res.error || res.message || 'Could not verify account holder name');
      }
    } catch (err: any) {
      setResolutionError(err.message || 'Verification attempt failed. Please check details.');
    } finally {
      setResolving(false);
    }
  };

  // Step 1 Success Confirmation: Proceed to Step 2
  const handleConfirmDetailsAndProceed = () => {
    if (!resolvedName) return;
    setWpStep(2);
  };

  // Step 2 Action: Submit transfer withdrawal
  const handleInitiateWithdrawal = async () => {
    const val = parseFloat(amountUsd);
    if (!amountUsd || isNaN(val) || val <= 0) {
      return toast.error('Please enter a valid amount');
    }

    // Constraints checks
    if (val < 1) {
      return toast.error('Minimum withdrawal amount is $1.00 USD');
    }
    if (val > 200) {
      return toast.error('Maximum single withdrawal amount is $200.00 USD');
    }
    if (limits && val > limits.remaining_withdrawal_usd) {
      return toast.error(`Daily withdrawal limit exceeded. Remaining limit: $${limits.remaining_withdrawal_usd.toFixed(2)}`);
    }
    if (val > balanceUsd) {
      return toast.error('Insufficient USD wallet balance');
    }
    if (!selectedBank || !resolvedName) {
      return toast.error('Setup steps are incomplete');
    }

    try {
      setWithdrawing(true);
      setWithdrawError(null);

      const res = await paystackWithdrawService.withdraw({
        amountUsd: val,
        accountNumber: accountNumber.trim(),
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountName: resolvedName,
        type: 'mobile_money',
        idempotencyKey: idempotencyKey
      });

      if (res.error) {
        setWithdrawError(res.error || res.message || 'Transaction rejected by payment gateway');
      } else if (res.status === 'success' || res.status === 'pending') {
        setReceipt(res);
        toast.success(res.message || 'Withdrawal requested successfully!');
        setWpStep(3);
        onSuccess(); // Trigger parent wallet balance refresh
        loadHistory(); // Reload table logs
        loadSavedRecipients(); // Reload recipients list
      } else {
        setWithdrawError(res.note || 'Something went wrong during withdrawal processing');
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'Payment system returned an unexpected error');
    } finally {
      setWithdrawing(false);
    }
  };

  const selectRecipient = (rec: PaystackTransferRecipient) => {
    const bankMatch = banks.find(b => b.name === rec.bank_name || b.code === rec.account_number); // matching heuristic
    if (bankMatch) {
      setSelectedBank(bankMatch);
    } else {
      // Find by code fallback or find standard bank
      const foundBank = banks.find(b => b.name.toLowerCase().includes(rec.bank_name.toLowerCase()) || rec.bank_name.toLowerCase().includes(b.name.toLowerCase()));
      if (foundBank) setSelectedBank(foundBank);
    }
    setAccountNumber(rec.account_number);
    setResolvedName(rec.name);
    setResolutionError(null);
    toast.success(`Autofilled account details for: ${rec.name}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md" 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#070815] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] z-10"
      >
        {/* Top Header / Tab Selector */}
        <div className="p-8 pb-4 shrink-0 flex items-center justify-between border-b border-white/5 bg-[#0a0c20]/50">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <BankIcon className="w-6 h-6 text-primary" /> Payout Cabinet
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
              Modern instant mobile money withdrawals via Paystack
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Custom Tab Bar */}
        <div className="px-8 shrink-0 flex border-b border-white/5 bg-[#050612]/70 h-10">
          <button 
            type="button"
            onClick={() => { setActiveTab('withdraw'); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all border-b-2",
              activeTab === 'withdraw'
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            <Plus className="w-3.5 h-3.5" /> Request Transfer
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('history'); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all border-b-2",
              activeTab === 'history'
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            <History className="w-3.5 h-3.5" /> Payout Requests
          </button>
        </div>

        {/* Scrollable View Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeTab === 'withdraw' ? (
            <div className="space-y-6">
              
              {/* STAGE CONTROLLER INDICATOR */}
              {wpStep < 3 && (
                <div className="flex items-center justify-between bg-white/2 border border-white/5 p-3 rounded-2xl shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black italic",
                      wpStep === 1 ? "bg-primary text-black" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    )}>
                      {wpStep === 1 ? '1' : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">
                      Destination Setup
                    </span>
                  </div>
                  <div className="h-px bg-white/10 flex-1 mx-3" />
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black italic",
                      wpStep === 2 ? "bg-primary text-black border-transparent" : "bg-white/5 border border-white/10 text-slate-500"
                    )}>
                      2
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Amount & Payout
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 1 VIEW */}
              {wpStep === 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  
                  {/* Saved payout recipients (quick selector) if we have any */}
                  {savedRecipients.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-1">
                        <User className="w-3 h-3 text-[#d4af37]" /> Quick Payout Saved Accounts
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mask-gradient-r">
                        {savedRecipients.map((rec) => (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => selectRecipient(rec)}
                            className={cn(
                              "shrink-0 flex flex-col items-start p-3 bg-white/2 hover:bg-white/5 border border-white/5 rounded-xl text-left min-w-[130px] transition-all relative overflow-hidden group/item",
                              accountNumber === rec.account_number ? "border-[#d4af37]/50 bg-[#d4af37]/5" : ""
                            )}
                          >
                            <span className="text-[10px] font-black italic text-white truncate max-w-[110px] uppercase block">
                              {rec.name}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 font-mono mt-1 block">
                              {rec.bank_name}
                            </span>
                            <span className="text-[8px] font-semibold text-[#d4af37] font-mono tracking-wider truncate max-w-[110px] block mt-0.5">
                              {rec.account_number}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment provider selector */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                      Pick Payout Operator
                    </p>
                    {loadingBanks ? (
                      <div className="flex items-center justify-center p-6 bg-white/1 border border-white/5 rounded-2xl">
                        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 pl-2">Decrypting provider networks...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {banks.map((bk) => (
                          <button
                            key={bk.id}
                            type="button"
                            onClick={() => {
                              setSelectedBank(bk);
                              setResolvedName(null);
                              setResolutionError(null);
                            }}
                            className={cn(
                              "flex items-center justify-between p-3.5 rounded-xl border transition-all text-left",
                              selectedBank?.id === bk.id
                                ? "bg-primary/10 border-primary text-primary shadow-xl"
                                : "bg-white/2 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                            )}
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              <Landmark className={cn("w-4 h-4 shrink-0", selectedBank?.id === bk.id ? "text-primary" : "text-slate-500")} />
                              <div>
                                <p className="text-[11px] font-black uppercase italic tracking-tighter leading-tight truncate">
                                  {bk.name}
                                </p>
                                <p className="text-[8px] font-semibold opacity-60 font-mono text-[9px]">
                                  {bk.currency}
                                </p>
                              </div>
                            </div>
                            {selectedBank?.id === bk.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Account enter area */}
                  <div className="space-y-3.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic block">
                      Target Mobile Money Phone Number (M-PESA / Airtel)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        type="tel"
                        required
                        value={accountNumber}
                        onChange={(e) => {
                          setAccountNumber(e.target.value);
                          setResolvedName(null);
                          setResolutionError(null);
                        }}
                        placeholder="e.g. 07XXXXXXXX or 01XXXXXXXX"
                        className="w-full bg-white/2 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white font-black italic tracking-tighter text-base outline-none focus:border-primary/50 placeholder:text-slate-705"
                      />
                    </div>
                  </div>

                  {/* Resolution Output Banners */}
                  <AnimatePresence mode="wait">
                    {resolving && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3"
                      >
                        <RefreshCw className="w-4 h-4 animate-spin text-primary shrink-0" />
                        <div>
                          <p className="text-xs font-black text-primary uppercase italic tracking-tighter">
                            Resolving registered name...
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Interrogating Paystack sandbox ledger safely
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {resolvedName && !resolving && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3.5"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-emerald-400 uppercase italic tracking-tighter">
                            Verified Holder Account Name
                          </p>
                          <p className="text-sm font-black text-white italic uppercase tracking-tight">
                            {resolvedName}
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium font-mono">
                            Paystack Network: {selectedBank?.name} ({accountNumber})
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {resolutionError && !resolving && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3.5"
                      >
                        <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 mt-0.5 shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <p className="text-xs font-black text-rose-400 uppercase italic tracking-tighter">
                            Verification Failed
                          </p>
                          <p className="text-[11px] text-zinc-300 font-semibold leading-normal">
                            {resolutionError}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest pt-1 leading-normal italic">
                            Double-check the account/phone format and try again. Ensure you choose the correct mobile operator code.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Primary Verification / Advancement button */}
                  {!resolvedName ? (
                    <button
                      type="button"
                      disabled={resolving || !accountNumber || !selectedBank}
                      onClick={handleResolveAccount}
                      className="w-full bg-white hover:bg-slate-200 disabled:opacity-40 py-4.5 rounded-2xl flex items-center justify-center space-x-2 shadow-xl shrink-0 transition-all active:scale-95 text-black font-black uppercase italic tracking-tighter text-base"
                    >
                      {resolving ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin text-black" />
                          <span>Verifying Holder Info...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Account Holder</span>
                          <ArrowUpRight className="w-5 h-5 text-black" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmDetailsAndProceed}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 py-4.5 rounded-2xl flex items-center justify-center space-x-2 shadow-xl transition-all active:scale-95 text-black font-black uppercase italic tracking-tighter text-base"
                    >
                      <span>Proceed with Verified Details</span>
                      <ChevronRight className="w-5 h-5 text-black" />
                    </button>
                  )}

                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center italic leading-relaxed pt-1.5">
                    * Paystack Account Verification prevents losing funds to typos or incorrect phone numbers. Complete name matching first.
                  </p>

                </motion.div>
              )}

              {/* STEP 2 VIEW */}
              {wpStep === 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  
                  {/* Verified Details Header Card */}
                  <div className="bg-[#0b0e20] border border-white/5 rounded-2xl p-4.5 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#d4af37] italic">
                        Payout Target Account
                      </span>
                      <p className="text-[11px] font-bold text-slate-400 font-mono">
                        {selectedBank?.name} — {accountNumber}
                      </p>
                      <p className="text-sm font-black text-white italic uppercase tracking-tight">
                        {resolvedName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWpStep(1)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center gap-1 shrink-0"
                    >
                      <ArrowLeft className="w-3 h-3 text-[#d4af37]" /> Change
                    </button>
                  </div>

                  {/* Amount entry block */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                      <span>Specify Withdrawal Sum (USD)</span>
                      <span>Balance: ${balanceUsd.toFixed(2)} USD</span>
                    </div>

                    <div className="flex space-x-2">
                      <div className="bg-white/2 border border-white/5 rounded-2xl px-5 py-4 text-white font-black uppercase italic tracking-tighter flex items-center justify-center text-lg select-none">
                        USD
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={amountUsd}
                          onChange={(e) => {
                            setAmountUsd(e.target.value);
                            setWithdrawError(null);
                          }}
                          className="w-full bg-white/2 border border-white/5 rounded-2xl pl-4 pr-24 py-4 text-white font-black italic tracking-tighter text-xl outline-none focus:border-primary/50 placeholder:text-slate-705"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-teal-400 italic uppercase tracking-tighter">
                          ≈ {amountUsd ? (parseFloat(amountUsd) * 130).toLocaleString() : 0} KES
                        </div>
                      </div>
                    </div>

                    {/* Simple rate helper metadata */}
                    <div className="flex justify-between items-center px-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                      <span>Exchange Rate: 1 USD = 130.00 KES</span>
                      <span>Min: $1 | Max: $200</span>
                    </div>
                  </div>

                  {/* Submission errors displayed directly to users */}
                  <AnimatePresence>
                    {withdrawError && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-xs text-rose-300"
                      >
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold uppercase italic tracking-wider text-rose-400">
                            Withdrawal Declined
                          </p>
                          <p className="font-semibold text-zinc-300 mt-1 pb-1 leading-relaxed">
                            {withdrawError}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-t border-rose-500/10 pt-1 leading-normal italic">
                            Verification token and idempotency limits are recorded. Retry submission if parameters remain identical.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit cashout payout button */}
                  <button
                    type="button"
                    disabled={withdrawing || !amountUsd || parseFloat(amountUsd) <= 0}
                    onClick={handleInitiateWithdrawal}
                    className="w-full bg-white hover:bg-slate-200 disabled:opacity-40 py-5 rounded-2xl flex items-center justify-center space-x-2 shadow-xl  transition-all active:scale-95 text-black font-black uppercase italic tracking-tighter text-base shrink-0"
                  >
                    {withdrawing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-black" />
                        <span>Sending payload transfer...</span>
                      </>
                    ) : (
                      <>
                        <span>Process Withdrawal</span>
                        <ArrowUpRight className="w-5 h-5 text-black" />
                      </>
                    )}
                  </button>

                  {/* Warning terms */}
                  <div className="p-3.5 bg-white/1 border border-white/5 rounded-2xl space-y-1 shrink-0">
                    <p className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest italic flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-[#d4af37]" /> Core Limit Check Compliance
                    </p>
                    <p className="text-[9px] text-slate-400 leading-normal font-medium">
                      Funds will be paid to your verified mobile money wallet immediately in Sandbox Mode. Production limits are min $1.00 and max $200.00 per transaction, cap at $500.00 daily.
                    </p>
                  </div>

                </motion.div>
              )}

              {/* STEP 3 success view with printable receipt */}
              {wpStep === 3 && receipt && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 pt-2"
                >
                  {/* Decorative confetti container */}
                  <div className="text-center space-y-3 py-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] pointer-events-none" />
                    
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto"
                    >
                      <Check className="w-9 h-9 stroke-[4] text-[#040511]" />
                    </motion.div>

                    <div className="space-y-1">
                      <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">
                        Payout Confirmed
                      </h3>
                      <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center justify-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> INSTANT SANDBOX PROGRESS COMPLETED
                      </p>
                    </div>
                  </div>

                  {/* Receipt items container */}
                  <div className="bg-[#0b0e20] border border-white/5 rounded-2xl overflow-hidden shadow-xl shrink-0">
                    <div className="p-4.5 bg-[#0e1127] border-b border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Secured Payout Receipt
                      </span>
                      <span className="text-[9px] font-bold text-[#d4af37] font-mono uppercase bg-[#d4af37]/10 px-2.5 py-0.5 border border-[#d4af37]/20 rounded-full">
                        Success
                      </span>
                    </div>

                    <div className="p-5 space-y-3 text-xs divide-y divide-white/5 font-semibold text-slate-300">
                      <div className="flex justify-between items-center pb-2.5">
                        <span className="text-slate-500">Holder Code Status:</span>
                        <span className="text-white font-mono uppercase">{receipt.transfer_reference}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2.5 pb-2.5">
                        <span className="text-slate-500">Destination Account:</span>
                        <span className="text-white italic uppercase">{receipt.account_name || resolvedName}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2.5 pb-2.5">
                        <span className="text-slate-500">Mobile Phone / Operator:</span>
                        <span className="text-white font-mono">{accountNumber} ({selectedBank?.name})</span>
                      </div>
                      <div className="flex justify-between items-center pt-2.5 pb-2.5">
                        <span className="text-slate-500">Usd Deducted:</span>
                        <span className="text-white font-extrabold">${receipt.amount_usd || parseFloat(amountUsd).toFixed(2)} USD</span>
                      </div>
                      <div className="flex justify-between items-center pt-2.5 pb-2.5">
                        <span className="text-slate-500">Kes Payout Disbursed:</span>
                        <span className="text-emerald-400 font-extrabold italic">{(receipt.amount_kes || (parseFloat(amountUsd) * 130)).toLocaleString()} KES</span>
                      </div>
                      <div className="flex justify-between items-center pt-2.5 pt-2 flex-col sm:flex-row gap-1 border-t border-white/5">
                        <span className="text-slate-500 shrink-0 text-[10px]">Security Hash Message:</span>
                        <span className="text-[10px] text-slate-400 font-mono text-center sm:text-right italic truncate max-w-full">
                          {receipt.note || 'Withdrawal processed (sandbox mode — instant)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Final close button */}
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      onClose();
                    }}
                    className="w-full bg-white hover:bg-slate-205 py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xl shrink-0 transition-all active:scale-95 text-black font-black uppercase italic tracking-tighter text-base"
                  >
                    <span>Done & Close Cabinet</span>
                  </button>

                </motion.div>
              )}

            </div>
          ) : (
            /* HISTORY TAB VIEW */
            <div className="space-y-5">
              
              <div className="flex items-center justify-between pb-1 shrink-0">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#d4af37]" /> Paystack Transaction Ledger Logs
                </span>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="p-1 px-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-[9px] font-black uppercase tracking-wider text-slate-300 transition-all"
                >
                  Refresh
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white/1 border border-white/5 rounded-3xl">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">Syncing ledger records...</span>
                </div>
              ) : withdrawalHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-white/1 border border-white/5 rounded-3xl">
                  <Ban className="w-10 h-10 text-slate-700" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase italic text-slate-400">No payout logs found</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 max-w-[240px]">
                      Trigger a transaction on the mobile money module to record success histories.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1 cs-scroll">
                  {withdrawalHistory.map((item) => (
                    <div 
                      key={item.id}
                      className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/4 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#d4af37] font-bold">
                            #{item.transfer_reference?.slice(0, 10) || item.id.slice(0, 8)}
                          </span>
                          <span className="text-[8px] font-bold text-slate-500 font-mono">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold uppercase italic text-slate-400">
                          Disbursement request: <span className="text-white font-mono font-black">{item.currency}</span>
                        </p>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <p className="text-sm font-black italic text-white leading-none">
                          -${Number(item.amount_usd).toFixed(2)} USD
                        </p>
                        <span className={cn(
                          "inline-block text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border leading-none font-mono",
                          item.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          item.status === 'pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                          "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        )}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Real-time Processing footer wrapper */}
        <div className="bg-[#050612]/80 px-8 py-5 flex items-center justify-between border-t border-white/5 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-black text-primary uppercase italic tracking-widest">Real-time processing active</span>
          </div>
          <div className="flex items-center gap-1">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] font-mono text-slate-600 font-semibold select-none">IDEMPOTENCY_CAP_LOCKIVE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
