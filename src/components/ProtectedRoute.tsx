import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowAdminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowAdminOnly = false }) => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [accountStatus, setAccountStatus] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setCheckingStatus(false);
      return;
    }

    async function checkAccountStatus() {
      try {
        const fetchPromise = (async () => {
          const { data, error } = await supabase.rpc('get_my_account_status');
          if (error) {
            console.error('[ProtectedRoute] get_my_account_status error:', error);
            
            // Fallback to profiles table query for robustness
            const { data: profileData } = await supabase
              .from('profiles')
              .select('status, banned_reason, suspension_reason, suspended_until')
              .eq('id', user.id)
              .single();
            return profileData || { status: 'active' };
          }
          return data;
        })();

        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => {
            console.warn('[ProtectedRoute] Account status RPC check timed out. Proceeding with active status.');
            resolve({ status: 'active' });
          }, 3000)
        );

        const statusData = await Promise.race([fetchPromise, timeoutPromise]);
        setAccountStatus(statusData);
      } catch (err) {
        console.error('[ProtectedRoute] Failed to fetch account standing:', err);
      } finally {
        setCheckingStatus(false);
      }
    }

    checkAccountStatus();
  }, [user]);

  if (loading) {
    if (!user) {
      return null;
    }
    return <Outlet />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Running Security Checks...</p>
        </div>
      </div>
    );
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

  if (allowAdminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
