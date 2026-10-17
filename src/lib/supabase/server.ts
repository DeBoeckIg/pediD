import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieOptions } from '@supabase/ssr';
import type { Database } from './database.types';
export async function createSupabaseServerClient() { const store = await cookies(); return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => store.getAll(), setAll: (values: { name: string; value: string; options: CookieOptions }[]) => values.forEach(({ name, value, options }) => store.set(name, value, options)) } }); }
export function createSupabaseAdminClient(): any { const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js'); return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } }); }
