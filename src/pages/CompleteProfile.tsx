import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trophy, Phone, Loader2, CheckCircle, XCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/common/SEO';

const GLOBAL_COUNTRIES = [
  // Top / Most active ones first
  { name: 'Kenya', code: 'KE', prefix: '+254', length: [9], placeholder: '712345678', flag: '🇰🇪' },
  { name: 'Nigeria', code: 'NG', prefix: '+234', length: [9], placeholder: '803123456', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', prefix: '+27', length: [9], placeholder: '821234567', flag: '🇿🇦' },
  { name: 'Uganda', code: 'UG', prefix: '+256', length: [9], placeholder: '712345678', flag: '🇺🇬' },
  { name: 'Tanzania', code: 'TZ', prefix: '+255', length: [9], placeholder: '712345678', flag: '🇹🇿' },
  { name: 'Ghana', code: 'GH', prefix: '+233', length: [9], placeholder: '241234567', flag: '🇬🇭' },
  { name: 'Rwanda', code: 'RW', prefix: '+250', length: [9], placeholder: '788123456', flag: '🇷🇼' },

  // All other African countries
  { name: 'Algeria', code: 'DZ', prefix: '+213', length: [9], placeholder: '512345678', flag: '🇩🇿' },
  { name: 'Angola', code: 'AO', prefix: '+244', length: [9], placeholder: '912345678', flag: '🇦🇴' },
  { name: 'Benin', code: 'BJ', prefix: '+229', length: [9], placeholder: '901234567', flag: '🇧🇯' },
  { name: 'Botswana', code: 'BW', prefix: '+267', length: [9], placeholder: '712345678', flag: '🇧🇼' },
  { name: 'Burkina Faso', code: 'BF', prefix: '+226', length: [9], placeholder: '701234567', flag: '🇧🇫' },
  { name: 'Burundi', code: 'BI', prefix: '+257', length: [9], placeholder: '712345678', flag: '🇧🇮' },
  { name: 'Cabo Verde', code: 'CV', prefix: '+238', length: [9], placeholder: '912345678', flag: '🇨🇻' },
  { name: 'Cameroon', code: 'CM', prefix: '+237', length: [9], placeholder: '612345678', flag: '🇨🇲' },
  { name: 'Central African Republic', code: 'CF', prefix: '+236', length: [9], placeholder: '701234567', flag: '🇨🇫' },
  { name: 'Chad', code: 'TD', prefix: '+235', length: [9], placeholder: '612345678', flag: '🇹🇩' },
  { name: 'Comoros', code: 'KM', prefix: '+269', length: [9], placeholder: '321234567', flag: '🇰🇲' },
  { name: 'DR Congo', code: 'CD', prefix: '+243', length: [9], placeholder: '812345678', flag: '🇨🇩' },
  { name: 'Congo Republic', code: 'CG', prefix: '+242', length: [9], placeholder: '051234567', flag: '🇨🇬' },
  { name: 'Cote d\'Ivoire', code: 'CI', prefix: '+225', length: [9], placeholder: '071234567', flag: '🇨🇮' },
  { name: 'Djibouti', code: 'DJ', prefix: '+253', length: [9], placeholder: '771234567', flag: '🇩🇯' },
  { name: 'Egypt', code: 'EG', prefix: '+20', length: [9], placeholder: '101234567', flag: '🇪🇬' },
  { name: 'Equatorial Guinea', code: 'GQ', prefix: '+240', length: [9], placeholder: '221234567', flag: '🇬🇶' },
  { name: 'Eritrea', code: 'ER', prefix: '+291', length: [9], placeholder: '712345678', flag: '🇪🇷' },
  { name: 'Eswatini', code: 'SZ', prefix: '+268', length: [9], placeholder: '761234567', flag: '🇸🇿' },
  { name: 'Ethiopia', code: 'ET', prefix: '+251', length: [9], placeholder: '911234567', flag: '🇪🇹' },
  { name: 'Gabon', code: 'GA', prefix: '+241', length: [9], placeholder: '612345678', flag: '🇬🇦' },
  { name: 'Gambia', code: 'GM', prefix: '+220', length: [9], placeholder: '712345678', flag: '🇬🇲' },
  { name: 'Guinea', code: 'GN', prefix: '+224', length: [9], placeholder: '621234567', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', code: 'GW', prefix: '+245', length: [9], placeholder: '951234567', flag: '🇬🇼' },
  { name: 'Lesotho', code: 'LS', prefix: '+266', length: [9], placeholder: '581234567', flag: '🇱🇸' },
  { name: 'Liberia', code: 'LR', prefix: '+231', length: [9], placeholder: '771234567', fontFlag: '🇱🇷', flag: '🇱🇷' },
  { name: 'Libya', code: 'LY', prefix: '+218', length: [9], placeholder: '912345678', flag: '🇱🇾' },
  { name: 'Madagascar', code: 'MG', prefix: '+261', length: [9], placeholder: '321234567', flag: '🇲🇬' },
  { name: 'Malawi', code: 'MW', prefix: '+265', length: [9], placeholder: '881234567', flag: '🇲🇼' },
  { name: 'Mali', code: 'ML', prefix: '+223', length: [9], placeholder: '612345678', flag: '🇲🇱' },
  { name: 'Mauritania', code: 'MR', prefix: '+222', length: [9], placeholder: '451234567', flag: '🇲🇷' },
  { name: 'Mauritius', code: 'MU', prefix: '+230', length: [9], placeholder: '521234567', flag: '🇲🇺' },
  { name: 'Morocco', code: 'MA', prefix: '+212', length: [9], placeholder: '612345678', flag: '🇲🇦' },
  { name: 'Mozambique', code: 'MZ', prefix: '+258', length: [9], placeholder: '821234567', flag: '🇲🇿' },
  { name: 'Namibia', code: 'NA', prefix: '+264', length: [9], placeholder: '811234567', flag: '🇳🇦' },
  { name: 'Niger', code: 'NE', prefix: '+227', length: [9], placeholder: '901234567', flag: '🇳🇪' },
  { name: 'Sao Tome and Principe', code: 'ST', prefix: '+239', length: [9], placeholder: '991234567', flag: '🇸🇹' },
  { name: 'Senegal', code: 'SN', prefix: '+221', length: [9], placeholder: '771234567', flag: '🇸🇳' },
  { name: 'Seychelles', code: 'SC', prefix: '+248', length: [9], placeholder: '251234567', flag: '🇸🇨' },
  { name: 'Sierra Leone', code: 'SL', prefix: '+232', length: [9], placeholder: '761234567', flag: '🇸🇱' },
  { name: 'Somalia', code: 'SO', prefix: '+252', length: [9], placeholder: '612345678', flag: '🇸🇴' },
  { name: 'South Sudan', code: 'SS', prefix: '+211', length: [9], placeholder: '911234567', flag: '🇸🇸' },
  { name: 'Sudan', code: 'SD', prefix: '+249', length: [9], placeholder: '912345678', flag: '🇸🇩' },
  { name: 'Togo', code: 'TG', prefix: '+228', length: [9], placeholder: '901234567', flag: '🇹🇬' },
  { name: 'Tunisia', code: 'TN', prefix: '+216', length: [9], placeholder: '981234567', flag: '🇹🇳' },
  { name: 'Zambia', code: 'ZM', prefix: '+260', length: [9], placeholder: '951234567', flag: '🇿🇲' },
  { name: 'Zimbabwe', code: 'ZW', prefix: '+263', length: [9], placeholder: '771234567', flag: '🇿🇼' },

  // Rest of the world
  { name: 'United Kingdom', code: 'GB', prefix: '+44', length: [9], placeholder: '770090007', flag: '🇬🇧' },
  { name: 'United States', code: 'US', prefix: '+1', length: [9], placeholder: '202555014', flag: '🇺🇸' },
  { name: 'Canada', code: 'CA', prefix: '+1_CA', prefixValue: '+1', length: [9], placeholder: '613555014', flag: '🇨🇦' },
  { name: 'India', code: 'IN', prefix: '+91', length: [9], placeholder: '987654321', flag: '🇮🇳' },
  { name: 'Saudi Arabia', code: 'SA', prefix: '+966', length: [9], placeholder: '501234567', flag: '🇸🇦' },
  { name: 'UAE', code: 'AE', prefix: '+971', length: [9], placeholder: '501234567', flag: '🇦🇪' },
  { name: 'Germany', code: 'DE', prefix: '+49', length: [9], placeholder: '170123456', flag: '🇩🇪' },
  { name: 'France', code: 'FR', prefix: '+33', length: [9], placeholder: '612345678', flag: '🇫🇷' },
  { name: 'Australia', code: 'AU', prefix: '+61', length: [9], placeholder: '412345678', flag: '🇦🇺' },
  { name: 'China', code: 'CN', prefix: '+86', length: [9], placeholder: '138123456', flag: '🇨🇳' },
  { name: 'Brazil', code: 'BR', prefix: '+55', length: [9], placeholder: '119123456', flag: '🇧🇷' },
  { name: 'Japan', code: 'JP', prefix: '+81', length: [9], placeholder: '901234567', flag: '🇯🇵' },
  { name: 'Singapore', code: 'SG', prefix: '+65', length: [9], placeholder: '812345678', flag: '🇸🇬' },
  { name: 'Spain', code: 'ES', prefix: '+34', length: [9], placeholder: '612345678', flag: '🇪🇸' },
  { name: 'Italy', code: 'IT', prefix: '+39', length: [9], placeholder: '312345678', flag: '🇮🇹' },
  { name: 'Portugal', code: 'PT', prefix: '+351', length: [9], placeholder: '912345678', flag: '🇵🇹' },
  { name: 'Netherlands', code: 'NL', prefix: '+31', length: [9], placeholder: '612345678', flag: '🇳🇱' },
  { name: 'Argentina', code: 'AR', prefix: '+54', length: [9], placeholder: '911234567', flag: '🇦🇷' },
  { name: 'Mexico', code: 'MX', prefix: '+52', length: [9], placeholder: '551234567', flag: '🇲🇽' },
  { name: 'Turkey', code: 'TR', prefix: '+90', length: [9], placeholder: '532123456', flag: '🇹🇷' },
  { name: 'Qatar', code: 'QA', prefix: '+974', length: [9], placeholder: '551234567', flag: '🇶🇦' },
  { name: 'Kuwait', code: 'KW', prefix: '+965', length: [9], placeholder: '512345678', flag: '🇰🇼' },
  { name: 'Pakistan', code: 'PK', prefix: '+92', length: [9], placeholder: '300123456', flag: '🇵🇰' },
  { name: 'Bangladesh', code: 'BD', prefix: '+880', length: [9], placeholder: '171234567', flag: '🇧🇩' },
  { name: 'Indonesia', code: 'ID', prefix: '+62', length: [9], placeholder: '812345678', flag: '🇮🇩' },
  { name: 'Malaysia', code: 'MY', prefix: '+60', length: [9], placeholder: '123456789', flag: '🇲🇾' },
  { name: 'Ukraine', code: 'UA', prefix: '+380', length: [9], placeholder: '501234567', flag: '🇺🇦' },
  { name: 'Poland', code: 'PL', prefix: '+48', length: [9], placeholder: '501234567', flag: '🇵🇱' },

  { name: 'Custom Code', code: 'OTH', prefix: '+', length: [9], placeholder: 'Enter 9-digit local number', flag: '🌐' }
];

export default function CompleteProfile() {
  const { user, profile, refreshAuth, signOut } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [countryIndex, setCountryIndex] = useState(0);
  const [whatsappLocal, setWhatsappLocal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailability, setUsernameAvailability] = useState<'checking' | 'available' | 'taken' | 'invalid' | 'too_short' | null>(null);

  // Prefill existing fields if they exist in partial profile
  useEffect(() => {
    if (profile?.username && !profile.username.startsWith('temp_user_')) {
      setUsername(profile.username);
    }
    
    // Parse partial phone number if they have one already
    if (profile?.whatsapp_number) {
      const ph = profile.whatsapp_number;
      // Find matching country code prefix
      const match = GLOBAL_COUNTRIES.find(c => c.prefix !== '+' && ph.startsWith(c.prefix));
      if (match) {
        const idx = GLOBAL_COUNTRIES.indexOf(match);
        setCountryIndex(idx);
        setWhatsappLocal(ph.slice(match.prefix.length));
      } else {
        setWhatsappLocal(ph);
      }
    }
  }, [profile]);

  // Real-time username verification
  useEffect(() => {
    if (!username) {
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

    // Ignore check if it's their own original username
    if (profile?.username === username) {
      setUsernameAvailability('available');
      return;
    }

    setUsernameAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const { data, error: checkError } = await (supabase as any)
          .from('profiles')
          .select('id, username')
          .eq('username', username)
          .maybeSingle();

        if (checkError) throw checkError;

        if (data && data.id !== user?.id) {
          setUsernameAvailability('taken');
        } else {
          setUsernameAvailability('available');
        }
      } catch (err) {
        console.error('Error checking username availability:', err);
        setUsernameAvailability(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, user?.id, profile?.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3) {
        throw new Error('Username must be at least 3 characters.');
      }

      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        throw new Error('Username can only contain letters, numbers, and underscores.');
      }

      if (usernameAvailability === 'taken') {
        throw new Error('This username is already taken. Please try another one.');
      }

      const cleanLocal = whatsappLocal.replace(/[^0-9]/g, '');
      if (!cleanLocal || cleanLocal.length < 7) {
        throw new Error('Please enter a valid WhatsApp phone number (excluding leading zeros).');
      }

      const country = GLOBAL_COUNTRIES[countryIndex];
      const fullWhatsAppNumber = `${country.prefix}${cleanLocal}`;

      // Perform profile update
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({
          username: cleanUsername,
          whatsapp_number: fullWhatsAppNumber,
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Re-fetch updated profile inside contexts
      await refreshAuth();
      
      // Navigate to main application landing
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'An expected write failure occurred. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-black">
      <SEO title="Complete Your Profile" />
      
      {/* Visual background atmospheric elements */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-zinc-850/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none" />

      <div className="w-full max-w-lg bg-[#0b0c11]/95 backdrop-blur-3xl border border-border-main/55 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 mb-8 sm:mb-10">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#1c1d24] to-[#12131a] border border-[#00d1ff]/40 shadow-xl flex items-center justify-center text-primary">
              <Trophy className="w-8 h-8 animate-pulse text-[#00d1ff]" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black italic tracking-tight text-white uppercase leading-none">
              Register Your Codename
            </h1>
            <p className="text-text-muted text-xs font-semibold leading-relaxed uppercase tracking-wider">
              Complete your profile dossier to enter active Tournahub leagues.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/5 mb-6 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-2xl flex items-start space-x-3 text-left">
            <XCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* USERNAME FIELD */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">
              Tournaments username
            </label>
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <span className="text-primary font-black italic text-lg leading-none">@</span>
              </div>
              <input
                type="text"
                required
                disabled={loading}
                className="w-full bg-background/40 border border-border-main rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-text-main font-medium relative z-10"
                placeholder="Enter unique tournaments username"
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
                <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" /> Username available
              </p>
            )}
            {usernameAvailability === 'taken' && (
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider ml-1 mt-1 flex items-center">
                <XCircle className="w-3.5 h-3.5 mr-1 text-red-500 shrink-0" /> Username is taken. Try another.
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

          {/* WHATSAPP NUMBER FIELD */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">
              WhatsApp number
            </label>
            <div className="flex items-center bg-background/40 border border-border-main rounded-2xl focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 overflow-hidden relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              
              {/* Flag prefix selector dropdown */}
              <div className="relative z-20 flex items-center pl-4 pr-2 py-4 border-r border-[#1c1d24] h-full cursor-pointer bg-[#0e0f14]/50 hover:bg-[#15161d] transition-colors">
                <select
                  disabled={loading}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  value={countryIndex}
                  onChange={(e) => setCountryIndex(Number(e.target.value))}
                >
                  {GLOBAL_COUNTRIES.map((c, idx) => (
                    <option key={c.code} value={idx} className="bg-[#111218] text-white">
                      {c.flag} {c.name} ({c.prefix})
                    </option>
                  ))}
                </select>
                <span className="text-sm font-semibold">{GLOBAL_COUNTRIES[countryIndex].flag}</span>
                <span className="ml-1 text-xs font-black text-text-main font-mono">{GLOBAL_COUNTRIES[countryIndex].prefix}</span>
              </div>

              {/* Local Number Input */}
              <input
                type="text"
                inputMode="numeric"
                required
                disabled={loading}
                className="flex-1 bg-transparent border-none outline-none text-text-main font-medium py-4 px-4 placeholder:text-text-muted/40 focus:ring-0 focus:border-none text-sm h-full"
                placeholder={`e.g. ${GLOBAL_COUNTRIES[countryIndex].placeholder}`}
                value={whatsappLocal}
                onChange={(e) => setWhatsappLocal(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            <p className="text-[9px] text-text-muted italic ml-1 mt-1 leading-normal">
              Excluding any leading zero. Must be a valid local WhatsApp communication number.
            </p>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading || usernameAvailability === 'taken' || usernameAvailability === 'checking' || !username || !whatsappLocal}
            className="w-full relative group overflow-hidden rounded-2xl h-14 flex items-center justify-center cursor-pointer transition-all duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-[#00a3cc] to-primary transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative z-10 text-black text-sm font-black uppercase italic tracking-wider flex items-center gap-1.5">
              {loading ? (
                <>Saving Changes... <Loader2 className="w-4 h-4 animate-spin text-black" /></>
              ) : (
                <>Save & Launch Dashboard</>
              )}
            </span>
          </button>
        </form>

        {/* LOGOUT BUTTON - Allow them to log out to escape */}
        <div className="mt-8 border-t border-border-main/55 pt-6 text-center">
          <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase mb-3">
            Want to use a different account?
          </p>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Are you sure you want to sign out and return to Login?')) {
                await signOut();
              }
            }}
            className="inline-flex items-center space-x-2 text-xs font-black uppercase italic tracking-wider text-red-500/90 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 stroke-[2.5px]" />
            <span>Terminate session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
