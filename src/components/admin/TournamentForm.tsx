import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tournament } from '../../types/database';
import { tournamentService } from '../../services/tournamentService';
import { storageService } from '../../services/storageService';
import { TournamentStatus, TOURNAMENT_STATUS_LABELS, ALLOWED_STATUSES } from '../../constants';
import { Loader2, Upload, AlertCircle, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn, getStorageUrl } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const tournamentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.enum(['league', 'knockout', 'swiss', 'group_stage', 'hybrid', 'champions_league']),
  max_players: z.number().min(2, "At least 2 players required"),
  entry_fee: z.number().min(0),
  prize_pool: z.number().min(0),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  banner_url: z.string().optional(),
  double_round_robin: z.boolean().optional(),
  swiss_rounds: z.number().optional(),
  cl_direct_qualify_count: z.number().optional(),
  cl_playoff_zone_count: z.number().optional(),
  cl_two_legged_rounds: z.boolean().optional(),
}).refine(data => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return end >= start;
}, {
  message: "End date must be after or same as start date",
  path: ["end_date"],
}).superRefine((data, ctx) => {
  if (data.type === 'champions_league') {
    const direct = data.cl_direct_qualify_count || 8;
    const playoff = data.cl_playoff_zone_count || 16;
    
    // Check power of two
    const knockoutTeams = direct + Math.floor(playoff / 2);
    const isPowerOfTwo = knockoutTeams > 0 && (knockoutTeams & (knockoutTeams - 1)) === 0;
    if (!isPowerOfTwo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Direct qualifiers (${direct}) + Playoff winners (${playoff}/2 = ${Math.floor(playoff/2)}) must equal a power of two (2, 4, 8, 16, 32...). Currently ${knockoutTeams}.`,
        path: ["cl_direct_qualify_count"]
      });
    }

    if (data.max_players < direct + playoff) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Max capacity (${data.max_players}) must be at least direct qualifiers + playoff zone (${direct + playoff}).`,
        path: ["max_players"]
      });
    }
  }
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

interface TournamentFormProps {
  initialData?: Tournament;
  mode: 'create' | 'edit';
}

