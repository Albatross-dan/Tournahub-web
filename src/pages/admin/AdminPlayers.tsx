import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Users, Search, Shield, ShieldOff, 
  Wallet, Mail, Calendar, MoreVertical,
  Activity, ArrowUpRight, Ban, CheckCircle2,
  Clock, RefreshCw, ChevronLeft, ChevronRight,
  User, ShieldAlert, FileText, Trash2, X, Plus, Copy,
  Loader2
} from 'lucide-react';
import { formatCurrency, cn, getPublicIdentity } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Services & Components
import { moderationService } from '../../services/moderationService';
import { 
  BanUserModal, 
  SuspendUserModal, 
  RestoreUserModal, 
  SoftDeleteModal, 
  PermanentDeleteModal, 
  AssignRoleModal, 
  AddNoteModal 
} from '../../components/admin/ModerationModals';

// Local date representation helper (from Supabase UTC ISO to user local timezone)
function formatLocalTime(isoString: string | null) {
  if (!isoString) return 'Never';
  try {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch {
    return isoString;
  }
}

// Relative time helper
function formatRelativeTime(isoString: string | null) {
  if (!isoString) return 'Never';
  try {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now'; // Future date fallback
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'N/A';
  }
}

export default function AdminPlayers() {
  const { profile: loggedInProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Selected User Panel & Modals
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserFull, setSelectedUserFull] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Triggering specific modals on a target user
  const [activeModal, setActiveModal] = useState<string | null>(null); // 'ban' | 'suspend' | 'restore' | 'soft_delete' | 'permanent_delete' | 'role' | 'note'
  const [modalTargetUser, setModalTargetUser] = useState<any | null>(null);

  useEffect(() => {
    fetchUsersList();
  }, [page, statusFilter, roleFilter]);

  // Handle Search & Filter Resets
  const triggerSearch = () => {
    if (page === 1) {
      fetchUsersList();
    } else {
      setPage(1); // will trigger search via useEffect
    }
  };

  const handleFilterChange = (type: 'status' | 'role', val: string) => {
    if (type === 'status') setStatusFilter(val);
    if (type === 'role') setRoleFilter(val);
    setPage(1);
  };

  async function fetchUsersList() {
    setLoading(true);
    try {
      const statusParam = statusFilter === 'All' ? null : (statusFilter.toLowerCase() as any);
      const roleParam = roleFilter === 'All' ? null : (roleFilter.toLowerCase() as any);
      
      const result = await moderationService.listUsers({
        page,
        pageSize,
        status: statusParam,
        role: roleParam,
        search: search.trim() || null
      });

      // Response contains users & total_count
      setUsers(result?.users || []);
      setTotalCount(result?.total_count || 0);

      // If the currently viewed user detail is open, refetch its data to keep states synced
      if (selectedUserId) {
        loadUserDetail(selectedUserId);
      }
    } catch (err) {
      console.error('Error listing users:', err);
      toast.error('Failed to load contender database.');
    } finally {
      setLoading(false);
    }
  }

  // Fetch full details of a specific user (including notes & logs/audit history)
  async function loadUserDetail(userId: string) {
    setLoadingDetail(true);
    try {
      const data = await moderationService.getUser(userId);
      setSelectedUserFull(data);
    } catch (err) {
      console.error('Error fetching user detail:', err);
      toast.error('Failed to load user detailed dossier.');
    } finally {
      setLoadingDetail(false);
    }
  }

  const handleOpenDetail = (user: any) => {
    setSelectedUserId(user.id);
    loadUserDetail(user.id);
  };

  const handleCloseDetail = () => {
    setSelectedUserId(null);
    setSelectedUserFull(null);
  };

  const openModerationModal = (user: any, modalType: string) => {
    setModalTargetUser(user);
    setActiveModal(modalType);
  };

  const closeModerationModal = () => {
    setActiveModal(null);
    setModalTargetUser(null);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <AdminShell>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Contender <span className="text-primary italic">Database</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
              Oversight, Clearance Level Allocation & Security Logs
            </p>
          </div>
          <button 
            onClick={() => { setSearch(''); setStatusFilter('All'); setRoleFilter('All'); setPage(1); }}
            className="px-5 py-3.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl gap-4 flex flex-col xl:flex-row xl:items-center">
          {/* Query Search */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search by username, UUID or email..." 
              className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-12 pr-4 py-4 text-xs font-bold text-white placeholder:text-slate-700 outline-none focus:border-primary/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 xl:w-auto">
            {/* Status Selector */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">Status Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="bg-slate-950 text-xs font-bold uppercase border border-slate-850 rounded-xl px-4 py-3 text-slate-300 focus:border-primary outline-none"
              >
                <option value="All">All statuses</option>
                <option value="Active">🟢 Active</option>
                <option value="Banned">🔴 Banned</option>
                <option value="Suspended">🟡 Suspended</option>
                <option value="Deleted">⚫ Deleted</option>
              </select>
            </div>

            {/* Role Selector */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">Clearance Title</label>
              <select 
                value={roleFilter}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="bg-slate-950 text-xs font-bold uppercase border border-slate-850 rounded-xl px-4 py-3 text-slate-300 focus:border-primary outline-none"
              >
                <option value="All">All Clearance</option>
                <option value="User">User</option>
                <option value="Moderator">Moderator</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* Run Search Button */}
            <button 
              onClick={triggerSearch}
              className="col-span-2 md:col-span-1 h-11 bg-primary text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl hover:bg-white transition-all self-end"
            >
              Verify Intel
            </button>
          </div>
        </div>

        {/* List of profiles / Users Table */}
        <div className="card overflow-hidden border-white/5 bg-surface/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contender dossier</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Clearance Level</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Standing status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Last Active</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Action Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300 font-medium whitespace-nowrap">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-24">
                      <LoadingState message="Decrypting Core Clearance Database..." />
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((u) => {
                    const isBanned = u.status === 'banned';
                    const isSuspended = u.status === 'suspended';
                    const isDeleted = u.status === 'deleted';

                    return (
                      <tr 
                        key={u.id} 
                        className="group hover:bg-white/5 transition-all duration-300 cursor-pointer"
                        onClick={() => handleOpenDetail(u)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-4">
                            <div className="w-11 h-11 rounded-full border border-slate-800 bg-slate-950 flex items-center justify-center text-primary font-black text-lg group-hover:border-primary/50 transition-colors shrink-0">
                              {(u.username || 'U')[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => handleOpenDetail(u)}
                                className="font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors text-left text-sm leading-tight hover:underline"
                              >
                                {u.username || 'Anonymous'}
                              </button>
                              <span className="text-[10px] text-slate-500 font-mono tracking-wider">{u.email || '@no_email'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border",
                            u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                            u.role === 'moderator' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-slate-850 text-slate-500 border-slate-800'
                          )}>
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border",
                            isBanned ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                            isSuspended ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            isDeleted ? 'bg-slate-800 text-slate-400 border-slate-700' :
                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          )}>
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-mono text-slate-500 text-[11px]">
                          {formatRelativeTime(u.last_login_at)}
                        </td>
                        <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1">
                            {/* Ban / Restore toggler */}
                            {isBanned || isSuspended ? (
                              <button
                                onClick={() => openModerationModal(u, 'restore')}
                                className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-black transition-all"
                                title="Restore User Account"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => openModerationModal(u, 'suspend')}
                                  className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-all"
                                  title="Suspend Temporarily"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openModerationModal(u, 'ban')}
                                  className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                  title="Ban Permanently"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Options dropdown trigger opens panel */}
                            <button 
                              onClick={() => handleOpenDetail(u)}
                              className="p-2 bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white rounded-lg transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">
                      Zero matching contender files decoded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-6 bg-slate-900/30 border-t border-slate-800/50 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount} profiles
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="p-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-black transition-all",
                        page === p
                          ? 'bg-primary text-black'
                          : 'bg-slate-950 border border-slate-850 text-slate-400 hover:border-slate-700'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="p-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* SIDE SHEET: USER LOG INTERACTION PROFILE DOSSIER */}
      {/* ==================================================== */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[250] flex justify-end bg-slate-950/70 backdrop-blur-sm">
          {/* Backdrop Dismiss area */}
          <div className="flex-1 cursor-pointer" onClick={handleCloseDetail} />

          {/* The Side Sheet panel content */}
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full shadow-2xl overflow-y-auto flex flex-col p-8 relative">
            
            {/* Close Button Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Security dossier record</span>
              <button 
                onClick={handleCloseDetail}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail || !selectedUserFull ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Assembling user report data...</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-8">
                  
                  {/* Header Details */}
                  <div className="flex items-start space-x-5">
                    <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-primary font-black text-3xl shrink-0">
                      {(selectedUserFull.profile?.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-xl font-black text-white uppercase tracking-tight truncate leading-none">
                          {selectedUserFull.profile?.username || 'Anonymous'}
                        </h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0",
                          selectedUserFull.profile?.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          selectedUserFull.profile?.role === 'moderator' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-slate-850 text-slate-500 border-slate-800'
                        )}>
                          {selectedUserFull.profile?.role || 'user'}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-slate-400 gap-1.5 mt-2.5 text-xs font-bold leading-none select-all">
                        <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="truncate">{selectedUserFull.profile?.email}</span>
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-mono">
                        <span>ID: {selectedUserFull.profile?.id}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedUserFull.profile?.id);
                            toast.success('ID copied to clipboard');
                          }}
                          className="hover:text-white"
                          title="Copy Original ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Operational Status Full-width box */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Account standing</span>
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          selectedUserFull.profile?.status === 'active' ? 'bg-emerald-500 shadow shadow-emerald-500/50' :
                          selectedUserFull.profile?.status === 'banned' ? 'bg-red-500 shadow shadow-red-500/50' :
                          selectedUserFull.profile?.status === 'suspended' ? 'bg-amber-500 shadow shadow-amber-500/50' :
                          'bg-slate-400 shadow shadow-slate-400/50'
                        )} />
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          {selectedUserFull.profile?.status || 'active'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Available Balance</span>
                      <span className="text-sm font-black text-emerald-400 italic block">
                        {formatCurrency(selectedUserFull.wallet?.balance || 0)}
                      </span>
                    </div>
                  </div>

                  {/* History dates */}
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-[10px] space-y-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500 uppercase tracking-widest">Joined Deployment:</span>
                      <span className="text-slate-300 font-bold">{formatLocalTime(selectedUserFull.profile?.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500 uppercase tracking-widest">Last Access Node:</span>
                      <span className="text-slate-300 font-bold">{formatLocalTime(selectedUserFull.profile?.last_login_at)}</span>
                    </div>
                  </div>

                  {/* Wallet audit security */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <h5 className="text-xs font-black uppercase text-white tracking-widest italic flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        Wallet Restraints
                      </h5>
                    </div>
                    {['banned', 'suspended', 'deleted'].includes(selectedUserFull.profile?.status) ? (
                      <div className="p-4 bg-red-950/25 border border-red-900/30 rounded-2xl text-xs text-red-400 font-bold flex gap-3">
                        <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
                        <div>
                          <p className="font-extrabold uppercase mb-0.5">Transactions Isolated & Locked</p>
                          <p className="text-[11px] font-medium leading-relaxed">
                            Due to user account status '{selectedUserFull.profile?.status}', their connected wallet is fully restricted. Local payout nodes are bypassed.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-950/15 border border-emerald-900/20 rounded-2xl text-xs text-emerald-400 font-bold flex gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 animate-pulse" />
                        <div>
                          <p className="font-extrabold uppercase mb-0.5">Cleared Wallet Hub</p>
                          <p className="text-[11px] font-medium leading-relaxed">
                            Wallet is actively unlocked. Standard entries, winnings, and checkout transfers are normal.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes Tab / Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h5 className="text-xs font-black uppercase text-white tracking-widest italic flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-400" />
                        Admin oversight notes
                      </h5>
                      <button 
                        onClick={() => openModerationModal(selectedUserFull.profile, 'note')}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        Add note
                      </button>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {selectedUserFull.notes && selectedUserFull.notes.length > 0 ? (
                        selectedUserFull.notes.map((n: any) => (
                          <div key={n.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                            <p className="text-xs font-bold text-slate-200 leading-relaxed italic">"{n.note}"</p>
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-500 mr-2">
                              <span>Admin: {n.admin_username}</span>
                              <span className="font-mono">{formatRelativeTime(n.created_at)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-slate-600 font-bold uppercase tracking-widest text-[9px]">
                          Intel notes clean. No logs reported.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Change Audit Logs History */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h5 className="text-xs font-black uppercase text-white tracking-widest italic flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        Security State Logs
                      </h5>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedUserFull.logs && selectedUserFull.logs.length > 0 ? (
                        selectedUserFull.logs.map((l: any) => (
                          <div key={l.id} className="p-3 bg-slate-950 border-white/5 border rounded-xl text-[11px] leading-relaxed">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn(
                                "text-[8px] px-1.5 rounded-md font-black uppercase tracking-wider border",
                                ['ban'].includes(l.action_type) ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                ['suspend'].includes(l.action_type) ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                ['restore'].includes(l.action_type) ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                "bg-slate-800 text-slate-400"
                              )}>
                                {l.action_type || 'SYSTEM'}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono tracking-tighter">{formatRelativeTime(l.created_at)}</span>
                            </div>
                            <p className="font-bold text-slate-300">
                              Admin <span className="text-white">@{l.admin_username}</span>:
                              <span className="text-slate-400 font-medium italic"> "{l.reason || 'No details specified'}"</span>
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-slate-600 font-bold uppercase tracking-widest text-[9px]">
                          Zero standing change logs reported.
                        </p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Bottom Inline Actions Toolbar */}
                <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 gap-3 shrink-0">
                  <button 
                    onClick={() => openModerationModal(selectedUserFull.profile, 'role')}
                    className="py-3 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-xl text-[10px] border border-purple-500/10 font-bold uppercase tracking-widest transition-all"
                  >
                    Clearance Role
                  </button>

                  {['banned', 'suspended'].includes(selectedUserFull.profile?.status) ? (
                    <button 
                      onClick={() => openModerationModal(selectedUserFull.profile, 'restore')}
                      className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-950/30"
                    >
                      Restore Account
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => openModerationModal(selectedUserFull.profile, 'suspend')}
                        className="py-3 bg-orange-600/10 hover:bg-orange-600 text-orange-450 hover:text-white rounded-xl text-[10px] border border-orange-500/15 font-bold uppercase tracking-widest transition-all"
                      >
                        Suspend User
                      </button>
                      <button 
                        onClick={() => openModerationModal(selectedUserFull.profile, 'ban')}
                        className="py-3 bg-red-600/15 hover:bg-red-650 text-red-500 hover:text-white rounded-xl text-[10px] border border-red-500/15 font-bold uppercase tracking-widest transition-all"
                      >
                        Ban Account
                      </button>
                    </>
                  )}

                  {selectedUserFull.profile?.status !== 'deleted' ? (
                    <button 
                      onClick={() => openModerationModal(selectedUserFull.profile, 'soft_delete')}
                      className="col-span-2 py-3 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-xl text-[10px] border border-slate-755 font-bold uppercase tracking-widest transition-all"
                    >
                      Delete Account
                    </button>
                  ) : (
                    <button 
                      onClick={() => openModerationModal(selectedUserFull.profile, 'permanent_delete')}
                      className="col-span-2 py-3 bg-red-950 hover:bg-red-900 text-red-400 hover:text-white rounded-xl text-[10px] border border-red-900/40 font-bold uppercase tracking-widest transition-all animate-pulse"
                    >
                      ⚠️ Permanent Deletion Purge
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* RENDER ACTIVE ADMINISTRATIVE ACT MODALS (A-G) */}
      {/* ==================================================== */}
      {activeModal === 'ban' && modalTargetUser && (
        <BanUserModal
          isOpen={true}
          onClose={closeModerationModal}
          user={modalTargetUser}
          onSuccess={fetchUsersList}
        />
      )}
      {activeModal === 'suspend' && modalTargetUser && (
        <SuspendUserModal
          isOpen={true}
          onClose={closeModerationModal}
          user={modalTargetUser}
          onSuccess={fetchUsersList}
        />
      )}
      {activeModal === 'restore' && modalTargetUser && (
        <RestoreUserModal
          isOpen={true}
          onClose={closeModerationModal}
          user={modalTargetUser}
          onSuccess={fetchUsersList}
        />
      )}
      {activeModal === 'soft_delete' && modalTargetUser && (
        <SoftDeleteModal
          isOpen={true}
          onClose={closeModerationModal}
          user={modalTargetUser}
          onSuccess={fetchUsersList}
        />
      )}
      {activeModal === 'permanent_delete' && modalTargetUser && (
        <PermanentDeleteModal
          isOpen={true}
          onClose={closeModerationModal}
          user={modalTargetUser}
          onSuccess={() => {
            handleCloseDetail();
            fetchUsersList();
          }}
        />
      )}
      {activeModal === 'role' && modalTargetUser && (
        <AssignRoleModal
          isOpen={true}
          onClose={closeModerationModal}
          user={modalTargetUser}
          onSuccess={fetchUsersList}
        />
      )}
      {activeModal === 'note' && modalTargetUser && (
        <AddNoteModal
          isOpen={true}
          onClose={closeModerationModal}
          user={modalTargetUser}
          onSuccess={fetchUsersList}
        />
      )}

    </AdminShell>
  );
}
