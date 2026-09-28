import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Store, Gavel, Users, CheckCircle2, XCircle, 
  EyeOff, Eye, Key, AlertTriangle, DollarSign, RefreshCw, Star, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminShell from '../../components/layout/AdminShell';
import { CredentialsModal } from '../../components/marketplace/CredentialsModal';
import { MarketplaceListing, MarketplaceOrder, MarketplaceSellerStats } from '../../types/marketplace';
import { marketplaceService } from '../../services/marketplaceService';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { useSignedUrl } from '../../hooks/useSignedUrl';

function SignedEvidenceImage({ path, alt, borderColorClass = "hover:border-red-500/40" }: { path: string; alt: string; borderColorClass?: string; key?: any }) {
  const { url, loading, error } = useSignedUrl('marketplace-dispute-evidence', path);

  if (loading) {
    return (
      <div className="aspect-video bg-slate-950 rounded-xl border border-white/5 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="aspect-video bg-slate-950 rounded-xl border border-red-500/20 flex items-center justify-center p-2 text-center">
        <span className="text-[9px] font-bold text-red-400">Broken Image</span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "aspect-video bg-slate-950 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center relative transition-colors cursor-pointer group",
        borderColorClass
      )}
    >
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        referrerPolicy="no-referrer"
      />
    </a>
  );
}

