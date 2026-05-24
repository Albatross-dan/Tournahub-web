import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { platformService } from '../../services/platformService';
import { usePlatformStatus } from '../../contexts/PlatformStatusContext';
import toast from 'react-hot-toast';
import AdminShell from '../../components/layout/AdminShell';
import { 
  Loader2, Wrench, Megaphone, AlertTriangle, 
  ShieldAlert, Activity, CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminPlatform() {
  const { status: globalStatus, checkStatus } = usePlatformStatus();
  const { user } = useAuth();
  
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndEstimate, setMaintenanceEndEstimate] = useState('');
  const [maintenanceScheduledAt, setMaintenanceScheduledAt] = useState('');
  
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfirmToggle, setShowConfirmToggle] = useState<boolean | null>(null); // true = confirm enable, false = confirm disable
  
  // Announcement states
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'high' | 'urgent'>('urgent');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Helper formats
  const toLocalInputFormat = (isoString: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (err) {
      return '';
    }
  };

  const toUTCISOString = (inputValue: string): string | null => {
    if (!inputValue) return null;
    try {
      const d = new Date(inputValue);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch (err) {
      return null;
    }
  };

  // Sync state with global polled state
  useEffect(() => {
    if (globalStatus) {
      setMaintenanceMode(globalStatus.maintenance_mode);
      setMaintenanceMessage(globalStatus.maintenance_message || '');
      setMaintenanceEndEstimate(toLocalInputFormat(globalStatus.maintenance_end_estimate));
      setMaintenanceScheduledAt(toLocalInputFormat(globalStatus.maintenance_scheduled_at));
    }
  }, [globalStatus]);

  return (
    <AdminShell>
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none flex items-center gap-3">
            Platform <span className="text-primary italic">Oversight</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-3 flex items-center">
            <Activity className="w-3 h-3 mr-2 text-primary animate-pulse" />
            Central Controls, Gatekeeper Gates & System Comms
          </p>
        </div>

        {/* PLATFORM CONFIGURATION & BROADCAST CONTROL CENTER */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CARD 1: Maintenance Control Panel */}
          <div className="card p-8 border-white/5 bg-slate-900/40 relative flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                    <span className="text-amber-500">🔧</span> Maintenance Mode Config
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Schedule downtime and restrict client entry
                  </p>
                </div>
                
                {/* Status Indicator */}
                <div className="text-right">
                  {!globalStatus ? (
                    <span className="text-xs text-slate-500 font-black animate-pulse uppercase tracking-wider">Syncing status...</span>
                  ) : globalStatus.maintenance_mode ? (
                    <span className="inline-flex items-center px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg animate-pulse">
                      🔴 MAINTENANCE ACTIVE
                    </span>
                  ) : globalStatus.upcoming_maintenance ? (
                    <span className="inline-flex items-center px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      🟡 SCHEDULED MAINTENANCE
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      🟢 PLATFORM IS LIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Sub status subtitle */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-white/[0.02] text-xs font-semibold text-slate-400 mb-6">
                {(!globalStatus) ? (
                  "Retrieving central configuration..."
                ) : globalStatus.maintenance_mode ? (
                  "🔴 Maintenance Mode Active: non-admin users are blockaded from access."
                ) : globalStatus.upcoming_maintenance ? (
                  `🟡 Scheduled maintenance warning active for ${globalStatus.maintenance_scheduled_at ? new Date(globalStatus.maintenance_scheduled_at).toLocaleString() : ''}`
                ) : (
                  "🟢 Platform is Live: all users have full operational access."
                )}
              </div>

              {/* Instant Toggle Control */}
              <div className="flex items-center justify-between p-4 bg-slate-950/20 rounded-2xl border border-white/5 mb-6">
                <div className="space-y-0.5">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Operational Gate Toggle</span>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Instant override. Triggers confirmation dialog.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) return;
                    setShowConfirmToggle(!maintenanceMode);
                  }}
                  className={cn(
                    "px-5 py-2.5 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all shadow-md cursor-pointer",
                    maintenanceMode 
                      ? "bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20" 
                      : "bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                >
                  {maintenanceMode ? "● Maintenance ON" : "● Live Mode"}
                </button>
              </div>

              {/* Text Messages & Date inputs form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Maintenance Message (Shown to users)
                  </label>
                  <textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    rows={3}
                    placeholder="TournaHub is currently undergoing scheduled maintenance..."
                    className="w-full bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      Estimated Back Online (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={maintenanceEndEstimate}
                      onChange={(e) => setMaintenanceEndEstimate(e.target.value)}
                      className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      Schedule Warning Banner (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={maintenanceScheduledAt}
                      onChange={(e) => setMaintenanceScheduledAt(e.target.value)}
                      className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save changes action */}
            <div className="mt-8 pt-6 border-t border-white/[0.03]">
              <button
                type="button"
                onClick={async () => {
                  if (!user) return;
                  setSavingConfig(true);
                  try {
                    const resMsg = await platformService.setMaintenanceMessage(user.id, maintenanceMessage);
                    if (resMsg?.error) {
                      toast.error(`Message saving error: ${resMsg.error}`);
                      return;
                    }

                    const endEstimIso = toUTCISOString(maintenanceEndEstimate);
                    const resEnd = await platformService.setMaintenanceEndEstimate(user.id, endEstimIso);
                    if (resEnd?.error) {
                      toast.error(`End expectation saving error: ${resEnd.error}`);
                      return;
                    }

                    const schedAtIso = toUTCISOString(maintenanceScheduledAt);
                    const resSched = await platformService.setMaintenanceScheduledAt(user.id, schedAtIso);
                    if (resSched?.error) {
                      toast.error(`Schedule banner saving error: ${resSched.error}`);
                      return;
                    }

                    toast.success("✓ Platform status updated");
                    await checkStatus();
                  } catch (err: any) {
                    toast.error(err.message || "An exception occurred while updating configurations");
                  } finally {
                    setSavingConfig(false);
                  }
                }}
                disabled={savingConfig}
                className="w-full relative group overflow-hidden rounded-2xl cursor-pointer disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-primary" />
                <div className="relative h-12 flex items-center justify-center space-x-2">
                  {savingConfig ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                  ) : (
                    <span className="text-slate-900 text-xs font-black italic uppercase tracking-wider">
                      Save Maintenance Settings
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Confirmation Modals for Toggle */}
            {showConfirmToggle !== null && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center rounded-[1.5rem]">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/20 mb-4 animate-bounce">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black italic uppercase text-slate-100 tracking-wider mb-2">
                  Admin Confirmation Required
                </h4>
                <p className="text-[11px] text-slate-400 font-semibold mb-6 max-w-xs leading-relaxed">
                  {showConfirmToggle 
                    ? "You are about to enable maintenance mode. All non-admin users will immediately see the maintenance screen and cannot use the app. Continue?" 
                    : "Are you sure you want to disable maintenance mode? All registered players will regain full real-time access to the platform."
                  }
                </p>
                <div className="flex space-x-3 w-full max-w-xs justify-center font-bold">
                  <button
                    onClick={() => setShowConfirmToggle(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      const targetVal = showConfirmToggle;
                      setShowConfirmToggle(null);
                      setSavingConfig(true);
                      try {
                        const res = await platformService.setMaintenanceMode(user.id, targetVal);
                        if (res?.error) {
                          toast.error(`Toggle error: ${res.error}`);
                        } else {
                          toast.success(`✓ Maintenance mode is now ${targetVal ? 'ENABLED' : 'DISABLED'}`);
                          await checkStatus();
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Failed to toggle mode");
                      } finally {
                        setSavingConfig(false);
                      }
                    }}
                    className="px-4 py-2 bg-primary hover:opacity-90 text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    {showConfirmToggle ? "Enable Maintenance" : "Disable & Go Live"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: Send Announcement Section */}
          <div className="card p-8 border-white/5 bg-slate-900/40 relative flex flex-col justify-between">
            <div>
              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                  <span className="text-blue-500">📢</span> Broadcast Messages
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Dispatch real-time notification alerts to all participants
                </p>
              </div>

              <div className="space-y-4">
                {/* Title field */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Maintenance Over / Huge Tournament Added..."
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1"
                  />
                </div>

                {/* Message field */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Message Content
                  </label>
                  <textarea
                    maxLength={500}
                    rows={3}
                    placeholder="Please note that TournaHub has upgraded matches. Check out the latest lobbies..."
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-white text-xs font-semibold mt-1 resize-none"
                  />
                </div>

                {/* Priority Selector */}
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Priority Level
                  </span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {(['normal', 'high', 'urgent'] as const).map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => setAnnPriority(pr)}
                        className={cn(
                          "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-all",
                          annPriority === pr 
                            ? pr === 'urgent' 
                              ? 'bg-red-500/10 border-red-500/50 text-red-400 font-extrabold' 
                              : pr === 'high' 
                                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 font-extrabold'
                                : 'bg-slate-700 border-slate-600 text-slate-200 font-extrabold'
                            : 'bg-slate-950/20 border-white/5 text-slate-400 hover:bg-white/5'
                        )}
                      >
                        {pr === 'urgent' ? '🚨 Urgent' : pr === 'high' ? '📢 High' : '🔔 Normal'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Interactive Preview Box */}
                <div className="space-y-1 bg-slate-950/20 p-4 border border-white/[0.02] rounded-2xl">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Player Preview</span>
                  
                  {annPriority === 'normal' ? (
                    <p className="text-[11px] italic font-semibold text-slate-400 uppercase tracking-widest mt-1">
                      💭 Will appear in notification bell only.
                    </p>
                  ) : annPriority === 'high' ? (
                    <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-blue-200 rounded-lg text-xs font-semibold leading-normal">
                      📢 <strong className="text-blue-300 font-black uppercase tracking-wide">
                        {annTitle || 'Title Placeholder'}
                      </strong>: {annBody ? (annBody.length > 120 ? annBody.substring(0, 120) + '...' : annBody) : 'Truncated message content placeholder will sit here'}
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-200">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <h4 className="text-xs font-black italic uppercase text-red-400 tracking-wider">
                            🚨 {annTitle || 'Title Placeholder'}
                          </h4>
                          <p className="text-[11px] font-medium leading-relaxed text-red-300 mt-1">
                            {annBody || 'This is the full announcement message content. It does not suffer from truncation and is persistent until explicitly marked as read by the player.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Broadcast button */}
            <div className="mt-8 pt-6 border-t border-white/[0.03]">
              <button
                type="button"
                disabled={sendingAnnouncement || !annTitle || !annBody}
                onClick={() => {
                  if (annTitle.trim().length < 3 || annTitle.trim().length > 100) {
                    toast.error("Title must be between 3 and 100 characters");
                    return;
                  }
                  if (annBody.trim().length < 10 || annBody.trim().length > 500) {
                    toast.error("Message must be between 10 and 500 characters");
                    return;
                  }
                  setShowConfirmSend(true);
                }}
                className="w-full relative group overflow-hidden rounded-2xl cursor-pointer disabled:opacity-40"
              >
                <div className="absolute inset-0 bg-primary" />
                <div className="relative h-12 flex items-center justify-center space-x-2">
                  {sendingAnnouncement ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                  ) : (
                    <span className="text-slate-900 text-xs font-black italic uppercase tracking-wider">
                      Send to All Users
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Confirmation pop-over for Sending */}
            {showConfirmSend && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center rounded-[1.5rem]">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center border border-blue-500/20 mb-4 animate-bounce">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black italic uppercase text-slate-100 tracking-wider mb-2">
                  Confirm Broadcast Distribution
                </h4>
                <p className="text-[11px] text-slate-400 font-semibold mb-6 max-w-xs leading-relaxed">
                  Send this announcement to ALL registered users on TournaHub?<br />
                  Priority: <span className="text-primary font-black uppercase italic tracking-wider">{annPriority}</span>.<br />
                  <span className="text-red-400 font-bold">This operation cannot be unsent.</span>
                </p>
                <div className="flex space-x-3 w-full max-w-xs justify-center font-bold">
                  <button
                    onClick={() => setShowConfirmSend(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowConfirmSend(false);
                      setSendingAnnouncement(true);
                      try {
                        await platformService.sendAnnouncement(annTitle.trim(), annBody.trim(), annPriority);
                        toast.success("✓ Announcement sent to all users");
                        setAnnTitle('');
                        setAnnBody('');
                      } catch (err: any) {
                        toast.error(err.message || "Failed to broadcast announcement");
                      } finally {
                        setSendingAnnouncement(false);
                      }
                    }}
                    className="px-4 py-2 bg-primary hover:opacity-90 text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Send Announcement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
