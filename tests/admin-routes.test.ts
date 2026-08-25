import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { authorized: true, client: {} as any };
const requireAdmin = vi.fn(async () => { if (!state.authorized) throw new Error('Unauthorized'); });
const createClient = vi.fn(async () => state.client);
const saveCategory = vi.fn(async (_client, id, name) => ({ id: id ?? 'category-1', name }));
const saveProduct = vi.fn(async (_client, id, input) => ({ id: id ?? 'product-1', ...input }));
const deleteProduct = vi.fn(async () => undefined);
const deleteCategory = vi.fn(async () => undefined);
const replacePrimaryImage = vi.fn(async (_client, _storage, productId, file) => ({ product_id: productId, object_path: `products/${productId}/${file.name}` }));
const validateImage = vi.fn(() => []);

vi.mock('@/modules/auth/guard', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: createClient, createSupabaseAdminClient: createClient }));
vi.mock('@/modules/catalog/service', () => ({ saveCategory, saveProduct, deleteProduct, deleteCategory }));
vi.mock('@/modules/media/service', () => ({ replacePrimaryImage, validateImage }));

describe('admin route boundaries', () => {
  beforeEach(() => { state.authorized = true; vi.clearAllMocks(); });

  it('authorizes upload and persists the replacement through the route', async () => {
    const { POST } = await import('../app/api/admin/media/route');
    const form = new FormData(); form.set('productId', 'product-1'); form.set('file', new File(['image'], 'new.png', { type: 'image/png' }));
    const response = await POST(new Request('http://localhost/api/admin/media', { method: 'POST', body: form }));
    expect(response.status).toBe(201); expect(replacePrimaryImage).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'product-1', expect.any(File));
    state.authorized = false;
    expect((await POST(new Request('http://localhost/api/admin/media', { method: 'POST', body: form }))).status).toBe(401);
  });

  it('routes category and product CRUD to guarded persistence', async () => {
    const categories = await import('../app/api/admin/categories/route');
    const products = await import('../app/api/admin/products/route');
    expect((await categories.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Drinks' }), headers: { 'content-type': 'application/json' } }))).status).toBe(201);
    expect((await products.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Tea', categoryId: 'category-1', priceArs: 100, stockQuantity: 2, published: true }), headers: { 'content-type': 'application/json' } }))).status).toBe(201);
    expect((await products.DELETE(new Request('http://localhost/api/admin/products?id=product-1'))).status).toBe(204);
    expect(saveCategory).toHaveBeenCalled(); expect(saveProduct).toHaveBeenCalled(); expect(deleteProduct).toHaveBeenCalledWith(state.client, 'product-1');
  });

  it('enforces reassignment before category deletion at the route boundary', async () => {
    deleteCategory.mockRejectedValueOnce(new Error('Reassign every product before deleting this category')).mockResolvedValueOnce(undefined);
    const { DELETE } = await import('../app/api/admin/categories/[id]/route');
    expect((await DELETE(new Request('http://localhost'), { params: Promise.resolve({ id: 'category-1' }) })).status).toBe(409);
    expect((await DELETE(new Request('http://localhost'), { params: Promise.resolve({ id: 'category-1' }) })).status).toBe(204);
    expect(deleteCategory).toHaveBeenCalledTimes(2);
  });
});
