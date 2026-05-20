import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabase";

/**
 * Standardizes identity display across the platform.
 * Ensures we never leak IDs or emails in the UI.
 */
export function getPublicIdentity(profile: any) {
  if (!profile) return 'TBD';
  
  // Handle literal fallback codes from backend views
  const username = profile.username || profile.sender_username || profile.actor_username || profile.created_by_username || profile.username;
  
  if (username === '[deleted]') return 'Deleted User';
  if (username === '[system]') return 'System';
  if (username === '[none]') return '—';
  
  if (typeof profile === 'string') {
    // If it's a UUID, try to provide a truncated version if we really have no profile object
    if (profile.length > 20) return `USER_${profile.substring(0, 5).toUpperCase()}`;
    return profile;
  }
  
  // Resolve recursive profile join if exists (Supabase often nests under 'profiles')
  const target = profile.profiles || profile.profile || profile;
  
  // Try to find any flavor of identity
  const identity = target.username || target.display_name || profile.username || profile.display_name || profile.email?.split('@')[0];
  
  if (!identity && (profile.id || profile.user_id || target.id)) {
    const id = profile.id || profile.user_id || target.id;
    return `USER_${String(id).substring(0, 5).toUpperCase()}`;
  }

  return identity || 'Anonymous';
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatCurrencyDynamic(amount: number, currency: string = 'USD') {
  // Map our currency codes to locales if needed, defaulting to en-US for display
  const locales: Record<string, string> = {
    'KES': 'en-KE',
    'NGN': 'en-NG',
    'GHS': 'en-GH',
    'UGX': 'en-UG',
    'ZAR': 'en-ZA',
    'USD': 'en-US'
  };
  
  return new Intl.NumberFormat(locales[currency] || 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Gets a public URL for a file in a storage bucket.
 */
export function getStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const cleanPath = cleanStoragePath(bucket, path);
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath || '');
  return data.publicUrl;
}

/**
 * Cleans a storage path by removing the bucket prefix if it exists.
 * Some Supabase versions return data.path with the bucket name prepended.
 */
export function cleanStoragePath(bucket: string, path: string | null | undefined) {
  if (!path) return path;
  
  // Remove bucket name and a following slash if it exists at the start
  const prefix = `${bucket}/`;
  if (path.startsWith(prefix)) {
    return path.substring(prefix.length);
  }
  
  return path;
}

/**
 * Creates a signed URL for a private file in a storage bucket.
 */
export async function getSignedUrl(bucket: string, path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  const cleanPath = cleanStoragePath(bucket, path);

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath || '', expiresIn);
    
    if (error) {
      console.error(`Error creating signed URL for ${bucket}/${cleanPath}:`, error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (err) {
    console.error(`Unexpected error creating signed URL for ${bucket}/${cleanPath}:`, err);
    return null;
  }
}
