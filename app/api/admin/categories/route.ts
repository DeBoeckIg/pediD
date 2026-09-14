import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { saveCategory } from '@/modules/catalog/service';
import { requireAdmin } from '@/modules/auth/guard';
import { listAdminCatalog } from '@/modules/catalog/service';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';
export async function GET(request: Request) { try { await requireAdmin(); const catalog = await listAdminCatalog(createSupabaseAdminClient()); return NextResponse.json(catalog.categories); } catch (error) { return apiError(error, { fallback: 'Unable to list categories', request }); } }
export async function POST(request: Request) { const forbidden = protectAdminMutation(request); if (forbidden) return forbidden; try { await requireAdmin(); const body = await request.json(); const category = await saveCategory(createSupabaseAdminClient(), body.id, String(body.name ?? '')); return NextResponse.json(category, { status: body.id ? 200 : 201 }); } catch (error) { return apiError(error, { fallback: 'Invalid category', request }); } }
