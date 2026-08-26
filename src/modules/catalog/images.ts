import type { PublicProduct } from './dto';

const IMAGE_BUCKET = 'product-images';
const SIGNED_URL_TTL_SECONDS = 60 * 15;

type StorageClient = {
  storage: { from(bucket: string): { createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: unknown | null }> } };
};

export async function createCatalogImageUrlMap(client: StorageClient, paths: (string | null)[]) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const entries = await Promise.all(uniquePaths.map(async path => {
    try {
      const { data, error } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) return [path, null] as const;
      return [path, data.signedUrl] as const;
    } catch {
      return [path, null] as const;
    }
  }));
  return new Map(entries);
}

export function imageUrlFor(map: Map<string, string | null>, path: string) {
  return map.get(path) ?? null;
}

export function publicCatalogImageUrlFor(map: Map<string, string | null>) {
  return (path: string) => imageUrlFor(map, path);
}
