import { toast } from 'react-hot-toast';

export interface ShareOptions {
  title: string;
  text: string;
  url: string;
  imageUrl?: string | null;
  referralCode?: string;
  campaignId?: string;
  meta?: Record<string, any>;
}

/**
 * Modern, Lightweight & Highly Compatible Sharing Utility for TournaHub
 * 
 * Supports:
 * - Direct native Web Share API (including image file blobs when supported and allowed by CORS)
 * - Safe manual clipboard fallback with formatted multi-line post structure
 * - Graceful handling of user abort (cancellation)
 * - Advanced future-proof parameters (referrals, social tracking tags, and campaigns)
 */
export async function shareContent(options: ShareOptions): Promise<{ success: boolean; method: 'share' | 'copy' | 'fallback' }> {
  let shareUrl = options.url;
  
  try {
    const urlObj = new URL(shareUrl);
    
    // Future Compatibility Hooks: Append campaign or referral pointers on-the-fly
    if (options.referralCode) {
      urlObj.searchParams.set('ref', options.referralCode);
    }
    if (options.campaignId) {
      urlObj.searchParams.set('utm_campaign', options.campaignId);
      urlObj.searchParams.set('utm_source', 'tournahub_share');
    }
    
    shareUrl = urlObj.toString();
  } catch (e) {
    console.warn('[Share] Failed parsing sharing URL as object. Using raw input URL as-is:', shareUrl);
  }

  const shareTitle = options.title;
  const shareText = options.text;

  // 1. Primary path: Use the browser's native Web Share API
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData: ShareData = {
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      };

      // Optional future support for binary share files (e.g. tournament posters/banners)
      if (options.imageUrl && navigator.canShare) {
        try {
          // Fetch the banner into a local File object to attach to the native payload (supports CORS)
          const imgResponse = await fetch(options.imageUrl, { mode: 'cors', credentials: 'omit' });
          if (imgResponse.ok) {
            const blob = await imgResponse.blob();
            const mimeType = blob.type || 'image/jpeg';
            const suffix = mimeType.split('/')[1] || 'jpeg';
            const bannerFile = new File([blob], `tournament_banner.${suffix}`, { type: mimeType });

            if (navigator.canShare({ files: [bannerFile] })) {
              shareData.files = [bannerFile];
            }
          }
        } catch (imgErr) {
          // Silence CORS or fetching network failures and proceed with standard text/link share gracefully
          console.warn('[Share] Omitted image file from sharing request payload:', imgErr);
        }
      }

      await navigator.share(shareData);
      return { success: true, method: 'share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[Share] Sharing operation was aborted by the user.');
        return { success: false, method: 'share' };
      }
      console.warn('[Share] Web Share API failed. Falling back to clipboard copy:', err);
    }
  }

  // 2. Secondary/Fallback path: Multi-line formatted Clipboard copying
  try {
    const fallbackBlock = `${shareTitle}\n\n${shareText}\n\n${shareUrl}`;
    await navigator.clipboard.writeText(fallbackBlock);
    toast.success('✓ Link & details copied to clipboard!');
    return { success: true, method: 'copy' };
  } catch (err) {
    console.error('[Share] Primary clipboard writing failed. Attempting legacy DOM selection fallback:', err);
    try {
      const textarea = document.createElement('textarea');
      textarea.value = `${shareTitle}\n\n${shareText}\n\n${shareUrl}`;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const selectionSuccess = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (selectionSuccess) {
        toast.success('✓ Tournament info copied to clipboard!');
        return { success: true, method: 'copy' };
      }
    } catch (nestedErr) {
      console.error('[Share] Legacy clipboard execution failed:', nestedErr);
    }

    toast.error('Failed to copy automatically. Please copy the URL from your web address bar.');
    return { success: false, method: 'fallback' };
  }
}
