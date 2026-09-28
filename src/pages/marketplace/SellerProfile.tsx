import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Star, ShieldCheck, ArrowLeft, Store, Award, Trophy, MessageSquare
} from 'lucide-react';
import Shell from '../../components/layout/Shell';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { MarketplaceListing, MarketplaceReview, MarketplaceSellerStats } from '../../types/marketplace';
import { marketplaceService } from '../../services/marketplaceService';
import { cn } from '../../lib/utils';

export default function SellerProfile() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<MarketplaceSellerStats | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  useEffect(() => {
    if (!sellerId) return;
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const [statsData, listingsData, reviewsData] = await Promise.all([
          marketplaceService.getSellerStats(sellerId),
          marketplaceService.getListings({ sellerId, status: 'published' }),
          marketplaceService.getSellerReviews(sellerId),
        ]);
        setStats(statsData);
        setListings(listingsData);
        setReviews(reviewsData);
      } catch (err) {
        console.error('Error loading seller profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [sellerId]);

  if (loading) {
    return (
      <Shell>
        <div className="py-32 flex flex-col items-center justify-center space-y-4 text-slate-400">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            Loading Seller Dossier...
          </span>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-7xl mx-auto py-6 space-y-8">
        <MarketplaceNavbar />

        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>

        {/* Seller Banner / Card */}
        <div className="card bg-surface border-border-main rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 text-center md:text-left">
            <div className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-primary/40 overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
              {stats?.avatar_url ? (
                <img src={stats.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                    {stats?.username || 'Verified Seller'}
                  </h1>
                  {stats?.verified_seller === true && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/15 border border-primary/30 rounded-lg text-[10px] font-black uppercase tracking-wider text-primary">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                {/* Star Rating Badge */}
                <div className="flex items-center justify-center md:justify-end gap-3 bg-background/80 px-4 py-2 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-5 h-5 fill-amber-400" />
                    <span className="text-lg font-black">{Number(stats?.average_rating || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-slate-500">|</span>
                  <span className="text-xs font-bold text-slate-300">{stats?.total_reviews || 0} Reviews</span>
                  <span className="text-xs text-slate-500">|</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-400">{stats?.completed_sales || 0} Sold</span>
                </div>
              </div>

              <p className="text-xs text-text-muted font-bold max-w-xl">
                eFootball Marketplace seller account. Escrow guaranteed on all account transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('listings')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all cursor-pointer",
              activeTab === 'listings'
                ? "bg-primary text-slate-950 shadow-md shadow-primary/20"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Store className="w-4 h-4 stroke-[2.5px]" />
            <span>Active Listings ({listings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all cursor-pointer",
              activeTab === 'reviews'
                ? "bg-primary text-slate-950 shadow-md shadow-primary/20"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <MessageSquare className="w-4 h-4 stroke-[2.5px]" />
            <span>Customer Reviews ({reviews.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'listings' ? (
          listings.length === 0 ? (
            <div className="py-16 text-center bg-surface/40 rounded-3xl border border-white/5 p-8 max-w-md mx-auto space-y-3">
              <Store className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-black text-white uppercase italic">No Active Listings</h3>
              <p className="text-xs text-slate-400">This seller currently has no active accounts for sale.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )
        ) : (
          reviews.length === 0 ? (
            <div className="py-16 text-center bg-surface/40 rounded-3xl border border-white/5 p-8 max-w-md mx-auto space-y-3">
              <Award className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-black text-white uppercase italic">No Reviews Yet</h3>
              <p className="text-xs text-slate-400">This seller has not received any customer feedback yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <div key={rev.id} className="card bg-surface border-border-main rounded-2xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                        {rev.buyer_avatar_url ? (
                          <img src={rev.buyer_avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-wide">
                        {rev.buyer_username || 'Verified Buyer'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "w-4 h-4",
                          s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                        )}
                      />
                    ))}
                    <span className="text-xs font-black text-amber-400 ml-1.5">{rev.rating}.0</span>
                  </div>

                  {rev.comment && (
                    <p className="text-xs text-slate-300 font-medium leading-relaxed bg-background/50 p-3 rounded-xl border border-white/5">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Shell>
  );
}
