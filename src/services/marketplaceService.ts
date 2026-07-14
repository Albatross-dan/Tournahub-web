import { supabase } from '../lib/supabase';
import { MarketplaceListing, MarketplaceOrder, MarketplaceReview, MarketplaceSellerStats, OrderCredentials } from '../types/marketplace';

/**
 * URGENT WIRE TO LIVE SUPABASE DATA
 * Zero tolerance for mock data, hardcoded IDs, or local storage fallbacks.
 * All queries must use the real authenticated user obtained fresh from supabase.auth.getUser().
 * All money-moving and status-changing actions MUST go through RPC functions.
 */

export const marketplaceService = {
  // --- HELPER: GET FRESH SESSION ---
  async getFreshUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Authentication required. Please log in.');
    }
    try {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (!profile) {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
        const { error: insErr } = await (supabase as any).from('profiles').insert({
          id: user.id,
          username,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: 'user',
          status: 'active'
        });
        if (insErr && insErr.code !== '23505') { // Ignore duplicate key errors
          console.warn('[MarketplaceService] Profile creation info:', insErr.message || JSON.stringify(insErr));
        }
      }
    } catch (e: any) {
      console.warn('[MarketplaceService] Profile check notice:', e?.message || e);
    }
    return user;
  },

  // --- LISTINGS READS ---
  async getListings(filters?: {
    platform?: string;
    minPrice?: number;
    maxPrice?: number;
    accountLevel?: string;
    search?: string;
    sortBy?: 'price_asc' | 'price_desc' | 'newest';
    status?: string;
    sellerId?: string;
  }): Promise<MarketplaceListing[]> {
    let query = (supabase as any).from('v_marketplace_listings').select('*');

    if (filters?.status && filters.status !== 'all' && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    } else if (!filters?.sellerId) {
      query = query.eq('status', 'published');
    }

    if (filters?.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }

    if (filters?.platform && filters.platform !== 'all' && filters.platform !== 'ALL') {
      query = query.eq('platform', filters.platform);
    }

    if (filters?.minPrice !== undefined && !isNaN(filters.minPrice)) {
      query = query.gte('price_usd', filters.minPrice);
    }

    if (filters?.maxPrice !== undefined && !isNaN(filters.maxPrice) && filters.maxPrice > 0) {
      query = query.lte('price_usd', filters.maxPrice);
    }

    if (filters?.accountLevel && filters.accountLevel.trim() !== '') {
      query = query.ilike('account_level', `%${filters.accountLevel.trim()}%`);
    }

    if (filters?.search && filters.search.trim() !== '') {
      query = query.ilike('title', `%${filters.search.trim()}%`);
    }

    if (filters?.sortBy === 'price_asc') {
      query = query.order('price_usd', { ascending: true });
    } else if (filters?.sortBy === 'price_desc') {
      query = query.order('price_usd', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error('[MarketplaceService] getListings DB error:', error);
      throw new Error(error.message || 'Failed to load marketplace listings');
    }
    return (data || []) as MarketplaceListing[];
  },

  async getRecentlySold(): Promise<any[]> {
    const { data, error } = await (supabase as any)
      .from('v_marketplace_recently_sold')
      .select('*');
    if (error) {
      console.error('[MarketplaceService] getRecentlySold DB error:', error);
      return [];
    }
    return data || [];
  },

  async getListingById(id: string): Promise<MarketplaceListing | null> {
    const { data: listing, error } = await (supabase as any)
      .from('v_marketplace_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[MarketplaceService] getListingById DB error:', error);
      throw new Error(error.message || 'Failed to fetch listing detail');
    }
    return (listing || null) as MarketplaceListing | null;
  },

  // --- SELLER: MY LISTINGS (ALL STATUSES) ---
  async getMyListings(userId?: string): Promise<MarketplaceListing[]> {
    const user = await this.getFreshUser();
    const targetId = userId || user.id;

    const { data: myListings, error } = await (supabase as any)
      .from('marketplace_listings')
      .select('*')
      .eq('seller_id', targetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MarketplaceService] getMyListings DB error:', error);
      throw new Error(error.message || 'Failed to load your seller listings');
    }
    return (myListings || []) as MarketplaceListing[];
  },

  // --- LISTINGS WRITES (SELLER) ---
  async saveDraftListing(sellerId: string, listingData: Partial<MarketplaceListing>, listingId?: string): Promise<string> {
    const user = await this.getFreshUser();
    if (user.id !== sellerId) {
      throw new Error('Unauthorized: Seller ID does not match active session.');
    }

    const rawPlatform = listingData.platform || 'Other';
    const PLATFORM_MAP: Record<string, string> = {
      'PlayStation (PS4/PS5)': 'PS5',
      'PlayStation 5 (PS5)': 'PS5',
      'PlayStation 4 (PS4)': 'PS4',
      'Xbox Series / One': 'Xbox',
      'Xbox Series/One': 'Xbox',
      'Mobile (Android/iOS)': 'Mobile',
      'PC (Steam/Windows)': 'PC',
      'PS5': 'PS5',
      'PS4': 'PS4',
      'Xbox': 'Xbox',
      'Mobile': 'Mobile',
      'PC': 'PC',
      'Other': 'Other'
    };
    const dbPlatform = PLATFORM_MAP[rawPlatform] || (['PS4', 'PS5', 'Xbox', 'PC', 'Mobile', 'Other'].includes(rawPlatform) ? rawPlatform : 'Other');

    const payload = {
      seller_id: user.id,
      title: listingData.title || '',
      description: listingData.description || '',
      platform: dbPlatform,
      price_usd: Math.max(0.01, Number(listingData.price_usd) || 0.01),
      account_level: listingData.account_level || '',
      gp_amount: Number(listingData.gp_amount) || 0,
      coins_amount: Number(listingData.coins_amount) || 0,
      featured_players: listingData.featured_players || [],
      epic_players: listingData.epic_players || [],
      screenshots: listingData.screenshots || [],
      status: (listingData.status || 'draft').toLowerCase() as any,
      updated_at: new Date().toISOString()
    };

    if (listingId) {
      const { data: updated, error } = await (supabase as any)
        .from('marketplace_listings')
        .update(payload)
        .eq('id', listingId)
        .eq('seller_id', user.id)
        .select()
        .single();

      if (error) {
        console.error(`[MarketplaceService] updateListing DB error: ${error.message}`, error);
        throw new Error(error.message || 'Failed to update listing in database');
      }
      return updated ? updated.id : listingId;
    } else {
      const { data: draft, error } = await (supabase as any)
        .from('marketplace_listings')
        .insert(payload)
        .select()
        .single();

      if (error || !draft) {
        const errMsg = error?.message || error?.details || 'No row returned from database insert';
        console.error(`[MarketplaceService] createDraftListing DB error: ${errMsg}`, error || '');
        throw new Error(errMsg);
      }
      return draft.id;
    }
  },

  async publishListing(sellerId: string, listingId: string): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== sellerId) {
      throw new Error('Unauthorized: Seller ID does not match active session.');
    }

    const { data, error } = await (supabase as any).rpc('fn_marketplace_publish_listing', {
      p_seller_id: user.id,
      p_listing_id: listingId
    });

    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to publish listing' };
    }
    return data || { success: true };
  },

  async uploadScreenshot(sellerId: string, listingId: string, file: File): Promise<string> {
    const user = await this.getFreshUser();
    if (user.id !== sellerId) {
      throw new Error('Unauthorized: Seller ID does not match active session.');
    }

    const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'screenshot.png';
    const filePath = `${user.id}/${listingId}/${Date.now()}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from('marketplace-listings')
      .upload(filePath, file, { contentType: file.type || 'image/png', upsert: true });

    if (uploadError) {
      console.error('[MarketplaceService] uploadScreenshot storage error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload screenshot to storage bucket');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('marketplace-listings')
      .getPublicUrl(filePath);

    return publicUrl || filePath;
  },

  getListingImageUrl(pathOrUrl?: string): string {
    if (!pathOrUrl) return '/default-card.jpg';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    const { data } = supabase.storage.from('marketplace-listings').getPublicUrl(pathOrUrl);
    return data?.publicUrl || '/default-card.jpg';
  },

  // --- ORDERS ---
  async getOrders(userId: string, role: 'buyer' | 'seller'): Promise<MarketplaceOrder[]> {
    if (role === 'buyer') {
      return this.getMyOrders(userId);
    } else {
      return this.getMySales(userId);
    }
  },

  async getMyOrders(userId?: string): Promise<MarketplaceOrder[]> {
    const user = await this.getFreshUser();
    const targetId = userId || user.id;

    const { data: myOrders, error } = await (supabase as any)
      .from('v_marketplace_order_detail')
      .select('*')
      .eq('buyer_id', targetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MarketplaceService] getMyOrders DB error:', error);
      throw new Error(error.message || 'Failed to load your buyer orders');
    }
    return (myOrders || []) as MarketplaceOrder[];
  },

  async getMySales(userId?: string): Promise<MarketplaceOrder[]> {
    const user = await this.getFreshUser();
    const targetId = userId || user.id;

    const { data: mySales, error } = await (supabase as any)
      .from('v_marketplace_order_detail')
      .select('*')
      .eq('seller_id', targetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MarketplaceService] getMySales DB error:', error);
      throw new Error(error.message || 'Failed to load your seller orders');
    }
    return (mySales || []) as MarketplaceOrder[];
  },

  async getOrderById(orderId: string): Promise<MarketplaceOrder | null> {
    const { data, error } = await (supabase as any)
      .from('v_marketplace_order_detail')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[MarketplaceService] getOrderById DB error:', error);
    }
    return (data || null) as MarketplaceOrder | null;
  },

  async purchaseListing(buyerId: string, listingId: string): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== buyerId) {
      throw new Error('Unauthorized: Buyer ID does not match active session.');
    }

    const { data, error } = await (supabase as any).rpc('fn_marketplace_purchase', {
      p_buyer_id: user.id,
      p_listing_id: listingId
    });

    if (error || (data && (data as any).error)) {
      if (data) {
        return data;
      }
      return { error: error?.message ?? 'Failed to purchase listing' };
    }
    return data || { success: true };
  },

  async submitCredentials(sellerId: string, orderId: string, credentials: {
    login_email: string;
    password: string;
    recovery_info?: string;
    notes?: string;
  }): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== sellerId) {
      throw new Error('Unauthorized: Seller ID does not match active session.');
    }

    const { data, error } = await (supabase as any).rpc('fn_marketplace_submit_credentials', {
      p_seller_id: user.id,
      p_order_id: orderId,
      p_login_email: credentials.login_email,
      p_password: credentials.password,
      p_recovery_info: credentials.recovery_info || null,
      p_notes: credentials.notes || null
    });

    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to submit credentials' };
    }
    return data || { success: true };
  },

  async getCredentials(requesterId: string, orderId: string): Promise<{ error?: string; credentials?: OrderCredentials }> {
    const user = await this.getFreshUser();
    if (user.id !== requesterId) {
      return { error: 'Unauthorized: Requester ID does not match active session.' };
    }

    const { data, error } = await (supabase as any).rpc('fn_marketplace_get_credentials', {
      p_requester_id: user.id,
      p_order_id: orderId
    });

    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to fetch credentials' };
    }
    const creds = (data as any)?.credentials || data || {};
    return { credentials: creds as OrderCredentials };
  },

  async confirmDelivery(buyerId: string, orderId: string): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== buyerId) {
      return { error: 'Unauthorized: Buyer ID does not match active session.' };
    }

    const { data, error } = await (supabase as any).rpc('fn_marketplace_confirm_delivery', {
      p_buyer_id: user.id,
      p_order_id: orderId
    });

    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to confirm delivery' };
    }
    return data || { success: true };
  },

  async openDispute(openerId: string, orderId: string, reason: string, description: string, evidencePaths: string[]): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== openerId) {
      return { error: 'Unauthorized: Opener ID does not match active session.' };
    }

    const { data, error } = await (supabase as any).rpc('fn_marketplace_open_dispute', {
      p_opener_id: user.id,
      p_order_id: orderId,
      p_reason: reason,
      p_description: description,
      p_evidence: evidencePaths
    });

    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to open dispute' };
    }
    return data || { success: true };
  },

  async uploadDisputeEvidence(userId: string, orderId: string, file: File): Promise<string> {
    const user = await this.getFreshUser();
    if (user.id !== userId) {
      throw new Error('Unauthorized: User ID does not match active session.');
    }

    const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'evidence.png';
    const filePath = `${user.id}/${orderId}/${Date.now()}_${cleanName}`;

    const { error } = await supabase.storage
      .from('marketplace-dispute-evidence')
      .upload(filePath, file, { contentType: file.type || 'image/png', upsert: true });

    if (error) {
      console.error('[MarketplaceService] uploadDisputeEvidence storage error:', error);
      throw new Error(error.message || 'Failed to upload dispute evidence to storage');
    }
    return filePath;
  },

  async getDisputeEvidenceUrl(pathOrUrl?: string): Promise<string> {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    const { data, error } = await supabase.storage
      .from('marketplace-dispute-evidence')
      .createSignedUrl(pathOrUrl, 3600);
    
    if (error || !data?.signedUrl) {
      const { data: pubData } = supabase.storage.from('marketplace-dispute-evidence').getPublicUrl(pathOrUrl);
      return pubData?.publicUrl || '';
    }
    return data.signedUrl;
  },

  async submitReview(buyerId: string, orderId: string, rating: number, comment?: string): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== buyerId) {
      return { error: 'Unauthorized: Buyer ID does not match active session.' };
    }

    const { data, error } = await (supabase as any).rpc('fn_marketplace_submit_review', {
      p_buyer_id: user.id,
      p_order_id: orderId,
      p_rating: Math.round(Number(rating)),
      p_comment: comment || null
    });

    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to submit review' };
    }
    return data || { success: true };
  },

  // --- SELLER PUBLIC PROFILE ---
  async getSellerStats(sellerId: string): Promise<MarketplaceSellerStats | null> {
    const { data: statsData } = await (supabase as any)
      .from('marketplace_seller_stats')
      .select('*')
      .eq('user_id', sellerId)
      .maybeSingle();

    const { data: profileData } = await (supabase as any)
      .from('profiles')
      .select('username, avatar_url, role')
      .eq('id', sellerId)
      .maybeSingle();

    if (!statsData && !profileData) {
      return null;
    }

    return {
      seller_id: sellerId,
      completed_sales: (statsData as any)?.completed_sales || 0,
      average_rating: (statsData as any)?.average_rating || 0,
      total_reviews: (statsData as any)?.total_reviews || 0,
      verified_seller: (statsData as any)?.verified_seller === true,
      username: (profileData as any)?.username || (statsData as any)?.username || 'Seller',
      avatar_url: (profileData as any)?.avatar_url || (statsData as any)?.avatar_url,
      role: (profileData as any)?.role || 'user'
    } as MarketplaceSellerStats;
  },

  async getSellerReviews(sellerId: string): Promise<MarketplaceReview[]> {
    const { data, error } = await (supabase as any)
      .from('marketplace_reviews')
      .select('*, buyer:profiles!marketplace_reviews_buyer_id_fkey(username, avatar_url)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      const { data: altData, error: altErr } = await (supabase as any)
        .from('marketplace_reviews')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      if (altErr) {
        console.error('[MarketplaceService] getSellerReviews DB error:', altErr);
        return [];
      }
      return (altData || []).map((row: any) => ({
        ...row,
        buyer_username: row.buyer_username || 'Buyer',
        buyer_avatar_url: row.buyer_avatar_url
      }));
    }

    return (data || []).map((row: any) => ({
      ...row,
      buyer_username: row.buyer?.username || row.buyer_username || 'Buyer',
      buyer_avatar_url: row.buyer?.avatar_url || row.buyer_avatar_url
    }));
  },

  // --- ADMIN METHODS ---
  async adminModerateListing(adminId: string, listingId: string, action: 'approve' | 'reject' | 'hide' | 'unhide', reason?: string): Promise<any> {
    const user = await this.getFreshUser();
    const { data, error } = await (supabase as any).rpc('fn_admin_moderate_listing', {
      p_admin_id: user.id,
      p_listing_id: listingId,
      p_action: action,
      p_reason: reason || null
    });

    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? `Failed to ${action} listing` };
    }
    return data || { success: true };
  },

  async adminGetQueue(statusFilter?: string): Promise<MarketplaceListing[]> {
    await this.getFreshUser();
    let query = (supabase as any)
      .from('marketplace_listings')
      .select('*, seller:profiles!marketplace_listings_seller_id_fkey(username, avatar_url)')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all' && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    } else {
      query = query.in('status', ['draft', 'published', 'hidden', 'rejected']);
    }

    const { data, error } = await query;
    if (error) {
      let altQuery = (supabase as any).from('v_marketplace_listings').select('*').order('created_at', { ascending: false });
      if (statusFilter && statusFilter !== 'all' && statusFilter !== 'ALL') {
        altQuery = altQuery.eq('status', statusFilter);
      } else {
        altQuery = altQuery.in('status', ['draft', 'published', 'hidden', 'rejected']);
      }
      const { data: altData, error: altErr } = await altQuery;
      if (altErr) {
        console.error('[MarketplaceService] adminGetQueue DB error:', altErr);
        throw new Error(altErr.message || 'Failed to load admin queue');
      }
      return (altData || []) as MarketplaceListing[];
    }

    return (data || []).map((row: any) => ({
      ...row,
      seller_username: row.seller?.username || row.seller_username || 'Seller',
      seller_avatar_url: row.seller?.avatar_url || row.seller_avatar_url
    }));
  },

  async adminGetDisputes(): Promise<MarketplaceOrder[]> {
    await this.getFreshUser();
    const { data: disputes, error } = await (supabase as any)
      .from('marketplace_disputes')
      .select('*, order:v_marketplace_order_detail(*)')
      .in('status', ['open', 'under_review'])
      .order('created_at', { ascending: false });

    if (error) {
      const { data: altData, error: altErr } = await (supabase as any)
        .from('v_marketplace_order_detail')
        .select('*')
        .eq('status', 'disputed')
        .order('updated_at', { ascending: false });
      if (altErr) {
        console.error('[MarketplaceService] adminGetDisputes DB error:', altErr);
        throw new Error(altErr.message || 'Failed to load disputes');
      }
      return (altData || []) as MarketplaceOrder[];
    }
    return (disputes || []).map((d: any) => {
      const ord = d.order || d;
      return {
        ...ord,
        dispute_id: d.id,
        dispute_category: d.dispute_category,
        dispute_reason: d.reason,
        dispute_description: d.description,
        dispute_evidence: d.evidence,
        dispute_status: d.status,
        dispute_response_deadline: d.response_deadline,
        dispute_responded_at: d.responded_at,
        dispute_counterparty_response: d.counterparty_response,
        dispute_counterparty_evidence: d.counterparty_evidence,
        dispute_auto_resolved: d.auto_resolved,
        dispute_admin_notes: d.admin_notes
      };
    });
  },

  async adminResolveDispute(adminId: string, orderId: string, outcome: 'refund_buyer' | 'release_seller' | 'partial', partialRefundUsd?: number, adminNotes?: string): Promise<any> {
    const user = await this.getFreshUser();
    const { data, error } = await (supabase as any).rpc('fn_admin_resolve_marketplace_dispute', {
      p_admin_id: user.id,
      p_order_id: orderId,
      p_outcome: outcome,
      p_partial_refund_usd: outcome === 'partial' ? (partialRefundUsd || 0) : null,
      p_admin_notes: adminNotes || null
    });

    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to resolve dispute' };
    }
    return data || { success: true };
  },

  async adminGetAllSellerStats(): Promise<MarketplaceSellerStats[]> {
    await this.getFreshUser();
    const { data: statsData, error } = await (supabase as any)
      .from('marketplace_seller_stats')
      .select('*, profile:profiles!marketplace_seller_stats_user_id_fkey(username, avatar_url, role)')
      .order('completed_sales', { ascending: false });

    if (error) {
      const { data: altData, error: altErr } = await (supabase as any)
        .from('marketplace_seller_stats')
        .select('*')
        .order('completed_sales', { ascending: false });
      if (altErr) {
        console.error('[MarketplaceService] adminGetAllSellerStats DB error:', altErr);
        throw new Error(altErr.message || 'Failed to load seller stats');
      }
      return (altData || []) as MarketplaceSellerStats[];
    }

    return (statsData || []).map((row: any) => ({
      seller_id: row.user_id || row.seller_id,
      completed_sales: row.completed_sales || 0,
      average_rating: row.average_rating || 0,
      total_reviews: row.total_reviews || 0,
      verified_seller: row.verified_seller,
      username: row.profile?.username || row.username || 'Unknown Seller',
      avatar_url: row.profile?.avatar_url || row.avatar_url,
      role: row.profile?.role || row.role
    }));
  },

  async getDisputeByOrderId(orderId: string): Promise<any | null> {
    const { data, error } = await (supabase as any)
      .from('marketplace_disputes')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    if (error) {
      console.error('[MarketplaceService] getDisputeByOrderId DB error:', error);
      return null;
    }
    return data;
  },

  async respondToDispute(responderId: string, disputeId: string, response: string, evidencePaths: string[] = []): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== responderId) {
      return { error: 'Unauthorized: Responder ID does not match active session.' };
    }
    const { data, error } = await (supabase as any).rpc('fn_marketplace_dispute_respond', {
      p_responder_id: user.id,
      p_dispute_id: disputeId,
      p_response: response,
      p_evidence: evidencePaths
    });
    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to respond to dispute' };
    }
    return data || { success: true };
  },

  async reportAccountRecovery(buyerId: string, orderId: string, description: string, evidencePaths: string[]): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== buyerId) {
      return { error: 'Unauthorized: Buyer ID does not match active session.' };
    }
    if (!evidencePaths || evidencePaths.length === 0) {
      return { error: 'Evidence is required: please upload at least one screenshot/file.' };
    }
    const { data, error } = await (supabase as any).rpc('fn_marketplace_report_account_recovery', {
      p_buyer_id: user.id,
      p_order_id: orderId,
      p_description: description,
      p_evidence: evidencePaths
    });
    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to report account recovery' };
    }
    return data || { success: true };
  },

  async adminResolveAccountRecovery(adminId: string, disputeId: string, outcome: 'uphold' | 'reject', notes?: string): Promise<any> {
    const user = await this.getFreshUser();
    if (user.id !== adminId) {
      return { error: 'Unauthorized: Admin ID does not match active session.' };
    }
    const { data, error } = await (supabase as any).rpc('fn_admin_resolve_account_recovery', {
      p_admin_id: user.id,
      p_dispute_id: disputeId,
      p_outcome: outcome,
      p_admin_notes: notes || null
    });
    if (error || (data && (data as any).error)) {
      return { error: (data as any)?.error ?? error?.message ?? 'Failed to resolve account recovery dispute' };
    }
    return data || { success: true };
  },

  async adminGetSuspendedSellers(): Promise<any[]> {
    await this.getFreshUser();
    const { data, error } = await (supabase as any)
      .from('marketplace_seller_stats')
      .select('*, profile:profiles!marketplace_seller_stats_user_id_fkey(username)')
      .eq('is_suspended', true)
      .order('debt_owed_usd', { ascending: false });
    if (error) {
      console.error('[MarketplaceService] adminGetSuspendedSellers DB error:', error);
      return [];
    }
    return data || [];
  }
};
