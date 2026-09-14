import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { deleteCategory } from '@/modules/catalog/service';
import { requireAdmin } from '@/modules/auth/guard';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { const forbidden = protectAdminMutation(request); if (forbidden) return forbidden; try { await requireAdmin(); await deleteCategory(createSupabaseAdminClient(), (await params).id); return new NextResponse(null, { status: 204 }); } catch (error) { const message = error instanceof Error ? error.message : ''; const status = message.startsWith(ASSOCIATED_PRODUCTS_ERROR) || message === 'Reassign every product before deleting this category' ? 409 : undefined; return apiError(error, { fallback: 'Category cannot be deleted', request, status }); } }
const ASSOCIATED_PRODUCTS_ERROR = 'No se puede eliminar: la categoría tiene productos asociados. Reasigná esos productos primero.';
