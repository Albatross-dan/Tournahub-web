import React, { useState, useEffect } from 'react';
import { Store, RefreshCw, AlertCircle, Sparkles, Clock, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Shell from '../../components/layout/Shell';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { ListingFilters } from '../../components/marketplace/ListingFilters';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { MarketplaceListing } from '../../types/marketplace';
import { marketplaceService } from '../../services/marketplaceService';

export default function MarketplaceBrowse() {
  const [loading, setLoading] = useState<boolean>(true);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Recently Sold State
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [selectedSoldListing, setSelectedSoldListing] = useState<any | null>(null);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [platform, setPlatform] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketplaceService.getListings({
        platform,
        maxPrice,
        search,
        sortBy,
        status: 'published',
      });
      setListings(data);
    } catch (err: any) {
      console.error('Failed to load listings:', err);
      const msg = err.message || 'Error loading marketplace listings.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const data = await marketplaceService.getRecentlySold();
      setRecentSales(data || []);
    } catch (err) {
      console.error('Failed to load recently sold listings:', err);
    }
  };

  useEffect(() => {
    fetchRecentSales();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 200);
    return () => clearTimeout(timer);
  }, [platform, maxPrice, search, sortBy]);

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto py-6">
        <MarketplaceNavbar />

        {/* Recently Sold Ticker Strip */}
        {recentSales.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Live Deals Verified — Recently Completed Sales
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-hide scroll-smooth snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSoldListing(sale)}
                  className="flex-shrink-0 w-64 bg-surface/80 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3 relative overflow-hidden select-none cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-emerald-950/20 active:scale-[0.98]"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 bg-slate-950 rounded-xl overflow-hidden border border-white/10 shrink-0 relative">
                    <img
                      src={sale.screenshots && sale.screenshots.length > 0 ? marketplaceService.getListingImageUrl(sale.screenshots[0]) : '/default-card.jpg'}
                      referrerPolicy="no-referrer"
                      alt=""
                      className="w-full h-full object-cover grayscale opacity-60"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                      <span className="text-[7px] font-black uppercase tracking-widest text-white bg-red-600 px-1 py-0.5 rounded shadow-sm scale-95 font-sans">SOLD</span>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="text-xs font-black text-slate-300 uppercase italic truncate">
                      {sale.title}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary font-mono text-xs font-black">${Number(sale.price_usd).toFixed(2)}</span>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5 uppercase">
                        {sale.platform}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold">
                      <span className="truncate max-w-[90px] text-slate-400">@{sale.seller_username || 'seller'}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        {formatRelativeTime(sale.sold_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ListingFilters
          search={search}
          onSearchChange={setSearch}
          platform={platform}
          onPlatformChange={setPlatform}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        {/* Content Section */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 text-slate-400">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg shadow-primary/20" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              Scanning Marketplace Registry...
            </span>
          </div>
        ) : error ? (
          <div className="py-16 text-center bg-red-950/20 border border-red-900/40 rounded-3xl p-8 max-w-md mx-auto space-y-4">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-base font-black text-white uppercase italic">Failed to Connect</h3>
            <p className="text-xs text-red-300/80 font-medium">{error}</p>
            <button
              onClick={fetchListings}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase italic tracking-wider rounded-xl mx-auto transition-all shadow-lg shadow-red-600/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="py-20 text-center bg-surface/50 border border-border-main rounded-3xl p-10 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Store className="w-8 h-8 stroke-[1.5px]" />
            </div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
              No Listings Found
            </h3>
            <p className="text-xs text-text-muted font-bold max-w-sm mx-auto leading-relaxed">
              We couldn't find any accounts matching your current search or filters. Try adjusting your platform or price range.
            </p>
            {(search || platform !== 'all' || maxPrice < 1000) && (
              <button
                onClick={() => {
                  setSearch('');
                  setPlatform('all');
                  setMaxPrice(1000);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-primary font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                Showing <strong className="text-white">{listings.length}</strong> available accounts
              </span>
              <button
                onClick={fetchListings}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sold Listing Summary Modal */}
      {selectedSoldListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-surface border border-border-main rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-sm font-black text-white uppercase italic tracking-wider">
                  Sold Listing Summary
                </h3>
              </div>
              <button
                onClick={() => setSelectedSoldListing(null)}
                className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Info */}
            <div className="space-y-4">
              {/* Thumbnail Screenshot */}
              <div className="aspect-[16/9] w-full bg-slate-950 rounded-2xl overflow-hidden border border-white/10 relative">
                <img
                  src={selectedSoldListing.screenshots && selectedSoldListing.screenshots.length > 0
                    ? marketplaceService.getListingImageUrl(selectedSoldListing.screenshots[0])
                    : '/default-card.jpg'
                  }
                  referrerPolicy="no-referrer"
                  alt=""
                  className="w-full h-full object-cover grayscale opacity-50"
                />
                <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center space-y-2 p-4">
                  <div className="px-3 py-1 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-lg">
                    SOLD & DELIVERED
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center max-w-xs">
                    This account is no longer purchasable as the deal has been successfully finalized.
                  </p>
                </div>
              </div>

              {/* Title and platform details */}
              <div className="space-y-1">
                <h4 className="text-base font-black text-white uppercase italic">
                  {selectedSoldListing.title}
                </h4>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                  <span className="bg-slate-900 border border-white/5 px-2 py-0.5 rounded-lg text-slate-300 uppercase">
                    Platform: <strong className="text-white">{selectedSoldListing.platform}</strong>
                  </span>
                  {selectedSoldListing.account_level && (
                    <span className="bg-slate-900 border border-white/5 px-2 py-0.5 rounded-lg text-slate-300">
                      Level: <strong className="text-white">{selectedSoldListing.account_level}</strong>
                    </span>
                  )}
                  <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-emerald-400">
                    Deal Price: <strong className="font-mono">${Number(selectedSoldListing.price_usd).toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              {/* Secure Info Banner */}
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    Secured by Escrow
                  </h5>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                    The payment for this account was held securely in TournaHub Escrow until the buyer successfully received and confirmed full access. The funds have been successfully disbursed to seller <strong className="text-slate-200">@{selectedSoldListing.seller_username}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                onClick={() => setSelectedSoldListing(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Close Summary
              </button>
            </div>

          </div>
        </div>
      )}
    </Shell>
  );
}
