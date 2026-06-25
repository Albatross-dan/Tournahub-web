
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import AdminShell from '../../components/layout/AdminShell';
import { Wallet, History, Users, ShieldCheck } from 'lucide-react';
import WithdrawalRequests from '../../components/admin/WithdrawalRequests';
import UserWalletAudit from '../../components/admin/UserWalletAudit';
import PlatformRevenueDashboard from '../../components/admin/PlatformRevenueDashboard';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import LoadingState from '../../components/ui/LoadingState';

type AdminWalletTab = 'withdrawals' | 'audit' | 'logs';

export default function AdminWallet() {
  const [activeTab, setActiveTab] = useState<AdminWalletTab>('withdrawals');
  const { user, profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingState />;
  }

  const isFullAdmin = profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'danieloguda11221@gmail.com';
  if (!isFullAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminShell>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Financial <span className="text-primary italic">Oversight</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-3">
              Manage Treasury, Withdrawals, and User Audits
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 border-b border-white/5 pb-px overflow-x-auto custom-scrollbar">
           <TabButton 
             active={activeTab === 'withdrawals'} 
             onClick={() => setActiveTab('withdrawals')}
             label="Withdrawals"
             icon={<History className="w-4 h-4" />}
           />
           <TabButton 
             active={activeTab === 'audit'} 
             onClick={() => setActiveTab('audit')}
             label="User Audit"
             icon={<Users className="w-4 h-4" />}
           />
           <TabButton 
             active={activeTab === 'logs'} 
             onClick={() => setActiveTab('logs')}
             label="Revenue Logs"
             icon={<ShieldCheck className="w-4 h-4" />}
           />
        </div>

        <div className="min-h-[500px]">
           {activeTab === 'withdrawals' && <WithdrawalRequests />}
           {activeTab === 'audit' && <UserWalletAudit />}
           {activeTab === 'logs' && <PlatformRevenueDashboard />}
        </div>
      </div>
    </AdminShell>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-8 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap flex items-center space-x-3",
        active ? "text-primary bg-primary/5" : "text-slate-500 hover:text-white"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
    </button>
  );
}
