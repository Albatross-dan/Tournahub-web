-- ==========================================
-- eFOOTBALL ACCOUNTS MARKETPLACE & ESCROW ENGINE
-- SQL Schema, Views, RLS Policies, and Secure RPCs
-- ==========================================

-- 1. TABLES

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT DEFAULT 'Universal',
  price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.01 CHECK (price_usd >= 0),
  account_level TEXT,
  gp_amount BIGINT DEFAULT 0,
  coins_amount BIGINT DEFAULT 0,
  featured_players JSONB DEFAULT '[]'::jsonb,
  epic_players JSONB DEFAULT '[]'::jsonb,
  screenshots JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'reserved', 'sold', 'cancelled', 'expired', 'hidden', 'rejected')),
  rejection_reason TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

ALTER TABLE IF EXISTS public.marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_price_usd_check;
ALTER TABLE IF EXISTS public.marketplace_listings ADD CONSTRAINT marketplace_listings_price_usd_check CHECK (price_usd >= 0);

CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_usd NUMERIC(10, 2) NOT NULL,
  commission_percent NUMERIC(5, 2) DEFAULT 5.00,
  commission_amount_usd NUMERIC(10, 2) DEFAULT 0.00,
  seller_amount_usd NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'escrow_held' CHECK (status IN ('escrow_held', 'credentials_submitted', 'completed', 'disputed', 'refunded', 'cancelled')),
  credential_submit_deadline TIMESTAMPTZ,
  review_deadline TIMESTAMPTZ,
  credentials_submitted_at TIMESTAMPTZ,
  buyer_confirmed_at TIMESTAMPTZ,
  auto_released BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.marketplace_order_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  login_email TEXT NOT NULL,
  password TEXT NOT NULL,
  recovery_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  opener_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_refund', 'resolved_release')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_seller_stats (
  seller_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_sales INTEGER DEFAULT 0,
  average_rating NUMERIC(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  verified_seller BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_order_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_seller_stats ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES

-- Profiles: Ensure users can insert and update their own profile
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Listings: Explicit policies for SELECT, INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Public read published listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers manage own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers insert own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers update own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers delete own listings" ON public.marketplace_listings;

CREATE POLICY "Public read published listings" ON public.marketplace_listings
  FOR SELECT USING (status = 'published' OR auth.uid() = seller_id);

CREATE POLICY "Sellers insert own listings" ON public.marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers update own listings" ON public.marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers delete own listings" ON public.marketplace_listings
  FOR DELETE USING (auth.uid() = seller_id);

-- Orders: Buyers and sellers involved can view and update their orders
DROP POLICY IF EXISTS "Participants view orders" ON public.marketplace_orders;
DROP POLICY IF EXISTS "Participants update orders" ON public.marketplace_orders;

CREATE POLICY "Participants view orders" ON public.marketplace_orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Participants update orders" ON public.marketplace_orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Credentials: Only seller who created or buyer who purchased can select
DROP POLICY IF EXISTS "Participants read credentials" ON public.marketplace_order_credentials;
DROP POLICY IF EXISTS "Sellers insert credentials" ON public.marketplace_order_credentials;

CREATE POLICY "Participants read credentials" ON public.marketplace_order_credentials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Sellers insert credentials" ON public.marketplace_order_credentials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      WHERE o.id = order_id AND o.seller_id = auth.uid()
    )
  );

-- Disputes: Participants can read and insert disputes
DROP POLICY IF EXISTS "Participants view disputes" ON public.marketplace_disputes;
DROP POLICY IF EXISTS "Participants create disputes" ON public.marketplace_disputes;

CREATE POLICY "Participants view disputes" ON public.marketplace_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Participants create disputes" ON public.marketplace_disputes
  FOR INSERT WITH CHECK (auth.uid() = opener_id);

-- Reviews: Anyone can read reviews
DROP POLICY IF EXISTS "Public read reviews" ON public.marketplace_reviews;
DROP POLICY IF EXISTS "Buyers insert reviews" ON public.marketplace_reviews;

CREATE POLICY "Public read reviews" ON public.marketplace_reviews
  FOR SELECT USING (true);

CREATE POLICY "Buyers insert reviews" ON public.marketplace_reviews
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Stats: Anyone can read seller stats
DROP POLICY IF EXISTS "Public read seller stats" ON public.marketplace_seller_stats;

CREATE POLICY "Public read seller stats" ON public.marketplace_seller_stats
  FOR SELECT USING (true);


-- 4. VIEWS

