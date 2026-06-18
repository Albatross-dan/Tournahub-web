import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trophy, Phone, Loader2, CheckCircle, XCircle, LogOut, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/common/SEO';
import { 
  getCountries, 
  getCountryCallingCode, 
  AsYouType, 
  isValidPhoneNumber, 
  parsePhoneNumber, 
  getExampleNumber,
  CountryCode 
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';

const countryList = getCountries().map(code => {
  let name: string = code;
  try {
    name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch (e) {
    name = code;
  }
  return {
    countryCode: code as CountryCode,
    callingCode: `+${getCountryCallingCode(code)}`,
    name
  };
}).sort((a, b) => a.name.localeCompare(b.name));

const priorityCodes = ['KE', 'NG', 'GH', 'TZ', 'UG', 'ZA', 'ET', 'CM', 'CI', 'SN'];

const priorityCountries = priorityCodes
  .map(code => countryList.find(c => c.countryCode === code))
  .filter((c): c is NonNullable<typeof c> => !!c);

const remainingCountries = countryList.filter(
  c => !priorityCodes.includes(c.countryCode)
);

const countryOptions = [...priorityCountries, ...remainingCountries];

function getExpectedDigits(countryCode: CountryCode) {
  try {
    const example = getExampleNumber(countryCode, examples);
    return example?.nationalNumber?.length ?? null;
  } catch {
    return null;
  }
}

function getExampleFormat(countryCode: CountryCode) {
  try {
    const example = getExampleNumber(countryCode, examples);
    return example?.formatNational() ?? null;
  } catch {
    return null;
  }
}

function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '';
  }
}

