import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Shield, Users, Search, Plus, Trash2, Edit2, Loader2, X, Check, AlertTriangle, ShieldCheck, UserPlus, Info, Calendar, MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StaffMember {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  status: string;
  country_code: string | null;
  last_seen_at: string | null;
  permissions: any; // jsonb array
  permission_count: number;
  last_updated_at: string | null;
}

interface PermissionRegistry {
  key: string;
  label: string;
  description: string;
  category: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  moderation: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/25' },
  operations: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/25' },
  reporting: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/25' },
};

export default function StaffManagement() {
  const { profile, user } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionRegistry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1: Search player, 2: Toggles, 3: Notes & Confirm
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Permission Toggles State
  const [toggledPermissions, setToggledPermissions] = useState<Record<string, boolean>>({});
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirm Remove All
  const [revokingStaff, setRevokingStaff] = useState<StaffMember | null>(null);
  const [revokingAllLoading, setRevokingAllLoading] = useState(false);

  const isFullAdmin = profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'danieloguda11221@gmail.com';

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('v_staff_directory')
        .select('*');
      if (error) throw error;
      setStaffList(data || []);
    } catch (err: any) {
      console.error('Error fetching staff directory:', err);
      toast.error('Failed to load staff list');
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_registry')
        .select('key, label, description, category')
        .order('category, key');
      if (error) throw error;
      setAllPermissions(data || []);
    } catch (err: any) {
      console.error('Error fetching permission registry:', err);
      toast.error('Failed to load permissions registry');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStaff(), fetchPermissions()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isFullAdmin) {
      loadData();

      // Subscribe to real-time changes
      const channel = supabase
        .channel('staff-directory-sync')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'staff_permissions',
        }, () => {
          fetchStaff();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isFullAdmin]);

  // Player search logic
  useEffect(() => {
    if (step !== 1 || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, role, status')
          .ilike('username', `%${searchQuery}%`)
          .eq('status', 'active')
          .neq('role', 'admin') // admins don't need permissions
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err: any) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, step]);

  const handleOpenAssignModal = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setToggledPermissions({});
    setInitialPermissions([]);
    setNotes('');
    setStep(1);
    setShowModal(true);
  };

  const handleOpenEditModal = (staff: StaffMember) => {
    setSelectedUser({
      id: staff.user_id,
      username: staff.username,
      avatar_url: staff.avatar_url,
      role: staff.role
    });
    
    // Parse permissions from staff list row
    const permsList = Array.isArray(staff.permissions) ? staff.permissions : [];
    const keys = permsList.map((p: any) => typeof p === 'string' ? p : p?.permission || p?.key);
    
    const prechecked: Record<string, boolean> = {};
    allPermissions.forEach(p => {
      prechecked[p.key] = keys.includes(p.key);
    });

    setToggledPermissions(prechecked);
    setInitialPermissions(keys);
    setNotes('');
    setStep(2); // Skip search
    setShowModal(true);
  };

  const handleSelectUser = async (userRecord: any) => {
    setSelectedUser(userRecord);
    setNotes('');

    // Fetch existing permissions for this user to pre-populate toggles
    try {
      const { data, error } = await supabase
        .from('staff_permissions')
        .select('permission')
        .eq('user_id', userRecord.id);

      if (error) throw error;

      const keys = (data || []).map((p: any) => p.permission);
      const prechecked: Record<string, boolean> = {};
      allPermissions.forEach(p => {
        prechecked[p.key] = keys.includes(p.key);
      });

      setToggledPermissions(prechecked);
      setInitialPermissions(keys);
      setStep(2);
    } catch (err) {
      console.error('Failed to load user permissions:', err);
      toast.error('Could not load user permissions');
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    const keysToGrant = allPermissions
      .filter(p => toggledPermissions[p.key] && !initialPermissions.includes(p.key))
      .map(p => p.key);

    const keysToRevoke = allPermissions
      .filter(p => !toggledPermissions[p.key] && initialPermissions.includes(p.key))
      .map(p => p.key);

    try {
      const promises = [];

      // Call RPC grant functions
      for (const key of keysToGrant) {
        promises.push(
          (supabase as any).rpc('grant_permission', {
            p_target_user_id: selectedUser.id,
            p_permission: key,
            p_notes: notes.trim() || null
          })
        );
      }

      // Call RPC revoke functions
      for (const key of keysToRevoke) {
        promises.push(
          (supabase as any).rpc('revoke_permission', {
            p_target_user_id: selectedUser.id,
            p_permission: key
          })
        );
      }

      const results = await Promise.all(promises);

      // Check errors in results
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        const firstError = errors[0].error;
        if (firstError.message?.includes('PERMISSION_DENIED')) {
          toast.error('Only admins can manage staff permissions');
        } else if (firstError.message?.includes('SELF_GRANT_DENIED')) {
          toast.error('You cannot assign permissions to yourself');
        } else if (firstError.message?.includes('ADMIN_GRANT_DENIED')) {
          toast.error('You cannot grant permissions to administrators');
        } else {
          toast.error(firstError.message || 'Failed to apply permissions');
        }
        throw firstError;
      }

      toast.success('Permissions updated successfully!');
      await fetchStaff();
      setShowModal(false);
    } catch (err: any) {
      console.error('Failed to update permissions:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!revokingStaff) return;
    setRevokingAllLoading(true);

    try {
      const { error } = await (supabase as any).rpc('revoke_all_permissions', {
        p_target_user_id: revokingStaff.user_id
      });

      if (error) throw error;

      toast.success(`Revoked all permissions from ${revokingStaff.username}`);
      await fetchStaff();
      setRevokingStaff(null);
    } catch (err: any) {
      console.error('Revoke all failed:', err);
      toast.error(err.message || 'Failed to revoke permissions');
    } finally {
      setRevokingAllLoading(false);
    }
  };

  const formatRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const now = Date.now();
    const date = new Date(isoString).getTime();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  };

  if (!isFullAdmin) {
    return (
      <AdminShell>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-slate-900/40 border border-slate-800/60 rounded-3xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-black italic uppercase text-white mb-2">Permission Denied</h2>
          <p className="text-sm text-slate-400">Only administrators are authorized to manage staff permissions.</p>
        </div>
      </AdminShell>
    );
  }

  // Helper to extract keys safely
  const getPermissionKeys = (staff: StaffMember) => {
    const permsList = Array.isArray(staff.permissions) ? staff.permissions : [];
    return permsList.map((p: any) => typeof p === 'string' ? p : p?.permission || p?.key);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-[#0d0f26]/90 border border-slate-800/50 rounded-2xl">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white flex items-center gap-2.5">
              <Shield className="w-8 h-8 text-primary" />
              Staff Management
            </h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Grant permissions, configure moderator profiles, and audit system credentials
            </p>
          </div>

          <button
            onClick={handleOpenAssignModal}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md self-start sm:self-center"
          >
            <UserPlus className="w-4 h-4" />
            Assign Staff
          </button>
        </div>

        {/* Staff Directory Card */}
        <div className="bg-[#0d0f26]/60 border border-slate-800/40 rounded-2xl p-6 md:p-8">
          <h2 className="text-lg font-black italic uppercase tracking-wider text-white mb-6">
            Current Staff Directory
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs uppercase font-black tracking-widest text-slate-500">Querying staff registries...</span>
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/20">
              <Users className="w-12 h-12 text-slate-650 mx-auto mb-3" />
              <h3 className="text-base font-black italic uppercase text-slate-300">No Custom Staff Members</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto uppercase tracking-wide">
                Assign roles and custom moderator permissions to your players using the Assign Staff action
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {staffList.map((staff) => {
                const permsKeys = getPermissionKeys(staff);
                return (
                  <div 
                    key={staff.user_id}
                    className="flex flex-col justify-between p-5 bg-[#0e102b]/95 border border-slate-800/80 rounded-2xl hover:border-slate-700/50 transition-all shadow-sm"
                  >
                    <div>
                      {/* Staff Header Info */}
                      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/40">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img 
                              src={staff.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${staff.username}`}
                              alt={staff.username}
                              className="w-11 h-11 rounded-xl object-cover bg-slate-800 border border-slate-700/50"
                              referrerPolicy="no-referrer"
                            />
                            {staff.last_seen_at && (Date.now() - new Date(staff.last_seen_at).getTime() < 300000) ? (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0e102b]" title="Online" />
                            ) : (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-600 border-2 border-[#0e102b]" title="Offline" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-black italic text-base text-white uppercase tracking-tight flex items-center gap-1.5 leading-none">
                              {staff.username}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded border border-primary/20">
                                {staff.role}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                Seen {formatRelativeTime(staff.last_seen_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Permissions Chips */}
                      <div className="py-4 space-y-2.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 block">
                          Granted Credentials ({permsKeys.length})
                        </span>
                        {permsKeys.length === 0 ? (
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider italic py-1">
                            No custom permissions assigned yet.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {allPermissions
                              .filter(p => permsKeys.includes(p.key))
                              .map(p => {
                                const config = CATEGORY_COLORS[p.category] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
                                return (
                                  <span 
                                    key={p.key}
                                    title={p.description}
                                    className={`px-2.5 py-1 ${config.bg} ${config.text} ${config.border} border text-[10px] font-bold uppercase tracking-wide rounded-lg flex items-center gap-1 shadow-sm cursor-help`}
                                  >
                                    <ShieldCheck className="w-3 h-3" />
                                    {p.label}
                                  </span>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/40 mt-2">
                      <button
                        onClick={() => handleOpenEditModal(staff)}
                        className="flex items-center gap-1 px-3 py-2 hover:bg-slate-800/50 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setRevokingStaff(staff)}
                        className="flex items-center gap-1 px-3 py-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove All
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ASSIGN / EDIT STAFF MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0b0c1e] border-2 border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800/60">
              <h3 className="text-lg font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {initialPermissions.length > 0 ? 'Edit Permissions' : 'Assign Staff Member'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicators */}
            {initialPermissions.length === 0 && (
              <div className="flex border-b border-slate-850 bg-[#0e1026]/40 px-6 py-3">
                <div className={`flex items-center space-x-2 text-xs font-black uppercase tracking-wider ${step === 1 ? 'text-primary' : 'text-slate-500'}`}>
                  <span>1. Player Profile</span>
                </div>
                <div className="w-6 h-px bg-slate-850 self-center mx-4" />
                <div className={`flex items-center space-x-2 text-xs font-black uppercase tracking-wider ${step === 2 ? 'text-primary' : 'text-slate-500'}`}>
                  <span>2. Assign Credentials</span>
                </div>
              </div>
            )}

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* STEP 1: PLAYER PROFILE SEARCH */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Gamers Registry</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search by gamer username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#111228] border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-white text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  {searching ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/20 max-h-[250px] overflow-y-auto">
                      {searchResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectUser(p)}
                          className="flex items-center justify-between p-4 border-b border-slate-900/60 hover:bg-slate-800/45 cursor-pointer transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <img 
                              src={p.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${p.username}`}
                              alt={p.username}
                              className="w-9 h-9 rounded-lg object-cover bg-slate-800 border border-slate-700/50"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-black italic text-sm text-white uppercase tracking-tight">@{p.username}</span>
                              <span className="block text-[10px] font-bold text-slate-500 uppercase mt-0.5">{p.role}</span>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.trim() ? (
                    <div className="text-center py-10 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      No active players found matching codename
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl flex items-start gap-3">
                      <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-normal uppercase tracking-wide">
                        Please query an existing, active user who has completed profile registration to assign staff permissions. Admin roles cannot be managed as they possess full system access by default.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: CREDENTIAL ASSIGNMENT */}
              {step === 2 && selectedUser && (
                <div className="space-y-6">
                  {/* Selected Gamer Banner */}
                  <div className="flex items-center space-x-3 p-4 bg-[#0e1026] border border-slate-800 rounded-xl">
                    <img 
                      src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedUser.username}`}
                      alt={selectedUser.username}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700/50"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="font-black italic text-sm text-white uppercase tracking-tight">Selected: @{selectedUser.username}</span>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mt-0.5">{selectedUser.role}</span>
                    </div>
                    {initialPermissions.length === 0 && (
                      <button
                        onClick={() => setStep(1)}
                        className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  {/* Permissions Selection grouped by Category */}
                  <div className="space-y-6">
                    {['moderation', 'operations', 'reporting'].map((cat) => {
                      const filtered = allPermissions.filter(p => p.category === cat);
                      if (filtered.length === 0) return null;

                      const colors = CATEGORY_COLORS[cat] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };

                      return (
                        <div key={cat} className="space-y-3">
                          <span className={`inline-block px-2.5 py-1 ${colors.bg} ${colors.text} ${colors.border} border text-[10px] font-black uppercase tracking-widest rounded-lg`}>
                            {cat} Division
                          </span>

                          <div className="space-y-2.5">
                            {filtered.map(p => (
                              <label
                                key={p.key}
                                className={`flex items-start gap-3.5 p-4 bg-[#111228]/60 border rounded-2xl cursor-pointer transition-all hover:bg-slate-800/20 ${toggledPermissions[p.key] ? 'border-primary/30 shadow-[0_0_15px_rgba(0,209,255,0.02)] bg-primary/5' : 'border-slate-800/80'}`}
                              >
                                <div className="relative flex items-center mt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={toggledPermissions[p.key] || false}
                                    onChange={(e) => {
                                      setToggledPermissions(prev => ({
                                        ...prev,
                                        [p.key]: e.target.checked
                                      }));
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${toggledPermissions[p.key] ? 'bg-primary border-primary' : 'border-slate-700 bg-slate-900'}`}>
                                    {toggledPermissions[p.key] && <Check className="w-3.5 h-3.5 text-black stroke-[3.5px]" />}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-bold text-sm text-white uppercase tracking-wider block">{p.label}</span>
                                  <span className="text-[11px] text-slate-400 leading-normal font-medium mt-1 block">{p.description}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Assignment Reason (Auditable Ledger Notes)
                    </label>
                    <textarea
                      placeholder="Brief notes detailing the assignment of permissions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-[#111228] border border-slate-800 rounded-xl p-3.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-white text-xs font-semibold transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800/60 flex items-center justify-end gap-3 bg-slate-950/20">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="px-4 py-3 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              {step === 2 && (
                <button
                  onClick={handleConfirmAssign}
                  disabled={submitting}
                  className="px-5 py-3.5 bg-primary hover:bg-primary-dark text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      Saving...
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    </>
                  ) : (
                    <>
                      Apply Permissions
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REMOVE ALL CONFIRM DIALOG */}
      {revokingStaff && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0b0c1e] border-2 border-red-500/20 rounded-3xl p-8 text-center shadow-2xl relative">
            
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle className="w-7 h-7" />
              </div>
            </div>

            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">
              Revoke All Credentials?
            </h3>
            <p className="text-[10px] text-red-400 font-black uppercase tracking-widest block mb-4">
              Security Override Action
            </p>

            <p className="text-xs text-slate-450 leading-relaxed uppercase tracking-wider mb-6">
              Are you absolutely sure you want to revoke all moderator credentials from <span className="text-white font-extrabold">@{revokingStaff.username}</span>? They will lose all access to staff portals and operations pages immediately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setRevokingStaff(null)}
                disabled={revokingAllLoading}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-750/30 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeAll}
                disabled={revokingAllLoading}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {revokingAllLoading ? (
                  <>
                    Revoking...
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </>
                ) : (
                  <>
                    Revoke All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
