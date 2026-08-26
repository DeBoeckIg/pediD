import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { deleteCategory } from '@/modules/catalog/service';
import { requireAdmin } from '@/modules/auth/guard';
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { await requireAdmin(); await deleteCategory(createSupabaseAdminClient(), (await params).id); return new NextResponse(null, { status: 204 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Category cannot be deleted' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 409 }); } }
