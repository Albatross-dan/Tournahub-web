import React from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PlayerBadgeProps {
  badgeId: string | null | undefined;
  username: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export function getBadgeUrl(badgeId: string | null | undefined): string | null {
  if (!badgeId) return null;
  // Basic check to see if it's already a full URL or just a filename
  if (badgeId.startsWith('http')) return badgeId;
  return `${SUPABASE_URL}/storage/v1/object/public/team-badges/${badgeId}`;
}

export const PlayerBadge: React.FC<PlayerBadgeProps> = ({ 
  badgeId, 
  username, 
  size = 'md',
  className 
}) => {
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  
  const url = getBadgeUrl(badgeId);
  
  const sizeClasses = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const iconSizes = {
    xs: 10,
    sm: 12,
    md: 20,
    lg: 32,
    xl: 48,
  };

  if (!url || error) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-500 shadow-inner shrink-0",
          sizeClasses[size],
          className
        )}
        title={`${username} has no badge`}
      >
        <Shield size={iconSizes[size]} className="opacity-40" />
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 flex items-center justify-center", sizeClasses[size], className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 rounded-xl animate-pulse">
           <Loader2 className="w-1/2 h-1/2 text-slate-600 animate-spin" />
        </div>
      )}
      <img
        src={url}
        alt={`${username}'s badge`}
        className={cn(
          "w-full h-full object-contain drop-shadow-md transition-opacity duration-300",
          loading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
