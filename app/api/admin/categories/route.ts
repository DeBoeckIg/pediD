import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { saveCategory } from '@/modules/catalog/service';
import { requireAdmin } from '@/modules/auth/guard';
export async function POST(request: Request) { try { await requireAdmin(); const body = await request.json(); const category = await saveCategory(createSupabaseAdminClient(), body.id, String(body.name ?? '')); return NextResponse.json(category, { status: body.id ? 200 : 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid category' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 400 }); } }
