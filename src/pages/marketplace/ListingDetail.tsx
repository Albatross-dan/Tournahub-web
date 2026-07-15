import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Store, Star, ShieldCheck, Tag, Zap, Coins, Trophy, User, 
  ArrowLeft, CheckCircle2, AlertTriangle, ShieldAlert, Eye, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Shell from '../../components/layout/Shell';
import { MarketplaceListing } from '../../types/marketplace';
import { marketplaceService } from '../../services/marketplaceService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);

  // Purchase Modal State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [purchasing, setPurchasing] = useState<boolean>(false);

  // Insufficient Balance Modal State
  const [showInsufficientModal, setShowInsufficientModal] = useState<boolean>(false);
  const [insufficientDetails, setInsufficientDetails] = useState<{
    message: string;
    currentBalance: number;
    required: number;
    shortfall: number;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await marketplaceService.getListingById(id);
        if (!data) {
          setError('Listing not found or has been removed.');
        } else {
          setListing(data);
        }
      } catch (err: any) {
        console.error('Error fetching listing:', err);
        setError(err.message || 'Failed to load listing details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <Shell>
        <div className="py-32 flex flex-col items-center justify-center space-y-4 text-slate-400">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            Loading Account Dossier...
          </span>
        </div>
      </Shell>
    );
  }

  if (error || !listing) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto py-20 text-center space-y-5">
          <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-3xl space-y-3">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-base font-black text-white uppercase italic">Listing Unavailable</h3>
            <p className="text-xs text-red-300 font-bold">{error || 'This listing does not exist.'}</p>
          </div>
          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </button>
        </div>
      </Shell>
    );
  }

  const screenshots = listing.screenshots || [];
  const activeImageUrl = screenshots.length > 0 
    ? marketplaceService.getListingImageUrl(screenshots[selectedImageIdx] || screenshots[0])
    : '/default-card.jpg';

  const formatUSD = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

  // Determine Buy Button state & Tooltip
  const isSeller = user?.id === listing.seller_id;
  const isSuspended = listing.seller_suspended;
  const isAvailable = listing.status === 'published';
  const isLoggedIn = !!user;

  let buyDisabledReason: string | null = null;
  if (!isLoggedIn) buyDisabledReason = 'Log in to purchase';
  else if (isSeller) buyDisabledReason = 'You cannot buy your own listing';
  else if (isSuspended) buyDisabledReason = 'Seller account is suspended';
  else if (!isAvailable) buyDisabledReason = `Listing is no longer available (${listing.status})`;

  const handleConfirmPurchase = async () => {
    if (!listing) return;
    setPurchasing(true);
    try {
      const { data: { user: liveUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !liveUser) {
        toast.error('Authentication required. Please log in.');
        setPurchasing(false);
        navigate('/login');
        return;
      }
      const res = await marketplaceService.purchaseListing(liveUser.id, listing.id);
      if (res && res.error) {
        if (res.error_code === 'insufficient_balance') {
          setInsufficientDetails({
            message: res.error,
            currentBalance: res.current_balance_usd || 0,
            required: res.required_amount_usd || listing.price_usd,
            shortfall: res.shortfall_usd || 0
          });
          setShowConfirmModal(false);
          setShowInsufficientModal(true);
        } else {
          toast.error(res.error);
        }
        setPurchasing(false);
      } else {
        toast.success('Account purchased successfully! Check your orders.');
        setShowConfirmModal(false);
        navigate('/marketplace/orders');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete purchase.');
      setPurchasing(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Browse Grid</span>
          </button>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
              listing.status === 'published' 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            )}>
              Status: {listing.status}
            </span>
            {listing.view_count !== undefined && (
              <span className="flex items-center gap-1 px-3 py-1 bg-slate-900 border border-white/5 rounded-full text-[10px] font-bold text-slate-400">
                <Eye className="w-3 h-3 text-primary" />
                <span>{listing.view_count} views</span>
              </span>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Gallery & Description (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Gallery Viewer */}
            <div className="card bg-surface border-border-main rounded-3xl overflow-hidden p-4 space-y-4 shadow-xl">
              <div className="relative aspect-[16/9] w-full bg-slate-950 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                {activeImageUrl && activeImageUrl !== '/default-card.jpg' ? (
                  <img
                    src={activeImageUrl}
                    alt={listing.title}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 space-y-2">
                    <Trophy className="w-12 h-12 stroke-[1.5px] opacity-30" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">No Image Available</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl text-xs font-black text-white uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-primary inline mr-1" />
                  {listing.platform}
                </div>
              </div>

              {/* Thumbnails Carousel */}
              {screenshots.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {screenshots.map((shot, idx) => {
                    const thumbUrl = marketplaceService.getListingImageUrl(shot);
                    const isSelected = idx === selectedImageIdx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIdx(idx)}
                        className={cn(
                          "relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer",
                          isSelected ? "border-primary scale-105 shadow-md shadow-primary/30" : "border-white/10 opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={thumbUrl} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Account Specifications */}
            <div className="card bg-surface border-border-main rounded-3xl p-6 space-y-6 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase italic tracking-wider border-b border-white/5 pb-3">
                Account Specifications & Attributes
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-background/60 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platform</span>
                  <p className="text-xs font-bold text-white uppercase">{listing.platform || 'Multiplatform'}</p>
                </div>
                <div className="p-4 bg-background/60 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Strength / Level</span>
                  <p className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    {listing.account_level || 'Not Specified'}
                  </p>
                </div>
                <div className="p-4 bg-background/60 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">GP Balance</span>
                  <p className="text-xs font-bold text-blue-400 uppercase">
                    {listing.gp_amount !== undefined && listing.gp_amount > 0 ? `${listing.gp_amount.toLocaleString()} GP` : '0 GP'}
                  </p>
                </div>
                <div className="p-4 bg-background/60 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">eFootball Coins</span>
                  <p className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    {listing.coins_amount !== undefined && listing.coins_amount > 0 ? `${listing.coins_amount.toLocaleString()} Coins` : '0 Coins'}
                  </p>
                </div>
              </div>

              {/* Epic Players */}
              {listing.epic_players && listing.epic_players.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                    ★ Epic & Big Time Legends ({listing.epic_players.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {listing.epic_players.map((player, idx) => (
                      <span key={idx} className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs font-black text-amber-300 uppercase tracking-wide">
                        {typeof player === 'string' ? player : JSON.stringify(player)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured Players */}
              {listing.featured_players && listing.featured_players.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
                    ◆ Featured & Show Time Players ({listing.featured_players.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {listing.featured_players.map((player, idx) => (
                      <span key={idx} className="px-3 py-1 bg-primary/15 border border-primary/30 rounded-xl text-xs font-black text-primary uppercase tracking-wide">
                        {typeof player === 'string' ? player : JSON.stringify(player)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="card bg-surface border-border-main rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase italic tracking-wider border-b border-white/5 pb-3">
                Detailed Seller Description
              </h3>
              <div className="text-xs text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
                {listing.description || 'No additional description provided by the seller.'}
              </div>
            </div>
          </div>

          {/* Right Column: Checkout & Seller Card (4 Cols) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Checkout Card */}
            <div className="card bg-surface border-border-main rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Price (USD)</span>
                <div className="text-3xl font-black text-white uppercase italic tracking-tighter text-primary mt-1">
                  {formatUSD(listing.price_usd)}
                </div>
                <p className="text-[10px] text-text-muted font-bold mt-1">
                  Funds held in escrow until you verify login credentials.
                </p>
              </div>

              {/* Buy Button */}
              <div className="space-y-3 pt-2">
                <button
                  disabled={!!buyDisabledReason}
                  onClick={() => setShowConfirmModal(true)}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm uppercase italic tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer",
                    buyDisabledReason
                      ? "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed"
                      : "bg-primary hover:bg-primary-dark text-slate-950 shadow-primary/25 active:scale-98"
                  )}
                  title={buyDisabledReason || 'Buy Account Now'}
                >
                  <Lock className="w-4 h-4 stroke-[2.5px]" />
                  <span>{buyDisabledReason || 'Buy Now (Escrow Protected)'}</span>
                </button>

                {buyDisabledReason && (
                  <p className="text-[10px] text-center font-bold text-amber-400/90 uppercase tracking-wider">
                    {buyDisabledReason}
                  </p>
                )}
              </div>

              {/* Security Guarantee List */}
              <div className="pt-4 border-t border-white/5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% Automated USD Escrow Guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Review credentials before releasing funds</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>24/7 Admin Moderation & Dispute Support</span>
                </div>
              </div>
            </div>

            {/* Seller Reputation Card */}
            <div className="card bg-surface border-border-main rounded-3xl p-6 space-y-5 shadow-xl">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest italic border-b border-white/5 pb-2">
                Seller Information
              </h4>

              <Link
                to={`/players/${listing.seller_username}`}
                className="flex items-center space-x-3 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {listing.seller_avatar_url ? (
                    <img src={listing.seller_avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-sm font-black text-white uppercase italic truncate group-hover:text-primary transition-colors">
                      {listing.seller_username || 'Unknown Seller'}
                    </h5>
                    {listing.seller_verified && (
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0" title="Verified Seller" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400 group-hover:text-slate-300">
                    {listing.seller_average_rating !== undefined && listing.seller_average_rating > 0 ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {Number(listing.seller_average_rating).toFixed(1)}
                        <span className="text-slate-500">({listing.seller_total_reviews || 0})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">New Seller</span>
                    )}
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-400 font-mono">{listing.seller_completed_sales || 0} Sold</span>
                  </div>
                </div>
              </Link>

              {listing.seller_suspended && (
                <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs font-black text-red-400 uppercase tracking-wider text-center">
                  ⚠️ Seller Account Suspended
                </div>
              )}

              <Link
                to={`/players/${listing.seller_username}`}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 block text-center cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>View Seller Public Profile</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-surface border border-border-main rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                <Store className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase italic tracking-wider">
                  Confirm Account Purchase
                </h3>
                <p className="text-xs text-text-muted font-bold">Escrow Protection Active</p>
              </div>
            </div>

            <div className="p-4 bg-background/80 rounded-2xl border border-white/5 space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Account Listing:</span>
                <span className="text-white truncate max-w-[180px]">{listing.title}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Platform:</span>
                <span className="text-white uppercase">{listing.platform}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-white/10 pt-2">
                <span className="text-slate-300 uppercase">Total Escrow Amount:</span>
                <span className="text-primary font-mono">{formatUSD(listing.price_usd)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed font-medium">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                You are about to buy this account for <strong>{formatUSD(listing.price_usd)}</strong> from your USD wallet balance. Funds will be held in escrow until you review login credentials and confirm delivery.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={purchasing}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={purchasing}
                className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
              >
                {purchasing ? 'Processing...' : 'Confirm & Lock Escrow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Balance Modal */}
      {showInsufficientModal && insufficientDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-surface border border-border-main rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
                <Coins className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase italic tracking-wider">
                  Insufficient Wallet Funds
                </h3>
                <p className="text-xs text-text-muted font-bold">Checkout Blocked</p>
              </div>
            </div>

            <div className="p-4 bg-background/80 rounded-2xl border border-white/5 space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Your Current Balance:</span>
                <span className="text-white font-mono">{formatUSD(insufficientDetails.currentBalance)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Required Amount:</span>
                <span className="text-white font-mono">{formatUSD(insufficientDetails.required)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-white/10 pt-2 text-red-400">
                <span className="uppercase">Shortfall Amount:</span>
                <span className="font-mono">{formatUSD(insufficientDetails.shortfall)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {insufficientDetails.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowInsufficientModal(false);
                  setInsufficientDetails(null);
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Browse Listings
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInsufficientModal(false);
                  setInsufficientDetails(null);
                  navigate('/wallet');
                }}
                className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>Top Up Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
