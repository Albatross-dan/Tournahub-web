import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Tag, RefreshCw, Lock, CheckCircle2, AlertTriangle, 
  Store, Edit3, Eye, Check, PlusCircle, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import Shell from '../../components/layout/Shell';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { CountdownTimer } from '../../components/marketplace/CountdownTimer';
import { SubmitCredentialsModal } from '../../components/marketplace/SubmitCredentialsModal';
import { DisputeResponseModal } from '../../components/marketplace/DisputeResponseModal';
import { MarketplaceOrder, MarketplaceListing } from '../../types/marketplace';
import { marketplaceService } from '../../services/marketplaceService';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export default function MySales() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [sales, setSales] = useState<MarketplaceOrder[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'listings'>('orders');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [selectedOrderForCreds, setSelectedOrderForCreds] = useState<MarketplaceOrder | null>(null);
  const [selectedOrderForDisputeResponse, setSelectedOrderForDisputeResponse] = useState<MarketplaceOrder | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Get the real logged-in user everywhere from live session
      const { data: { user: liveUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !liveUser) {
        navigate('/login');
        return;
      }
      const userId = liveUser.id;
      setCurrentUserId(userId);

      const [ordersData, listingsData] = await Promise.all([
        marketplaceService.getOrders(userId, 'seller'),
        marketplaceService.getMyListings(userId)
      ]);
      setSales(ordersData);
      setListings(listingsData);
    } catch (err: any) {
      console.error('Failed to load sales and listings:', err);
      const msg = err.message || 'Error loading seller data.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handlePublishListing = async (listingId: string) => {
    if (!currentUserId) return;
    try {
      const res = await marketplaceService.publishListing(currentUserId, listingId);
      if (res && res.error) {
        toast.error(res.error);
      } else {
        toast.success('Listing successfully published to marketplace!');
        fetchAll();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish listing.');
    }
  };

  const formatUSD = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'escrow_held':
        return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', label: 'Action Required: Submit Details' };
      case 'credentials_submitted':
        return { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', label: 'Waiting Buyer Confirm' };
      case 'completed':
        return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', label: 'Sale Completed' };
      case 'disputed':
        return { bg: 'bg-red-500/10 border-red-500/30 text-red-400', label: 'Under Dispute' };
      case 'refunded':
        return { bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400', label: 'Refunded to Buyer' };
      default:
        return { bg: 'bg-slate-800 border-white/10 text-slate-400', label: status };
    }
  };

  const getListingBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', label: 'Live on Store' };
      case 'draft':
        return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', label: 'Draft / Unpublished' };
      case 'reserved':
      case 'pending_escrow':
        return { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', label: 'In Escrow' };
      case 'sold':
        return { bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400', label: 'Sold' };
      case 'hidden':
        return { bg: 'bg-slate-800 border-white/10 text-slate-400', label: 'Hidden' };
      case 'rejected':
        return { bg: 'bg-red-500/10 border-red-500/30 text-red-400', label: 'Rejected by Admin' };
      default:
        return { bg: 'bg-slate-800 border-white/10 text-slate-400', label: status };
    }
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        <MarketplaceNavbar />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white uppercase italic tracking-tight">
              Seller Dashboard & Escrow Payouts
            </h2>
            <p className="text-xs text-text-muted font-bold">
              Manage your listed accounts, submit login credentials to escrow, and track USD earnings.
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tabs for Orders vs Listings */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all cursor-pointer",
              activeTab === 'orders'
                ? "bg-primary text-slate-950 shadow-lg shadow-primary/20"
                : "bg-surface/60 text-slate-400 hover:text-white border border-white/5"
            )}
          >
            <Tag className="w-4 h-4" />
            <span>My Escrow Orders ({sales.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all cursor-pointer",
              activeTab === 'listings'
                ? "bg-primary text-slate-950 shadow-lg shadow-primary/20"
                : "bg-surface/60 text-slate-400 hover:text-white border border-white/5"
            )}
          >
            <Store className="w-4 h-4" />
            <span>My Listings ({listings.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 text-slate-400">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              Loading Seller Ledger...
            </span>
          </div>
        ) : error ? (
          <div className="py-16 text-center bg-red-950/20 border border-red-900/40 rounded-3xl p-8 max-w-md mx-auto space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-base font-black text-white uppercase italic">Failed to Load Seller Data</h3>
            <p className="text-xs text-red-300/80 font-medium">{error}</p>
          </div>
        ) : activeTab === 'orders' ? (
          /* TAB 1: ESCROW ORDERS */
          sales.length === 0 ? (
            <div className="py-20 text-center bg-surface/50 border border-border-main rounded-3xl p-10 max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                <Tag className="w-8 h-8 stroke-[1.5px]" />
              </div>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                No Sales Transactions Yet
              </h3>
              <p className="text-xs text-text-muted font-bold max-w-sm mx-auto leading-relaxed">
                You don't have any active sales yet. List an account for sale to start earning USD directly to your wallet.
              </p>
              <Link
                to="/marketplace/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span>Sell An Account</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((order) => {
                const badge = getStatusBadge(order.status);
                const thumbUrl = order.listing_screenshots && order.listing_screenshots.length > 0
                  ? marketplaceService.getListingImageUrl(order.listing_screenshots[0])
                  : '/default-card.jpg';

                const sellerPayout = order.seller_amount_usd !== undefined
                  ? order.seller_amount_usd
                  : order.amount_usd * 0.9;

                return (
                  <div
                    key={order.id}
                    className="card bg-surface border-border-main rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-white/20"
                  >
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

                        <div className="flex items-center gap-4 text-xs text-text-muted font-bold flex-wrap">
                          <span>Buyer: <strong className="text-slate-300">{order.buyer_username || 'Buyer'}</strong></span>
                          <span>•</span>
                          <span>Sale Price: <strong className="text-white font-mono">{formatUSD(order.amount_usd)}</strong></span>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono font-extrabold flex items-center gap-0.5">
                            Your Payout: {formatUSD(sellerPayout)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                      {order.status === 'escrow_held' && (
                        <div className="flex flex-col md:items-end gap-1.5 max-w-xs">
                          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wide">
                            ⚠️ Submit login before deadline or order auto-cancels!
                          </span>
                          {order.credential_submit_deadline && (
                            <CountdownTimer targetDate={order.credential_submit_deadline} label="Submit Deadline" onExpire={fetchAll} />
                          )}
                        </div>
                      )}

                      {order.status === 'credentials_submitted' && (
                        <div className="flex flex-col md:items-end gap-1">
                          <span className="text-[10px] font-bold text-blue-300">Credentials submitted. Buyer review window:</span>
                          {order.review_deadline && (
                            <CountdownTimer targetDate={order.review_deadline} label="Auto-Release In" onExpire={fetchAll} />
                          )}
                        </div>
                      )}

                      {order.status === 'completed' && (
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Funds Released to Wallet</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0 shrink-0">
                      {order.status === 'escrow_held' && (
                        <button
                          onClick={() => setSelectedOrderForCreds(order)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer"
                        >
                          <Lock className="w-4 h-4 stroke-[2.5px]" />
                          <span>Submit Credentials</span>
                        </button>
                      )}

                      {order.status === 'credentials_submitted' && (
                        <div className="px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Pending Buyer Confirmation
                        </div>
                      )}

                      {order.status === 'disputed' && (
                        <button
                          onClick={() => setSelectedOrderForDisputeResponse(order)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Dispute Assessment</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* TAB 2: MY LISTINGS (ALL STATUSES) */
          listings.length === 0 ? (
            <div className="py-20 text-center bg-surface/50 border border-border-main rounded-3xl p-10 max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                <Store className="w-8 h-8 stroke-[1.5px]" />
              </div>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                No Listings Created Yet
              </h3>
              <p className="text-xs text-text-muted font-bold max-w-sm mx-auto leading-relaxed">
                You haven't listed any eFootball accounts for sale yet. Create your first listing now.
              </p>
              <Link
                to="/marketplace/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
                <span>Create First Listing</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => {
                const badge = getListingBadge(listing.status);
                const thumbUrl = listing.screenshots && listing.screenshots.length > 0
                  ? marketplaceService.getListingImageUrl(listing.screenshots[0])
                  : '/default-card.jpg';

                return (
                  <div
                    key={listing.id}
                    className="card bg-surface border border-border-main rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all hover:border-white/20"
                  >
                    <div>
                      <div className="relative h-40 bg-slate-900 overflow-hidden">
                        <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3">
                          <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border backdrop-blur-md", badge.bg)}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 font-mono font-extrabold text-white text-sm">
                          {formatUSD(listing.price_usd)}
                        </div>
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                          <span>Platform: <strong className="text-white">{listing.platform}</strong></span>
                          <span>Level: <strong className="text-white">{listing.account_level || 'N/A'}</strong></span>
                        </div>
                        <h4 className="text-base font-black text-white uppercase italic tracking-tight line-clamp-1">
                          {listing.title || 'Untitled Account Listing'}
                        </h4>
                        <p className="text-xs text-text-muted font-medium line-clamp-2">
                          {listing.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 flex items-center justify-between gap-2 border-t border-white/5 mt-4">
                      <Link
                        to={`/marketplace/listing/${listing.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all text-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                      <Link
                        to={`/marketplace/edit/${listing.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-primary font-black text-xs uppercase italic tracking-wider rounded-xl transition-all text-center"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Link>
                      {listing.status === 'draft' && (
                        <button
                          onClick={() => handlePublishListing(listing.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          <span>Publish</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {selectedOrderForCreds && currentUserId && (
          <SubmitCredentialsModal
            isOpen={!!selectedOrderForCreds}
            onClose={() => setSelectedOrderForCreds(null)}
            orderId={selectedOrderForCreds.id}
            sellerId={currentUserId}
            onSuccess={fetchAll}
            deadline={selectedOrderForCreds.credential_submit_deadline}
          />
        )}

        {selectedOrderForDisputeResponse && currentUserId && (
          <DisputeResponseModal
            isOpen={!!selectedOrderForDisputeResponse}
            onClose={() => setSelectedOrderForDisputeResponse(null)}
            orderId={selectedOrderForDisputeResponse.id}
            userId={currentUserId}
            onSuccess={fetchAll}
          />
        )}
      </div>
    </Shell>
  );
}