CREATE OR REPLACE VIEW public.v_marketplace_listings AS
SELECT 
  l.*,
  p.username AS seller_username,
  p.avatar_url AS seller_avatar_url,
  p.role AS seller_role,
  COALESCE(s.completed_sales, 0) AS seller_completed_sales,
  COALESCE(s.average_rating, 0.00) AS seller_average_rating,
  COALESCE(s.total_reviews, 0) AS seller_total_reviews,
  COALESCE(s.verified_seller, false) AS seller_verified
FROM public.marketplace_listings l
LEFT JOIN public.profiles p ON l.seller_id = p.id
LEFT JOIN public.marketplace_seller_stats s ON l.seller_id = s.seller_id;

CREATE OR REPLACE VIEW public.v_marketplace_order_detail AS
SELECT 
  o.*,
  l.title AS listing_title,
  l.platform AS listing_platform,
  l.screenshots AS listing_screenshots,
  pb.username AS buyer_username,
  ps.username AS seller_username,
  EXISTS(SELECT 1 FROM public.marketplace_order_credentials c WHERE c.order_id = o.id) AS has_credentials,
  d.status AS dispute_status,
  d.id AS dispute_id
FROM public.marketplace_orders o
LEFT JOIN public.marketplace_listings l ON o.listing_id = l.id
LEFT JOIN public.profiles pb ON o.buyer_id = pb.id
LEFT JOIN public.profiles ps ON o.seller_id = ps.id
LEFT JOIN public.marketplace_disputes d ON o.id = d.order_id;

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-listings', 'marketplace-listings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-dispute-evidence', 'marketplace-dispute-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- 6. RPC FUNCTIONS

