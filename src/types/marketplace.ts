export type ListingStatus = 'draft' | 'published' | 'reserved' | 'sold' | 'cancelled' | 'expired' | 'hidden' | 'rejected';
export type OrderStatus = 'escrow_held' | 'credentials_submitted' | 'completed' | 'disputed' | 'refunded' | 'cancelled';

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  platform: string;
  price_usd: number;
  account_level?: string | number;
  gp_amount?: number;
  coins_amount?: number;
  featured_players?: string[] | any[];
  epic_players?: string[] | any[];
  screenshots?: string[];
  status: ListingStatus;
  rejection_reason?: string;
  view_count?: number;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  seller_username?: string;
  seller_avatar_url?: string;
  seller_completed_sales?: number;
  seller_average_rating?: number;
  seller_total_reviews?: number;
  seller_verified?: boolean;
  seller_suspended?: boolean;
}

export interface MarketplaceOrder {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_usd: number;
  commission_percent?: number;
  commission_amount_usd?: number;
  seller_amount_usd?: number;
  status: OrderStatus;
  credential_submit_deadline?: string;
  review_deadline?: string;
  credentials_submitted_at?: string;
  buyer_confirmed_at?: string;
  auto_released?: boolean;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  listing_title?: string;
  listing_screenshots?: string[];
  listing_platform?: string;
  buyer_username?: string;
  seller_username?: string;
  has_credentials?: boolean;
  dispute_status?: string;
  dispute_id?: string;
}

export interface MarketplaceReview {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  buyer_username?: string;
  buyer_avatar_url?: string;
}

export interface MarketplaceSellerStats {
  seller_id: string;
  completed_sales: number;
  average_rating: number;
  total_reviews: number;
  verified_seller?: boolean;
  username?: string;
  avatar_url?: string;
  role?: string;
}

export interface OrderCredentials {
  order_id?: string;
  login_email: string;
  password: string;
  recovery_info?: string;
  notes?: string;
}
