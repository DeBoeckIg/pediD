export type ProductInput = { name: string; description?: string; categoryId: string; priceArs: number; stockQuantity: number; published: boolean };
export function validateProductInput(input: ProductInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim() || input.name.trim().length > 160) errors.push('Name must contain 1 to 160 characters');
  if (!input.categoryId) errors.push('Category is required');
  if (!Number.isInteger(input.priceArs) || input.priceArs < 0) errors.push('Price must be a non-negative whole-number ARS amount');
  if (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0) errors.push('Stock must be a non-negative integer');
  return errors;
}
export function validateCategoryName(name: string): string[] { return !name.trim() || name.trim().length > 120 ? ['Category name must contain 1 to 120 characters'] : []; }