CREATE OR REPLACE FUNCTION public.fn_marketplace_publish_listing(p_seller_id UUID, p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.marketplace_listings
  SET status = 'published', published_at = now(), updated_at = now()
  WHERE id = p_listing_id AND seller_id = p_seller_id AND status IN ('draft', 'hidden', 'rejected');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Listing not found or cannot be published');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_marketplace_purchase(p_buyer_id UUID, p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing RECORD;
  v_order_id UUID;
  v_comm NUMERIC(10, 2);
  v_seller_amt NUMERIC(10, 2);
BEGIN
  SELECT * INTO v_listing FROM public.marketplace_listings
  WHERE id = p_listing_id AND status = 'published'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Account listing is no longer available or already sold');
  END IF;

  IF v_listing.seller_id = p_buyer_id THEN
    RETURN jsonb_build_object('error', 'You cannot buy your own listing');
  END IF;

  v_comm := ROUND((v_listing.price_usd * 0.05), 2);
  v_seller_amt := v_listing.price_usd - v_comm;

  UPDATE public.marketplace_listings SET status = 'reserved', updated_at = now() WHERE id = p_listing_id;

  INSERT INTO public.marketplace_orders (
    listing_id, buyer_id, seller_id, amount_usd, commission_percent, commission_amount_usd, seller_amount_usd, status, credential_submit_deadline
  ) VALUES (
    p_listing_id, p_buyer_id, v_listing.seller_id, v_listing.price_usd, 5.00, v_comm, v_seller_amt, 'escrow_held', now() + INTERVAL '24 hours'
  ) RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_marketplace_submit_credentials(
  p_seller_id UUID, p_order_id UUID, p_login_email TEXT, p_password TEXT, p_recovery_info TEXT, p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = p_order_id AND seller_id = p_seller_id AND status = 'escrow_held') THEN
    RETURN jsonb_build_object('error', 'Order not in escrow or permission denied');
  END IF;

  INSERT INTO public.marketplace_order_credentials (order_id, login_email, password, recovery_info, notes)
  VALUES (p_order_id, p_login_email, p_password, p_recovery_info, p_notes)
  ON CONFLICT (order_id) DO UPDATE SET login_email = p_login_email, password = p_password, recovery_info = p_recovery_info, notes = p_notes;

  UPDATE public.marketplace_orders
  SET status = 'credentials_submitted', credentials_submitted_at = now(), review_deadline = now() + INTERVAL '48 hours', updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_marketplace_get_credentials(p_requester_id UUID, p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creds RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = p_order_id AND (buyer_id = p_requester_id OR seller_id = p_requester_id)) THEN
    RETURN jsonb_build_object('error', 'Unauthorized to view credentials');
  END IF;

  SELECT * INTO v_creds FROM public.marketplace_order_credentials WHERE order_id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No credentials submitted yet');
  END IF;

  RETURN jsonb_build_object('credentials', row_to_json(v_creds));
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_marketplace_confirm_delivery(p_buyer_id UUID, p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id = p_order_id AND buyer_id = p_buyer_id AND status = 'credentials_submitted' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found or not awaiting confirmation');
  END IF;

  UPDATE public.marketplace_orders SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = p_order_id;
  UPDATE public.marketplace_listings SET status = 'sold', updated_at = now() WHERE id = v_order.listing_id;

  INSERT INTO public.marketplace_seller_stats (seller_id, completed_sales)
  VALUES (v_order.seller_id, 1)
  ON CONFLICT (seller_id) DO UPDATE SET completed_sales = marketplace_seller_stats.completed_sales + 1, updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_marketplace_open_dispute(p_opener_id UUID, p_order_id UUID, p_reason TEXT, p_description TEXT, p_evidence JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dsp_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = p_order_id AND (buyer_id = p_opener_id OR seller_id = p_opener_id) AND status IN ('escrow_held', 'credentials_submitted')) THEN
    RETURN jsonb_build_object('error', 'Cannot dispute this order');
  END IF;

  UPDATE public.marketplace_orders SET status = 'disputed', updated_at = now() WHERE id = p_order_id;

  INSERT INTO public.marketplace_disputes (order_id, opener_id, reason, description, evidence, status)
  VALUES (p_order_id, p_opener_id, p_reason, p_description, COALESCE(p_evidence, '[]'::jsonb), 'open')
  RETURNING id INTO v_dsp_id;

  RETURN jsonb_build_object('success', true, 'dispute_id', v_dsp_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_marketplace_submit_review(p_buyer_id UUID, p_order_id UUID, p_rating INTEGER, p_comment TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_avg NUMERIC(3, 2);
  v_total INTEGER;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id = p_order_id AND buyer_id = p_buyer_id AND status = 'completed';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order must be completed before leaving a review');
  END IF;

  INSERT INTO public.marketplace_reviews (order_id, buyer_id, seller_id, rating, comment)
  VALUES (p_order_id, p_buyer_id, v_order.seller_id, p_rating, p_comment)
  ON CONFLICT (order_id) DO NOTHING;

  SELECT AVG(rating)::numeric(3,2), COUNT(*) INTO v_avg, v_total FROM public.marketplace_reviews WHERE seller_id = v_order.seller_id;

  INSERT INTO public.marketplace_seller_stats (seller_id, average_rating, total_reviews)
  VALUES (v_order.seller_id, v_avg, v_total)
  ON CONFLICT (seller_id) DO UPDATE SET average_rating = v_avg, total_reviews = v_total, updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_moderate_listing(p_admin_id UUID, p_listing_id UUID, p_action TEXT, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND (role = 'admin' OR role = 'moderator')) THEN
    RETURN jsonb_build_object('error', 'Unauthorized administrator action');
  END IF;

  IF p_action = 'approve' OR p_action = 'unhide' THEN
    UPDATE public.marketplace_listings SET status = 'published', rejection_reason = NULL, updated_at = now() WHERE id = p_listing_id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.marketplace_listings SET status = 'rejected', rejection_reason = COALESCE(p_reason, 'Rejected by admin'), updated_at = now() WHERE id = p_listing_id;
  ELSIF p_action = 'hide' THEN
    UPDATE public.marketplace_listings SET status = 'hidden', rejection_reason = COALESCE(p_reason, 'Hidden by moderation team'), updated_at = now() WHERE id = p_listing_id;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid action');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_resolve_marketplace_dispute(p_admin_id UUID, p_order_id UUID, p_outcome TEXT, p_partial_refund_usd NUMERIC, p_admin_notes TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND (role = 'admin' OR role = 'moderator')) THEN
    RETURN jsonb_build_object('error', 'Unauthorized administrator action');
  END IF;

  IF p_outcome = 'refund_buyer' THEN
    UPDATE public.marketplace_orders SET status = 'refunded', updated_at = now() WHERE id = p_order_id;
    UPDATE public.marketplace_disputes SET status = 'resolved_refund', resolution_notes = p_admin_notes, resolved_at = now() WHERE order_id = p_order_id;
  ELSIF p_outcome = 'release_seller' THEN
    UPDATE public.marketplace_orders SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = p_order_id;
    UPDATE public.marketplace_disputes SET status = 'resolved_release', resolution_notes = p_admin_notes, resolved_at = now() WHERE order_id = p_order_id;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid dispute outcome');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
