import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ShieldCheck, Tag, Zap, Coins, Trophy, User } from 'lucide-react';
import { MarketplaceListing } from '../../types/marketplace';
import { marketplaceService } from '../../services/marketplaceService';
import { cn } from '../../lib/utils';

interface ListingCardProps {
  listing: MarketplaceListing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const navigate = useNavigate();
  const thumbnailPath = listing.screenshots && listing.screenshots.length > 0 ? listing.screenshots[0] : '';
  const imageUrl = marketplaceService.getListingImageUrl(thumbnailPath);

  const formatUSD = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

  return (
    <div
      onClick={() => navigate(`/marketplace/listing/${listing.id}`)}
      className="card bg-surface border-border-main hover:border-primary/50 transition-all duration-300 group overflow-hidden rounded-3xl shadow-lg flex flex-col h-full relative cursor-pointer"
    >
      {/* Thumbnail Section */}
      <div className="relative aspect-[16/10] w-full bg-slate-900/80 overflow-hidden">
        {imageUrl && imageUrl !== '/default-card.jpg' ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-2 bg-gradient-to-br from-slate-900 to-slate-950">
            <Trophy className="w-10 h-10 stroke-[1.5px] opacity-30" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">eFootball Account</span>
          </div>
        )}

        {/* Platform Badge overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-md">
          <Tag className="w-3 h-3 text-primary" />
          <span>{listing.platform || 'Multiplatform'}</span>
        </div>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-primary text-slate-950 font-black text-sm rounded-xl uppercase italic tracking-tighter shadow-lg shadow-primary/20">
          {formatUSD(listing.price_usd)}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase italic tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
          <p className="text-xs text-text-muted font-bold mt-1.5 line-clamp-2 leading-relaxed">
            {listing.description || 'No detailed description provided.'}
          </p>

          {/* Account Attributes Pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {listing.account_level && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[9px] font-bold text-slate-300 uppercase">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                Lvl: {listing.account_level}
              </span>
            )}
            {listing.gp_amount !== undefined && listing.gp_amount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[9px] font-bold text-blue-400 uppercase">
                GP: {(listing.gp_amount / 1000 >= 1000 ? (listing.gp_amount / 1000000).toFixed(1) + 'M' : (listing.gp_amount / 1000).toFixed(0) + 'K')}
              </span>
            )}
            {listing.coins_amount !== undefined && listing.coins_amount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[9px] font-bold text-amber-400 uppercase">
                <Coins className="w-2.5 h-2.5" />
                {listing.coins_amount} Coins
              </span>
            )}
          </div>
        </div>

        {/* Seller Reputation Footer */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
          <Link
            to={`/players/${listing.seller_username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center space-x-2 min-w-0 group/seller z-10 hover:text-primary transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 group-hover/seller:scale-105 transition-transform">
              {listing.seller_avatar_url ? (
                <img src={listing.seller_avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
            <div className="truncate">
              <span className="text-[11px] font-bold text-slate-300 group-hover/seller:text-primary transition-colors truncate flex items-center gap-1">
                {listing.seller_username || 'Seller'}
                {listing.seller_verified && (
                  <ShieldCheck className="w-3 h-3 text-primary shrink-0" title="Verified Seller" />
                )}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {listing.seller_average_rating !== undefined && listing.seller_average_rating > 0 ? (
              <div className="flex items-center gap-0.5 text-amber-400 font-black text-[11px]">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{Number(listing.seller_average_rating).toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-slate-500">New</span>
            )}
            <span className="text-[10px] font-bold text-slate-500 border-l border-white/10 pl-2">
              {listing.seller_completed_sales || 0} sold
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
