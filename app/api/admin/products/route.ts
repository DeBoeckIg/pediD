import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { saveProduct } from '@/modules/catalog/service';
import { requireAdmin } from '@/modules/auth/guard';
import { deleteProduct } from '@/modules/catalog/service';
async function guarded() { await requireAdmin(); return createSupabaseServerClient(); }
export async function POST(request: Request) { try { const body = await request.json(); const product = await saveProduct(await guarded(), body.id, { name: String(body.name ?? ''), description: String(body.description ?? ''), categoryId: String(body.categoryId ?? ''), priceArs: Number(body.priceArs), stockQuantity: Number(body.stockQuantity), published: Boolean(body.published) }); return NextResponse.json(product, { status: body.id ? 200 : 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid product' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 400 }); } }
export async function DELETE(request: Request) { try { const id = new URL(request.url).searchParams.get('id'); if (!id) throw new Error('Product id is required'); await deleteProduct(await guarded(), id); return new NextResponse(null, { status: 204 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete product' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 400 }); } }
