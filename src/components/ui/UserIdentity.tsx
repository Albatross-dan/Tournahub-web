import React from 'react';
import { Users } from 'lucide-react';
import { cn, getStorageUrl, getPublicIdentity } from '../../lib/utils';

interface UserIdentityProps {
  profile: any;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showAvatar?: boolean;
  className?: string;
  truncate?: boolean;
  isMe?: boolean;
}

export default function UserIdentity({ 
  profile, 
  size = 'md', 
  showAvatar = true, 
  className, 
  truncate = true,
  isMe = false
}: UserIdentityProps) {
  const username = getPublicIdentity(profile);
  const avatarUrl = profile?.avatar_url;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[8px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-lg'
  };

  const nameSizeClasses = {
    xs: 'text-[9px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl'
  };

  return (
    <div className={cn("flex items-center space-x-3 min-w-0 font-sans", className)}>
      {showAvatar && (
        <div className={cn(
          "rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-lg shrink-0 overflow-hidden",
          sizeClasses[size]
        )}>
          {avatarUrl ? (
            <img 
              src={getStorageUrl('avatars', avatarUrl) || undefined} 
              className="w-full h-full object-cover" 
              alt={username}
              referrerPolicy="no-referrer"
            />
          ) : (
            <Users className={cn("text-slate-700", {
              "w-3 h-3": size === 'xs',
              "w-4 h-4": size === 'sm',
              "w-6 h-6": size === 'md' || size === 'lg',
              "w-10 h-10": size === 'xl'
            })} />
          )}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn(
          "font-bold uppercase italic tracking-tight",
          isMe ? "text-primary" : "text-white",
          truncate && "truncate",
          nameSizeClasses[size]
        )}>
          {isMe ? 'You' : username}
        </p>
      </div>
    </div>
  );
}
