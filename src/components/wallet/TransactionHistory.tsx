import React from 'react';
import { useWalletTransactions } from '../../hooks/useWalletTransactions';
import { TransactionRow } from './TransactionRow';
import { History, RefreshCw, Loader2 } from 'lucide-react';

export function TransactionHistory() {
  const {
    transactions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch,
  } = useWalletTransactions(10); // Page size of 10 to keep list loading interactive

  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col">
      {/* Title & Stats */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-black text-white uppercase italic tracking-wider">
            Transaction History
          </h3>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading || isLoadingMore}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all text-xs"
          title="Refresh transaction history"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider">
          ⚠️ {error}
        </div>
      )}

      {/* Main List */}
      <div className="space-y-2 flex-grow">
        {isLoading && transactions.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Syncing ledger transactions...
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center border border-white/5 text-slate-500">
              <History className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-white uppercase italic tracking-wider">
                No Transactions Found
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                Your completed deposit and enrollment fees will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>

            {hasMore && (
              <div className="pt-4 flex justify-center border-t border-white/5 mt-4">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-extrabold text-[10px] uppercase italic tracking-widest border border-white/10 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      Loading Records...
                    </>
                  ) : (
                    'Load More Entries'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TransactionHistory;
