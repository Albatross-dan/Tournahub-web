import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BRAND = {
  name: "Tournahub",
  email: "support@tournahub.com",
  effectiveDate: "June 1, 2026",
};

const termsContent = [
  {
    id: "eligibility",
    title: "1. User Eligibility",
    body: `By creating an account on Tournahub, you confirm that you are at least 13 years old. If you are under 18, you must have the consent of a parent or legal guardian to use the platform, especially for any paid tournaments.

You agree to use Tournahub only for lawful purposes and in compliance with all applicable laws in your jurisdiction. Users who reside in regions where online gaming competitions or prize-based contests are restricted or prohibited are responsible for ensuring their own compliance with local laws.`,
  },
  {
    id: "account",
    title: "2. Account Registration & Security",
    body: `When you register, you agree to provide accurate, complete, and up-to-date information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.

Do not share your password or allow others to use your account. If you suspect unauthorized access, notify us immediately at ${BRAND.email}. Tournahub will not be liable for any loss or damage resulting from unauthorized account use.`,
  },
  {
    id: "participation",
    title: "3. Tournament Participation",
    body: `Users may join free or paid tournaments created by organizers on the platform. By entering a tournament, you agree to abide by the specific rules set by the organizer for that event.

Tournahub provides the infrastructure (brackets, fixtures, standings, real-time updates) but does not control, endorse, or guarantee the conduct or outcomes of user-organized tournaments. Participation is voluntary and at your own discretion.

Tournament results submitted by organizers or match administrators are considered final unless a formal dispute is raised within the allowed window.`,
  },
  {
    id: "payments",
    title: "4. Payments & Refunds",
    body: `Some tournaments on Tournahub may require entry fees or offer prize pools, as configured by the organizer. All payments are processed through third-party payment providers (e.g., M-Pesa/Daraja API or other enabled gateways).

Tournahub does not store your payment card details. Transaction records are maintained by the respective payment provider.

Refund Policy: Refund eligibility is determined by the individual tournament organizer. Tournahub is not responsible for refunding entry fees for user-organized events. If a technical error on our platform causes a failed or duplicate charge, contact us at ${BRAND.email} and we will investigate.

Tournahub reserves the right to charge service or platform fees, which will always be disclosed before payment is completed.`,
  },
  {
    id: "fairplay",
    title: "5. Fair Play & Anti-Cheating Policy",
    body: `Tournahub is built on fair competition. You agree NOT to:

• Use cheats, exploits, aimbots, macros, or any unauthorized third-party software.
• Manipulate match results, collude with opponents, or engage in match-fixing.
• Use multiple or fake accounts to gain unfair advantages.
• Submit false match scores or tamper with bracket data.

Violations may result in immediate disqualification, prize forfeiture, and permanent account suspension. Tournahub reserves the right to investigate suspicious activity and take action without prior notice.`,
  },
  {
    id: "organizer",
    title: "6. Organizer vs. Platform Responsibility",
    body: `Tournahub is a platform provider — we supply tools for hosting and managing tournaments. We are not a tournament operator.

Tournament organizers are independently responsible for:
• Setting and enforcing their own rules.
• Distributing prizes to winners.
• Managing disputes among participants.
• Ensuring their tournaments comply with local laws.

Tournahub does not guarantee that prizes will be paid out, that organizers are legitimate, or that tournaments will be completed as advertised. We strongly encourage users to participate in tournaments only from organizers they trust.`,
  },
  {
    id: "content",
    title: "7. Content Ownership",
    body: `You retain ownership of any content you create on Tournahub, including team names, logos, and profile information. By uploading content, you grant Tournahub a non-exclusive, royalty-free license to display and use that content solely for the purpose of operating the platform.

You must not use names, logos, or images that infringe on third-party copyrights or trademarks. Tournahub reserves the right to remove content that violates these guidelines.`,
  },
  {
    id: "prohibited",
    title: "8. Prohibited Behavior",
    body: `You agree not to engage in any of the following:

• Harassment, hate speech, or abusive behavior toward other users.
• Impersonating other users, organizers, or Tournahub staff.
• Uploading malicious code, attempting to hack the platform, or performing DDoS attacks.
• Using the platform for fraudulent activity or scams.
• Scraping, reverse engineering, or copying the platform's code or data.
• Attempting to manipulate leaderboards, brackets, or standings without authorization.

Violation of these rules will result in account suspension or permanent ban, and may be reported to relevant authorities.`,
  },
  {
    id: "termination",
    title: "9. Suspension & Account Termination",
    body: `Tournahub may suspend or terminate your account at any time if you violate these Terms, engage in fraudulent behavior, or pose a risk to the platform or other users.

You may also delete your account at any time through the app settings. Upon account deletion, your data will be handled per our Privacy Policy. Prizes or entry fees already committed to ongoing tournaments may not be recoverable after deletion.`,
  },
  {
    id: "liability",
    title: "10. Limitation of Liability",
    body: `To the maximum extent permitted by applicable law, Tournahub and its team shall not be liable for:

• Loss of prizes, entry fees, or earnings due to organizer non-payment.
• Losses arising from account suspension or termination.
• Service interruptions, bugs, or data loss.
• Any indirect, incidental, or consequential damages.

Our total liability in any case is limited to the amount you paid directly to Tournahub (platform fees only) in the 30 days preceding the claim.`,
  },
  {
    id: "disputes",
    title: "11. Dispute Resolution",
    body: `If you have a dispute with another user or organizer, we encourage you to first attempt to resolve it directly. If needed, you may report the issue to us at ${BRAND.email}.

Tournahub will make reasonable efforts to mediate platform-related disputes but has no legal obligation to resolve disputes between users or between users and organizers.

These Terms are governed by applicable laws. Any legal action against Tournahub must be brought in a court of competent jurisdiction.`,
  },
  {
    id: "changes",
    title: "12. Changes to These Terms",
    body: `We may update these Terms & Conditions from time to time. When we do, we'll update the "Effective Date" at the top of this page and notify users through the app or email for significant changes.

Continued use of Tournahub after changes are published means you accept the updated Terms. If you disagree with any changes, you may close your account.`,
  },
];

