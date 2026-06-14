import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Trophy, Mail, Lock, Loader2, Phone, Globe, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import SEO from '../components/common/SEO';
import { useAuth } from '../contexts/AuthContext';

const logoUrl = '/android-chrome-512x512.png';

const getTimezones = () => {
  let list: string[] = [];
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      list = Intl.supportedValuesOf('timeZone');
    }
  } catch (e) {
    console.error('Error fetching timezones via Intl:', e);
  }
  if (!list || list.length === 0) {
    list = [
      'Africa/Nairobi',
      'UTC',
      'Africa/Lagos',
      'Africa/Johannesburg',
      'Africa/Cairo',
      'Europe/London',
      'Europe/Paris',
      'America/New_York',
      'America/Los_Angeles',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Australia/Sydney'
    ];
  }
  if (!list.includes('Africa/Nairobi')) {
    list.push('Africa/Nairobi');
  }
  return [...list].sort();
};

const SYSTEM_TIMEZONES = getTimezones();

const GLOBAL_COUNTRIES = [
  { name: 'Kenya', code: 'KE', prefix: '+254', length: [9], placeholder: '712345678', flag: '🇰🇪' },
  { name: 'Nigeria', code: 'NG', prefix: '+234', length: [9], placeholder: '803123456', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', prefix: '+27', length: [9], placeholder: '821234567', flag: '🇿🇦' },
  { name: 'United Kingdom', code: 'GB', prefix: '+44', length: [9], placeholder: '770090007', flag: '🇬🇧' },
  { name: 'United States', code: 'US', prefix: '+1', length: [9], placeholder: '202555014', flag: '🇺🇸' },
  { name: 'Uganda', code: 'UG', prefix: '+256', length: [9], placeholder: '712345678', flag: '🇺🇬' },
  { name: 'Tanzania', code: 'TZ', prefix: '+255', length: [9], placeholder: '712345678', flag: '🇹🇿' },
  { name: 'Ghana', code: 'GH', prefix: '+233', length: [9], placeholder: '241234567', flag: '🇬🇭' },
  { name: 'Rwanda', code: 'RW', prefix: '+250', length: [9], placeholder: '788123456', flag: '🇷🇼' },
  { name: 'India', code: 'IN', prefix: '+91', length: [9], placeholder: '987654321', flag: '🇮🇳' },
  { name: 'Egypt', code: 'EG', prefix: '+20', length: [9], placeholder: '101234567', flag: '🇪🇬' },
  { name: 'Saudi Arabia', code: 'SA', prefix: '+966', length: [9], placeholder: '501234567', flag: '🇸🇦' },
  { name: 'UAE', code: 'AE', prefix: '+971', length: [9], placeholder: '501234567', flag: '🇦🇪' },
  { name: 'Germany', code: 'DE', prefix: '+49', length: [9], placeholder: '170123456', flag: '🇩🇪' },
  { name: 'France', code: 'FR', prefix: '+33', length: [9], placeholder: '612345678', flag: '🇫🇷' },
  { name: 'Australia', code: 'AU', prefix: '+61', length: [9], placeholder: '412345678', flag: '🇦🇺' },
  { name: 'Custom Code', code: 'OTH', prefix: '+', length: [9], placeholder: 'Enter 9-digit local number', flag: '🌐' }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [countryIndex, setCountryIndex] = useState(0);
  const [whatsappLocal, setWhatsappLocal] = useState('');
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi';
    } catch (e) {
      return 'Africa/Nairobi';
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<'checking' | 'available' | 'taken' | 'invalid' | 'too_short' | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { refreshAuth } = useAuth();
  const initialIsSignUp = location.pathname === '/signup' || location.state?.signUp || new URLSearchParams(location.search).get('signup') === 'true';
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  
  const [success, setSuccess] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // Setup Listener for successful Google OAuth Completion via Popup
  useEffect(() => {
    const handleOauthMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;

      if (e.data?.type === 'SUPABASE_OAUTH_SUCCESS') {
        console.log('[Login] Google OAuth success signal received. Logging user in...');
        setLoading(true);
        try {
          await refreshAuth();
          window.location.reload();
        } catch (err: any) {
          setError(err.message || 'Verification state coordination failed.');
          setLoading(false);
        }
      } else if (e.data?.type === 'SUPABASE_OAUTH_ERROR') {
        setError(e.data.error || 'Authentication denied or cancelled inside verification window.');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, [refreshAuth]);

  // Live username checker guard
  useEffect(() => {
    if (!isSignUp || !username) {
      setUsernameAvailability(null);
      return;
    }

    if (username.length < 3) {
      setUsernameAvailability('too_short');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameAvailability('invalid');
      return;
    }

    setUsernameAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const { data, error: checkError } = await (supabase as any)
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();
        if (checkError) throw checkError;
        if (data) {
          setUsernameAvailability('taken');
        } else {
          setUsernameAvailability('available');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameAvailability(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, isSignUp]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        if (!agreedToTerms || !agreedToPrivacy) {
          throw new Error('Please agree to both the Terms & Conditions and the Privacy Policy by ticking the boxes.');
        }

        // Verify password length and confirmation
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        // Enforce username requirements
        if (!username || username.length < 3) {
          throw new Error('Tournaments username must be at least 3 characters long');
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          throw new Error('Tournaments username can only contain letters, numbers, and underscores');
        }

        if (usernameAvailability === 'taken') {
          throw new Error('Tournaments username is already taken. Try another one, champion.');
        }

        // Enforce WhatsApp requirements
        const country = GLOBAL_COUNTRIES[countryIndex];
        const cleanLocal = whatsappLocal.replace(/^0+/, ''); // strip leading zeroes
        if (!cleanLocal) {
          throw new Error('WhatsApp number is required.');
        }

        if (cleanLocal.length !== 9) {
          throw new Error('WhatsApp number must be exactly 9 digits long (excluding any leading zero).');
        }

        const fullWhatsAppNumber = `${country.prefix}${cleanLocal}`;

        // Check uniqueness before signing up (quick pre-check)
        const { data: existing, error: checkError } = await (supabase as any)
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (checkError) console.error('Username check error:', checkError);
        if (existing) {
          throw new Error('Tournaments username is already taken. Try another one, champion.');
        }

        // Save pending signup email in localStorage for seamless recovery
        localStorage.setItem('pending_signup_email', email);

        const { error: signUpErr, data } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/verify-callback`,
            data: {
              username: username,
              role: 'user',
              whatsapp_number: fullWhatsAppNumber,
              timezone: timezone
            }
          }
        });
        if (signUpErr) throw signUpErr;
        
        if (data.user) {
          // Explicitly update profiles table to ensure whatsapp_number and timezone are stored
          const { error: profileError } = await (supabase as any)
            .from('profiles')
            .update({ 
              whatsapp_number: fullWhatsAppNumber,
              timezone: timezone
            })
            .eq('id', data.user.id);
          if (profileError) {
            console.error('Failed to update profiles during signup:', profileError);
          }
        }
        
        if (data.user && data.session) {
          // Auto-logged in
          navigate('/dashboard');
        } else {
          // Immediately redirect users to the dedicated Verify Email page
          navigate('/verify-email', { state: { email, username } });
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          if (signInErr.message?.toLowerCase().includes('email not confirmed')) {
            // Friendly redirect for unverified users trying to log in
            localStorage.setItem('pending_signup_email', email);
            navigate(`/verify-email?email=${encodeURIComponent(email)}&fromLogin=true`);
            return;
          }
          throw signInErr;
        }
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      <SEO 
        title={isSignUp ? "Register Account" : "Sign In to your Account"}
        description={isSignUp 
          ? "Create your Tournahub credentials. Join football & eFootball brackets, maintain professional standings, and enter dynamic league stages with secure match transactions."
          : "Sign in to access your Tournahub dashboard. Check active tournament lists, your local wallet balances, and pending game fixtures."}
        path={isSignUp ? "/signup" : "/login"}
      />
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.05)_0%,transparent_100%)] pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center space-y-6 mb-12">
          <div className="flex justify-center group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img 
                src={logoUrl} 
                alt="TournaHubLogo" 
                className="w-32 h-32 object-contain relative z-10 transition-transform duration-500 group-hover:scale-110" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black italic text-text-main tracking-tight uppercase">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </h1>
            <p className="text-text-muted font-bold uppercase tracking-[0.2em] text-[10px]">
              {isSignUp ? 'Create your professional account' : 'Welcome back to the Arena'}
            </p>
          </div>
        </div>

        <div className="bg-surface/80 backdrop-blur-2xl border border-border-main rounded-[2.5rem] p-8 shadow-2xl shadow-black/20">
          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Tournaments username</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <span className="text-primary font-black italic text-lg leading-none">@</span>
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full bg-background/40 border border-border-main rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-text-main font-medium relative z-10 animate-fade-in"
                    placeholder="Enter your Tournaments username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                  />
                </div>
                {/* Real-time username validation checks */}
                {usernameAvailability === 'checking' && (
                  <p className="text-[10px] text-text-muted animate-pulse font-bold uppercase tracking-wider ml-1 mt-1 flex items-center">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin text-primary shrink-0" /> Checking availability...
                  </p>
                )}
                {usernameAvailability === 'available' && (
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider ml-1 mt-1 flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" /> Username not taken
                  </p>
                )}
                {usernameAvailability === 'taken' && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1 mt-1 flex items-center">
                    <XCircle className="w-3.5 h-3.5 mr-1 text-red-500 shrink-0" /> Username is already taken. Try another.
                  </p>
                )}
                {usernameAvailability === 'too_short' && (
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider ml-1 mt-1">
                    Username must be at least 3 characters.
                  </p>
                )}
                {usernameAvailability === 'invalid' && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1 mt-1">
                    Can only contain letters, numbers, and underscores.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-primary transition-colors pointer-events-none z-20" />
                <input
                  type="email"
                  required
                  className="w-full bg-background/40 border border-border-main rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-text-main font-medium relative z-10"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[9px] uppercase font-black tracking-widest text-[#9ca3af] hover:text-primary transition-colors relative z-20"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-background/40 border border-border-main rounded-2xl px-4 pr-12 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-text-main font-medium relative z-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors z-30"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="w-full bg-background/40 border border-border-main rounded-2xl px-4 pr-12 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-text-main font-medium relative z-10"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors z-30"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">
                  WhatsApp Number (for match coordination)
                </label>
                <div className="relative group flex items-center bg-background/40 border border-border-main rounded-2xl relative z-10 h-14">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  
                  {/* Country Prefix Selector */}
                  <div className="relative flex items-center h-full pl-4 border-r border-[#1a1b24] pr-2 shrink-0">
                    <span className="text-[14px]">{GLOBAL_COUNTRIES[countryIndex].flag}</span>
                    <select
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-base"
                      value={countryIndex}
                      onChange={(e) => setCountryIndex(Number(e.target.value))}
                    >
                      {GLOBAL_COUNTRIES.map((c, idx) => (
                        <option key={c.code} value={idx} className="bg-[#111218] text-white text-xs">
                          {c.flag} {c.name} ({c.prefix})
                        </option>
                      ))}
                    </select>
                    <span className="ml-1 text-xs font-black text-text-main font-mono">{GLOBAL_COUNTRIES[countryIndex].prefix}</span>
                  </div>

                  {/* Local Number Input */}
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={9}
                    className="flex-1 bg-transparent border-none outline-none text-text-main font-medium py-3 px-4 placeholder:text-text-muted/50 focus:ring-0 focus:border-none text-sm h-full"
                    placeholder={`e.g. ${GLOBAL_COUNTRIES[countryIndex].placeholder}`}
                    value={whatsappLocal}
                    onChange={(e) => setWhatsappLocal(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                  />
                </div>
                <p className="text-[9px] text-text-muted italic ml-1 mt-1">
                  Excluding any leading zero. Must be exactly 9 digits.
                </p>
              </div>
            )}



            {isSignUp && (
              <div className="space-y-3 px-1">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="h-4 w-4 bg-background/40 border border-border-main rounded text-primary focus:ring-1 focus:ring-primary/50 accent-primary cursor-pointer relative z-20 animate-fade-in"
                  />
                  <label htmlFor="agree-terms" className="text-[10px] font-black text-text-muted hover:text-text-main uppercase tracking-wider leading-none cursor-pointer select-none relative z-20">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="text-primary hover:underline italic font-black cursor-pointer"
                    >
                      Terms & Conditions
                    </Link>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="agree-privacy"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                    className="h-4 w-4 bg-background/40 border border-border-main rounded text-primary focus:ring-1 focus:ring-primary/50 accent-primary cursor-pointer relative z-20 animate-fade-in"
                  />
                  <label htmlFor="agree-privacy" className="text-[10px] font-black text-text-muted hover:text-text-main uppercase tracking-wider leading-none cursor-pointer select-none relative z-20">
                    I agree to the{" "}
                    <Link
                      to="/privacy-policy"
                      className="text-primary hover:underline italic font-black cursor-pointer"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>
            )}

            {/* Verification Success Box */}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold p-5 rounded-2xl flex flex-col space-y-2 animate-fade-in">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                  <span className="uppercase tracking-wider text-xs">Verify your Profile</span>
                </div>
                <p className="text-[10px] text-text-muted normal-case font-medium leading-relaxed">
                  {success}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/5 border border-red-500/10 text-red-500 text-[11px] font-bold p-4 rounded-xl flex items-center space-x-3 animate-fade-in">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-2xl"
            >
              <div className="absolute inset-0 bg-primary transition-transform group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="relative h-16 flex items-center justify-center space-x-3">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
                ) : (
                  <span className="text-slate-900 text-xl font-black italic uppercase tracking-tighter">
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </span>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-border-main space-y-6">
            <button 
              type="button"
              onClick={async () => {
                setLoading(true);
                setError(null);
                setSuccess(null);
                try {
                  if (isSignUp) {
                    if (!agreedToTerms || !agreedToPrivacy) {
                      throw new Error('Please agree to both the Terms & Conditions and the Privacy Policy by ticking the boxes.');
                    }

                    // Enforce username requirements
                    if (!username || username.length < 3) {
                      throw new Error('Please enter a Tournaments username (at least 3 characters) first.');
                    }

                    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                      throw new Error('Tournaments username can only contain letters, numbers, and underscores.');
                    }

                    if (usernameAvailability === 'taken') {
                      throw new Error('This Tournaments username is already taken. Try another one, champion.');
                    }

                    // Enforce WhatsApp requirements
                    const country = GLOBAL_COUNTRIES[countryIndex];
                    const cleanLocal = whatsappLocal.replace(/^0+/, '');
                    if (!cleanLocal) {
                      throw new Error('WhatsApp number is required for match coordination signup.');
                    }

                    if (cleanLocal.length !== 9) {
                      throw new Error('Local WhatsApp number must be exactly 9 digits.');
                    }

                    const fullWhatsAppNumber = `${country.prefix}${cleanLocal}`;

                    // Check uniqueness
                    const { data: existing, error: checkError } = await (supabase as any)
                      .from('profiles')
                      .select('username')
                      .eq('username', username)
                      .maybeSingle();

                    if (checkError) {
                      console.error('Username check error:', checkError);
                    }
                    if (existing) {
                      throw new Error('This Tournaments username is already taken. Try another one, champion.');
                    }

                    // Save settings to local storage so AuthContext can pick them up on redirect back
                    localStorage.setItem('pending_oauth_username', username);
                    localStorage.setItem('pending_oauth_whatsapp_number', fullWhatsAppNumber);
                    localStorage.setItem('pending_oauth_timezone', timezone);
                  }

                  const redirectUrl = `${window.location.origin}/verify-callback`;
                  const { data: oauthData, error: oauthErr } = await supabase.auth.signInWithOAuth({ 
                    provider: 'google',
                    options: {
                      redirectTo: redirectUrl,
                      skipBrowserRedirect: true
                    }
                  });
                  
                  if (oauthErr) {
                    throw oauthErr;
                  }

                  if (oauthData?.url) {
                    const popup = window.open(
                      oauthData.url,
                      'tournahub_google_oauth',
                      'width=500,height=600,resizable=yes,scrollbars=yes,status=yes'
                    );

                    if (!popup) {
                      throw new Error('Popup blocker active. Please allow popups for TournaHub to authenticate with Google.');
                    }
                  } else {
                    throw new Error('Could not request Google OAuth securely.');
                  }
                } catch (err: any) {
                  setError(err.message);
                  setLoading(false);
                }
              }}
              className="w-full flex items-center justify-center space-x-4 bg-surface hover:bg-surface-hover border border-border-main py-4 rounded-2xl transition-all"
            >
              <div className="bg-white p-1 rounded-md">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/>
                  <path fill="#34A853" d="M16.04 18.013c-1.09.693-2.447 1.096-4.04 1.096-3.13 0-5.783-2.115-6.734-4.89l-4.026 3.15C3.198 21.341 7.27 24 12 24c3.055 0 5.864-1.012 7.82-2.823l-3.78-3.164z"/>
                  <path fill="#4285F4" d="M19.82 21.177l3.78 3.164c2.502-2.31 4.4-6.07 4.4-11.841 0-.82-.07-1.611-.194-2.373H12v4.544h7.524c-.328 1.674-1.272 3.092-2.617 4.026l3.78 3.164z"/>
                  <path fill="#FBBC05" d="M5.266 14.235L1.24 17.385C.454 15.795 0 13.978 0 12c0-1.978.454-3.795 1.24-5.385l4.026 3.115C5.084 10.556 5 11.265 5 12c0 .735.084 1.444.266 2.235z"/>
                </svg>
              </div>
              <span className="text-xs font-black text-text-main uppercase tracking-widest italic">Continue with Google</span>
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  const targetSignUp = !isSignUp;
                  setIsSignUp(targetSignUp);
                  setConfirmPassword('');
                  setError(null);
                  setSuccess(null);
                  navigate(targetSignUp ? '/signup' : '/login', { replace: true });
                }}
                className="text-[11px] font-black uppercase tracking-widest text-[#9ca3af] hover:text-primary transition-all underline underline-offset-8 decoration-border-main hover:decoration-primary/30"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center flex items-center justify-center space-x-3 opacity-30 group cursor-help hover:opacity-100 transition-opacity">
          <div className="h-px w-8 bg-border-main" />
          <span className="text-[9px] font-black uppercase tracking-[0.5em] text-text-muted">Encrypted Uplink Established</span>
          <div className="h-px w-8 bg-border-main" />
        </div>

        <div className="mt-6 text-center flex items-center justify-center space-x-4">
          <Link
            to="/terms"
            className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all underline underline-offset-4 decoration-border-main"
          >
            Terms & Conditions
          </Link>
          <span className="text-border-main text-xs font-black">•</span>
          <Link
            to="/privacy-policy"
            className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all underline underline-offset-4 decoration-border-main"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
