import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GUIDE_LAUNCH_DATE, ENABLE_GUIDE_DB_SYNC, GUIDE_STORAGE_KEY } from './guideConfig';

export interface GuideState {
  welcome_tour: boolean;
  tips: Record<string, boolean>;
}

const DEFAULT_GUIDE_STATE: GuideState = {
  welcome_tour: false,
  tips: {
    wallet: false,
    tournament: false,
    result_submit: false,
    challenges: false,
    disputes: false,
  },
};

function getLocalState(): GuideState {
  if (typeof window === 'undefined') return DEFAULT_GUIDE_STATE;
  try {
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (!raw) return DEFAULT_GUIDE_STATE;
    const parsed = JSON.parse(raw);
    return {
      welcome_tour: Boolean(parsed?.welcome_tour),
      tips: {
        ...DEFAULT_GUIDE_STATE.tips,
        ...(parsed?.tips || {}),
      },
    };
  } catch {
    return DEFAULT_GUIDE_STATE;
  }
}

function saveLocalState(state: GuideState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silent fallback
  }
}

export function useGuideState() {
  const { profile, user } = useAuth();
  const [guideState, setGuideState] = useState<GuideState>(getLocalState);

  // Determine if this user is a NEW user (created after feature launch date)
  const isNewUser = useMemo(() => {
    if (!profile?.created_at) return false;
    try {
      const userCreated = new Date(profile.created_at).getTime();
      const launchDate = new Date(GUIDE_LAUNCH_DATE).getTime();
      return userCreated > launchDate;
    } catch {
      return false;
    }
  }, [profile?.created_at]);

  // Sync state from backend if flag enabled and column exists
  useEffect(() => {
    if (!ENABLE_GUIDE_DB_SYNC || !user?.id) return;
    let isMounted = true;

    async function syncFromDb() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_state')
          .eq('id', user!.id)
          .single();

        if (!error && (data as any)?.onboarding_state && isMounted) {
          const obState = (data as any).onboarding_state;
          setGuideState((prev) => {
            const merged: GuideState = {
              welcome_tour: Boolean(obState.welcome_tour || prev.welcome_tour),
              tips: {
                ...prev.tips,
                ...(obState.tips || {}),
              },
            };
            saveLocalState(merged);
            return merged;
          });
        }
      } catch {
        // Silent failure - never break the UI
      }
    }

    syncFromDb();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Helper to sync step to DB if flag is on
  const syncStepToDb = useCallback(async (stepKey: string) => {
    if (!ENABLE_GUIDE_DB_SYNC || !user?.id) return;
    try {
      await (supabase.rpc as any)('set_onboarding_step', { p_step: stepKey });
    } catch {
      // Silent error - offline safe
    }
  }, [user?.id]);

  const completeTour = useCallback(() => {
    setGuideState((prev) => {
      const next = { ...prev, welcome_tour: true };
      saveLocalState(next);
      return next;
    });
    syncStepToDb('welcome_tour');
  }, [syncStepToDb]);

  const resetTour = useCallback(() => {
    setGuideState((prev) => {
      const next = { ...prev, welcome_tour: false };
      saveLocalState(next);
      return next;
    });
  }, []);

  const dismissTip = useCallback((tipId: string) => {
    setGuideState((prev) => {
      const next = {
        ...prev,
        tips: {
          ...prev.tips,
          [tipId]: true,
        },
      };
      saveLocalState(next);
      return next;
    });
    syncStepToDb(`tip_${tipId}`);
  }, [syncStepToDb]);

  const shouldShowTour = Boolean(isNewUser && !guideState.welcome_tour);

  const shouldShowTip = useCallback((tipId: string) => {
    if (!isNewUser) return false;
    return !guideState.tips?.[tipId];
  }, [isNewUser, guideState.tips]);

  return {
    isNewUser,
    guideState,
    shouldShowTour,
    shouldShowTip,
    completeTour,
    resetTour,
    dismissTip,
  };
}
