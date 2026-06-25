import React, { useState } from 'react';
import { Download, Share2, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'react-hot-toast';

export function DownloadHeader({ tournamentName, title, logoUrl }: { tournamentName: string; title: string; logoUrl?: string }) {
  return (
    <div className="download-header hidden flex-col items-center justify-center text-center p-6 border-b border-white/10 bg-[#09090b] text-white rounded-t-2xl">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-10 h-10 bg-[#10b981]/15 rounded-xl flex items-center justify-center border border-[#10b981]/30">
            <span className="text-[#10b981] font-black text-xl italic tracking-tighter">TH</span>
          </div>
        )}
        <div className="text-left">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#10b981]">TOURNAHUB PLATFORM</span>
          <h1 className="text-lg font-black uppercase italic tracking-tight leading-none text-white">{tournamentName}</h1>
        </div>
      </div>
      <div className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-900/80 px-4 py-1 rounded-full border border-white/5">
        {title}
      </div>
    </div>
  );
}

export function DownloadFooter() {
  return (
    <div className="download-footer hidden flex-col items-center justify-center text-center p-6 border-t border-white/10 bg-[#09090b] text-white rounded-b-2xl gap-1">
      <p className="text-xs font-black text-slate-300 tracking-wider uppercase">Tournahub • tournahub.me</p>
      <p className="text-[8px] font-bold text-[#10b981] uppercase tracking-[0.2em] italic">The Ultimate Tournament Hub</p>
    </div>
  );
}

interface DownloadShareActionProps {
  elementId: string;
  tournamentName: string;
  fileName: string;
  title: string;
  className?: string;
  isWide?: boolean; // For brackets that need larger canvas widths
}

export default function DownloadShareAction({
  elementId,
  tournamentName,
  fileName,
  title,
  className = "",
  isWide = false
}: DownloadShareActionProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (mode: 'download' | 'share') => {
    if (isProcessing) return;

    const element = document.getElementById(elementId);
    if (!element) {
      toast.error("Target content could not be located. Please try again.");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading(
      mode === 'share' ? "Preparing image for sharing..." : "Generating high-quality image..."
    );

    // Save original styles & scrolling states
    const originalStyle = element.getAttribute('style') || '';
    const originalClassList = [...element.classList];
    const originalScrollLeft = element.scrollLeft;

    // Locate pre-rendered header and footer within the capture element
    const headers = element.querySelectorAll('.download-header');
    const footers = element.querySelectorAll('.download-footer');

    try {
      // Temporarily reveal header and footer
      headers.forEach((el: any) => {
        el.classList.remove('hidden');
        el.classList.add('flex');
      });
      footers.forEach((el: any) => {
        el.classList.remove('hidden');
        el.classList.add('flex');
      });

      // Force high-contrast styling for the screenshot capture
      element.classList.add('bg-[#09090b]', 'text-white', 'p-4', 'rounded-2xl', 'border', 'border-white/10');
      
      // Temporarily expand width and layout to prevent clippings or scrollbars
      if (isWide) {
        element.style.width = '1440px';
        element.style.minWidth = '1440px';
      } else {
        element.style.width = '850px';
        element.style.minWidth = '850px';
      }
      
      element.style.maxWidth = 'none';
      element.style.overflow = 'visible';
      element.style.transform = 'scale(1)';

      // Small delay to let rendering engine repaint the expanded styles
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Capture the element using html-to-image with robust CORS & Font bypass rules
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#09090b',
        quality: 0.95,
        pixelRatio: 1.5, // Retains high quality while preventing memory-limit crashes on mobile
        skipFonts: true, // Prevents iframe CORS blockages when loading custom external fonts
        fontEmbedCSS: '', // Disables embedding external web fonts to prevent security blockages
        imagePlaceholder: 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="100%" height="100%" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="sans-serif" font-size="10">TH</text></svg>',
        filter: (node: HTMLElement) => {
          // Exclude interactive scripts, iframe frames, and any temporary buttons inside
          const tag = node.tagName || '';
          if (tag === 'SCRIPT' || tag === 'IFRAME' || tag === 'STYLE') return false;
          if (node.classList && (node.classList.contains('download-share-btn') || node.classList.contains('action-btn-exclude'))) return false;
          return true;
        },
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          width: isWide ? '1440px' : '850px',
        }
      });

      // Restore original styling and state
      element.setAttribute('style', originalStyle);
      element.scrollLeft = originalScrollLeft;
      
      // Reset class list to original
      element.className = "";
      originalClassList.forEach(cls => element.classList.add(cls));

      // Hide header and footer again
      headers.forEach((el: any) => {
        el.classList.add('hidden');
        el.classList.remove('flex');
      });
      footers.forEach((el: any) => {
        el.classList.add('hidden');
        el.classList.remove('flex');
      });

      if (mode === 'share' && navigator.share && navigator.canShare) {
        // Convert base64 dataUrl to File
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${tournamentName} - ${title}`,
            text: `Check out the ${title} for ${tournamentName} on Tournahub! 🏆`,
          });
          toast.success("Shared successfully!", { id: loadingToast });
        } else {
          // Fallback to direct download if files sharing is blocked/unsupported
          triggerDownload(dataUrl, fileName);
          toast.success("Downloaded successfully! (Share not supported)", { id: loadingToast });
        }
      } else {
        // Direct Download mode
        triggerDownload(dataUrl, fileName);
        toast.success("Image downloaded successfully!", { id: loadingToast });
      }

    } catch (err) {
      console.error('[DownloadShareAction] Image capture error:', err);
      
      // Ensure we restore styling and remove temporary nodes even in case of error
      try {
        element.setAttribute('style', originalStyle);
        element.className = "";
        originalClassList.forEach(cls => element.classList.add(cls));
        headers.forEach((el: any) => {
          el.classList.add('hidden');
          el.classList.remove('flex');
        });
        footers.forEach((el: any) => {
          el.classList.add('hidden');
          el.classList.remove('flex');
        });
      } catch (cleanErr) {
        console.error('[DownloadShareAction] Clean up error:', cleanErr);
      }

      toast.error("Failed to generate high-quality image. Please try again.", { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.download = `${name}_${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if Web Share API with files is available
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => handleAction('download')}
        disabled={isProcessing}
        className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black uppercase tracking-wider text-slate-200 border border-white/5 hover:border-primary/30 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
      >
        {isProcessing ? (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 text-primary" />
        )}
        <span>Download PNG</span>
      </button>

      {canShare && (
        <button
          onClick={() => handleAction('share')}
          disabled={isProcessing}
          className="h-9 w-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/5 hover:border-primary/30 transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
          title="Share via Social Media"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          ) : (
            <Share2 className="w-3.5 h-3.5 text-[#10b981]" />
          )}
        </button>
      )}
    </div>
  );
}

