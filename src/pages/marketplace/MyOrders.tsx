import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingBag, RefreshCw, Key, CheckCircle2, ShieldAlert, 
  Award, ArrowLeft, Clock, DollarSign, Tag, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Shell from '../../components/layout/Shell';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { CountdownTimer } from '../../components/marketplace/CountdownTimer';
import { CredentialsModal } from '../../components/marketplace/CredentialsModal';
import { DisputeModal } from '../../components/marketplace/DisputeModal';
import { ReviewModal } from '../../components/marketplace/ReviewModal';
import { DisputeResponseModal } from '../../components/marketplace/DisputeResponseModal';
import { AccountRecoveryModal } from '../../components/marketplace/AccountRecoveryModal';
import { MarketplaceOrder } from '../../types/marketplace';
import { marketplaceService } from '../../services/marketplaceService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export default function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Active Modals State
  const [selectedOrderForCreds, setSelectedOrderForCreds] = useState<MarketplaceOrder | null>(null);
  const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<MarketplaceOrder | null>(null);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<MarketplaceOrder | null>(null);
  const [selectedOrderForRecoveryReport, setSelectedOrderForRecoveryReport] = useState<MarketplaceOrder | null>(null);
  const [selectedOrderForDisputeResponse, setSelectedOrderForDisputeResponse] = useState<MarketplaceOrder | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [orderToConfirm, setOrderToConfirm] = useState<string | null>(null);

  const isProtectionActive = (order: any) => {
    if (!order.post_confirmation_protection_until) return false;
    return new Date(order.post_confirmation_protection_until).getTime() > Date.now();
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user: liveUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !liveUser) {
        navigate('/login');
        return;
      }
      const currentUserId = liveUser.id;
      setUserId(currentUserId);
      const data = await marketplaceService.getOrders(currentUserId, 'buyer');
      setOrders(data);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      const msg = err.message || 'Error loading buyer orders.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initUser = async () => {
      try {
        const { data: { user: liveUser } } = await supabase.auth.getUser();
        if (liveUser) {
          setUserId(liveUser.id);
        }
      } catch (e) {
        console.error('Error fetching user on mount:', e);
      }
    };
    initUser();
    fetchOrders();
  }, []);

  const handleConfirmDelivery = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      const { data: { user: liveUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !liveUser) {
        toast.error('Authentication required. Please log in.');
        return;
      }
      const res = await marketplaceService.confirmDelivery(liveUser.id, orderId);
      if (res && res.error) {
        toast.error(res.error);
      } else {
        toast.success('✓ Delivery confirmed! Funds have been released to the seller.');
        setOrderToConfirm(null);
        await fetchOrders();
      }
    } catch (err: any) {
      console.error('confirm_delivery UI error:', err);
      toast.error(err.message || 'Something went wrong confirming delivery.');
    } finally {
      setConfirmingId(null);
    }
  };

  const formatUSD = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'escrow_held':
        return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', label: 'Escrow Held' };
      case 'credentials_submitted':
        return { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', label: 'Credentials Ready' };
      case 'completed':
        return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', label: 'Completed' };
      case 'disputed':
        return { bg: 'bg-red-500/10 border-red-500/30 text-red-400', label: 'Under Dispute' };
      case 'refunded':
        return { bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400', label: 'Refunded' };
      default:
        return { bg: 'bg-slate-800 border-white/10 text-slate-400', label: status };
    }
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        <MarketplaceNavbar />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white uppercase italic tracking-tight">
              My Purchased Orders (Buyer)
            </h2>
            <p className="text-xs text-text-muted font-bold">
              Track active escrow transactions, review login credentials, and manage deliveries.
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 text-slate-400">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              Retrieving Escrow Ledger...
            </span>
          </div>
        ) : error ? (
          <div className="py-16 text-center bg-red-950/20 border border-red-900/40 rounded-3xl p-8 max-w-md mx-auto space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-base font-black text-white uppercase italic">Failed to Load Orders</h3>
            <p className="text-xs text-red-300/80 font-medium">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center bg-surface/50 border border-border-main rounded-3xl p-10 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <ShoppingBag className="w-8 h-8 stroke-[1.5px]" />
            </div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
              No Purchases Yet
            </h3>
            <p className="text-xs text-text-muted font-bold max-w-sm mx-auto leading-relaxed">
              You haven't bought any eFootball accounts yet. Browse our verified marketplace listings to get started.
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              <span>Browse Marketplace</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const badge = getStatusBadge(order.status);
              const thumbUrl = order.listing_screenshots && order.listing_screenshots.length > 0
                ? marketplaceService.getListingImageUrl(order.listing_screenshots[0])
                : '/default-card.jpg';

              return (
                <div
                  key={order.id}
                  className="card bg-surface border-border-main rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-white/20"
                >
                  {/* Left: Thumbnail & Order Info */}
                  <div className="flex items-start md:items-center space-x-4 min-w-0 flex-1">
                    <Link to={`/marketplace/listing/${order.listing_id}`} className="w-20 h-14 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-white/10 group">
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </Link>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border", badge.bg)}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Order #{order.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <Link to={`/marketplace/listing/${order.listing_id}`} className="text-sm font-black text-white uppercase italic tracking-tight block truncate hover:text-primary transition-colors">
                        {order.listing_title || 'eFootball Account Listing'}
                      </Link>

                      <div className="flex items-center gap-4 text-xs text-text-muted font-bold">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-primary" />
                          {order.listing_platform || 'Multiplatform'}
                        </span>
                        <span>•</span>
                        <span>Seller: <strong className="text-slate-300">{order.seller_username || 'Seller'}</strong></span>
                        <span>•</span>
                        <span className="text-primary font-mono font-extrabold">{formatUSD(order.amount_usd)}</span>
                      </div>

                      {order.status === 'completed' && isProtectionActive(order) && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider mt-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Protected until {new Date(order.post_confirmation_protection_until!).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Live Timers & Status details */}
                  <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                    {order.status === 'escrow_held' && (
                      <div className="flex flex-col md:items-end gap-1">
                        <span className="text-[10px] font-bold text-slate-400">Waiting for seller credentials...</span>
                        {order.credential_submit_deadline && (
                          <CountdownTimer targetDate={order.credential_submit_deadline} label="Seller Deadline" onExpire={fetchOrders} />
                        )}
                      </div>
                    )}

                    {order.status === 'credentials_submitted' && (
                      <div className="flex flex-col md:items-end gap-1">
                        <span className="text-[10px] font-bold text-blue-300">Credentials available! Review before deadline:</span>
                        {order.review_deadline && (
                          <CountdownTimer targetDate={order.review_deadline} label="Review Deadline" onExpire={fetchOrders} />
                        )}
                      </div>
                    )}

                    {order.status === 'disputed' && (
                      <div className="px-3 py-1 bg-red-950/50 border border-red-500/40 rounded-xl text-[10px] font-black text-red-400 uppercase tracking-wider">
                        Dispute ID: {order.dispute_id?.slice(0, 8) || 'Active'}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0 shrink-0">
                    {order.status === 'credentials_submitted' && (
                      <>
                        <button
                          onClick={() => setSelectedOrderForCreds(order)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5 stroke-[2.5px]" />
                          <span>View Credentials</span>
                        </button>

                        <button
                          disabled={confirmingId === order.id}
                          onClick={() => setOrderToConfirm(order.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5px]" />
                          <span>{confirmingId === order.id ? 'Releasing...' : 'Confirm Delivery'}</span>
                        </button>

                        <button
                          onClick={() => setSelectedOrderForDispute(order)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Dispute</span>
                        </button>
                      </>
                    )}

                    {order.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedOrderForReview(order)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5 stroke-[2.5px]" />
                          <span>Leave Review</span>
                        </button>

                        {isProtectionActive(order) && (
                          <button
                            onClick={() => setSelectedOrderForRecoveryReport(order)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-950/50 hover:bg-red-900/50 border border-red-500/25 text-red-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer animate-pulse"
                            title="Report account recovery by seller"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Report Recovery</span>
                          </button>
                        )}
                      </div>
                    )}

                    {order.status === 'disputed' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedOrderForCreds(order)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>View Credentials</span>
                        </button>
                        <button
                          onClick={() => setSelectedOrderForDisputeResponse(order)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Dispute Assessment</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        {selectedOrderForCreds && userId && (
          <CredentialsModal
            isOpen={!!selectedOrderForCreds}
            onClose={() => setSelectedOrderForCreds(null)}
            orderId={selectedOrderForCreds.id}
            requesterId={userId}
            isBuyer={true}
          />
        )}

        {selectedOrderForDispute && userId && (
          <DisputeModal
            isOpen={!!selectedOrderForDispute}
            onClose={() => setSelectedOrderForDispute(null)}
            orderId={selectedOrderForDispute.id}
            openerId={userId}
            onSuccess={fetchOrders}
          />
        )}

        {selectedOrderForReview && userId && (
          <ReviewModal
            isOpen={!!selectedOrderForReview}
            onClose={() => setSelectedOrderForReview(null)}
            orderId={selectedOrderForReview.id}
            buyerId={userId}
            sellerUsername={selectedOrderForReview.seller_username}
            onSuccess={fetchOrders}
          />
        )}

        {selectedOrderForRecoveryReport && userId && (
          <AccountRecoveryModal
            isOpen={!!selectedOrderForRecoveryReport}
            onClose={() => setSelectedOrderForRecoveryReport(null)}
            orderId={selectedOrderForRecoveryReport.id}
            buyerId={userId}
            onSuccess={fetchOrders}
          />
        )}

        {selectedOrderForDisputeResponse && userId && (
          <DisputeResponseModal
            isOpen={!!selectedOrderForDisputeResponse}
            onClose={() => setSelectedOrderForDisputeResponse(null)}
            orderId={selectedOrderForDisputeResponse.id}
            userId={userId}
            onSuccess={fetchOrders}
          />
        )}

        {/* Custom Non-blocking Confirm Delivery Modal */}
        {orderToConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-surface border border-border-main rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3 text-emerald-400">
                <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase italic tracking-wider text-white">Confirm Delivery</h3>
                  <p className="text-xs text-emerald-400/80 font-bold">Release Escrow Funds</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Are you sure you want to confirm delivery? This will release the escrow funds directly to the seller. 
                <span className="text-red-400 block mt-1.5 font-bold uppercase tracking-wider text-[11px]">This action is irreversible.</span>
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToConfirm(null)}
                  disabled={confirmingId !== null}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDelivery(orderToConfirm)}
                  disabled={confirmingId !== null}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5px]" />
                  <span>{confirmingId !== null ? 'Confirming...' : 'Confirm Delivery'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
