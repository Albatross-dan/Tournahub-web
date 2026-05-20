import React from 'react';
import { useSignedUrl } from '../../hooks/useSignedUrl';
import { Loader2, ImageOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  bucket: string;
  path: string | null | undefined;
  fallback?: React.ReactNode;
  fallbackUrl?: string;
  className?: string;
  alt?: string;
}

export default function StorageImage({ 
  bucket, 
  path, 
  fallback,
  fallbackUrl,
  className,
  alt,
  ...props 
}: StorageImageProps) {
  const { url, loading, error } = useSignedUrl(bucket, path);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-900 animate-pulse", className)}>
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if ((error || !url) && !fallbackUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-900 border border-slate-800", className)}>
        {fallback || <ImageOff className="w-5 h-5 text-slate-700" />}
      </div>
    );
  }

  return (
    <img 
      src={url || fallbackUrl} 
      className={cn("object-cover", className)} 
      alt={alt}
      {...props} 
    />
  );
}
