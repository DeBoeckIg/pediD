import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { runCleanupWorker } from '@/modules/media/cleanup';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { supabaseCleanupQueue, supabaseStorageRemover } from '@/modules/media/cleanup';
export async function POST() { try { await requireAdmin(); const client = createSupabaseAdminClient(); const processed = await runCleanupWorker(supabaseCleanupQueue(client), supabaseStorageRemover(client)); return NextResponse.json({ processed }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Cleanup failed' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }); } }
