import * as Sentry from '@sentry/react';

// Use environment variables for Sentry configuration with fallback defaults
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || 'https://2b8baddd618a1cd34a57348a4e071a7b@o4511415237935104.ingest.de.sentry.io/4511642745110608';
const ENVIRONMENT = import.meta.env.MODE || 'development';
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE || 'tournahub-web@latest';

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
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,
  
  // Tracing targets for distributed tracing (Supabase and Local API)
  tracePropagationTargets: ['localhost', /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co/],

  // Session Replay Configuration
  replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.05 : 1.0, // Low in prod, high in dev
  replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
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

  Sentry.addBreadcrumb({
    category: 'supabase',
    message: `Supabase ${context.service || 'Request'} [${method}] status: ${status}`,
    level: isFailure ? 'error' : 'info',
    data: context,
  });

  if (isFailure) {
    Sentry.withScope((scope) => {
      scope.setTag('supabase.service', context.service || 'unknown');
      if (context.tableName) {
        scope.setTag('supabase.table', context.tableName);
      }
      scope.setTag('supabase.status_code', String(status));
      scope.setExtra('supabase.context', context);

      const errorMessage = error ? error.message : `Supabase API responded with status ${status}`;
      Sentry.captureException(new Error(errorMessage));
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
