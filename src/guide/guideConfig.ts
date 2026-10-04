// Guide launch timestamp. Users created before this date are existing users
// and will never receive automatic tours or popups.
export const GUIDE_LAUNCH_DATE = '2026-09-30T00:00:00.000Z';

// Backend sync flag. Set to true once the RPC 'set_onboarding_step' and profiles.onboarding_state are deployed.
export const ENABLE_GUIDE_DB_SYNC = false;

// LocalStorage key for immediate offline-safe persistence
export const GUIDE_STORAGE_KEY = 'th_guide_v1';
