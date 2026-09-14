export type Availability = 'available' | 'unavailable';
export type PublicVariant = { id: string; label: string; priceArs: number; availability: Availability };
export type PublicProduct = { id: string; categoryId: string; categoryName: string; name: string; description: string; priceArs: number; imageUrl: string | null; imageUrls: string[]; availability: Availability; variants: PublicVariant[] };
export type PublicCategory = { id: string; name: string; products: PublicProduct[] };

type CatalogRow = { id: string; category_id: string; category_name: string; name: string; description: string; price_ars: number; availability: Availability; image_path: string | null; image_paths?: string[]; variant_id?: string | null; variant_label?: string | null; variant_price_ars?: number | null; variant_availability?: Availability | null };
export function toPublicProduct(row: CatalogRow, imageUrl: string | null = null, imageUrls: string[] = []): PublicProduct {
  const variants = row.variant_id ? [{ id: row.variant_id, label: row.variant_label ?? 'Unidad', priceArs: row.variant_price_ars ?? row.price_ars, availability: row.variant_availability ?? row.availability }] : [{ id: row.id, label: 'Unidad', priceArs: row.price_ars, availability: row.availability }];
  return { id: row.id, categoryId: row.category_id, categoryName: row.category_name, name: row.name, description: row.description, priceArs: row.price_ars, imageUrl, imageUrls, availability: variants.some(v => v.availability === 'available') ? 'available' : 'unavailable', variants };
}
export function groupPublicCatalog(rows: CatalogRow[], imageUrlFor: (path: string) => string | null = () => null): PublicCategory[] {
  const categories = new Map<string, PublicCategory>();
  for (const row of rows) {
    const category = categories.get(row.category_id) ?? { id: row.category_id, name: row.category_name, products: [] };
    const paths = row.image_paths ?? (row.image_path ? [row.image_path] : []);
    category.products.push(toPublicProduct(row, paths[0] ? imageUrlFor(paths[0]) : null, paths.map(imageUrlFor).filter((url): url is string => Boolean(url))));
    categories.set(row.category_id, category);
  }
  return [...categories.values()];
}
