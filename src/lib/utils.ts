import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabase";

/**
 * Standardizes identity display across the platform.
 * Ensures we never leak IDs or emails in the UI.
 */
export function getPublicIdentity(profile: any) {
  if (!profile) return 'TBD';
  
  // If profile is a UUID string (unfetched), it's still 'TBD' or 'User'
  // but strictly NOT the ID itself.
  if (typeof profile === 'string') return 'User';
  
  return profile.username || profile.email?.split('@')[0] || 'Anonymous';
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
  
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Creates a signed URL for a private file in a storage bucket.
 */
export function getSignedUrl(bucket: string, path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  return supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
    .then(({ data }) => data?.signedUrl || null);
}
