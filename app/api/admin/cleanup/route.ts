import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { runCleanupWorker } from '@/modules/media/cleanup';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';
import { supabaseCleanupQueue, supabaseStorageRemover } from '@/modules/media/cleanup';
export async function POST(request: Request) { const forbidden = protectAdminMutation(request); if (forbidden) return forbidden; try { await requireAdmin(); const client = createSupabaseAdminClient(); const processed = await runCleanupWorker(supabaseCleanupQueue(client), supabaseStorageRemover(client)); return NextResponse.json({ processed }); } catch (error) { return apiError(error, { fallback: 'Cleanup failed', request }); } }
