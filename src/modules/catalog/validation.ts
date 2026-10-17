export type ProductInput = { name: string; description?: string; categoryId: string; priceArs?: number; stockQuantity?: number; published?: boolean };
export type VariantInput = { label: string; priceArs: number; stockQuantity: number; sortOrder: number; published: boolean; [key: string]: unknown };
export function validateVariantInput(input: VariantInput): string[] {
  const errors: string[] = [];
  if (!input.label.trim() || input.label.trim().length > 80) errors.push('Label must contain 1 to 80 characters');
  if ('unitType' in input && !['grams', 'kilograms', 'unit'].includes(String(input.unitType))) errors.push('Unit type is invalid');
  if ('quantity' in input && (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0)) errors.push('Quantity must be positive');
  if (input.priceArs !== undefined && (!Number.isInteger(input.priceArs) || input.priceArs < 0)) errors.push('Price must be a non-negative whole-number ARS amount');
  if (input.stockQuantity !== undefined && (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0)) errors.push('Stock must be a non-negative integer');
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) errors.push('Sort order must be a non-negative integer');
  return errors;
}
export function validateProductInput(input: ProductInput): string[] {
  const errors: string[] = [];
  const price = input.priceArs;
  const stock = input.stockQuantity;
  if (!input.name.trim() || input.name.trim().length > 160) errors.push('Name must contain 1 to 160 characters');
  if (!input.categoryId) errors.push('Category is required');
  if (price !== undefined && (!Number.isInteger(price) || price < 0)) errors.push('Price must be a non-negative whole-number ARS amount');
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) errors.push('Stock must be a non-negative integer');
  return errors;
}
export function validateCategoryName(name: string): string[] { return !name.trim() || name.trim().length > 120 ? ['Category name must contain 1 to 120 characters'] : []; }
