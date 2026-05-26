// ============================================================
// CREARD - Cliente Supabase (Server-side para API Routes)
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase no configurado. Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
    );
  }

  // Usar service_role_key si está disponible (para API routes que necesitan bypass RLS)
  _supabase = createClient(url, serviceRoleKey || anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabase;
}

// Singleton export
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    try {
      const client = getSupabaseClient();
      return (client as any)[prop];
    } catch {
      return undefined;
    }
  },
});

export { getSupabaseClient };