export default function TournamentForm({ initialData, mode }: TournamentFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>(
    initialData?.banner_url ? (getStorageUrl('tournament-banners', initialData.banner_url) || '') : ''
  );

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      type: initialData.type,
      max_players: initialData.max_players,
      entry_fee: initialData.entry_fee || 0,
      prize_pool: initialData.prize_pool || 0,
      description: initialData.description || '',
      status: initialData.status || TournamentStatus.DRAFT,
      start_date: initialData.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : '',
      end_date: initialData.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : '',
      banner_url: initialData.banner_url || '',
      double_round_robin: (Array.isArray((initialData as any).tournament_settings) 
        ? (initialData as any).tournament_settings[0] 
        : (initialData as any).tournament_settings)?.double_round_robin ?? false,
      swiss_rounds: (Array.isArray((initialData as any).tournament_settings) 
        ? (initialData as any).tournament_settings[0]?.swiss_rounds 
        : (initialData as any).tournament_settings?.swiss_rounds) ?? 3,
      cl_direct_qualify_count: (Array.isArray((initialData as any).tournament_settings) 
        ? (initialData as any).tournament_settings[0]?.cl_direct_qualify_count 
        : (initialData as any).tournament_settings?.cl_direct_qualify_count) ?? 8,
      cl_playoff_zone_count: (Array.isArray((initialData as any).tournament_settings) 
        ? (initialData as any).tournament_settings[0]?.cl_playoff_zone_count 
        : (initialData as any).tournament_settings?.cl_playoff_zone_count) ?? 16,
      cl_two_legged_rounds: (Array.isArray((initialData as any).tournament_settings) 
        ? (initialData as any).tournament_settings[0]?.cl_two_legged_rounds 
        : (initialData as any).tournament_settings?.cl_two_legged_rounds) ?? true,
    } : {
      name: '',
      type: 'knockout',
      max_players: 8,
      entry_fee: 0,
      prize_pool: 0,
      description: '',
      status: TournamentStatus.DRAFT,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      double_round_robin: false,
      swiss_rounds: 3,
      cl_direct_qualify_count: 8,
      cl_playoff_zone_count: 16,
      cl_two_legged_rounds: true,
    }
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: TournamentFormData) => {
    if (!user) return setError('You must be logged in to create a tournament');
    setLoading(true);
    setError(null);
    try {
      let bannerUrl = bannerPreview;

      if (bannerFile) {
        try {
          bannerUrl = await storageService.uploadBanner(bannerFile);
        } catch (uploadErr: any) {
          console.warn('[TournamentForm] Banner upload failed, using high-quality placeholder banner instead:', uploadErr);
          // Fallback to high-quality gaming placeholder instead of failing completely
          bannerUrl = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800';
          
          // Let the user know the image upload failed, but continue to save the tournament
          const uploadMsg = uploadErr.message || 'Failed to fetch';
          setError(`Notice: Banner upload failed (${uploadMsg}). Falling back to default gaming cover. Attempting to save tournament data...`);
        }
      }

      // Prepare data, ensuring dates are properly formatted or null
      const selectedStatus = data.status || (initialData?.status as string) || TournamentStatus.DRAFT;
      
      // Safety check: ensure status is allowed
      const finalStatus = ALLOWED_STATUSES.includes(selectedStatus as TournamentStatus) 
        ? selectedStatus 
        : TournamentStatus.DRAFT;

      const tournamentData: any = {
        name: data.name,
        type: data.type,
        max_players: data.max_players,
        entry_fee: data.entry_fee,
        prize_pool: data.prize_pool,
        description: data.description,
        status: finalStatus,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        banner_url: bannerUrl || null,
        created_by: user?.id || null,
        prize_1st_percent: 60,
        prize_2nd_percent: 30,
        prize_3rd_percent: 10
      };

      console.log('Attempting to save tournament:', tournamentData);

      try {
        const clSettings = data.type === 'champions_league' ? {
          swiss_rounds: data.swiss_rounds || 3,
          cl_direct_qualify_count: data.cl_direct_qualify_count || 8,
          cl_playoff_zone_count: data.cl_playoff_zone_count || 16,
          cl_two_legged_rounds: data.cl_two_legged_rounds ?? true
        } : {};

        if (mode === 'create') {
          await tournamentService.create(tournamentData, data.double_round_robin, clSettings);
        } else if (initialData) {
          await tournamentService.update(initialData.id, tournamentData, data.double_round_robin, clSettings);
        }
        navigate('/admin/tournaments');
      } catch (dbErr: any) {
        console.error('Database operation failed:', dbErr);
        setError(`Database operation failed. Error: ${dbErr.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Tournament save failed:', err);
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tournament Name</label>
            <input 
              {...register('name')}
              className={cn("input-field block w-full", errors.name && "border-red-500/50")}
              placeholder="e.g. Pro League Season 1"
            />
            {errors.name && <p className="text-xs text-red-500 font-bold">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Type</label>
              <select {...register('type')} className="input-field block w-full">
                <option value="knockout">Single Elimination</option>
                <option value="league">Round Robin</option>
                <option value="swiss">Swiss</option>
                <option value="group_stage">Group Stage</option>
                <option value="champions_league">Champions League</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tournament Status</label>
              <select 
                {...register('status')} 
                className="input-field block w-full"
                defaultValue={initialData?.status || TournamentStatus.DRAFT}
              >
                {Object.entries(TOURNAMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {watch('type') === 'league' && (
              <div className="col-span-2 space-y-3 p-4 bg-slate-900/50 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">League Format</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer p-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                    <input
                      type="radio"
                      checked={!watch('double_round_robin')}
                      onChange={() => setValue('double_round_robin', false)}
                      className="w-4 h-4 text-primary focus:ring-primary bg-slate-950 border-slate-800"
                    />
                    <div>
                      <span className="font-bold text-white block text-xs">Single Leg</span>
                      <span className="text-[11px] text-slate-400">each team plays every opponent once</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer p-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                    <input
                      type="radio"
                      checked={!!watch('double_round_robin')}
                      onChange={() => setValue('double_round_robin', true)}
                      className="w-4 h-4 text-primary focus:ring-primary bg-slate-950 border-slate-800"
                    />
                    <div>
                      <span className="font-bold text-white block text-xs">Double Leg</span>
                      <span className="text-[11px] text-slate-400">home and away (each opponent twice)</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {watch('type') === 'champions_league' && (
              <div className="col-span-2 space-y-4 p-5 bg-emerald-950/20 rounded-2xl border border-emerald-500/30 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider italic">Champions League Protocol Settings</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Configure single-table league phase and knockout playoff structures.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Opponents / Player (League Phase)</label>
                    <input
                      type="number"
                      {...register('swiss_rounds', { valueAsNumber: true })}
                      className="input-field block w-full text-sm"
                      defaultValue={3}
                    />
                    <p className="text-[10px] text-slate-500">Number of rounds in the single-table league.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Direct Qualifiers (Top N)</label>
                    <input
                      type="number"
                      {...register('cl_direct_qualify_count', { valueAsNumber: true })}
                      className="input-field block w-full text-sm"
                      defaultValue={8}
                    />
                    <p className="text-[10px] text-slate-500">Advance directly to Round of 16.</p>
                    {errors.cl_direct_qualify_count && (
                      <p className="text-xs text-red-400 font-bold mt-1">{errors.cl_direct_qualify_count.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Playoff Zone (Next M)</label>
                    <input
                      type="number"
                      {...register('cl_playoff_zone_count', { valueAsNumber: true })}
                      className="input-field block w-full text-sm"
                      defaultValue={16}
                    />
                    <p className="text-[10px] text-slate-500">Play two-legged knockout playoff.</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/20">
                  <label className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('cl_two_legged_rounds')}
                      className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 rounded bg-slate-950 border-slate-700"
                    />
                    <div>
                      <span className="font-bold text-white block text-xs">Two-Legged Knockouts</span>
                      <span className="text-[11px] text-slate-400">Playoff round and knockout ties up to final are home-and-away (2 legs).</span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Max Contenders Capacity</label>
              <input 
                type="number"
                {...register('max_players', { valueAsNumber: true })}
                className="input-field block w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Entry Fee ($)</label>
              <input 
                type="number"
                step="0.01"
                {...register('entry_fee', { valueAsNumber: true })}
                className="input-field block w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Prize Pool ($)</label>
              <input 
                type="number"
                step="0.01"
                {...register('prize_pool', { valueAsNumber: true })}
                className="input-field block w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Registration Window</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <input 
                  type="date" 
                  {...register('start_date')} 
                  className={cn("input-field block w-full", errors.start_date && "border-red-500/50")} 
                />
                {errors.start_date && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.start_date.message}</p>}
              </div>
              <div className="space-y-1">
                <input 
                  type="date" 
                  {...register('end_date')} 
                  className={cn("input-field block w-full", errors.end_date && "border-red-500/50")} 
                />
                {errors.end_date && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.end_date.message}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Banner Image</label>
            <div className="relative group aspect-video rounded-2xl border-2 border-dashed border-slate-700 hover:border-primary/50 transition-all overflow-hidden flex flex-col items-center justify-center bg-slate-900">
              {bannerPreview ? (
                <>
                  <img src={bannerPreview} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="btn-secondary flex items-center cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Change Banner
                      <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                    </label>
                  </div>
                </>
              ) : (
                <label className="flex flex-col items-center cursor-pointer p-8">
                  <Upload className="w-12 h-12 text-slate-600 mb-4 group-hover:text-primary transition-colors" />
                  <p className="text-sm font-bold text-slate-500 text-center">Drag or click to upload banner</p>
                  <p className="text-[10px] text-slate-600 uppercase mt-2">16:9 Recommended</p>
                  <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Description</label>
            <textarea 
              {...register('description')}
              rows={5}
              className="input-field block w-full py-3 resize-none"
              placeholder="Tell players what to expect..."
            />
            {errors.description && <p className="text-xs text-red-500 font-bold">{errors.description.message}</p>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-4 pt-8 border-t border-slate-800">
        <button 
          type="button" 
          onClick={() => navigate('/admin/tournaments')}
          className="btn-secondary h-12 px-8 flex items-center"
        >
          <X className="w-4 h-4 mr-2" />
          Discard
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary h-12 px-12 italic uppercase font-black tracking-tighter flex items-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Initialize Event' : 'Update Details'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
