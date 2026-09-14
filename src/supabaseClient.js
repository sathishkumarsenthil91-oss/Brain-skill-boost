import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 🔑 SUPABASE CONFIGURATION
// Retrieves credentials from Vite environment variables (import.meta.env)
// ============================================================================

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://nzgisrrrbabedlntmcoc.supabase.co";

const SUPABASE_PUBLIC_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_CZTBEfxJPsy4EjJSMXtydw_yZ0gzyJ0";

// ============================================================================
// 🚀 EXPORT SUPABASE CLIENT
// ============================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

