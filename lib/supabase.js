// path: lib/supabase.js

import { createClient } from "@supabase/supabase-js";

// Server-only client using the service_role key.
// NEVER import this file into client components ('use client').
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);
