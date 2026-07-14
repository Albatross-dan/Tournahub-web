import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, Tag, PlusCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export const MarketplaceNavbar: React.FC = () => {
  const navigate = useNavigate();
  const { profile, can } = useAuth();
  const isAdmin = profile?.role === 'admin' || can('manage_marketplace');

  const navLinks = [
    { name: 'Browse Accounts', path: '/marketplace', icon: Store, end: true },
    { name: 'My Orders', path: '/marketplace/orders', icon: ShoppingBag, end: false },
    { name: 'My Sales', path: '/marketplace/sales', icon: Tag, end: false },
  ];

  return (
    <div className="bg-surface/80 backdrop-blur-md border border-border-main rounded-2xl p-4 mb-8 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Badge */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
            <Store className="w-6 h-6 stroke-[2.5px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">
                eFootball <span className="text-primary">Marketplace</span>
              </h1>
              <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md uppercase tracking-widest">
                USD Escrow
              </span>
            </div>
            <p className="text-xs text-text-muted font-bold">
              Secure player accounts, coins, and squads with automated escrow protection.
            </p>
          </div>
        </div>

        {/* Tabs & Create CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-background/90 p-1.5 rounded-xl border border-white/5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase italic tracking-wider transition-all",
                      isActive
                        ? "bg-primary text-slate-950 shadow-md shadow-primary/20 scale-102"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )
                  }
                >
                  <Icon className="w-3.5 h-3.5 stroke-[2.5px]" />
                  <span>{link.name}</span>
                </NavLink>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/marketplace/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>Sell Account</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate('/admin/marketplace')}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-primary font-black text-[10px] uppercase tracking-widest rounded-xl border border-primary/30 transition-all cursor-pointer"
              title="Admin Marketplace Dashboard"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
