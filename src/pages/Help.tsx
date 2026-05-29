import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Shell from '../components/layout/Shell';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trophy, Flame, Zap, Shield, AlertTriangle, Clock, 
  ChevronDown, ArrowLeft, Gamepad2, Globe, HelpCircle, Mail,
  List, CheckCircle, Smartphone, Sliders, PlayCircle, Search, 
  BookOpen, Compass, CreditCard, Bell, ExternalLink, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SEO from '../components/common/SEO';

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  keywords: string[];
}

interface FAQSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  borderColorClass: string;
  hoverBorderClass: string;
  bgLightClass: string;
  items: FAQItem[];
}

export default function Help() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('about');
  
  // Track open state for each section's FAQ indices independently
  const [openStates, setOpenStates] = useState<Record<string, string | null>>({
    'about': 'what-is',
    'joining': null,
    'match': null,
    'wallet': null,
    'notifications': null,
    'support': null,
    'rules-guidelines': null,
  });

  const logoUrl = '/android-chrome-512x512.png';
  const SUPPORT_EMAIL = 'mailto:support@tournahub.me';
  const COMMUNITY_WHATSAPP = 'https://whatsapp.com/channel/0029Vb7nKTkK5cDClzvMYT1Z';

  // Toggle open state for a given question inside a section
  const toggleFAQ = (sectionId: string, faqId: string) => {
    setOpenStates(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === faqId ? null : faqId
    }));
  };

  // Structured content with precise copy requested by user
  const sections: FAQSection[] = useMemo(() => [
    {
      id: 'about',
      title: 'About Tournahub',
      icon: Gamepad2,
      colorClass: 'text-indigo-400',
      borderColorClass: 'border-indigo-500/10',
      hoverBorderClass: 'hover:border-indigo-500/20',
      bgLightClass: 'bg-indigo-500/5',
      items: [
        {
          id: 'what-is',
          question: 'What is Tournahub?',
          keywords: ['efootball', 'league', 'knockout', 'about', 'what'],
          answer: (
            <div className="space-y-3">
              <p>
                Tournahub is an esports gaming platform built for competitive tournaments and online gaming competitions.
              </p>
              <p>
                Players can join tournaments, compete against other players, submit match results, track standings, and progress through tournament fixtures automatically.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#d4af37] mb-2 font-mono">Supported eFootball Formats:</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-300 text-xs">
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> League tournaments</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Knockout tournaments</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Group stage competitions</li>
                  <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Free & Prize tournaments</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'create-account',
          question: 'How do I create an account?',
          keywords: ['register', 'account', 'sign up', 'username', 'email', 'verify'],
          answer: (
            <div className="space-y-3">
              <p>
                Creating an account on Tournahub is simple. You can register by:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-300 pl-1">
                <li>Using your email and password</li>
                <li>Signing up with your Google account</li>
              </ul>
              <p>
                During registration, every user must choose a unique username. Your username is important because it is the name that will appear in tournaments, fixtures, standings, and match results.
              </p>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 mt-2 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5" /> Important Notes:
                </h4>
                <ul className="space-y-1.5 text-zinc-300 text-xs">
                  <li className="flex gap-2"><span className="text-amber-400 font-bold font-mono">•</span> <span>Your username can only be changed up to 3 times from account settings.</span></li>
                  <li className="flex gap-2"><span className="text-amber-400 font-bold font-mono">•</span> <span>Email verification is required before your account becomes active.</span></li>
                  <li className="flex gap-2"><span className="text-amber-400 font-bold font-mono">•</span> <span>A verification link will be sent to your email address during registration.</span></li>
                  <li className="flex gap-2"><span className="text-amber-400 font-bold font-mono">•</span> <span>You must confirm your email before using tournament features.</span></li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'how-tournaments-work',
          question: 'How do tournaments work?',
          keywords: ['process', 'how', 'flow', 'joining', 'format'],
          answer: (
            <div className="space-y-3">
              <p>
                Tournaments on Tournahub are fully organized and managed by the platform system.
              </p>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#d4af37] font-mono mt-2">Tournament Process:</h4>
              <ol className="space-y-2 text-zinc-300">
                <li className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-lg">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-xs font-black flex items-center justify-center">1</span>
                  <span>Join a tournament</span>
                </li >
                <li className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-lg">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-xs font-black flex items-center justify-center">2</span>
                  <span>Wait for fixtures to be generated</span>
                </li>
                <li className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-lg">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-xs font-black flex items-center justify-center">3</span>
                  <span>Play your scheduled matches</span>
                </li>
                <li className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-lg">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-xs font-black flex items-center justify-center">4</span>
                  <span>Submit match results with screenshot evidence</span>
                </li>
                <li className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-lg">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-xs font-black flex items-center justify-center">5</span>
                  <span>Tournament tables and fixtures update automatically</span>
                </li>
              </ol>
              <p className="text-xs text-zinc-400 mt-2">
                Depending on the tournament type, players may progress through League standings, Knockout brackets, or Group stages. For paid tournaments, players must complete the required registration payment before participating.
              </p>
            </div>
          )
        },
        {
          id: 'supported-games',
          question: 'What games are currently supported?',
          keywords: ['efootball', 'pes', 'fifa', 'games'],
          answer: (
            <p>
              Currently, Tournahub supports <strong>eFootball</strong>. More games may be added in future platform updates.
            </p>
          )
        },
        {
          id: 'is-free',
          question: 'Is Tournahub free?',
          keywords: ['free', 'cost', 'pay', 'paid', 'entry fee'],
          answer: (
            <div className="space-y-3">
              <p>
                Yes. Tournahub offers both free and paid tournament formats:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider font-mono">Free Tournaments</h4>
                  <p className="text-[11px] text-zinc-300 mt-1">Open for all players, absolutely no registration or entry fee required.</p>
                </div>
                <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider font-mono">Paid Tournaments</h4>
                  <p className="text-[11px] text-zinc-300 mt-1">Require an entry fee. Players compete for tournament prize pools and cash rewards.</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Tournament details always explicitly show whether a competition is free or paid before joining.
              </p>
            </div>
          )
        }
      ]
    },
    {
      id: 'joining',
      title: 'Joining Tournaments',
      icon: Trophy,
      colorClass: 'text-[#ffd700]',
      borderColorClass: 'border-[#ffd700]/10',
      hoverBorderClass: 'hover:border-[#ffd700]/20',
      bgLightClass: 'bg-[#ffd700]/5',
      items: [
        {
          id: 'how-to-join',
          question: 'How do I join a tournament?',
          keywords: ['join', 'register', 'how', 'slots', 'preferred badge'],
          answer: (
            <div className="space-y-3">
              <p>To join a tournament:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 pl-1">
                <li>Open the tournament card on the dashboard or browse panel.</li>
                <li>Read the tournament details and rules carefully.</li>
                <li>Tap the <strong className="text-white">“Join Tournament”</strong> button.</li>
                <li>Select your preferred team badge.</li>
                <li>Confirm your registration details.</li>
              </ol>
              <p className="text-xs text-zinc-400">
                Always review tournament format, rules, match schedules, and prize details before joining.
              </p>
            </div>
          )
        },
        {
          id: 'entry-fee',
          question: 'How do I pay the tournament entry fee?',
          keywords: ['pay', 'wallet', 'fund', 'registration fee', 'deducted'],
          answer: (
            <div className="space-y-2">
              <p>Paid tournaments require sufficient wallet balance before registration.</p>
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-white uppercase tracking-wider font-mono text-[10px] text-[#d4af37]">Payment Process:</p>
                <p>1. Fund your wallet using supported checkout options.</p>
                <p>2. Join desired paid tournament.</p>
                <p>3. The registration fee will automatically be deducted during the matchmaking joining process.</p>
              </div>
              <p className="text-xs text-zinc-500">
                Wallet and payment features are currently being improved and expanded for smoother transactions.
              </p>
            </div>
          )
        },
        {
          id: 'join-free',
          question: 'Can I join free tournaments?',
          keywords: ['free', 'join', 'no fee'],
          answer: (
            <p>
              Yes. Any player with an active Tournahub account can join free tournaments without paying any registration fee.
            </p>
          )
        },
        {
          id: 'after-joining',
          question: 'What happens after joining a tournament?',
          keywords: ['join', 'what next', 'slots full', 'generate fixtures', 'my matches'],
          answer: (
            <div className="space-y-3">
              <p>After successfully joining:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                  <h4 className="font-bold text-white mb-1 font-mono uppercase text-[10px]">If tournament slots are full:</h4>
                  <ul className="space-y-1 text-zinc-300">
                    <li>• Fixtures will automatically be generated.</li>
                    <li>• Your matches will appear in the “My Matches” section.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                  <h4 className="font-bold text-white mb-1 font-mono uppercase text-[10px]">If slots are not yet full:</h4>
                  <ul className="space-y-1 text-zinc-300">
                    <li>• You must wait for more players to join.</li>
                    <li>• You may receive notifications once it kicks off.</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Players are encouraged to check tournament status updates regularly.
              </p>
            </div>
          )
        },
        {
          id: 'know-opponent',
          question: 'How do I know my opponent?',
          keywords: ['opponent', 'who', 'find', 'matches tab', 'profile'],
          answer: (
            <p>
              You can view your opponent by opening tournament fixtures or checking the <strong>“My Matches”</strong> tab. Your scheduled opponent, match details, and result submission section will appear there automatically.
            </p>
          )
        }
      ]
    },
    {
      id: 'match',
      title: 'Match System',
      icon: Flame,
      colorClass: 'text-orange-400',
      borderColorClass: 'border-orange-500/10',
      hoverBorderClass: 'hover:border-orange-500/20',
      bgLightClass: 'bg-orange-500/5',
      items: [
        {
          id: 'match-schedules',
          question: 'How are match schedules handled?',
          keywords: ['schedule', 'generate', 'format', 'knockout', 'league'],
          answer: (
            <p>
              Match fixtures and schedules are automatically generated by the Tournahub system depending on the tournament format. This includes: League fixtures, Knockout brackets, and Group stage matches. Players are expected to check their matches regularly and keep time.
            </p>
          )
        },
        {
          id: 'coordinate',
          question: 'How do players coordinate matches?',
          keywords: ['coordinate', 'chat', 'contact', 'room code', 'whatsapp'],
          answer: (
            <div className="space-y-3">
              <p>
                When match time arrives, players should use the direct match chat room provided on the platform to communicate and organize their game.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs space-y-1 text-zinc-300">
                <span className="font-mono text-orange-400 uppercase font-black tracking-widest text-[10px] block mb-2">Players may:</span>
                <p>• Share eFootball match room codes</p>
                <p>• Coordinate kickoff times</p>
                <p>• Share contact information such as WhatsApp if both players agree</p>
              </div>
              <p className="text-xs text-zinc-400">
                The platform chat system is the primary communication channel for tournament matches.
              </p>
            </div>
          )
        },
        {
          id: 'offline-opponent',
          question: 'What happens if my opponent is offline?',
          keywords: ['offline', 'no show', 'opponent missing', 'dispute', 'evidence'],
          answer: (
            <div className="space-y-2">
              <p>If your opponent is unavailable:</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-300 pl-1 text-xs">
                <li>Attempt to contact them through the match room chat.</li>
                <li>Wait until the match submission period ends.</li>
                <li>Submit screenshot evidence showing your attempts to contact the opponent.</li>
              </ol>
              <p className="text-xs text-zinc-400">
                Administrators will review the chat logs plus screenshot evidence and award the result accordingly.
              </p>
            </div>
          )
        },
        {
          id: 'report-results',
          question: 'How do I report match results?',
          keywords: ['report', 'results', 'submit', 'evidence', 'screenshot', 'upload'],
          answer: (
            <div className="space-y-2">
              <p>After completing a match:</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-300 pl-1 text-xs">
                <li>Take a clear screenshot of the final match result screen showing usernames and score.</li>
                <li>Open the match submission section in "My Matches".</li>
                <li>Upload the result evidence from your storage.</li>
                <li>Submit your match result before the deadline.</li>
              </ol>
              <p className="text-xs text-zinc-400">
                Both players are highly encouraged to submit results immediately for faster auto-verification approval.
              </p>
            </div>
          )
        },
        {
          id: 'conflict',
          question: 'What happens if players disagree on results?',
          keywords: ['conflict', 'disagree', 'dispute', 'fake', 'edited', 'suspend'],
          answer: (
            <div className="space-y-2">
              <p>If submitted results conflict:</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-300 pl-1 text-xs">
                <li>The match is automatically sent to the admin dispute center.</li>
                <li>Evidence from both players will be reviewed.</li>
                <li>Administrators will verify screenshots and match information before making a final decision.</li>
              </ul>
              <div className="bg-red-500/5 border border-red-500/15 text-red-300 rounded-xl p-4 text-xs mt-2">
                <strong>CRITICAL NOTICE:</strong> Fake or edited match evidence will result in permanent account suspension.
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'wallet',
      title: 'Wallet & Payments',
      icon: CreditCard,
      colorClass: 'text-emerald-400',
      borderColorClass: 'border-emerald-500/10',
      hoverBorderClass: 'hover:border-emerald-500/20',
      bgLightClass: 'bg-emerald-500/5',
      items: [
        {
          id: 'deposits',
          question: 'How do deposits work?',
          keywords: ['deposit', 'paystack', 'bank card', 'mobile money', 'payment'],
          answer: (
            <div className="space-y-2">
              <p>Tournahub uses <strong>Paystack</strong> for payment processing and wallet funding.</p>
              <p className="text-xs text-zinc-300">Supported payment methods may include:</p>
              <ul className="grid grid-cols-2 gap-2 text-xs text-zinc-300 pl-1">
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Bank cards</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Mobile money</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Bank transfers</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Regional options</li>
              </ul>
              <p className="text-xs text-zinc-500 mt-2">
                Supported countries depend on Paystack availability. Wallet functionality is currently under continuous improvement as we optimize payment avenues.
              </p>
            </div>
          )
        },
        {
          id: 'withdrawals',
          question: 'Can I withdraw winnings?',
          keywords: ['withdraw', 'winnings', 'cash out', 'payout', 'verify'],
          answer: (
            <p>
              Yes. Players will be able to withdraw tournament winnings through supported Paystack payout methods once withdrawals are fully enabled and available on the platform. Additional verification may be required for security and fraud prevention purposes.
            </p>
          )
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      colorClass: 'text-amber-400',
      borderColorClass: 'border-amber-500/10',
      hoverBorderClass: 'hover:border-amber-500/20',
      bgLightClass: 'bg-amber-500/5',
      items: [
        {
          id: 'pushed',
          question: 'Will I receive tournament notifications and reminders?',
          keywords: ['notifications', 'reminder', 'announcement', 'fixture', 'alerts'],
          answer: (
            <div className="space-y-2">
              <p>
                Yes. Tournahub can send:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-300 text-xs pl-1">
                <li>Match reminders</li>
                <li>Tournament updates</li>
                <li>Fixture notifications</li>
                <li>Result updates</li>
                <li>Important announcements</li>
              </ul>
              <p className="text-xs text-zinc-400 mt-2">
                To receive notifications properly, ensure notifications are enabled on your device and browser.
              </p>
            </div>
          )
        }
      ]
    },
    {
      id: 'support',
      title: 'Support',
      icon: HelpCircle,
      colorClass: 'text-sky-400',
      borderColorClass: 'border-sky-500/10',
      hoverBorderClass: 'hover:border-sky-500/20',
      bgLightClass: 'bg-sky-500/5',
      items: [
        {
          id: 'get-support',
          question: 'How do I contact support?',
          keywords: ['support', 'contact', 'email', 'help', 'dispute', 'bug'],
          answer: (
            <div className="space-y-3">
              <p>
                For support, questions, or technical issues, contact:
              </p>
              <p className="font-mono text-base font-black text-sky-400 hover:underline">
                <a href={SUPPORT_EMAIL}>support@tournahub.me</a>
              </p>
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-xs space-y-1.5 text-zinc-300">
                <p className="font-bold text-white uppercase text-[10px] tracking-wider mb-1">Support may assist with:</p>
                <p>• Tournament registration issues</p>
                <p>• Match disputes & result reviews</p>
                <p>• Payment or checkout problems</p>
                <p>• Account settings & credentials recovery</p>
                <p>• General technical bug reporting</p>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'rules-guidelines',
      title: 'Tournament Rules & Guidelines',
      icon: Shield,
      colorClass: 'text-[#d4af37]',
      borderColorClass: 'border-[#d4af37]/10',
      hoverBorderClass: 'hover:border-[#d4af37]/20',
      bgLightClass: 'bg-[#d4af37]/5',
      items: [
        {
          id: 'rulebook-settings',
          question: '⚽ Tournament Match Settings (League, Knockout & Group Stage)',
          keywords: ['settings', 'attributes', 'configuration', 'minutes', 'injuries', 'knockout', 'group'],
          answer: (
            <div className="space-y-4 text-xs divide-y divide-white/5">
              <div className="space-y-2">
                <h5 className="font-bold text-sky-400 uppercase tracking-widest font-mono text-[10px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-sky-500" /> League Match Settings
                </h5>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-300 font-mono text-[11px]">
                  <li>• Match Type: <strong className="text-white">Standard</strong></li>
                  <li>• Match Time: <strong className="text-white">6 Minutes</strong></li>
                  <li>• Injuries: <strong className="text-white">No</strong></li>
                  <li>• Extra Time: <strong className="text-white">No</strong></li>
                  <li>• Penalties: <strong className="text-white">No</strong></li>
                  <li>• Substitutions: <strong className="text-white">6</strong></li>
                  <li className="col-span-2 text-[#d4af37] font-black">• Player Condition: Excellent (Home & Away)</li>
                </ul>
              </div>
              <div className="space-y-2 pt-3">
                <h5 className="font-bold text-rose-500 uppercase tracking-widest font-mono text-[10px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-rose-500" /> Knockout Match Settings
                </h5>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-300 font-mono text-[11px]">
                  <li>• Match Type: <strong className="text-white">Standard</strong></li>
                  <li>• Match Time: <strong className="text-white">6 Minutes</strong></li>
                  <li>• Injuries: <strong className="text-white">No</strong></li>
                  <li>• Extra Time: <strong className="text-white">Yes</strong></li>
                  <li>• Penalties: <strong className="text-white">Yes</strong></li>
                  <li>• Substitutions: <strong className="text-white">6</strong></li>
                  <li className="col-span-2 text-[#d4af37] font-black">• Player Condition: Excellent (Home & Away)</li>
                </ul>
              </div>
              <div className="space-y-2 pt-3">
                <h5 className="font-bold text-amber-500 tracking-widest font-mono text-[10px] uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-amber-500" /> Group Stage Match Settings
                </h5>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-300 font-mono text-[11px]">
                  <li>• Match Type: <strong className="text-white">Standard</strong></li>
                  <li>• Match Time: <strong className="text-white">6 Minutes</strong></li>
                  <li>• Injuries: <strong className="text-white">No</strong></li>
                  <li>• Extra Time: <strong className="text-white">No</strong></li>
                  <li>• Penalties: <strong className="text-white">No</strong></li>
                  <li>• Substitutions: <strong className="text-white">6</strong></li>
                  <li className="col-span-2 text-[#d4af37] font-black">• Player Condition: Excellent (Home & Away)</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'rulebook-general',
          question: '📜 General Tournament Rules (1 to 5)',
          keywords: ['participation', 'absent', 'suspension', 'consequences', 'fake', 'disconnection', 'stream links'],
          answer: (
            <div className="space-y-3.5 text-xs">
              <div>
                <p className="font-bold font-mono text-white text-[10px] tracking-wider uppercase mb-1">1️⃣ Match Participation:</p>
                <p className="text-zinc-300">Every player must play scheduled matches within the allocated tournament time. Failure to participate may result in an automatic loss. Repeated absence from matches may lead to suspension or permanent banning.</p>
                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 mt-1.5 grid grid-cols-2 gap-1.5 text-[10px] text-zinc-400 font-mono">
                  <span className="text-white flex items-center gap-1"><span className="w-1 h-1 rounded bg-red-400" /> Automatic loss</span>
                  <span className="text-white flex items-center gap-1"><span className="w-1 h-1 rounded bg-red-400" /> Tournament disqualification</span>
                  <span className="text-white flex items-center gap-1"><span className="w-1 h-1 rounded bg-red-400" /> Account suspension</span>
                  <span className="text-white flex items-center gap-1"><span className="w-1 h-1 rounded bg-red-400" /> Permanent banning</span>
                </div>
              </div>
              
              <div>
                <p className="font-bold font-mono text-white text-[10px] tracking-wider uppercase mb-1">2️⃣ Result Submission:</p>
                <p className="text-zinc-300">Match results must be submitted before the tournament deadline. Fake, edited, or misleading screenshots are strictly prohibited. Both players should submit results immediately after the match.</p>
                <p className="text-[11px] text-[#d4af37] mt-1 italic font-semibold">
                  If only one player submits valid evidence before the deadline while the opponent fails to respond, the submitted result may be approved automatically. Submitting fake results leads to permanent account ban.
                </p>
              </div>

              <div>
                <p className="font-bold font-mono text-white text-[10px] tracking-wider uppercase mb-1">3️⃣ Tournament Commitment:</p>
                <p className="text-zinc-300">Before joining, players must carefully review format, rules, schedules, and prize details. Once registered, tournament cancellation is not allowed. Active and competitive play is mandatory.</p>
              </div>

              <div>
                <p className="font-bold font-mono text-white text-[10px] tracking-wider uppercase mb-1">4️⃣ Network Issues & Match Disconnections:</p>
                <p className="text-zinc-300">Players must use a stable internet connection. Intentional quitting is prohibited. Any player who forfeits a match automatically loses regardless of the current scoreline.</p>
              </div>

              <div>
                <p className="font-bold font-mono text-white text-[10px] tracking-wider uppercase mb-1">5️⃣ Stream Link Rules:</p>
                <p className="text-zinc-300">Only valid stream links for the correct match are allowed. Fake, expired, or misleading links are prohibited. Violations may result in suspension or tournament penalties.</p>
              </div>
            </div>
          )
        },
        {
          id: 'rulebook-disconnections',
          question: '🎮 In-Game Disconnection Rules (by Minute)',
          keywords: ['disconnect', 'minute', 'score', 'consequences', 'internet', 'forfeit'],
          answer: (
            <div className="space-y-2.5 text-xs font-mono">
              <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                <p className="font-bold text-white text-[11px]">⏱️ 0&apos; – 15&apos; Minute</p>
                <p className="text-zinc-400 mt-0.5 text-[11px]">If the score is 0–0 or 1–0: The match must be replayed immediately. No rescheduling is allowed.</p>
              </div>
              <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                <p className="font-bold text-white text-[11px]">⏱️ 15&apos; – 45&apos; Minute</p>
                <p className="text-zinc-400 mt-0.5 text-[11px]">The player responsible for the disconnection loses the match regardless of the current score.</p>
              </div>
              <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                <p className="font-bold text-white text-[11px]">⏱️ 46&apos; – 80&apos; Minute</p>
                <p className="text-zinc-400 mt-0.5 text-[11px]">Any player responsible for the network issue loses the match regardless of the scoreline.</p>
              </div>
              <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                <p className="font-bold text-white text-[11px]">⏱️ Beyond 85&apos; Minute</p>
                <p className="text-zinc-400 mt-0.5 text-[11px]">If the goal difference is 4 goals or more, the current result stands. Clear screenshots must be provided as evidence.</p>
              </div>
            </div>
          )
        }
      ]
    }
  ], []);

  // Filter content based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase().trim();
    return sections.map(section => {
      const matchingItems = section.items.filter(item => 
        item.question.toLowerCase().includes(query) ||
        item.keywords.some(k => k.includes(query))
      );
      
      return {
        ...section,
        items: matchingItems
      };
    }).filter(section => section.items.length > 0);
  }, [searchQuery, sections]);

  // Set the first matching section active on filter
  useEffect(() => {
    if (filteredSections.length > 0 && searchQuery) {
      setActiveSection(filteredSections[0].id);
    }
  }, [filteredSections, searchQuery]);

  // Generate structured schema.org FAQ data for Google/SEO compliance
  const schemaFAQData = useMemo(() => {
    const list: any[] = [];
    sections.forEach(sec => {
      sec.items.forEach(item => {
        // Simple plain text conversion for schema values
        const plainTextAnswer = typeof item.question === 'string' ? sec.title : 'Tournahub Guidelines';
        list.push({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Read the full answer and policies on Tournahub Official Help Center for ${plainTextAnswer}.`
          }
        });
      });
    });

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": list,
      "publisher": {
        "@type": "Organization",
        "name": "Tournahub",
        "logo": "https://tournahub.me/android-chrome-512x512.png"
      }
    };
  }, [sections]);

  const PageHeader = () => (
    <div className="space-y-4 text-center max-w-4xl mx-auto mb-10 pt-4 px-4 relative z-10">
      <SEO 
        title="Help Center & Frequently Asked Questions"
        description="Welcome to Tournahub esports tournament help desk. Find eFootball match setup guidelines, wallet payments help, tournament formats and guidelines."
        path="/help"
        schemaData={schemaFAQData}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-400/10 border border-indigo-400/20 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-indigo-400"
      >
        <BookOpen className="w-3.5 h-3.5" /> Support Desk
      </motion.div>
      
      <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-white">
        TournaHub <span className="text-primary font-black italic">Help Center</span>
      </h1>
      
      <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
        Find official guidelines, match structures, secure Paystack payment steps, rules compliance, and contact support. Use the search tool to find answers instantly.
      </p>

      {/* SEARCH INPUT */}
      <div className="relative max-w-xl mx-auto mt-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-500" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search questions, settings, or rules..."
          className="block w-full pl-11 pr-12 py-4 bg-[#0a0c1a] border border-white/10 hover:border-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-2xl text-sm text-white placeholder-zinc-500 font-medium transition-all shadow-xl font-mono focus:outline-none"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center font-mono text-xs text-zinc-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  const helpContent = (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto pb-16 relative z-10 px-4 sm:px-6">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <div className="lg:col-span-3 hidden lg:block">
        <div className="sticky top-24 space-y-3 bg-[#0a0c1a]/60 backdrop-blur-md rounded-2xl border border-white/5 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 pl-3 mb-2 font-mono">
            Support Categories
          </p>
          <nav className="flex flex-col space-y-1">
            {filteredSections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSection(sec.id);
                    const el = document.getElementById(`sec-${sec.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all font-bold uppercase italic tracking-wider text-xs border ${
                    isActive 
                      ? 'bg-primary border-primary text-black' 
                      : 'border-transparent text-[#a3a3c2] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : sec.colorClass}`} />
                  <span>{sec.title}</span>
                  {sec.items.length > 0 && !searchQuery && (
                    <span className={`ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-black/10 text-black' : 'bg-white/5 text-zinc-400'
                    }`}>
                      {sec.items.length}
                    </span>
                  )}
                </button>
              );
            })}
            
            {filteredSections.length === 0 && (
              <p className="text-xs text-zinc-500 italic p-3 text-center">No categories found</p>
            )}
          </nav>
        </div>
      </div>

      {/* DETAILED ACCORDION CONTENT */}
      <div className="lg:col-span-9 space-y-8">
        
        {filteredSections.length === 0 ? (
          <div className="text-center py-16 bg-[#0a0c1a] border border-white/5 rounded-2xl p-8 max-w-xl mx-auto">
            <HelpCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-black uppercase italic text-white mb-2">No matching help topics</h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              We couldn&apos;t find any answers matching &ldquo;{searchQuery}&rdquo;. Try using different terms or scroll through categories below.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-mono text-white"
            >
              Reset Search Filter
            </button>
          </div>
        ) : (
          filteredSections.map(sec => {
            const CategoryIcon = sec.icon;
            return (
              <div 
                id={`sec-${sec.id}`}
                key={sec.id} 
                className={`border rounded-2xl overflow-hidden bg-[#090a14] transition-all duration-300 ${sec.borderColorClass} ${sec.hoverBorderClass}`}
              >
                {/* SECTION HEADER CARD */}
                <div className={`p-5 border-b border-white/5 text-left transition-all ${sec.bgLightClass} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <CategoryIcon className={`w-5 h-5 ${sec.colorClass}`} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black italic uppercase tracking-wide text-white flex items-center gap-2">
                        {sec.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono">Category Guide</p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-block font-mono text-[10px] font-bold text-zinc-500 uppercase">
                    Tournahub Compliance
                  </span>
                </div>

                {/* LIST OF ACCORDIONS FOR EVERY ITEM */}
                <div className="divide-y divide-white/5">
                  {sec.items.map((item) => {
                    const isOpen = openStates[sec.id] === item.id;
                    return (
                      <div key={item.id} className="w-full">
                        <button
                          onClick={() => toggleFAQ(sec.id, item.id)}
                          className={`w-full flex items-center justify-between p-5 text-left transition-all ${
                            isOpen ? 'bg-[#0a0d1e] border-l-2 border-primary' : 'hover:bg-white/[0.01]'
                          }`}
                        >
                          <span className="text-sm sm:text-base font-bold text-white pr-4 flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-primary' : 'bg-zinc-600'}`} />
                            {item.question}
                          </span>
                          <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className={`${isOpen ? 'text-primary' : 'text-zinc-500'}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden bg-[#07080f]/50"
                            >
                              <div className="p-5 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 space-y-2">
                                {item.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );

  // If logged in, wrap inside the Shell layouts container of Tournahub
  if (user) {
    return (
      <Shell>
        <div className="pt-6">
          <PageHeader />
          {helpContent}
        </div>
      </Shell>
    );
  }

  // Guest variant layout matching Rules / Terms for maximum design consistency
  return (
    <div className="min-h-screen bg-[#040511] text-[#a3a3c2] relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.04)_0%,transparent_100%)] pointer-events-none" />
      
      {/* PUBLIC HEADER NAVBAR */}
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

      {/* GUEST BODY HELP */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-12 relative z-10">
        <PageHeader />
        {helpContent}
      </div>

      {/* COMPLIANCES STATIC FOOTER */}
      <footer className="bg-[#030409] py-12 px-6 md:px-12 text-[#a3a3c2] border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <img src={logoUrl} alt="Tournahub Logo" className="w-8 h-8 object-contain" />
            <span className="text-sm font-black uppercase italic text-white tracking-widest">
              Tournahub Help Center
            </span>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            © {new Date().getFullYear()} TOURNAHUB GLOBAL ENTERPRISE. ALL RIGHTS RESERVED.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs uppercase font-black tracking-widest">
            <Link to="/help" className="text-white hover:text-primary transition-colors">Help Center</Link>
            <Link to="/rules" className="text-zinc-400 hover:text-primary transition-colors">Tournament Rules</Link>
            <Link to="/terms" className="text-zinc-400 hover:text-primary transition-colors">Terms & Conditions</Link>
            <Link to="/privacy-policy" className="text-zinc-400 hover:text-primary transition-colors">Privacy Policy</Link>
            <a href={SUPPORT_EMAIL} className="text-zinc-400 hover:text-primary transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