export default function AdminMarketplace() {
  const { user, profile, can } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'disputes' | 'stats' | 'suspended_sellers'>('queue');
  const [loading, setLoading] = useState<boolean>(true);

  // Data State
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [disputes, setDisputes] = useState<MarketplaceOrder[]>([]);
  const [sellerStats, setSellerStats] = useState<MarketplaceSellerStats[]>([]);
  const [suspendedSellers, setSuspendedSellers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal / Action State
  const [selectedOrderForCreds, setSelectedOrderForCreds] = useState<MarketplaceOrder | null>(null);
  const [resolvingOrderId, setResolvingOrderId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'refund_buyer' | 'release_seller' | 'partial'>('refund_buyer');
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [confirmingResolve, setConfirmingResolve] = useState<{ orderId: string, category?: string, disputeId?: string } | null>(null);

  // Rejection prompt state
  const [rejectingListingId, setRejectingListingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const fetchAdminData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'queue') {
        const data = await marketplaceService.adminGetQueue(statusFilter);
        setListings(data);
      } else if (activeTab === 'disputes') {
        const data = await marketplaceService.adminGetDisputes();
        setDisputes(data);
      } else if (activeTab === 'stats') {
        const data = await marketplaceService.adminGetAllSellerStats();
        setSellerStats(data);
      } else if (activeTab === 'suspended_sellers') {
        const data = await marketplaceService.adminGetSuspendedSellers();
        setSuspendedSellers(data);
      }
    } catch (err: any) {
      toast.error('Error loading admin marketplace data: ' + (err.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeTab, statusFilter]);

  const handleModerateListing = async (listingId: string, action: 'approve' | 'reject' | 'hide' | 'unhide', reason?: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      const res = await marketplaceService.adminModerateListing(user.id, listingId, action, reason);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Listing successfully ${action}d!`);
        if (action === 'reject') setRejectingListingId(null);
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} listing.`);
    } finally {
      setProcessing(false);
    }
  };

  const handleResolveDispute = (orderId: string, category?: string, disputeId?: string) => {
    if (!user) return;

    if (category !== 'account_recovery' && outcome === 'partial' && (partialAmount <= 0 || isNaN(partialAmount))) {
      toast.error('Please enter a valid partial refund USD amount.');
      return;
    }

    setConfirmingResolve({ orderId, category, disputeId });
  };

  const executeResolveDispute = async (orderId: string, category?: string, disputeId?: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      if (category === 'account_recovery') {
        const actualOutcome = outcome === 'refund_buyer' ? 'uphold' : 'reject';
        const res = await marketplaceService.adminResolveAccountRecovery(
          user.id,
          disputeId || orderId,
          actualOutcome,
          adminNotes.trim()
        );

        if (res.error) {
          toast.error(res.error);
        } else {
          if (actualOutcome === 'uphold') {
            toast.success(
              <div className="space-y-1.5 p-1 text-xs text-left">
                <p className="font-extrabold text-white uppercase tracking-wider">⚖️ Recovery claim upheld successfully</p>
                <div className="border-t border-white/10 pt-1.5 space-y-1 text-slate-300">
                  <p>Buyer Refunded: <span className="text-emerald-400 font-mono font-black">${(res.buyer_refund_usd || 0).toFixed(2)}</span></p>
                  <p>Seller Clawback: <span className="text-amber-400 font-mono font-bold">${(res.clawback_usd || 0).toFixed(2)}</span></p>
                  {(res.shortfall_debt_usd || 0) > 0 && (
                    <p className="text-red-400 font-extrabold">Seller Debt Owed: <span className="font-mono">${(res.shortfall_debt_usd || 0).toFixed(2)}</span> (Seller Suspended)</p>
                  )}
                </div>
              </div>,
              { duration: 10000 }
            );
          } else {
            toast.success('⚖️ Account Recovery Claim dismissed. Dispute closed in seller favor.');
          }

          setResolvingOrderId(null);
          setAdminNotes('');
          setPartialAmount(0);
          setConfirmingResolve(null);
          fetchAdminData();
        }
      } else {
        const res = await marketplaceService.adminResolveDispute(
          user.id,
          orderId,
          outcome,
          partialAmount,
          adminNotes.trim()
        );

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('⚖️ Dispute resolved and wallet funds updated!');
          setResolvingOrderId(null);
          setAdminNotes('');
          setPartialAmount(0);
          setConfirmingResolve(null);
          fetchAdminData();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve dispute.');
    } finally {
      setProcessing(false);
    }
  };

  const formatUSD = (val: number) => `$${Number(val || 0).toFixed(2)}`;

  const canManage = profile?.role === 'admin' || can('manage_marketplace') || user?.email?.toLowerCase().includes('danieloguda');
  if (!canManage) {
    return (
      <AdminShell>
        <div className="py-24 text-center max-w-md mx-auto space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-black text-white uppercase italic">Access Restricted</h2>
          <p className="text-xs text-slate-400">You need the 'manage_marketplace' permission to access the Marketplace moderation desk.</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border-main p-6 rounded-3xl shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic tracking-wider">
                Marketplace Moderation HQ
              </h1>
              <p className="text-xs text-text-muted font-bold">
                Administer eFootball listings, resolve escrow disputes, and monitor seller analytics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer",
                activeTab === 'queue' ? "bg-primary text-slate-950 shadow-md shadow-primary/20" : "bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Listings Queue</span>
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer relative",
                activeTab === 'disputes' ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Open Disputes</span>
              {disputes.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer",
                activeTab === 'stats' ? "bg-primary text-slate-950 shadow-md shadow-primary/20" : "bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Seller Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('suspended_sellers')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer",
                activeTab === 'suspended_sellers' ? "bg-red-500/10 border border-red-500/30 text-red-400 shadow-md shadow-red-500/10" : "bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Suspended & Debts</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LISTINGS QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Filter Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-surface border border-border-main rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white outline-none cursor-pointer"
                >
                  <option value="all">All Moderatable Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published (Approved)</option>
                  <option value="hidden">Hidden</option>
                  <option value="rejected">Rejected</option>
                  <option value="reserved">Reserved (In Escrow)</option>
                  <option value="sold">Sold</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <button
                onClick={fetchAdminData}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                <span>Refresh Queue</span>
              </button>
            </div>

            {loading ? (
              <div className="py-24 flex justify-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : listings.length === 0 ? (
              <div className="py-16 text-center bg-surface/50 border border-border-main rounded-3xl p-8 max-w-md mx-auto space-y-2">
                <Store className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-base font-black text-white uppercase italic">Queue Empty</h3>
                <p className="text-xs text-slate-400">No listings found matching the selected filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {listings.map((listing) => {
                  const thumbUrl = listing.screenshots && listing.screenshots.length > 0
                    ? marketplaceService.getListingImageUrl(listing.screenshots[0])
                    : '/default-card.jpg';

                  return (
                    <div key={listing.id} className="card bg-surface border-border-main rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 min-w-0 flex-1">
                        <div className="w-20 h-14 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                              listing.status === 'published' ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
                              listing.status === 'hidden' ? "bg-amber-500/15 border-amber-500/30 text-amber-400" :
                              listing.status === 'rejected' ? "bg-red-500/15 border-red-500/30 text-red-400" :
                              listing.status === 'sold' ? "bg-blue-500/15 border-blue-500/30 text-blue-400 font-bold" :
                              listing.status === 'reserved' ? "bg-purple-500/15 border-purple-500/30 text-purple-400" :
                              listing.status === 'cancelled' ? "bg-slate-500/15 border-slate-500/30 text-slate-400" :
                              "bg-slate-800 border-white/10 text-slate-300"
                            )}>
                              {listing.status}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">
                              Platform: <strong className="text-white">{listing.platform}</strong>
                            </span>
                            <span className="text-[10px] text-slate-500">•</span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(listing.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-white uppercase italic truncate">
                            {listing.title}
                          </h4>

                          <div className="flex items-center gap-3 text-xs text-slate-400 font-bold">
                            <span>Seller: <strong className="text-slate-200">{listing.seller_username || 'Seller'}</strong></span>
                            <span>•</span>
                            <span className="text-primary font-mono">{formatUSD(listing.price_usd)}</span>
                            {listing.rejection_reason && (
                              <span className="text-red-400 text-[10px]">• Rejected: {listing.rejection_reason}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end shrink-0">
                        {['draft', 'published', 'hidden', 'rejected'].includes(listing.status) ? (
                          <>
                            {listing.status !== 'published' && (
                              <button
                                onClick={() => handleModerateListing(listing.id, 'approve')}
                                disabled={processing}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {listing.status !== 'rejected' && (
                              <button
                                onClick={() => setRejectingListingId(listing.id)}
                                disabled={processing}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}

                            {listing.status !== 'hidden' ? (
                              <button
                                onClick={() => handleModerateListing(listing.id, 'hide', 'Admin Moderation')}
                                disabled={processing}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Hide</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleModerateListing(listing.id, 'unhide')}
                                disabled={processing}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Unhide</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-900 border border-white/5 text-slate-500 rounded-xl">
                            Read Only
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rejection Prompt Modal */}
            {rejectingListingId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                <div className="bg-surface border border-border-main rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                  <h3 className="text-base font-black text-white uppercase italic">Reject Listing</h3>
                  <p className="text-xs text-slate-400">Provide a reason for rejecting this listing (will be visible to the seller):</p>
                  <textarea
                    rows={3}
                    placeholder="e.g. Inappropriate screenshots, unrealistic pricing, duplicate listing..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full bg-background border border-border-main rounded-xl p-3 text-xs text-white outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setRejectingListingId(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleModerateListing(rejectingListingId, 'reject', rejectReason || 'Did not meet marketplace guidelines')}
                      className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OPEN DISPUTES */}
        {activeTab === 'disputes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-red-400">
                ⚡ Active Escrow Disputes ({disputes.length})
              </span>
              <button
                onClick={fetchAdminData}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                <span>Refresh Disputes</span>
              </button>
            </div>

            {loading ? (
              <div className="py-24 flex justify-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : disputes.length === 0 ? (
              <div className="py-16 text-center bg-surface/50 border border-border-main rounded-3xl p-8 max-w-md mx-auto space-y-2">
                <Gavel className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-base font-black text-white uppercase italic">No Active Disputes</h3>
                <p className="text-xs text-slate-400">All marketplace transactions are currently operating smoothly.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {disputes.map((order) => (
                  <div key={order.id} className="card bg-surface border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-red-600 text-white font-black text-[10px] uppercase tracking-wider rounded-md">
                            Escrow Frozen
                          </span>
                          <span className="text-xs font-bold text-slate-400">Order #{order.id}</span>
                        </div>
                        <h3 className="text-base font-black text-white uppercase italic mt-1">
                          {order.listing_title || 'eFootball Account'}
                        </h3>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-300 mt-1">
                          <span>Buyer: <strong className="text-blue-400">{order.buyer_username}</strong></span>
                          <span>•</span>
                          <span>Seller: <strong className="text-amber-400">{order.seller_username}</strong></span>
                          <span>•</span>
                          <span>Amount: <strong className="text-primary font-mono">{formatUSD(order.amount_usd)}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedOrderForCreds(order)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5 stroke-[2.5px]" />
                          <span>View Vault Credentials</span>
                        </button>

                        <button
                          onClick={() => {
                            setResolvingOrderId(resolvingOrderId === order.id ? null : order.id);
                            setOutcome('refund_buyer');
                            setPartialAmount(0);
                            setAdminNotes('');
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          <Gavel className="w-3.5 h-3.5 stroke-[2.5px]" />
                          <span>{resolvingOrderId === order.id ? 'Close Panel' : 'Resolve Dispute'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Dispute details */}
                    <div className="bg-slate-950/40 border border-white/5 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Dispute Allegation & Status
                        </span>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                          order.dispute_status === 'open' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        )}>
                          {order.dispute_status || 'Active'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Category</span>
                        <p className="text-xs font-extrabold uppercase text-white">
                          {order.dispute_category === 'account_recovery' ? '⚠️ Account Recovery Report' : 'Escrow Freeze'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Claim Reason</span>
                        <p className="text-xs font-extrabold text-white">{order.dispute_reason || order.dispute_status || 'Unspecified Reason'}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Opener Explanation</span>
                        <p className="text-xs font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">{order.dispute_description || 'No explanation provided.'}</p>
                      </div>

                      {/* Evidence */}
                      {order.dispute_evidence && order.dispute_evidence.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Claimant Evidence Uploads</span>
                          <div className="grid grid-cols-4 gap-2">
                            {order.dispute_evidence.map((path: string, i: number) => (
                              <SignedEvidenceImage
                                key={i}
                                path={path}
                                alt={`Evidence ${i + 1}`}
                                borderColorClass="hover:border-red-500/40"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Counterparty Response */}
                      {order.dispute_responded_at ? (
                        <div className="pt-3 border-t border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                              Seller Defense Response
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              {new Date(order.dispute_responded_at).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="bg-slate-900 border border-white/5 p-4 rounded-xl space-y-2">
                            <p className="text-xs font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {order.dispute_counterparty_response}
                            </p>
                          </div>

                          {order.dispute_counterparty_evidence && order.dispute_counterparty_evidence.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Defense Evidence Uploads</span>
                              <div className="grid grid-cols-4 gap-2">
                                {order.dispute_counterparty_evidence.map((path: string, i: number) => (
                                  <SignedEvidenceImage
                                    key={i}
                                    path={path}
                                    alt={`Counterparty Evidence ${i + 1}`}
                                    borderColorClass="hover:border-emerald-500/40"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                            Seller Response Status
                          </span>
                          <p className="text-xs font-bold text-slate-400 mt-1">Awaiting seller defense response...</p>
                        </div>
                      )}
                    </div>

                    {/* Resolution Panel */}
                    {resolvingOrderId === order.id && (
                      <div className="p-6 bg-slate-900/90 border-2 border-amber-500/50 rounded-2xl space-y-5 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <h4 className="text-sm font-black text-amber-400 uppercase italic flex items-center gap-2">
                            <Gavel className="w-4 h-4" />
                            <span>Escrow Resolution Tribunal</span>
                          </h4>
                        </div>

                        {/* Outcome Radio */}
                        <div className="space-y-3">
                          <label className="text-xs font-black uppercase tracking-widest text-slate-300 block">
                            Select Final Outcome *
                          </label>
                          {order.dispute_category === 'account_recovery' ? (
                            <div className="space-y-3">
                              <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl mb-2 text-[11px] font-bold text-red-300">
                                ⚠️ Account Recovery Disputes are binary. Upholding will refund the buyer, claw back original seller payout, and automatically suspend the seller with debt-owed if their balance is insufficient.
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className={cn(
                                  "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                                  outcome === 'refund_buyer' ? "bg-red-500/20 border-red-500 text-white font-bold" : "bg-background border-white/10 text-slate-400"
                                )}>
                                  <input
                                    type="radio"
                                    name="outcome"
                                    checked={outcome === 'refund_buyer'}
                                    onChange={() => setOutcome('refund_buyer')}
                                    className="accent-red-500"
                                  />
                                  <span className="text-xs uppercase font-black">Uphold Claim (Refund Buyer & Penalize Seller)</span>
                                </label>

                                <label className={cn(
                                  "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                                  outcome === 'release_seller' ? "bg-slate-800 border-white/20 text-white font-bold" : "bg-background border-white/10 text-slate-400"
                                )}>
                                  <input
                                    type="radio"
                                    name="outcome"
                                    checked={outcome === 'release_seller'}
                                    onChange={() => setOutcome('release_seller')}
                                    className="accent-slate-400"
                                  />
                                  <span className="text-xs uppercase font-black">Reject Claim (Seller in Good Standing)</span>
                                </label>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <label className={cn(
                                  "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                                  outcome === 'refund_buyer' ? "bg-red-500/20 border-red-500 text-white font-bold" : "bg-background border-white/10 text-slate-400"
                                )}>
                                  <input
                                    type="radio"
                                    name="outcome"
                                    checked={outcome === 'refund_buyer'}
                                    onChange={() => setOutcome('refund_buyer')}
                                    className="accent-red-500"
                                  />
                                  <span className="text-xs uppercase font-black">Full Refund to Buyer ({formatUSD(order.amount_usd)})</span>
                                </label>

                                <label className={cn(
                                  "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                                  outcome === 'release_seller' ? "bg-emerald-500/20 border-emerald-500 text-white font-bold" : "bg-background border-white/10 text-slate-400"
                                )}>
                                  <input
                                    type="radio"
                                    name="outcome"
                                    checked={outcome === 'release_seller'}
                                    onChange={() => setOutcome('release_seller')}
                                    className="accent-emerald-500"
                                  />
                                  <span className="text-xs uppercase font-black">Release Escrow to Seller</span>
                                </label>

                                <label className={cn(
                                  "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                                  outcome === 'partial' ? "bg-amber-500/20 border-amber-500 text-white font-bold" : "bg-background border-white/10 text-slate-400"
                                )}>
                                  <input
                                    type="radio"
                                    name="outcome"
                                    checked={outcome === 'partial'}
                                    onChange={() => setOutcome('partial')}
                                    className="accent-amber-500"
                                  />
                                  <span className="text-xs uppercase font-black">Partial Refund Split</span>
                                </label>
                              </div>

                              {/* Partial Amount Input */}
                              {outcome === 'partial' && (
                                <div className="space-y-1.5 max-w-xs mt-3">
                                  <label className="text-xs font-black uppercase tracking-widest text-amber-400 block">
                                    Refund Amount to Buyer (USD $) *
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    max={order.amount_usd}
                                    placeholder="0.00"
                                    value={partialAmount}
                                    onChange={(e) => setPartialAmount(Number(e.target.value))}
                                    className="w-full bg-background border border-amber-500 rounded-xl p-3 text-sm font-mono font-extrabold text-white outline-none"
                                  />
                                  <span className="text-[10px] text-slate-400">
                                    Remainder (${Math.max(0, order.amount_usd - (partialAmount || 0)).toFixed(2)}) will be released to seller.
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Admin Notes */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase tracking-widest text-slate-300 block">
                            Tribunal Ruling Notes / Explanation (Visible to parties)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Explain the reason for this resolution (e.g. Seller provided valid recovery proof, or Account credentials failed verification)..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            className="w-full bg-background border border-border-main rounded-xl p-3 text-xs text-white outline-none resize-none"
                          />
                        </div>

                        {/* Action Submit */}
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setResolvingOrderId(null)}
                            disabled={processing}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveDispute(order.id, order.dispute_category, order.dispute_id)}
                            disabled={processing}
                            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                          >
                            <span>{processing ? 'Executing Ruling...' : 'Confirm Ruling & Disburse Escrow'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SELLER STATS TABLE */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                Registered Marketplace Sellers ({sellerStats.length})
              </span>
              <button
                onClick={fetchAdminData}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                <span>Refresh Analytics</span>
              </button>
            </div>

            {loading ? (
              <div className="py-24 flex justify-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sellerStats.length === 0 ? (
              <div className="py-16 text-center bg-surface/50 border border-border-main rounded-3xl p-8 max-w-md mx-auto space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-base font-black text-white uppercase italic">No Seller Stats Found</h3>
                <p className="text-xs text-slate-400">Seller statistics will appear as accounts are listed and sold.</p>
              </div>
            ) : (
              <div className="card bg-surface border-border-main rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-900/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-4">Seller Profile</th>
                        <th className="p-4 text-center">Completed Sales</th>
                        <th className="p-4 text-center">Avg Rating</th>
                        <th className="p-4 text-center">Total Reviews</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-bold">
                      {sellerStats.map((seller) => (
                        <tr key={seller.seller_id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                              {seller.avatar_url ? (
                                <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <span className="text-white uppercase font-black block">
                                {seller.username || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: {seller.seller_id.slice(0, 8)}...
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center font-mono text-emerald-400 font-extrabold text-sm">
                            {seller.completed_sales}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1 text-amber-400 font-extrabold">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {Number(seller.average_rating || 0).toFixed(1)}
                            </span>
                          </td>
                          <td className="p-4 text-center text-slate-300 font-mono">
                            {seller.total_reviews}
                          </td>
                          <td className="p-4 text-center">
                            {seller.verified_seller ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/15 border border-primary/30 rounded text-[9px] font-black text-primary uppercase">
                                <ShieldCheck className="w-3 h-3" /> Verified
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] uppercase font-bold">Standard</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SUSPENDED SELLERS & DEBT */}
        {activeTab === 'suspended_sellers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-red-400">
                ⚠️ Suspended Sellers with Outstanding Debts ({suspendedSellers.length})
              </span>
              <button
                onClick={fetchAdminData}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                <span>Refresh List</span>
              </button>
            </div>

            {loading ? (
              <div className="py-24 flex justify-center">
                <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : suspendedSellers.length === 0 ? (
              <div className="py-16 text-center bg-surface/50 border border-border-main rounded-3xl p-8 max-w-md mx-auto space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-base font-black text-white uppercase italic">All Sellers in Good Standing</h3>
                <p className="text-xs text-slate-400">There are currently no suspended sellers with negative balances in the ecosystem.</p>
              </div>
            ) : (
              <div className="card bg-surface border border-red-500/20 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-900/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-4">Seller Profile</th>
                        <th className="p-4">Debt Balance Owed</th>
                        <th className="p-4">Suspension Reason</th>
                        <th className="p-4 text-center">System Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-bold">
                      {suspendedSellers.map((seller) => (
                        <tr key={seller.user_id} className="hover:bg-red-500/5 transition-colors">
                          <td className="p-4 flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <span className="text-white uppercase font-black block">
                                {seller.profile?.username || 'Suspended Seller'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: {seller.user_id.slice(0, 8)}...
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-red-400 font-black text-sm">
                            {formatUSD(seller.debt_owed_usd || 0)}
                          </td>
                          <td className="p-4 text-slate-300 font-medium">
                            {seller.suspension_reason || 'Disputed Account Recovery Claim Upheld'}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] font-black text-red-400 uppercase tracking-wider">
                              Suspended
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Credentials modal for admin viewing dispute vault */}
        {selectedOrderForCreds && user && (
          <CredentialsModal
            isOpen={!!selectedOrderForCreds}
            onClose={() => setSelectedOrderForCreds(null)}
            orderId={selectedOrderForCreds.id}
            requesterId={user.id}
            isBuyer={false}
          />
        )}

        {/* Custom Confirmation Modal for Resolving Dispute */}
        {confirmingResolve && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3 text-amber-400">
                <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <Gavel className="w-6 h-6 stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase italic tracking-wider text-white">Confirm Resolution</h3>
                  <p className="text-xs text-amber-400/80 font-bold">Escrow Disbursement</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {confirmingResolve.category === 'account_recovery' ? (
                  `Are you sure you want to resolve this ACCOUNT RECOVERY claim with outcome: "${(outcome === 'refund_buyer' ? 'uphold' : 'reject').toUpperCase()}"? This action processes refunds, clawbacks, and potential seller debt/suspension.`
                ) : (
                  `Are you sure you want to resolve this dispute with outcome: "${outcome.toUpperCase()}"? This action modifies wallet ledgers and cannot be undone.`
                )}
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingResolve(null)}
                  disabled={processing}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executeResolveDispute(confirmingResolve.orderId, confirmingResolve.category, confirmingResolve.disputeId);
                  }}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Gavel className="w-3.5 h-3.5 stroke-[2.5px]" />
                  <span>{processing ? 'Executing Ruling...' : 'Confirm & Resolve'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
