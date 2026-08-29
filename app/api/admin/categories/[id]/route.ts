import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { deleteCategory } from '@/modules/catalog/service';
import { requireAdmin } from '@/modules/auth/guard';
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { await requireAdmin(); await deleteCategory(createSupabaseAdminClient(), (await params).id); return new NextResponse(null, { status: 204 }); } catch (error) { const message = error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'Category cannot be deleted'; const status = message === 'Unauthorized' ? 401 : message.startsWith(ASSOCIATED_PRODUCTS_ERROR) || message === 'Reassign every product before deleting this category' ? 409 : 500; return NextResponse.json({ error: message }, { status }); } }
const ASSOCIATED_PRODUCTS_ERROR = 'No se puede eliminar: la categoría tiene productos asociados. Reasigná esos productos primero.';
