import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, SlidersHorizontal, ChevronDown, Check, X, Tag, DollarSign, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ListingFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  platform: string;
  onPlatformChange: (val: string) => void;
  maxPrice: number;
  onMaxPriceChange: (val: number) => void;
  sortBy: 'newest' | 'price_asc' | 'price_desc';
  onSortByChange: (val: 'newest' | 'price_asc' | 'price_desc') => void;
}

const PLATFORMS = [
  { id: 'all', label: 'All Platforms' },
  { id: 'Mobile', label: 'Mobile' },
  { id: 'PS5', label: 'PlayStation 5' },
  { id: 'PS4', label: 'PlayStation 4' },
  { id: 'Xbox', label: 'Xbox' },
  { id: 'PC', label: 'PC' },
  { id: 'Other', label: 'Other' },
];

export const ListingFilters: React.FC<ListingFiltersProps> = ({
  search,
  onSearchChange,
  platform,
  onPlatformChange,
  maxPrice,
  onMaxPriceChange,
  sortBy,
  onSortByChange,
}) => {
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const platformRef = useRef<HTMLDivElement>(null);

  // Close platform dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (platformRef.current && !platformRef.current.contains(event.target as Node)) {
        setIsPlatformOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPlatformObj = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
  const isPriceFiltered = maxPrice < 1000;
  const isPlatformFiltered = platform !== 'all';
  const activeFiltersCount = (isPriceFiltered ? 1 : 0) + (isPlatformFiltered ? 1 : 0);

  return (
    <div className="space-y-3 mb-6">
      {/* Main compact container */}
      <div className="bg-surface border border-border-main rounded-2xl p-3 shadow-md space-y-3">
        {/* Row 1: Search (Full Width) */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search accounts, squads, legends..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-background border border-border-main focus:border-primary rounded-xl py-2.5 pl-10 pr-10 text-xs font-bold text-white placeholder:text-slate-500 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 2: Platform select, Sort By, Filters slider toggle */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          {/* Left / Center controls */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Custom Platform Popover Dropdown */}
            <div className="relative shrink-0" ref={platformRef}>
              <button
                type="button"
                onClick={() => setIsPlatformOpen(!isPlatformOpen)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 bg-background border border-border-main hover:border-primary/50 text-xs font-black uppercase tracking-wider text-white rounded-xl transition-all cursor-pointer",
                  isPlatformFiltered && "border-primary/40 bg-primary/5 text-primary"
                )}
              >
                <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {isPlatformFiltered ? selectedPlatformObj.label : 'All Platforms'}
                </span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform duration-200", isPlatformOpen && "rotate-180")} />
              </button>

              {isPlatformOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl bg-surface border border-border-main shadow-xl z-40 py-1.5 animate-fadeIn">
                  {PLATFORMS.map((p) => {
                    const isSelected = platform === p.id || (p.id === 'all' && (!platform || platform === 'all'));
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onPlatformChange(p.id);
                          setIsPlatformOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-bold transition-all hover:bg-white/5",
                          isSelected ? "text-primary bg-primary/5" : "text-slate-300"
                        )}
                      >
                        <span>{p.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-background border border-border-main rounded-xl px-3 py-2 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as any)}
                className="bg-transparent text-xs font-black uppercase tracking-wider text-white outline-none cursor-pointer border-none p-0 pr-1 select-none font-sans"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>
          </div>

          {/* Right Filters Button (opens slide-up bottom sheet / modal) */}
          <button
            type="button"
            onClick={() => setIsFiltersOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 bg-background border border-border-main hover:border-primary/50 text-xs font-black uppercase tracking-wider text-white rounded-xl transition-all cursor-pointer relative",
              isPriceFiltered && "border-emerald-500/40 bg-emerald-500/5 text-emerald-400"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Filters</span>
            {isPriceFiltered && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 absolute -top-1 -right-1 ring-4 ring-slate-950" />
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips (Removable) */}
      {(isPlatformFiltered || isPriceFiltered) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Active:
          </span>
          
          {isPlatformFiltered && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider">
              <span>Platform: {selectedPlatformObj.label}</span>
              <button
                onClick={() => onPlatformChange('all')}
                className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                title="Remove platform filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {isPriceFiltered && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <span>Max: ${maxPrice}</span>
              <button
                onClick={() => onMaxPriceChange(1000)}
                className="p-0.5 hover:bg-emerald-500/20 rounded-full transition-colors"
                title="Remove price filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              onPlatformChange('all');
              onMaxPriceChange(1000);
            }}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white underline transition-colors cursor-pointer pl-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Max Price Bottom Sheet / Modal Popover */}
      {isFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsFiltersOpen(false)} />
          
          {/* Sheet container */}
          <div className="relative bg-surface border-t sm:border border-border-main rounded-t-[2rem] sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-6 animate-slideUp sm:animate-scaleUp z-10">
            
            {/* Grab handle for visual mobile bottom sheet clue */}
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto sm:hidden -mt-2 mb-4" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black uppercase italic tracking-wider text-white">
                  Advanced Filters
                </h3>
              </div>
              <button
                onClick={() => setIsFiltersOpen(false)}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slider Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Budget Limit (Max USD)
                </span>
                <span className="text-sm font-mono font-extrabold text-primary px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                  {maxPrice >= 1000 ? 'Any ($1k+)' : `$${maxPrice}`}
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={maxPrice || 1000}
                  onChange={(e) => onMaxPriceChange(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-1.5 bg-background rounded-lg border border-white/5 appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>$10</span>
                  <span>$500</span>
                  <span>$1,000+</span>
                </div>
              </div>
            </div>

            {/* Action controls */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onMaxPriceChange(1000);
                }}
                disabled={!isPriceFiltered}
                className="flex-1 py-2.5 bg-slate-900 border border-white/5 hover:bg-slate-800 disabled:opacity-40 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Reset Budget
              </button>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer"
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
