import * as Sentry from '@sentry/react';

// Use environment variables for Sentry configuration with fallback defaults
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || 'https://2b8baddd618a1cd34a57348a4e071a7b@o4511415237935104.ingest.de.sentry.io/4511642745110608';

// Determine the environment dynamically at runtime in the browser.
// Because both AI Studio previews and real production deployments compile using `npm run build` (where import.meta.env.MODE is 'production'),
// we rely on window.location.hostname to distinguish the actual host at runtime.
const getEnvironment = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Explicit production domains
    if (hostname === 'tournahub.me' || hostname === 'www.tournahub.me') {
      return 'production';
    }
    
    // All other domains (including Google AI Studio previews *.run.app, vercel.app, and localhost)
    // are treated as development/preview to separate dev noise from real production traffic.
    return 'development';
  }
  
  // Build-time fallbacks (e.g. custom environment variable or Vite mode)
  if (import.meta.env.VITE_APP_ENV) {
    return import.meta.env.VITE_APP_ENV;
  }
  
  return import.meta.env.MODE === 'production' ? 'production' : 'development';
};

const ENVIRONMENT = getEnvironment();
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE || 'tournahub-web@latest';

console.log('[Sentry] Dynamic environment resolved to:', ENVIRONMENT, '(Host:', typeof window !== 'undefined' ? window.location.hostname : 'unknown', ')');

// Initialize Sentry
Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  release: RELEASE,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Mask all form inputs by default to protect user secrets (passwords, JWTs, emails, etc.)
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance Tracing Configuration
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 0,
  
  // Tracing targets for distributed tracing (Supabase and Local API)
  tracePropagationTargets: ['localhost', /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co/],

  // Session Replay Configuration - disable in development/preview to prevent fetch spam
  replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.05 : 0,
  replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0,

  beforeSend(event, hint) {
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const msg = String(error.message).toLowerCase();
      if (
        msg.includes('failed to fetch') ||
        msg.includes('network') ||
        msg.includes('load failed') ||
        msg.includes('offline') ||
        msg.includes('aborted') ||
        msg.includes('cancel')
      ) {
        return null; // Do not report transient network or blocked fetch failures to Sentry
      }
    }
    return event;
  },
});

/**
 * Set user identity context in Sentry
 */
export function identifySentryUser(user: { id: string; email?: string }, profile?: { username?: string | null }) {
  if (!user?.id) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
    username: profile?.username || undefined,
  });
  
  Sentry.addBreadcrumb({
    category: 'auth',
    message: `User authenticated: ${user.id}`,
    level: 'info',
  });
}

/**
 * Clear user identity context from Sentry
 */
export function clearSentryUser() {
  Sentry.setUser(null);
  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'User logged out',
    level: 'info',
  });
}

/**
 * Instrument Supabase Fetch Requests
 */
export function instrumentSupabaseFetch(
  url: string,
  options: RequestInit | undefined,
  response: Response | null,
  error: any
) {
  // Never log sensitive query params/bodies (passwords, reset tokens, keys)
  if (url.includes('token') || url.includes('password') || url.includes('signup') || url.includes('signin')) {
    return;
  }

  const status = response ? response.status : 'Network Error';
  const method = options?.method || 'GET';

  const context: Record<string, any> = {
    endpoint: url,
    statusCode: status,
    method,
  };

  // Classify Supabase services for better context
  if (url.includes('/rest/v1/')) {
    context.service = 'Database';
    const match = url.match(/\/rest\/v1\/([^?#]+)/);
    if (match && match[1]) {
      context.tableName = match[1];
    }
    context.operation = method === 'GET' ? 'SELECT' : method;
  } else if (url.includes('/auth/v1/')) {
    context.service = 'Auth';
    const match = url.match(/\/auth\/v1\/([^?#]+)/);
    if (match && match[1]) {
      context.operation = match[1];
    }
  } else if (url.includes('/storage/v1/')) {
    context.service = 'Storage';
    const match = url.match(/\/storage\/v1\/object\/([^?#]+)/);
    if (match && match[1]) {
      context.tableName = 'Storage Object';
      context.operation = match[1];
    }
  } else if (url.includes('/functions/v1/')) {
    context.service = 'Edge Functions';
    const match = url.match(/\/functions\/v1\/([^?#]+)/);
    if (match && match[1]) {
      context.operation = match[1];
    }
  }

  const isFailure = error || (response && !response.ok);

  // Classify failure type to distinguish between environmental, network, and application errors
  let failureType: 'none' | 'offline_user' | 'aborted_request' | 'timeout_failure' | 'genuine_network_failure' | 'supabase_server_response' = 'none';
  let isOffline = false;
  let isAbort = false;
  let isTimeout = false;

  if (error) {
    isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    isAbort = error.name === 'AbortError' || error.message?.toLowerCase().includes('aborted') || error.message?.toLowerCase().includes('cancel');
    isTimeout = error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('exceeded') || error.message?.toLowerCase().includes('deadline');

    if (isOffline) {
      failureType = 'offline_user';
    } else if (isAbort) {
      failureType = 'aborted_request';
    } else if (isTimeout) {
      failureType = 'timeout_failure';
    } else {
      failureType = 'genuine_network_failure';
    }
  } else if (response && !response.ok) {
    failureType = 'supabase_server_response';
  }

  // Update context for tracing and visualization in Sentry UI
  context.failureType = failureType;
  context.isOffline = isOffline;
  context.isAbort = isAbort;
  context.isTimeout = isTimeout;

  Sentry.addBreadcrumb({
    category: 'supabase',
    message: `Supabase ${context.service || 'Request'} [${method}] status: ${status} (Type: ${failureType})`,
    level: isFailure ? (isOffline || isAbort ? 'info' : 'error') : 'info',
    data: context,
  });

  if (isFailure) {
    Sentry.withScope((scope) => {
      scope.setTag('supabase.service', context.service || 'unknown');
      if (context.tableName) {
        scope.setTag('supabase.table', context.tableName);
      }
      scope.setTag('supabase.status_code', String(status));
      scope.setTag('failure_type', failureType);
      scope.setTag('is_offline', String(isOffline));
      scope.setTag('is_abort', String(isAbort));
      scope.setTag('is_timeout', String(isTimeout));
      scope.setExtra('supabase.context', context);

      // Distinguish grouping by failure type, HTTP method, and URL so Sentry categorizes them cleanly
      scope.setFingerprint(['supabase', failureType, method, url]);

      // Set lower severity for user environmental conditions (aborts/offline) to avoid alert fatigue
      if (isOffline || isAbort) {
        scope.setLevel('info');
      } else if (isTimeout) {
        scope.setLevel('warning');
      } else {
        scope.setLevel('error');
      }

      const rawErrorMessage = error ? error.message : `Supabase API responded with status ${status}`;
      const decoratedMessage = `[${failureType.toUpperCase()}] ${rawErrorMessage}`;
      
      if (!isOffline && !isAbort && !isTimeout && failureType !== 'genuine_network_failure' && !rawErrorMessage?.toLowerCase().includes('failed to fetch')) {
        Sentry.captureException(new Error(decoratedMessage));
      }
    });
  }
}

// Safely expose a manual test function to the window for Sentry verification
if (typeof window !== 'undefined') {
  (window as any).sentryTest = () => {
    console.log('[Sentry Test] Triggering a manual verification error...');
    throw new Error('Tournahub Sentry Verification: Manual Test Success!');
  };
}
