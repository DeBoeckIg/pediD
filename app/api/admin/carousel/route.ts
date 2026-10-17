import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/modules/auth/guard';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { validateImage } from '@/modules/media/service';

const MAX = 6;
const bucket = 'product-images';

function carouselError(error: unknown, request: Request, fallback: string) {
  const requestId = request.headers.get('x-request-id')?.slice(0, 100) ?? randomUUID();
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message = code === '42P01' ? 'Carousel database schema is unavailable'
    : code === '42501' ? 'Carousel database permission is unavailable'
    : error instanceof Error && /bucket|storage/i.test(error.message) ? 'Carousel storage is unavailable'
    : fallback;
  console.error(`[carousel-error] request=${requestId} category=${message.replaceAll(' ', '_')} code=${code || 'unknown'}`);
  return NextResponse.json({ error: message, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const db: any = createSupabaseAdminClient();
    const { data, error } = await db.from('site_carousel_slides').select('id,image_path,sort_order,active').order('sort_order').order('created_at');
    if (error) throw error;
    const slides = await Promise.all((data ?? []).map(async (slide: any) => {
      const signed = await db.storage.from(bucket).createSignedUrl(slide.image_path, 900);
      return { ...slide, imageUrl: signed.data?.signedUrl ?? null };
    }));
    return NextResponse.json(slides.filter((slide: any) => slide.imageUrl));
  } catch (error) {
    return carouselError(error, request, 'Unable to load carousel');
  }
}

async function deleteSlide(db: any, id: string) {
  if (!id) return NextResponse.json({ error: 'Slide id is required' }, { status: 400 });
  const found = await db.from('site_carousel_slides').select('image_path').eq('id', id).single();
  if (found.error) return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
  const deleted = await db.from('site_carousel_slides').delete().eq('id', id);
  if (deleted.error) throw deleted.error;
  const removed = await db.storage.from(bucket).remove([found.data.image_path]);
  if (removed.error) throw removed.error;
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const denied = protectAdminMutation(request); if (denied) return denied;
  try {
    await requireAdmin();
    const db: any = createSupabaseAdminClient();
    const contentType = request.headers.get('content-type') ?? '';
    const body: any = contentType.includes('multipart/form-data') ? Object.fromEntries(await request.formData()) : await request.json();
    if (body.action === 'reorder') {
      if (!Array.isArray(body.ids) || body.ids.length > MAX) return NextResponse.json({ error: 'Invalid carousel ids' }, { status: 400 });
      const result = await db.rpc('reorder_site_carousel', { p_ids: body.ids });
      if (result.error) throw result.error;
      return NextResponse.json(result.data);
    }
    if (body.action === 'delete') return deleteSlide(db, String(body.id ?? ''));
    if (!(body.file instanceof File)) return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    const validation = validateImage(body.file);
    if (validation.length) return NextResponse.json({ error: validation.join(', ') }, { status: 400 });
    const count = await db.from('site_carousel_slides').select('id', { count: 'exact', head: true });
    if (count.error) throw count.error;
    if ((count.count ?? 0) >= MAX) return NextResponse.json({ error: 'Carousel supports at most 6 slides' }, { status: 409 });
    const name = body.file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image';
    const path = `carousel/${randomUUID()}-${name}`;
    const upload = await db.storage.from(bucket).upload(path, body.file, { contentType: body.file.type, upsert: false });
    if (upload.error) throw upload.error;
    const inserted = await db.from('site_carousel_slides').insert({
      image_path: path,
      sort_order: count.count ?? 0,
      active: true,
    }).select().single();
    if (inserted.error) { await db.storage.from(bucket).remove([path]); throw inserted.error; }
    return NextResponse.json(inserted.data, { status: 201 });
  } catch (error) {
    return carouselError(error, request, 'Unable to update carousel');
  }
}

export async function DELETE(request: Request) {
  const denied = protectAdminMutation(request); if (denied) return denied;
  try { await requireAdmin(); return deleteSlide(createSupabaseAdminClient(), new URL(request.url).searchParams.get('id') ?? ''); }
  catch (error) { return apiError(error, { fallback: 'Unable to delete carousel slide', request }); }
}
