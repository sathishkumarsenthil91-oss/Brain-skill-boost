import { createClient } from '@supabase/supabase-js';

// Keep the production app pinned to the verified Brain Boost Supabase project.
// This avoids stale Vercel environment variables silently pointing the frontend
// at an older project where the Connectivity schema does not match.
const SUPABASE_URL = 'https://nzgisrrrbabedlntmcoc.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_CZTBEfxJPsy4EjJSMXtydw_yZ0gzyJ0';

export function reportServiceError(message) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('service-error', { detail: message }));
  }
}

async function resilientFetch(input, init) {
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const url = String(input instanceof Request ? input.url : input);
  const mutation = url.includes('/rest/v1/') && !['GET', 'HEAD', 'OPTIONS'].includes(method);

  try {
    const response = await fetch(input, init);

    if (mutation && !response.ok) {
      const tableMatch = url.match(/\/rest\/v1\/([^?]+)/);
      const tableName = tableMatch?.[1] || 'database';
      let details = '';

      try {
        details = await response.clone().text();
      } catch {}

      console.error('[Supabase mutation failed]', {
        table: tableName,
        method,
        status: response.status,
        details,
      });

      reportServiceError(
        `Could not save ${tableName} data (HTTP ${response.status}). Please sign in again if the problem continues.`
      );
    }

    return response;
  } catch (error) {
    if (mutation) {
      console.error('[Supabase network error]', { method, url, error });
      reportServiceError('Your changes could not be saved because the database could not be reached.');
    }
    throw error;
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  global: { fetch: resilientFetch },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Native Android OAuth bridge.
// Google authentication stays in the secure system browser, then returns to the
// installed app through brainboost://auth-callback. For Google we always request
// the account chooser so logout -> login can use a different Google account.
if (typeof window !== 'undefined' && /BrainBoostAndroid/i.test(navigator.userAgent)) {
  const originalSignInWithOAuth = supabase.auth.signInWithOAuth.bind(supabase.auth);

  supabase.auth.signInWithOAuth = (credentials) => {
    const originalOptions = credentials?.options || {};
    const queryParams = {
      ...(originalOptions.queryParams || {}),
    };

    if (credentials?.provider === 'google') {
      queryParams.prompt = 'select_account';
    }

    const options = {
      ...originalOptions,
      queryParams,
      redirectTo: `${window.location.origin}/?native_oauth=1`,
    };

    return originalSignInWithOAuth({
      ...credentials,
      options,
    });
  };
}
