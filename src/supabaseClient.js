import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 🔑 SUPABASE CONFIGURATION
// Retrieves credentials from Vite environment variables (import.meta.env)
// ============================================================================

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://nzgisrrrbabedlntmcoc.supabase.co";

const SUPABASE_PUBLIC_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_CZTBEfxJPsy4EjJSMXtydw_yZ0gzyJ0";

// ============================================================================
// 🚀 EXPORT SUPABASE CLIENT
// ============================================================================
export function reportServiceError(message) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('service-error', { detail: message }));
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  global: {
    fetch: async (input, init) => {
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const url = String(input instanceof Request ? input.url : input);
      const mutation = url.includes('/rest/v1/') && !['GET', 'HEAD', 'OPTIONS'].includes(method);
      try {
        const response = await fetch(input, init);
        if (mutation && !response.ok) reportServiceError('Your changes could not be saved. Check your connection and sign in again if needed.');
        return response;
      } catch (error) {
        if (mutation) reportServiceError('Your changes could not be saved because the database could not be reached.');
        throw error;
      }
    },
  },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

