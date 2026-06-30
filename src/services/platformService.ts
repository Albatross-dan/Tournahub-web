import { supabase } from '../lib/supabase';

export interface PlatformStatus {
  maintenance_mode: boolean;
  is_blocked: boolean;
  caller_is_admin: boolean;
  maintenance_message: string;
  maintenance_end_estimate: string | null;
  maintenance_scheduled_at: string | null;
  upcoming_maintenance: boolean;
}

/**
 * Robust retry utility specifically for transient network failures.
 * This will NOT retry on authentication errors, application errors, or explicit abort signals.
 */
/**
 * Robust retry utility specifically for transient network failures.
 * This will NOT retry on authentication errors, application errors, or explicit abort signals.
 */
async function retryWithBackoff<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  retries = 4,
  delay = 1000,
  factor = 2,
  signal?: AbortSignal
): Promise<T> {
  try {
    return await fn(signal);
  } catch (error: any) {
    if (signal?.aborted) {
      throw error;
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isAbort = error.name === 'AbortError' || error.message?.toLowerCase().includes('aborted') || error.message?.toLowerCase().includes('cancel');

    // Extract HTTP status or error code
    const status = error.status || error.statusCode || (error.code ? parseInt(error.code, 10) : undefined);
    
    // Explicitly non-transient status codes (4xx client/auth/validation errors)
    const isNonTransientStatus = status && (
      status === 400 ||
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 409 ||
      status === 422
    );

    const errorMessage = error.message?.toLowerCase() || '';
    const isNonTransientMessage = 
      errorMessage.includes('permission denied') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('jwt expired') ||
      errorMessage.includes('invalid token') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('invalid input') ||
      errorMessage.includes('validation');

    const isNonTransient = isNonTransientStatus || isNonTransientMessage;

    // We only retry if:
    // 1. We have retries remaining
    // 2. We are not offline (retrying immediately when offline has no effect)
    // 3. This was not an intentional abort
    // 4. The error is transient (e.g., standard "Failed to fetch" TypeError, or 5xx server responses)
    const isTransient = !isOffline && !isAbort && !isNonTransient && (
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('load failed') ||
      errorMessage.includes('timeout') ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      (!status && errorMessage.length > 0) // Native Fetch TypeErrors typically lack HTTP status codes
    );

    if (retries > 0 && isTransient) {
      console.warn(`[platformService] Transient fetch error. Retrying status check in ${delay}ms...`, error);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(resolve, delay);
        if (signal) {
          const onAbort = () => {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
          };
          signal.addEventListener('abort', onAbort);
        }
      });
      return retryWithBackoff(fn, retries - 1, delay * factor, factor, signal);
    }
    throw error;
  }
}

export const platformService = {
  async getPlatformStatus(options?: { signal?: AbortSignal }): Promise<PlatformStatus> {
    const fetchStatus = async (sig?: AbortSignal) => {
      let query = (supabase as any).rpc('get_platform_status');
      if (sig) {
        query = query.abortSignal(sig);
      }
      
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data as PlatformStatus;
    };

    try {
      const data = await retryWithBackoff(fetchStatus, 4, 1000, 2, options?.signal);
      return data;
    } catch (err: any) {
      // Re-throw genuine AbortErrors so the calling React context can handle cancellation
      if (err.name === 'AbortError' || err instanceof DOMException) {
        throw err;
      }

      console.warn('[platformService] Exception getting platform status:', err);
      // Return a safe, resilient default status to prevent the UI from freezing or breaking
      return {
        maintenance_mode: false,
        is_blocked: false,
        caller_is_admin: false,
        maintenance_message: '',
        maintenance_end_estimate: null,
        maintenance_scheduled_at: null,
        upcoming_maintenance: false
      };
    }
  },

  async setMaintenanceMode(adminId: string, enabled: boolean) {
    const { data, error } = await (supabase as any).rpc('admin_update_platform_config', {
      p_admin_id: adminId,
      p_key: 'maintenance_mode',
      p_value: enabled,
      p_description: null
    });
    if (error) {
      console.error('[platformService] Error setting maintenance mode:', error);
      return { error: error.message };
    }
    return data;
  },

  async setMaintenanceMessage(adminId: string, message: string) {
    const { data, error } = await (supabase as any).rpc('admin_update_platform_config', {
      p_admin_id: adminId,
      p_key: 'maintenance_message',
      p_value: message,
      p_description: null
    });
    if (error) {
      console.error('[platformService] Error setting maintenance message:', error);
      return { error: error.message };
    }
    return data;
  },

  async setMaintenanceEndEstimate(adminId: string, isoTimestampOrNull: string | null) {
    const { data, error } = await (supabase as any).rpc('admin_update_platform_config', {
      p_admin_id: adminId,
      p_key: 'maintenance_end_estimate',
      p_value: isoTimestampOrNull,
      p_description: null
    });
    if (error) {
      console.error('[platformService] Error setting maintenance end estimate:', error);
      return { error: error.message };
    }
    return data;
  },

  async setMaintenanceScheduledAt(adminId: string, isoTimestampOrNull: string | null) {
    const { data, error } = await (supabase as any).rpc('admin_update_platform_config', {
      p_admin_id: adminId,
      p_key: 'maintenance_scheduled_at',
      p_value: isoTimestampOrNull,
      p_description: null
    });
    if (error) {
      console.error('[platformService] Error setting maintenance scheduled at:', error);
      return { error: error.message };
    }
    return data;
  },

  async sendAnnouncement(title: string, body: string, priority: 'normal' | 'high' | 'urgent') {
    const { data, error } = await (supabase as any).rpc('admin_broadcast_notification', {
      p_type: 'announcement',
      p_category: 'announcement',
      p_title: title,
      p_body: body,
      p_priority: priority,
      p_data: {}
    });
    if (error) {
      console.error('[platformService] Error sending announcement:', error);
      throw error;
    }
    return data;
  }
};
