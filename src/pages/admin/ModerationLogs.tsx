import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Shield, Activity, Search, RefreshCw, 
  ChevronLeft, ChevronRight, FileText, 
  User, Calendar, Clock, ArrowRight 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import LoadingState from '../../components/ui/LoadingState';
import { toast } from 'react-hot-toast';
import { moderationService } from '../../services/moderationService';
import { useAuth } from '../../contexts/AuthContext';

// Local date format helper
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
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'N/A';
  }
}

export default function ModerationLogs() {
  const { can, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  if (authLoading) {
    return <LoadingState />;
  }

  if (!can('view_reports')) {
    return <Navigate to="/admin" replace />;
  }

  // Filters State
  const [actionType, setActionType] = useState<string>('All');
  const [adminId, setAdminId] = useState('');
  const [targetId, setTargetId] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    fetchLogs();
  }, [page, actionType]);

  const handleFilterChange = (field: 'action' | 'admin' | 'target', value: string) => {
    if (field === 'action') setActionType(value);
    if (field === 'admin') setAdminId(value);
    if (field === 'target') setTargetId(value);
    setPage(1); // Reset to first page
  };

  const triggerSearch = () => {
    if (page === 1) {
      fetchLogs();
    } else {
      setPage(1);
    }
  };

  const handleClear = () => {
    setActionType('All');
    setAdminId('');
    setTargetId('');
    setPage(1);
  };

  async function fetchLogs() {
    setLoading(true);
    try {
      const actionParam = actionType === 'All' ? null : (actionType.toLowerCase() as any);
      
      const result = await moderationService.getModerationLogs({
        page,
        pageSize,
        actionType: actionParam,
        adminId: adminId.trim() || null,
        targetId: targetId.trim() || null
      });

      // Response contains logs & total_count
      setLogs(result?.logs || []);
      setTotalCount(result?.total_count || 0);
    } catch (err) {
      console.error('Error listing moderation logs:', err);
      toast.error('Failed to decrypt audit logs.');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <AdminShell>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Oversight <span className="text-primary italic">Logs</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
              System Audit Trails & Irreversible Record Archives
            </p>
          </div>
          <button 
            onClick={handleClear}
            className="px-5 py-3.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl gap-4 flex flex-col xl:flex-row xl:items-end">
          {/* Action type dropdown */}
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Action protocols</label>
            <select
              value={actionType}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full bg-slate-950 text-xs font-bold uppercase border border-slate-850 rounded-xl px-4 py-3.5 text-slate-300 focus:border-primary outline-none"
            >
              <option value="All">All Actions</option>
              <option value="ban">BAN</option>
              <option value="suspend">SUSPEND</option>
              <option value="restore">RESTORE</option>
              <option value="soft_delete">SOFT DELETE</option>
              <option value="permanent_delete">PERMANENT DELETE</option>
              <option value="note">NOTE</option>
            </select>
          </div>

          {/* Admin ID filter input */}
          <div className="space-y-2 flex-1 min-w-[220px]">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Performing Operator (Admin / Mod Email/ID)</label>
            <input 
              type="text"
              placeholder="Filter by admin ID..."
              value={adminId}
              onChange={(e) => handleFilterChange('admin', e.target.value)}
              className="w-full bg-slate-950 text-xs font-bold border border-slate-850 rounded-xl px-4 py-3.5 text-slate-300 focus:border-primary outline-none"
            />
          </div>

          {/* Target ID filter input */}
          <div className="space-y-2 flex-1 min-w-[220px]">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Target Contender (User Email/ID)</label>
            <input 
              type="text"
              placeholder="Filter by target user ID..."
              value={targetId}
              onChange={(e) => handleFilterChange('target', e.target.value)}
              className="w-full bg-slate-950 text-xs font-bold border border-slate-850 rounded-xl px-4 py-3.5 text-slate-300 focus:border-primary outline-none"
            />
          </div>

          <button 
            onClick={triggerSearch}
            className="h-12 bg-primary text-black font-black uppercase italic tracking-widest text-[10px] px-8 rounded-xl hover:bg-white transition-all xl:w-auto w-full"
          >
            Decode Archives
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="card overflow-hidden border-white/5 bg-surface/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-1/12">Protocol</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operator (Admin)</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Target Contender</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-4/12">Explanation / Reason</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300 font-medium whitespace-nowrap">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-24">
                      <LoadingState message="Decrypting Global Audit Trails..." />
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((l) => {
                    let badgeClass = 'bg-slate-805 text-slate-400 border-slate-700';
                    const actType = (l.action_type || '').toLowerCase();
                    if (['ban'].includes(actType)) {
                      badgeClass = 'bg-red-500/10 text-red-500 border-red-500/20';
                    } else if (['suspend'].includes(actType)) {
                      badgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                    } else if (['restore'].includes(actType)) {
                      badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    } else if (['soft_delete'].includes(actType)) {
                      badgeClass = 'bg-slate-800 text-slate-400 border-slate-705';
                    } else if (['permanent_delete'].includes(actType)) {
                      badgeClass = 'bg-red-950 text-red-500 border-red-900';
                    } else if (['note'].includes(actType)) {
                      badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    }

                    return (
                      <tr key={l.id} className="hover:bg-white/5 transition-all">
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border block text-center",
                            badgeClass
                          )}>
                            {l.action_type || 'SYSTEM'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{l.admin_username || 'SYSTEM'}</span>
                            <span className="text-[9px] text-slate-600 font-mono tracking-tighter truncate max-w-[150px]" title={l.admin_id || 'N/A'}>
                              {l.admin_id ? l.admin_id.slice(0, 8) + '...' : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-primary font-bold">@{l.target_username || 'unknown'}</span>
                            <span className="text-[9px] text-slate-600 font-mono tracking-tighter truncate max-w-[150px]" title={l.target_id || 'N/A'}>
                              {l.target_id ? l.target_id.slice(0, 8) + '...' : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 leading-relaxed whitespace-pre-wrap max-w-xs xl:max-w-md font-mono text-[11px] text-slate-400">
                          "{l.reason || 'No details provided.'}"
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-slate-400">{formatLocalTime(l.created_at)}</span>
                            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black mt-0.5">{formatRelativeTime(l.created_at)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">
                      Zero historical operations decoded.
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
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount} log lines
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
    </AdminShell>
  );
}