const privacyContent = [
  {
    id: "collected",
    title: "1. What Data We Collect",
    body: `When you use Tournahub, we collect the following types of information:

Account Information: Your email address and hashed password (stored securely via Supabase Auth). If you sign in with Google, we receive your name and email from Google.

Profile Data: Your username, display name, avatar, team affiliations, and other profile details you choose to add.

Tournament Activity: Tournaments you join or create, match results, scores, standings, and game history.

Device & Usage Data: Your IP address, device type, browser/app version, and usage patterns (for security and performance).

Payment-Related Data: We do not store your payment card or mobile money details directly. Payments are processed by third-party providers (e.g., M-Pesa/Daraja). We receive basic transaction confirmations (amount, status, reference ID).`,
  },
  {
    id: "usage",
    title: "2. How We Use Your Data",
    body: `We use your data to:

• Create and manage your account.
• Enable tournament registration, bracket creation, and match tracking.
• Display your profile and team information to other users as part of the tournament experience.
• Send important notifications (tournament updates, match schedules, results).
• Detect and prevent fraud, cheating, or abuse.
• Improve the platform through analytics and user feedback.
• Comply with legal obligations if required.

We do not sell your personal data to advertisers or third parties.`,
  },
  {
    id: "storage",
    title: "3. Data Storage",
    body: `All user data is stored on Supabase, a secure cloud backend platform. Supabase provides encrypted storage, row-level security (RLS), and authentication services.

Your data is stored on servers that may be located outside your country of residence. By using Tournahub, you consent to this data being transferred and stored internationally in compliance with applicable data protection laws.`,
  },
  {
    id: "sharing",
    title: "4. Data Sharing",
    body: `We do not sell or rent your personal data. We share data only in the following limited cases:

• With Tournament Organizers: Your username, team name, and match results may be visible to organizers of tournaments you join. This is necessary for the platform to function.
• With Payment Providers: Basic transaction data is shared with M-Pesa (Safaricom Daraja API) or other enabled payment gateways to process fees.
• With Supabase: As our backend provider, Supabase processes data per their own privacy policy (supabase.com/privacy).
• Legal Requirements: We may disclose data if required by law, court order, or to protect the safety of users.`,
  },
  {
    id: "rights",
    title: "5. Your Rights",
    body: `You have the following rights regarding your personal data:

• Access: Request a copy of the personal data we hold about you.
• Update: Edit your profile information directly in the app settings.
• Delete: Request deletion of your account and associated data. Send a request to ${BRAND.email}. Some data (e.g., match records) may be retained for platform integrity purposes.
• Withdraw Consent: You may stop using the platform at any time and request data removal.

To exercise these rights, contact us at ${BRAND.email}.`,
  },
  {
    id: "cookies",
    title: "6. Cookies & Session Storage",
    body: `The Tournahub web app uses session tokens and local storage to keep you logged in and maintain your preferences. These are essential for app functionality and are not used for advertising tracking.

If you use the Flutter mobile app, local device storage is used for caching your session and tournament data for a faster experience.

You can clear app data or log out at any time to remove stored session information.`,
  },
  {
    id: "security",
    title: "7. Data Security",
    body: `We take data security seriously. Measures we have in place include:

• Passwords are never stored in plain text — they are handled by Supabase Auth using industry-standard hashing.
• Database access is protected by Supabase Row Level Security (RLS), ensuring users can only access their own data.
• All communication between your device and our servers uses HTTPS/TLS encryption.
• Payment data is never stored on our servers.

While we implement strong security practices, no platform is 100% immune to breaches. In the event of a data breach that affects your information, we will notify you promptly.`,
  },
  {
    id: "thirdparty",
    title: "8. Third-Party Services",
    body: `Tournahub integrates with the following third-party services:

• Supabase (supabase.com) — Authentication, database, and real-time data.
• Google Sign-In (optional) — OAuth2 login via Google.
• M-Pesa / Safaricom Daraja API (optional) — Mobile money payment processing.
• Other payment gateways — If enabled by organizers in your region.

Each of these services has its own privacy policy. We encourage you to review them.`,
  },
  {
    id: "retention",
    title: "9. Data Retention",
    body: `We retain your data for as long as your account is active. If you delete your account:

• Your profile data will be permanently deleted within 30 days.
• Match records and tournament history may be retained in anonymized form for platform statistics.
• Payment transaction records may be retained as required by financial regulations.
• If your account is suspended for policy violations, we may retain records related to the violation for legal purposes.`,
  },
  {
    id: "contact",
    title: "10. Contact & Support",
    body: `If you have any questions, concerns, or requests related to your privacy or data, please contact us:

Email: ${BRAND.email}
Platform: Use the in-app Help & Support section

We will respond to all inquiries within 5 business days.`,
  },
];

