import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowAdminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowAdminOnly = false }) => {
  const { user, loading, profile, isAdmin, signOut, accountStatus, permissionSet, permissionsLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const isFullAdmin = isAdmin || profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'danieloguda11221@gmail.com';
    const hasStaffPermissions = permissionSet && permissionSet.size > 0;
    const canAccessAdmin = isFullAdmin || hasStaffPermissions;

    console.log('[ProtectedRoute] Security Gate Checked:', {
      timestamp: new Date().toISOString(),
      path: location.pathname,
      allowAdminOnly,
      loading,
      permissionsLoading,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasProfile: !!profile,
      username: profile?.username,
      whatsapp: profile?.whatsapp_number,
      isAdmin,
      canAccessAdmin,
      accountStatusSummary: accountStatus ? { status: accountStatus.status } : 'none'
    });
  }, [allowAdminOnly, loading, permissionsLoading, user, profile, isAdmin, accountStatus, location.pathname, permissionSet]);

  if (loading || permissionsLoading || (user && !profile) || (user && !accountStatus)) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center relative p-4">
        <div className="absolute top-[30%] left-[30%] w-[250px] h-[250px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary-dark/20 border-t-2 border-t-primary animate-spin" />
          </div>
          <p className="text-[10px] text-slate-450 font-black uppercase tracking-[0.2em] animate-pulse">
            Running security checks...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Enforce profile completion checks
  const hasIncompleteProfile = 
    !profile?.username || 
    profile.username.trim() === '' || 
    !profile?.whatsapp_number || 
    profile.whatsapp_number.trim() === '';

  if (hasIncompleteProfile) {
    if (location.pathname !== '/complete-profile') {
      return <Navigate to="/complete-profile" replace />;
    }
  } else if (location.pathname === '/complete-profile') {
    return <Navigate to="/dashboard" replace />;
  }

  // Evaluate current user status
  const currentStatus = accountStatus?.status || 'active';
  if (['banned', 'suspended', 'deleted'].includes(currentStatus)) {
    const isSuspended = currentStatus === 'suspended';
    const isBanned = currentStatus === 'banned';
    const isDeleted = currentStatus === 'deleted';

    const title = isSuspended ? 'Account Suspended' : 'Access Revoked';
    const actionText = isBanned 
      ? 'Your account has been permanently banned from TournaHub'
      : isDeleted 
        ? 'Your account has been deleted'
        : 'Your account is temporarily suspended';

    const reason = isBanned 
      ? accountStatus?.banned_reason 
      : isSuspended 
        ? accountStatus?.suspension_reason 
        : 'This account has been soft-deleted by an administrator.';

    const endDate = isSuspended && accountStatus?.suspended_until 
      ? new Date(accountStatus.suspended_until).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      : null;

    return (
      <div className="min-h-screen z-[1000] flex items-center justify-center p-4 bg-slate-950 text-white select-none">
        <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/20 rounded-3xl p-10 text-center shadow-2xl relative">
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-650/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">
            {title}
          </h3>

          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-4">
            Security Blockade
          </p>

          <div className="space-y-4 mb-8">
            <p className="text-xs text-slate-300 font-extrabold leading-relaxed uppercase tracking-wider">
              {actionText}
            </p>

            {endDate && (
              <div className="py-2 px-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-xl inline-block italic">
                Suspension ends on: {endDate}
              </div>
            )}

            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-left space-y-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Dossier Reason Details:</span>
              <p className="text-xs font-mono font-bold text-red-400 italic leading-relaxed">
                "{reason || 'No specific reason recorded in ledger.'}"
              </p>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal font-medium leading-relaxed">
              Appeal requests can be addressed to security operations. Ensure your ID credentials are ready. Support email: <span className="text-slate-400">security@tournahub.com</span>
            </p>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full py-4.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black uppercase italic tracking-widest rounded-2xl transition-all border border-slate-700/50 flex items-center justify-center gap-2 shadow-lg"
          >
            <LogOut className="w-4 h-4 stroke-[3px]" />
            Terminate Session
          </button>
        </div>
      </div>
    );
  }

  const isFullAdmin = isAdmin || profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'danieloguda11221@gmail.com';
  const hasStaffPermissions = permissionSet && permissionSet.size > 0;
  const canAccessAdmin = isFullAdmin || hasStaffPermissions;

  if (allowAdminOnly && !canAccessAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
