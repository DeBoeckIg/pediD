import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { saveProduct } from '@/modules/catalog/service';
import { requireAdmin } from '@/modules/auth/guard';
import { deleteProduct, listAdminCatalog } from '@/modules/catalog/service';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';
async function guarded() { await requireAdmin(); return createSupabaseAdminClient(); }
export async function GET(request: Request) { try { const catalog = await listAdminCatalog(await guarded()); return NextResponse.json(catalog.products); } catch (error) { return apiError(error, { fallback: 'Unable to list products', request }); } }
export async function POST(request: Request) { const forbidden = protectAdminMutation(request); if (forbidden) return forbidden; try { const body = await request.json(); const product = await saveProduct(await guarded(), body.id, { name: String(body.name ?? ''), description: String(body.description ?? ''), categoryId: String(body.categoryId ?? ''), priceArs: Number(body.priceArs), stockQuantity: Number(body.stockQuantity), published: Boolean(body.published) }); return NextResponse.json(product, { status: body.id ? 200 : 201 }); } catch (error) { return apiError(error, { fallback: 'Invalid product', request }); } }
export async function DELETE(request: Request) { const forbidden = protectAdminMutation(request); if (forbidden) return forbidden; try { const id = new URL(request.url).searchParams.get('id'); if (!id) throw new Error('Product id is required'); await deleteProduct(await guarded(), id); return new NextResponse(null, { status: 204 }); } catch (error) { return apiError(error, { fallback: 'Unable to delete product', request }); } }
