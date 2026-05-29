import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Shell from '../components/layout/Shell';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trophy, Flame, Zap, Shield, AlertTriangle, Clock, 
  ChevronDown, ArrowLeft, Gamepad2, Globe, HelpCircle, Mail,
  List, CheckCircle, Smartphone, Sliders, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Rules() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeAccordion, setActiveAccordion] = useState<string | null>('general');

  const logoUrl = '/android-chrome-512x512.png';
  const SUPPORT_EMAIL = 'mailto:support@tournahub.me';
  const COMMUNITY_WHATSAPP = 'https://whatsapp.com/channel/0029Vb7nKTkK5cDClzvMYT1Z';

  const toggleAccordion = (section: string) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };

  const PageHeader = () => (
    <div className="space-y-4 text-center max-w-3xl mx-auto mb-10 pt-4 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-[#d4af37]"
      >
        <Shield className="w-3.5 h-3.5" /> Official Rulebook
      </motion.div>
      <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-white">
        Tournament <span className="text-[#d4af37]">Rules & Guidelines</span>
      </h1>
      <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
        Please read all rules carefully before joining any tournament. By participating, every player agrees to follow all rules and regulations below.
      </p>
    </div>
  );

  const AccordionHeader = ({ id, title, icon: Icon, colorClass, subtitle }: { id: string; title: string; icon: any; colorClass: string; subtitle?: string }) => {
    const isOpen = activeAccordion === id;
    return (
      <button
        onClick={() => toggleAccordion(id)}
        className={`w-full flex items-center justify-between p-5 bg-[#0e101f] hover:bg-[#14172f] border-b border-white/5 text-left transition-all relative ${
          isOpen ? 'bg-[#121633]' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black italic uppercase tracking-wide text-white flex items-center gap-2">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-zinc-500 font-mono mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-500 hover:text-white"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>
    );
  };

  const rulesContent = (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      
      {/* 1. MATCH SETTINGS */}
      <div className="border border-white/5 rounded-2xl overflow-hidden shadow-xl bg-[#090a14]">
        <AccordionHeader
          id="match-settings"
          title="⚽ TOURNAMENT MATCH SETTINGS"
          icon={Gamepad2}
          colorClass="text-[#ffd700]"
          subtitle="Configurations for Leagues, Knockouts & Group stages in Tournahub"
        />
        <AnimatePresence initial={false}>
          {activeAccordion === 'match-settings' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-6 space-y-8 bg-[#090a14] border-t border-white/5 divide-y divide-white/5">
                
                {/* League Match Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sky-400 font-black italic tracking-wider text-sm">
                    <span className="w-2.5 h-2.5 rounded bg-sky-500" />
                    🟦 LEAGUE MATCH SETTINGS
                  </div>
                  <div className="bg-[#0b0d1e] border border-sky-500/10 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#d4af37] font-black mb-3">
                      Match Configuration
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300 font-medium">
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Match Type: <strong className="text-white ml-1">Standard</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Match Time: <strong className="text-white ml-1">6 Minutes</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Injuries: <strong className="text-white ml-1">No</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Extra Time: <strong className="text-white ml-1">No</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Penalties: <strong className="text-white ml-1">No</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Substitutions: <strong className="text-white ml-1">6 Substitutions</strong></li>
                      <li className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-zinc-400 pt-1 border-t border-white/5 font-mono text-[11px]">
                        <Sliders className="w-3.5 h-3.5 text-sky-400" /> Condition: Excellent (Home & Away)
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Knockout Match Settings */}
                <div className="space-y-4 pt-6">
                  <div className="flex items-center gap-2 text-rose-500 font-black italic tracking-wider text-sm">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                    🟥 KNOCKOUT MATCH SETTINGS
                  </div>
                  <div className="bg-[#0b0d1e] border border-rose-500/10 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#d4af37] font-black mb-3">
                      Match Configuration
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300 font-medium">
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Match Type: <strong className="text-white ml-1">Standard</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Match Time: <strong className="text-white ml-1">6 Minutes</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Injuries: <strong className="text-white ml-1">No</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Extra Time: <strong className="text-white ml-1">Yes</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Penalties: <strong className="text-white ml-1">Yes</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Substitutions: <strong className="text-white ml-1">6 Substitutions</strong></li>
                      <li className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-zinc-400 pt-1 border-t border-white/5 font-mono text-[11px]">
                        <Sliders className="w-3.5 h-3.5 text-rose-500" /> Condition: Excellent (Home & Away)
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Group Stage Match Settings */}
                <div className="space-y-4 pt-6">
                  <div className="flex items-center gap-2 text-amber-500 font-black italic tracking-wider text-sm">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    🟨 GROUP STAGE MATCH SETTINGS
                  </div>
                  <div className="bg-[#0b0d1e] border border-amber-500/10 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#d4af37] font-black mb-3">
                      Match Configuration
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300 font-medium">
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Match Type: <strong className="text-white ml-1">Standard</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Match Time: <strong className="text-white ml-1">6 Minutes</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Injuries: <strong className="text-white ml-1">No</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Extra Time: <strong className="text-white ml-1">No</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Penalties: <strong className="text-white ml-1">No</strong></li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Substitutions: <strong className="text-white ml-1">6 Substitutions</strong></li>
                      <li className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-zinc-400 pt-1 border-t border-white/5 font-mono text-[11px]">
                        <Sliders className="w-3.5 h-3.5 text-amber-500" /> Condition: Excellent (Home & Away)
                      </li>
                    </ul>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. GENERAL TOURNAMENT RULES */}
      <div className="border border-white/5 rounded-2xl overflow-hidden shadow-xl bg-[#090a14]">
        <AccordionHeader
          id="general"
          title="📜 GENERAL TOURNAMENT RULES"
          icon={List}
          colorClass="text-[#10b981]"
          subtitle="Match Participation, Result Submission, Disconnection rules and streams"
        />
        <AnimatePresence initial={false}>
          {activeAccordion === 'general' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-6 space-y-6 bg-[#090a14] border-t border-white/5">
                
                {/* 1. Match Participation */}
                <div className="p-5 bg-white/2 rounded-xl border border-white/5 space-y-2.5">
                  <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#10b981]/15 text-[#10b981] flex items-center justify-center text-xs font-mono font-bold">1</span>
                    Match Participation
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-zinc-300 space-y-2 font-medium">
                    <li>Every player must play their scheduled match at the allocated time on Tournahub.</li>
                    <li>Failure to play a scheduled match will result in an automatic loss.</li>
                    <li>The opponent will automatically be awarded the win.</li>
                    <li>Repeating this offense 3 times may lead to account suspension or profile banning.</li>
                  </ul>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs mt-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wide text-[10px] text-rose-300">🚫 Consequences</span>
                      Straight Loss • Repeated offenses may result in permanent account banning on the network.
                    </div>
                  </div>
                </div>

                {/* 2. Result Submission */}
                <div className="p-5 bg-white/2 rounded-xl border border-white/5 space-y-2.5">
                  <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#10b981]/15 text-[#10b981] flex items-center justify-center text-xs font-mono font-bold">2</span>
                    Result Submission
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-zinc-300 space-y-2 font-medium">
                    <li>Results must be submitted before the official tournament deadline.</li>
                    <li>Submit results immediately after the match to avoid match abandonment.</li>
                    <li>Fake, misleading, or edited results are strictly prohibited.</li>
                    <li>Both players are required to submit match results for smooth automatic approval.</li>
                  </ul>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs mt-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wide text-[10px] text-amber-300">🚫 Submission Rules</span>
                      If one player submits results and the opponent fails to submit before the deadline, the submitted result may be automatically approved by the system. Submitting fake/edited results leads to automatic account banning.
                    </div>
                  </div>
                </div>

                {/* 3. Punctuality & Tournament Commitment */}
                <div className="p-5 bg-white/2 rounded-xl border border-white/5 space-y-2.5">
                  <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#10b981]/15 text-[#10b981] flex items-center justify-center text-xs font-mono font-bold">3</span>
                    Punctuality & Tournament Commitment
                  </h4>
                  <p className="text-xs text-zinc-400 font-semibold mb-2">
                    Read all tournament information carefully before joining, including:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-zinc-300 space-y-1.5 font-medium">
                    <li>Tournament format (e.g. Single Elimination or League)</li>
                    <li>Rules & match specifications</li>
                    <li>Entry fees & prize distribution information</li>
                    <li><strong className="text-white">Notice:</strong> Once you join a tournament, cancellation is not allowed.</li>
                    <li>Players are expected to keep time and remain competitive throughout the tournament.</li>
                  </ul>
                </div>

                {/* 4. Network Issues & Match Disconnections */}
                <div className="p-5 bg-white/2 rounded-xl border border-white/5 space-y-4">
                  <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#10b981]/15 text-[#10b981] flex items-center justify-center text-xs font-mono font-bold">4</span>
                    Network Issues & Match Disconnections
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-sky-500/5 border border-sky-500/10 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase">
                        <Globe className="w-3.5 h-3.5" /> 🌐 Internet Requirements
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal font-medium">
                        Use a stable and reliable internet connection. Lagging, quitting, or intentional disconnection may result in automatic loss. Avoid cancelling matches by any means.
                      </p>
                    </div>

                    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-rose-400 uppercase">
                        <AlertTriangle className="w-3.5 h-3.5" /> ❌ Match Forfeit
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal font-medium">
                        Any player who forfeits a match automatically loses the game, even if they were leading.
                      </p>
                    </div>
                  </div>

                  {/* IN GAME DISCONNECTION RULES CONTAINER */}
                  <div className="bg-[#0b0d1e] rounded-xl p-5 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black italic tracking-wider text-[#d4af37]">
                      <Clock className="w-4 h-4 text-[#d4af37]" />
                      🎮 IN-GAME DISCONNECTION RULES
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="border border-white/5 rounded-lg p-3.5 space-y-1 bg-white/1">
                        <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded uppercase">⏱️ 0' – 15' Minute</span>
                        <p className="text-[11px] text-zinc-300 font-semibold leading-normal">
                          If the score is <span className="text-white font-extrabold">0–0</span> or <span className="text-white font-extrabold">1–0</span>:
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          The match must be replayed immediately. No rescheduling allowed.
                        </p>
                      </div>

                      <div className="border border-white/5 rounded-lg p-3.5 space-y-1 bg-white/1">
                        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded uppercase">⏱️ 15' – 45' Minute</span>
                        <p className="text-[11px] text-zinc-300 font-semibold leading-normal">
                          Any player responsible for the network issue or disconnection loses the match, regardless of the score.
                        </p>
                      </div>

                      <div className="border border-white/5 rounded-lg p-3.5 space-y-1 bg-white/1">
                        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded uppercase">⏱️ 46' – 80' Minute</span>
                        <p className="text-[11px] text-zinc-300 font-semibold leading-normal">
                          Any player causing the network issue loses the match, regardless of the scorecard.
                        </p>
                      </div>

                      <div className="border border-white/5 rounded-lg p-3.5 space-y-1 bg-white/1">
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase">⏱️ Beyond 85' Minute</span>
                        <p className="text-[11px] text-zinc-300 font-semibold leading-normal">
                          If the goal difference is 4 goals or more, the current score will stand.
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium font-mono">
                          📸 Clear screenshots must be uploaded as evidence.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Stream Link Rules */}
                <div className="p-5 bg-white/2 rounded-xl border border-white/5 space-y-2.5">
                  <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#10b981]/15 text-[#10b981] flex items-center justify-center text-xs font-mono font-bold">5</span>
                    Stream Link Rules
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-zinc-300 space-y-1.5 font-medium">
                    <li>Only share valid live stream links for the correct match.</li>
                    <li>Expired, fake, misleading, or invalid links are strictly prohibited.</li>
                  </ul>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wide text-[10px] text-rose-300">🚫 Consequences</span>
                      Sharing invalid or misleading stream links may lead to immediate profile suspension.
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. IMPORTANT NOTICE */}
      <div className="border border-rose-500/20 rounded-2xl overflow-hidden shadow-xl bg-[#0d0711]">
        <AccordionHeader
          id="notice"
          title="⚠️ IMPORTANT NOTICE"
          icon={AlertTriangle}
          colorClass="text-rose-500"
          subtitle="System tracking warnings, suspension terms and fairplay protocols"
        />
        <AnimatePresence initial={false}>
          {activeAccordion === 'notice' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-6 space-y-6 bg-[#0c0812] border-t border-rose-500/10">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3 text-xs text-rose-300">
                  <p className="font-extrabold uppercase tracking-widest text-[#fe2c55] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> ALL ACTIVITIES ARE MONITORED AND TRACKED ON THE TOURNAMENT MATRIX.
                  </p>
                  <p className="font-semibold text-zinc-300 leading-relaxed">
                    Failure to follow tournament rules may result in immediate auto-moderation penalties:
                  </p>
                  <ul className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 text-zinc-200 mt-2 font-black italic uppercase tracking-wider text-[11px]">
                    <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500 shrink-0" /> Temporary Suspension</li>
                    <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500 shrink-0" /> Tournament Disqualification</li>
                    <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500 shrink-0" /> Permanent Account Banning</li>
                    <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500 shrink-0" /> Permanent Account Deletion</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/5 text-center">
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex flex-col items-center justify-center min-h-[80px]">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Respect Opponents</span>
                  </div>
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex flex-col items-center justify-center min-h-[80px]">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Play Fairly</span>
                  </div>
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex flex-col items-center justify-center min-h-[80px]">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Keep Time</span>
                  </div>
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex flex-col items-center justify-center min-h-[80px]">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Enjoy the game</span>
                  </div>
                </div>

                <div className="text-center font-black italic tracking-wider text-xl text-emerald-400 pt-4 uppercase">
                  🏆 GOOD LUCK & HAVE FUN!
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );

  // If logged in, wrap inside the Shell which displays nav and core elements
  if (user) {
    return (
      <Shell>
        <div className="pt-6">
          <PageHeader />
          {rulesContent}
        </div>
      </Shell>
    );
  }

  // Guest variant with a clean public headers & dark body background
  return (
    <div className="min-h-screen bg-[#040511] text-[#a3a3c2] relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.04)_0%,transparent_100%)] pointer-events-none" />
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#040511]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group cursor-pointer focus:outline-none">
            <img src={logoUrl} alt="Tournahub Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase">
                Tourna<span className="text-[#d4af37] font-black italic">hub</span>
              </h1>
            </div>
          </Link>

          <Link 
            to="/" 
            className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#d4af37]" /> Back to Lobby
          </Link>
        </div>
      </header>

      {/* BODY RULES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-12 relative z-10">
        <PageHeader />
        {rulesContent}
      </div>

      {/* FOOTER REQUIRED */}
      <footer className="bg-[#030409] py-12 px-6 md:px-12 text-[#a3a3c2] border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <img src={logoUrl} alt="Tournahub Logo" className="w-8 h-8 object-contain" />
            <span className="text-sm font-black uppercase italic text-white tracking-widest">
              Tournahub Rules & Policies
            </span>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            © {new Date().getFullYear()} TOURNAHUB GLOBAL ENTERPRISE. ALL RIGHTS RESERVED.
          </p>

          <div className="flex items-center space-x-6 text-xs uppercase font-black tracking-widest">
            <Link to="/rules" className="text-white hover:text-[#d4af37] transition-colors">Rules Page</Link>
            <a href={SUPPORT_EMAIL} className="text-text-muted hover:text-[#d4af37] transition-colors flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#d4af37]" /> Support
            </a>
            <a href={COMMUNITY_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-[#d4af37] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