const TABS = [
  { id: "terms", label: "Terms & Conditions", icon: "📋" },
  { id: "privacy", label: "Privacy Policy", icon: "🔒" },
];

export default function Legal() {
  const [activeTab, setActiveTab] = useState("terms");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Detect page route and initial active tab
    if (location.pathname.includes("privacy") || location.pathname.includes("privacy-policy")) {
      setActiveTab("privacy");
    } else if (location.pathname.includes("terms")) {
      setActiveTab("terms");
    } else {
      const hash = window.location.hash.replace("#", "");
      if (hash === "privacy" || hash === "terms") {
        setActiveTab(hash);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const content = activeTab === "terms" ? termsContent : privacyContent;

  const navigateToDashboardOrHome = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#0b0e1a", minHeight: "100vh", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0b0e1a; }
        ::-webkit-scrollbar-thumb { background: #2a3050; border-radius: 3px; }
        .tab-btn { cursor: pointer; border: none; transition: all 0.25s ease; }
        .tab-btn:hover { opacity: 0.85; }
        .section-card { transition: all 0.22s ease; border-left: 3px solid transparent; }
        .section-card:hover { border-left-color: #6ee7f7; background: rgba(110,231,247,0.04) !important; }
        .section-card.active { border-left-color: #6ee7f7; background: rgba(110,231,247,0.07) !important; }
        .toc-item { cursor: pointer; transition: all 0.18s; padding: 6px 10px; border-radius: 6px; font-size: 13px; color: #94a3b8; }
        .toc-item:hover { color: #6ee7f7; background: rgba(110,231,247,0.06); }
        .toc-item.active { color: #6ee7f7; background: rgba(110,231,247,0.1); font-weight: 600; }
        .consent-box { animation: fadeUp 0.5s ease forwards; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .glow { box-shadow: 0 0 30px rgba(110,231,247,0.12); }
        .header-sticky { position: sticky; top: 0; z-index: 100; backdrop-filter: blur(18px); transition: all 0.3s; }
      `}</style>

      {/* Header */}
      <div className="header-sticky" style={{ background: scrolled ? "rgba(11,14,26,0.95)" : "rgba(11,14,26,0.7)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 24px" }} className="flex flex-col sm:flex-row gap-4 items-center justify-between min-h-[64px] h-auto">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={navigateToDashboardOrHome}
              className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-primary hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer relative z-20"
              title="Go Back"
              style={{ background: "transparent", border: "none" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div onClick={navigateToDashboardOrHome} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6ee7f7,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>T</div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>Tournahub</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }} className="flex-wrap justify-center">
            {TABS.map(tab => (
              <button key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "privacy") {
                    navigate("/privacy-policy");
                  } else {
                    navigate("/terms");
                  }
                }}
                style={{
                  borderRadius: 9, fontWeight: 600, fontFamily: "inherit",
                  background: activeTab === tab.id ? "linear-gradient(135deg,#6ee7f7,#3b82f6)" : "transparent",
                  color: activeTab === tab.id ? "#0b0e1a" : "#94a3b8",
                }}
                className="tab-btn px-3 sm:px-[18px] py-1.5 sm:py-2 text-[11px] sm:text-[13px] whitespace-nowrap"
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px", display: "flex", gap: 40 }} className="flex-col md:flex-row">

        {/* Sidebar TOC */}
        <aside style={{ width: 220, flexShrink: 0, position: "sticky", top: 80, height: "fit-content" }} className="hidden md:block">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#475569", textTransform: "uppercase", marginBottom: 12 }}>On this page</div>
          {content.map(sec => (
            <div key={sec.id} className={`toc-item${activeSection === sec.id ? " active" : ""}`}
              onClick={() => {
                setActiveSection(sec.id);
                document.getElementById(sec.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>
              {sec.title}
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Page Hero */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(110,231,247,0.1)", border: "1px solid rgba(110,231,247,0.2)", borderRadius: 100, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#6ee7f7", marginBottom: 16 }}>
              {activeTab === "terms" ? "📋 Legal Agreement" : "🔒 Data Protection"}
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 12, letterSpacing: "-1px" }}>
              {activeTab === "terms" ? "Terms & Conditions" : "Privacy Policy"}
            </h1>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              Effective Date: <strong style={{ color: "#94a3b8" }}>{BRAND.effectiveDate}</strong> · Applies to Tournahub web & mobile app
            </p>
          </div>

          {/* Intro blurb */}
          <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 36, fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
            {activeTab === "terms"
              ? `Welcome to Tournahub. These Terms & Conditions govern your use of our tournament management platform. By creating an account or using any part of the platform, you agree to be bound by these terms. Please read them carefully.`
              : `Your privacy matters to us. This Privacy Policy explains what data Tournahub collects, why we collect it, how it's stored, and what rights you have. We've written it to be straightforward and clear.`}
          </div>

          {/* Sections */}
          {content.map((sec, i) => (
            <div key={sec.id} id={sec.id} className={`section-card${activeSection === sec.id ? " active" : ""}`}
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px 28px", marginBottom: 16, cursor: "default" }}
              onClick={() => setActiveSection(sec.id)}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 14, lineHeight: 1.3 }}>{sec.title}</h2>
              <div style={{ fontSize: 14.5, lineHeight: 1.85, color: "#94a3b8", whiteSpace: "pre-wrap" }}>{sec.body}</div>
            </div>
          ))}

          {/* Consent Block */}
          <div className="consent-box glow" style={{ marginTop: 48, background: "linear-gradient(135deg, rgba(110,231,247,0.08), rgba(59,130,246,0.08))", border: "1px solid rgba(110,231,247,0.25)", borderRadius: 18, padding: "32px 36px" }}>
            <div style={{ fontSize: 22, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>Your Consent</h3>
            <p style={{ fontSize: 14.5, color: "#94a3b8", lineHeight: 1.8, marginBottom: 20 }}>
              By registering on Tournahub — whether via email/password or Google Sign-In — you confirm that you have read, understood, and agree to be bound by both our <strong style={{ color: "#6ee7f7" }}>Terms & Conditions</strong> and our <strong style={{ color: "#6ee7f7" }}>Privacy Policy</strong>. If you do not agree, please do not create an account or use the platform.
            </p>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Both documents are available at the same URL. Use the tabs above to switch between them. For questions, reach us at <a href={`mailto:${BRAND.email}`} style={{ color: "#6ee7f7", textDecoration: "none" }}>{BRAND.email}</a>.
            </p>
          </div>

          {/* Explicit Back Button to easily escape page */}
          <button
            onClick={navigateToDashboardOrHome}
            style={{
              marginTop: 24,
              border: "1px solid rgba(110,231,247,0.2)",
              background: "rgba(110,231,247,0.03)",
              cursor: "pointer",
            }}
            className="w-full h-12 hover:bg-slate-800/40 transition-all rounded-xl text-slate-400 hover:text-[#00d1ff] font-bold uppercase tracking-wider text-[11px] flex items-center justify-center space-x-2 relative z-20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back to Previous Page</span>
          </button>

          {/* Footer note */}
          <div style={{ marginTop: 40, textAlign: "center", fontSize: 13, color: "#334155" }}>
            © {new Date().getFullYear()} Tournahub · All rights reserved · <span onClick={() => { setActiveTab("terms"); navigate("/terms"); }} style={{ color: "#475569", textDecoration: "none", cursor: "pointer" }}>Terms</span> · <span onClick={() => { setActiveTab("privacy"); navigate("/privacy-policy"); }} style={{ color: "#475569", textDecoration: "none", cursor: "pointer" }}>Privacy</span>
          </div>
        </main>
      </div>
    </div>
  );
}
