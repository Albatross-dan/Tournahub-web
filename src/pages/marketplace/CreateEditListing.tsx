import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Store, Upload, Trash2, ArrowLeft, Save, Send, AlertCircle, Zap, Coins, Trophy, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import Shell from '../../components/layout/Shell';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { marketplaceService } from '../../services/marketplaceService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const PLATFORM_DB_VALUE: Record<string, string> = {
  'PlayStation (PS4/PS5)': 'PS4',
  'PlayStation 5 (PS5)': 'PS5',
  'PlayStation 4 (PS4)': 'PS4',
  'Xbox Series / One': 'Xbox',
  'Xbox Series/One': 'Xbox',
  'Mobile (Android/iOS)': 'Mobile',
  'PC (Steam/Windows)': 'PC',
  'PS5': 'PS5',
  'PS4': 'PS4',
  'Xbox': 'Xbox',
  'Mobile': 'Mobile',
  'PC': 'PC',
  'Other': 'Other'
};

const getDbPlatform = (val?: string) => {
  if (!val) return 'Mobile';
  return PLATFORM_DB_VALUE[val] ?? (['PS4', 'PS5', 'Xbox', 'PC', 'Mobile', 'Other'].includes(val) ? val : 'Other');
};

export default function CreateEditListing() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listingId, setListingId] = useState<string>(id || '');
  const [uploadFolderId] = useState<string>(id || crypto.randomUUID());
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [uploadingImg, setUploadingImg] = useState<boolean>(false);

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [platform, setPlatform] = useState<string>('Mobile');
  const [priceUsd, setPriceUsd] = useState<string>('');
  const [accountLevel, setAccountLevel] = useState<string>('');
  const [gpAmount, setGpAmount] = useState<number>(0);
  const [coinsAmount, setCoinsAmount] = useState<number>(0);
  const [featuredInput, setFeaturedInput] = useState<string>('');
  const [epicInput, setEpicInput] = useState<string>('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('draft');

  useEffect(() => {
    if (!id) return;
    const fetchExisting = async () => {
      setLoading(true);
      try {
        const data = await marketplaceService.getListingById(id);
        if (data) {
          if (data.seller_id !== user?.id) {
            toast.error('You do not have permission to edit this listing.');
            navigate('/marketplace');
            return;
          }
          setListingId(data.id);
          setTitle(data.title || '');
          setDescription(data.description || '');
          setPlatform(getDbPlatform(data.platform));
          setPriceUsd(data.price_usd && data.price_usd > 0.01 ? String(data.price_usd) : '');
          setAccountLevel(String(data.account_level || ''));
          setGpAmount(data.gp_amount || 0);
          setCoinsAmount(data.coins_amount || 0);
          setScreenshots(data.screenshots || []);
          setStatus(data.status || 'draft');

          if (Array.isArray(data.featured_players)) {
            setFeaturedInput(data.featured_players.join(', '));
          }
          if (Array.isArray(data.epic_players)) {
            setEpicInput(data.epic_players.join(', '));
          }
        }
      } catch (err: any) {
        toast.error('Failed to load listing.');
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
  }, [id, user?.id, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const files = Array.from(e.target.files) as File[];
    if (screenshots.length + files.length > 8) {
      toast.error('You can upload a maximum of 8 screenshots per listing.');
      return;
    }

    setUploadingImg(true);
    try {
      const { data: { user: liveUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !liveUser) {
        toast.error('Authentication required.');
        setUploadingImg(false);
        return;
      }
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const path = await marketplaceService.uploadScreenshot(liveUser.id, listingId || uploadFolderId, file);
        uploadedPaths.push(path);
      }
      setScreenshots((prev) => [...prev, ...uploadedPaths]);
      toast.success(`Uploaded ${files.length} screenshot(s)!`);
    } catch (err: any) {
      toast.error(err.message || 'Error uploading screenshots.');
    } finally {
      setUploadingImg(false);
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const parsePlayers = (input: string): string[] => {
    if (!input.trim()) return [];
    return input
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error('Please enter a listing title.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user: liveUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !liveUser) {
        toast.error('Authentication required.');
        setSaving(false);
        navigate('/login');
        return;
      }

      const parsedPrice = parseFloat(priceUsd);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        toast.error('Please enter a valid price (> $0.00).');
        return;
      }

      console.log('price_usd being sent:', parsedPrice, typeof parsedPrice);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        platform: getDbPlatform(platform),
        price_usd: parsedPrice,
        account_level: accountLevel.trim() || undefined,
        gp_amount: Number(gpAmount) || 0,
        coins_amount: Number(coinsAmount) || 0,
        featured_players: parsePlayers(featuredInput),
        epic_players: parsePlayers(epicInput),
        screenshots,
        status: 'draft' as any,
      };

      const savedId = await marketplaceService.saveDraftListing(liveUser.id, payload, listingId || undefined);
      setListingId(savedId);
      setStatus('draft');
      toast.success('Listing saved as draft successfully!');
      if (!id) {
        navigate(`/marketplace/edit/${savedId}`, { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(priceUsd);
    if (!title.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Title and a valid price (> $0.00) are required.');
      return;
    }
    if (screenshots.length === 0) {
      toast.error('At least 1 screenshot is required to publish an account listing.');
      return;
    }

    setPublishing(true);
    try {
      const { data: { user: liveUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !liveUser) {
        toast.error('Authentication required.');
        setPublishing(false);
        navigate('/login');
        return;
      }

      console.log('price_usd being sent:', parsedPrice, typeof parsedPrice);

      // First save draft to ensure all latest form fields and screenshots are synced to DB
      const payload = {
        title: title.trim(),
        description: description.trim(),
        platform: getDbPlatform(platform),
        price_usd: parsedPrice,
        account_level: accountLevel.trim() || undefined,
        gp_amount: Number(gpAmount) || 0,
        coins_amount: Number(coinsAmount) || 0,
        featured_players: parsePlayers(featuredInput),
        epic_players: parsePlayers(epicInput),
        screenshots,
        status: status as any,
      };

      const targetId = await marketplaceService.saveDraftListing(liveUser.id, payload, listingId || undefined);

      // Now call RPC publish
      const res = await marketplaceService.publishListing(liveUser.id, targetId);
      if (res && res.error) {
        toast.error(res.error);
        setPublishing(false);
      } else {
        toast.success('🎉 Account listing published to the Marketplace!');
        navigate(`/marketplace/listing/${targetId}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish listing.');
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="py-32 flex flex-col items-center justify-center space-y-4 text-slate-400">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            Loading Listing Data...
          </span>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <MarketplaceNavbar />

        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </button>
          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-slate-800 rounded-lg text-slate-300 border border-white/5">
            Current Status: <strong className={status === 'published' ? 'text-emerald-400' : 'text-amber-400'}>{status}</strong>
          </span>
        </div>

        <div className="card bg-surface border-border-main rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/5 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-wider">
                {id ? 'Edit Account Listing' : 'List Your eFootball Account'}
              </h2>
              <p className="text-xs text-text-muted font-bold mt-1">
                Enter your account specifications, upload high-resolution screenshots, and set your USD price.
              </p>
            </div>
          </div>

          <form onSubmit={handlePublish} className="space-y-6">
            {/* Title & Platform */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                  Listing Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3140 Strength Squad | Big Time Messi & Ronaldinho | 5k Coins"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3.5 text-xs font-bold text-white outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                  Platform *
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3.5 text-xs font-bold text-white outline-none cursor-pointer"
                >
                  <option value="Mobile">Mobile (Android/iOS)</option>
                  <option value="PS5">PlayStation 5 (PS5)</option>
                  <option value="PS4">PlayStation 4 (PS4)</option>
                  <option value="Xbox">Xbox Series / One</option>
                  <option value="PC">PC (Steam/Windows)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Price USD & Team Strength */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  Listing Price (USD $) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="50.00"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  className="w-full bg-background border border-border-main focus:border-emerald-400 rounded-xl p-3.5 text-sm font-mono font-extrabold text-white outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Team Strength / Level
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3150 or Level 100"
                  value={accountLevel}
                  onChange={(e) => setAccountLevel(e.target.value)}
                  className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3.5 text-xs font-bold text-white outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> eFootball Coins
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={coinsAmount}
                  onChange={(e) => setCoinsAmount(Number(e.target.value))}
                  className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3.5 text-xs font-mono font-bold text-white outline-none transition-all"
                />
              </div>
            </div>

            {/* GP Amount & Featured/Epic Players */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                  GP Balance Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 2500000"
                  value={gpAmount}
                  onChange={(e) => setGpAmount(Number(e.target.value))}
                  className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3.5 text-xs font-mono font-bold text-white outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-amber-400">
                  ★ Epic & Big Time Legends (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Big Time Messi (2015), Epic Cruyff, Showtime Mbappe"
                  value={epicInput}
                  onChange={(e) => setEpicInput(e.target.value)}
                  className="w-full bg-background border border-border-main focus:border-amber-400 rounded-xl p-3.5 text-xs font-bold text-white outline-none transition-all"
                />
              </div>
            </div>

            {/* Featured Players */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-primary">
                ◆ Featured & POTW Players (Comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. POTW Haaland, Featured Vinicius Jr, Showtime Bellingham"
                value={featuredInput}
                onChange={(e) => setFeaturedInput(e.target.value)}
                className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3.5 text-xs font-bold text-white outline-none transition-all"
              />
            </div>

            {/* Detailed Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                Detailed Account Breakdown & Notes
              </label>
              <textarea
                rows={4}
                placeholder="List available managers, contract renewals, skill trainers, login methods (e.g. Konami ID only, Game Center unlinked), and any other valuable items..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background border border-border-main focus:border-primary rounded-xl p-3.5 text-xs text-slate-200 outline-none transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Screenshots Uploader */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                  <span>Account Screenshots * (At least 1 required to publish)</span>
                </label>
                <span className="text-xs font-mono font-bold text-slate-400">{screenshots.length} / 8</span>
              </div>

              <div className="border-2 border-dashed border-white/10 hover:border-primary/50 rounded-3xl p-6 text-center transition-all bg-background/50 relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={screenshots.length >= 8 || uploadingImg}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Upload className="w-8 h-8 text-primary mx-auto mb-2 animate-bounce" />
                <p className="text-sm font-black text-white uppercase italic">Click or drag images to upload</p>
                <p className="text-xs text-text-muted font-bold mt-1">
                  Upload squad view, reserves, coins, and manager screenshots (JPG, PNG, WEBP)
                </p>
                {uploadingImg && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-primary">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Uploading images to cloud storage...</span>
                  </div>
                )}
              </div>

              {/* Thumbnails grid */}
              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-3">
                  {screenshots.map((shot, idx) => {
                    const thumbUrl = marketplaceService.getListingImageUrl(shot);
                    return (
                      <div key={idx} className="relative aspect-[16/10] bg-slate-900 rounded-xl overflow-hidden border border-white/10 group">
                        <img src={thumbUrl} alt={`Screenshot ${idx}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-slate-950 font-black text-[8px] uppercase tracking-wider rounded">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeScreenshot(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 text-white rounded-md opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Actions */}
            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-end gap-4">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving || publishing || uploadingImg}
                className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Draft...' : 'Save as Draft'}</span>
              </button>

              <button
                type="submit"
                disabled={saving || publishing || uploadingImg}
                className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary-dark text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 stroke-[2.5px]" />
                <span>{publishing ? 'Publishing...' : 'Publish Listing'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Shell>
  );
}