export default function CompleteProfile() {
  const { user, profile, refreshAuth, signOut } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('KE');
  const [numberInput, setNumberInput] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formattedPreview, setFormattedPreview] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const expectedDigits = getExpectedDigits(selectedCountry);
  const exampleFormat = getExampleFormat(selectedCountry);
  const placeholder = getExampleNumber(selectedCountry, examples)?.nationalNumber ?? '712345678';

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
      try {
        const parsed = parsePhoneNumber(profile.whatsapp_number);
        if (parsed) {
          if (parsed.country) {
            setSelectedCountry(parsed.country);
          }
          setNumberInput(parsed.nationalNumber);
          
          const callingCode = getCountryCallingCode(parsed.country || 'KE');
          const formatter = new AsYouType(parsed.country || 'KE');
          const formatted = formatter.input(`+${callingCode}${parsed.nationalNumber}`);
          setFormattedPreview(formatted);
          
          const fullNumber = `+${callingCode}${parsed.nationalNumber}`;
          const valid = isValidPhoneNumber(fullNumber, parsed.country || 'KE');
          setIsValid(valid);
          setErrorMessage('');
        }
      } catch (e) {
        console.error('[CompleteProfile] Error parsing pre-existing whatsapp number:', e);
        setNumberInput(profile.whatsapp_number.replace(/^\+/, ''));
        setIsValid(null);
      }
    }
  }, [profile]);

  const handleNumberChange = (value: string, country = selectedCountry) => {
    const digitsOnly = value.replace(/\D/g, '');
    setNumberInput(digitsOnly);

    if (!digitsOnly) {
      setIsValid(null);
      setErrorMessage('');
      setFormattedPreview('');
      return;
    }

    const formatter = new AsYouType(country);
    const callingCode = getCountryCallingCode(country);
    const formatted = formatter.input(`+${callingCode}${digitsOnly}`);
    setFormattedPreview(formatted);

    const fullNumber = `+${callingCode}${digitsOnly}`;
    const valid = isValidPhoneNumber(fullNumber, country);
    setIsValid(valid);

    if (!valid && digitsOnly.length >= 4) {
      const expectedDigits = getExpectedDigits(country);
      const countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(country) || country;
      setErrorMessage(
        expectedDigits
          ? `${countryName} numbers need ${expectedDigits} digits after the country code`
          : 'Invalid number for the selected country'
      );
    } else {
      setErrorMessage('');
    }
  };

  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    handleNumberChange(numberInput, country);
  };

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

      const callingCode = getCountryCallingCode(selectedCountry);
      const fullWhatsAppNumber = `+${callingCode}${numberInput}`;

      if (!isValidPhoneNumber(fullWhatsAppNumber, selectedCountry)) {
        throw new Error('Please enter a valid WhatsApp number before saving.');
      }

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
      console.error('[CompleteProfile] Error saving profile:', err);
      // Backend already enforces E.164 — if the save still fails with a constraint error, catch it and show
      if (err.message && err.message.includes('profiles_whatsapp_number_check')) {
        setError('This number format is not accepted. Please check your country code and number.');
      } else {
        setError(err.message || 'This number format is not accepted. Please check your country code and number.');
      }
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
            
            {/* Country and Phone input layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Searchable Country Selector Dropdown */}
              <div className="md:col-span-1 relative z-30">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Country</label>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="w-full h-14 bg-background/40 border border-border-main rounded-2xl px-4 flex items-center justify-between text-white font-bold transition-all focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none text-xs"
                >
                  <span className="flex items-center space-x-2 truncate">
                    <span className="text-base">{getFlagEmoji(selectedCountry)}</span>
                    <span className="truncate text-text-main">
                      {countryOptions.find(c => c.countryCode === selectedCountry)?.name || selectedCountry}
                    </span>
                  </span>
                  <span className="text-zinc-500">▼</span>
                </button>

                {/* Dropdown Panel */}
                {showCountryDropdown && (
                  <div className="absolute left-0 mt-2 w-full max-h-64 bg-[#16171f] border border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-zinc-800 bg-[#0b0c11]">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        className="w-full bg-[#111218] border border-zinc-805 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 max-h-48 custom-scrollbar">
                      {countryOptions.filter(c =>
                        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                        c.callingCode.includes(countrySearch)
                      ).length === 0 ? (
                        <div className="p-3 text-[10px] text-zinc-500 text-center">No results for "{countrySearch}"</div>
                      ) : (
                        countryOptions.filter(c =>
                          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                          c.callingCode.includes(countrySearch)
                        ).map((c) => (
                          <button
                            key={c.countryCode}
                            type="button"
                            onClick={() => {
                              handleCountryChange(c.countryCode);
                              setShowCountryDropdown(false);
                              setCountrySearch('');
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors text-[10px] flex items-center justify-between ${
                              selectedCountry === c.countryCode ? "bg-primary/20 text-primary font-black" : "text-white"
                            }`}
                          >
                            <span className="flex items-center space-x-1.5 truncate">
                              <span>{getFlagEmoji(c.countryCode)}</span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="text-text-muted font-mono">{c.callingCode}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Input Box with static calling code prefix next to it */}
              <div className="md:col-span-2 relative">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black italic text-sm leading-none select-none">
                    {getCountryCallingCode(selectedCountry) ? `+${getCountryCallingCode(selectedCountry)}` : ''}
                  </span>
                  <input
                    type="tel"
                    disabled={loading}
                    className="w-full bg-background/40 border border-border-main rounded-2xl pl-16 pr-4 py-4 text-xs font-bold transition-all placeholder-zinc-700 text-white shadow-inner focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none h-14"
                    placeholder={`e.g. ${placeholder}`}
                    value={numberInput}
                    onChange={(e) => handleNumberChange(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Previews and format validations */}
            <div className="mt-2 space-y-1 pl-1">
              <p className="hint-text text-[9px] text-text-muted">
                {exampleFormat && expectedDigits
                  ? `e.g. ${exampleFormat} · ${expectedDigits} digits, excluding leading zero`
                  : 'Enter your number without the country code'}
              </p>

              {isValid === true && formattedPreview && (
                <p className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                  <span>✓ {formattedPreview}</span>
                </p>
              )}

              {isValid === false && errorMessage && (
                <p className="text-[10px] text-red-500 font-bold flex items-center space-x-1">
                  <span>✗ {errorMessage}</span>
                </p>
              )}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading || usernameAvailability === 'taken' || usernameAvailability === 'checking' || !username || isValid !== true}
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
