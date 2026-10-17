import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { validateImage, addProductImage, replacePrimaryImage, removeProductImage, setPrimaryImage, reorderProductImages } from '@/modules/media/service';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { MAX_MEDIA_REQUEST_BYTES, distributedRateLimit } from '@/lib/http/limits';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';

export async function POST(request: Request) {
  const forbidden = protectAdminMutation(request); if (forbidden) return forbidden;
  const limited = await distributedRateLimit(request, 'admin-media', 10, 60_000, 'local'); if (limited) return limited;
    const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_MEDIA_REQUEST_BYTES) return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  try {
    await requireAdmin();
    const contentType = request.headers.get('content-type') ?? '';
    const payload: Record<string, unknown> = contentType.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
    const file = payload.file;
    const productId = String(payload.productId ?? '');
     if (!productId) throw new Error('Product id is required');
     const admin = createSupabaseAdminClient();
     const storage = { upload: async (path: string, body: Blob, options: { contentType: string; upsert: boolean }) => { const { error } = await admin.storage.from('product-images').upload(path, body, options); if (error) throw error; }, remove: async (path: string) => { const { error } = await admin.storage.from('product-images').remove([path]); if (error) throw error; } };
        const action = String(payload.action ?? 'replace');
      if (action === 'delete') { await removeProductImage(admin, storage, String(payload.imageId ?? '')); return new NextResponse(null, { status: 204 }); }
       if (action === 'primary') { await setPrimaryImage(admin, String(payload.imageId ?? '')); return NextResponse.json({ ok: true }); }
       if (action === 'reorder') {
         const raw = payload.imageIds;
         const imageIds = Array.isArray(raw) ? raw : typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { throw new Error('imageIds must be valid JSON'); } })() : undefined;
         if (!Array.isArray(imageIds)) throw new Error('imageIds must be an array');
         return NextResponse.json(await reorderProductImages(admin, productId, imageIds));
       }
      if (!(file instanceof File)) throw new Error('Image file is required');
     const errors = validateImage(file); if (errors.length) throw new Error(errors.join(', '));
     const image = action === 'replace' ? await replacePrimaryImage(admin, storage, productId, file) : await addProductImage(admin, storage, productId, file, String(payload.primary) === 'true', Number(payload.sortOrder ?? 0)); const objectPath = image.object_path ?? image.objectPath; let imageUrl = objectPath;
    if (objectPath) { try { const signed = await admin.storage.from('product-images').createSignedUrl(objectPath, 900); if (!signed.error && signed.data?.signedUrl) imageUrl = signed.data.signedUrl; } catch {} }
    return NextResponse.json({ ...image, imageUrl, objectPath }, { status: 201 });
  } catch (error) { const response = apiError(error, { fallback: 'Invalid image', request }); if (error instanceof Error && error.message.includes('at most 6 images')) return NextResponse.json({ error: error.message }, { status: 409 }); return response; }
}
