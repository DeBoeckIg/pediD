export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export function validateImage(file: { type: string; size: number }): string[] {
  const errors: string[] = [];
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) errors.push('Images must be JPG, PNG, or WebP');
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) errors.push('Images must be 5 MB or smaller');
  return errors;
}
export function nextCleanupAttempt(attempts: number, now = new Date()): Date {
  const delayMinutes = Math.min(24 * 60, 2 ** Math.max(0, attempts) * 5);
  return new Date(now.getTime() + delayMinutes * 60_000);
}
export function objectPath(productId: string, extension: string): string { return `products/${productId}/${crypto.randomUUID()}.${extension}`; }
export async function optimizeImage(file: Blob, contentType: typeof ACCEPTED_IMAGE_TYPES[number]): Promise<Blob> {
  const errors = validateImage({ type: contentType, size: file.size }); if (errors.length) throw new Error(errors.join(', '));
  const sharp = (await import('sharp')).default;
  const output = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).toFormat(contentType === 'image/jpeg' ? 'jpeg' : contentType === 'image/png' ? 'png' : 'webp').toBuffer();
  return new Blob([new Uint8Array(output)], { type: contentType });
}

export type MediaStore = {
  upload(path: string, body: Blob, options: { contentType: string; upsert: boolean }): Promise<void>;
  remove(path: string): Promise<void>;
};

export async function replacePrimaryImage(client: any, storage: MediaStore, productId: string, file: File) {
  const errors = validateImage(file);
  if (errors.length) throw new Error(errors.join(', '));
  const optimized = await optimizeImage(file, file.type as typeof ACCEPTED_IMAGE_TYPES[number]);
  const extension = optimized.type === 'image/jpeg' ? 'jpg' : optimized.type.split('/')[1];
  const path = objectPath(productId, extension);
  await storage.upload(path, optimized, { contentType: optimized.type, upsert: false });
  const previous = await client.from('product_images').select('id,object_path').eq('product_id', productId).maybeSingle();
  if (previous.error) { await storage.remove(path); throw previous.error; }
  const inserted = previous.data
    ? await client.from('product_images').update({ object_path: path, mime_type: optimized.type, byte_size: optimized.size }).eq('id', previous.data.id).select().single()
    : await client.from('product_images').insert({ product_id: productId, object_path: path, mime_type: optimized.type, byte_size: optimized.size }).select().single();
  if (inserted.error) { await storage.remove(path); throw inserted.error; }
  if (previous.data) { const queued = await client.from('storage_cleanup_jobs').upsert({ object_path: previous.data.object_path }, { onConflict: 'object_path' }); if (queued.error) throw queued.error; }
  return inserted.data;
}
