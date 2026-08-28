export type Availability = 'available' | 'unavailable';
export type PublicProduct = { id: string; categoryId: string; categoryName: string; name: string; description: string; priceArs: number; imageUrl: string | null; availability: Availability };
export type PublicCategory = { id: string; name: string; products: PublicProduct[] };

type CatalogRow = { id: string; category_id: string; category_name: string; name: string; description: string; price_ars: number; availability: Availability; image_path: string | null };
export function toPublicProduct(row: CatalogRow, imageUrl: string | null = null): PublicProduct {
  return { id: row.id, categoryId: row.category_id, categoryName: row.category_name, name: row.name, description: row.description, priceArs: row.price_ars, imageUrl, availability: row.availability };
}
export function groupPublicCatalog(rows: CatalogRow[], imageUrlFor: (path: string) => string | null = () => null, metadata: Array<{ id: string; name: string }> = []): PublicCategory[] {
  const categories = new Map<string, PublicCategory>();
  metadata.forEach(category => categories.set(category.id, { ...category, products: [] }));
  for (const row of rows) {
    const category = categories.get(row.category_id) ?? { id: row.category_id, name: row.category_name, products: [] };
    category.products.push(toPublicProduct(row, row.image_path ? imageUrlFor(row.image_path) : null));
    categories.set(row.category_id, category);
  }
  return [...categories.values()];
}
