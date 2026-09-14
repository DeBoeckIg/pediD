import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/modules/auth/guard';
import { deleteVariant, saveVariant } from '@/modules/catalog/service';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';
export async function POST(request: Request) { const forbidden = protectAdminMutation(request); if (forbidden) return forbidden; try { await requireAdmin(); const body = await request.json(); const variant = await saveVariant(createSupabaseAdminClient(), String(body.productId), body.id, { label: String(body.label ?? ''), unitType: body.unitType ?? body.unit_type, quantity: Number(body.quantity), priceArs: Number(body.priceArs ?? body.price_ars), stockQuantity: Number(body.stockQuantity ?? body.stock_quantity), sortOrder: Number(body.sortOrder ?? body.sort_order), published: Boolean(body.published) }); return NextResponse.json(variant, { status: body.id ? 200 : 201 }); } catch (error) { return apiError(error, { fallback: 'Invalid presentation', request }); } }
export async function DELETE(request: Request) { const forbidden = protectAdminMutation(request); if (forbidden) return forbidden; try { await requireAdmin(); const url = new URL(request.url); await deleteVariant(createSupabaseAdminClient(), url.searchParams.get('productId') ?? '', url.searchParams.get('id') ?? ''); return new NextResponse(null, { status: 204 }); } catch (error) { return apiError(error, { fallback: 'Unable to delete presentation', request }); } }
