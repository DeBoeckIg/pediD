import { beforeEach, describe, expect, it, vi } from 'vitest';
import { protectAdminMutation } from '../src/lib/http/csrf';

const state = { authorized: true, serverClient: {} as any, adminClient: { storage: { from: vi.fn(() => ({ createSignedUrl: vi.fn(async () => ({ data: null, error: null })) })) } } as any };
const requireAdmin = vi.fn(async () => { if (!state.authorized) throw new Error('Unauthorized'); });
const createServerClient = vi.fn(async () => state.serverClient);
const createAdminClient = vi.fn(() => state.adminClient);
const saveCategory = vi.fn(async (_client, id, name) => ({ id: id ?? 'category-1', name }));
const saveProduct = vi.fn(async (_client, id, input) => ({ id: id ?? 'product-1', ...input }));
const deleteProduct = vi.fn(async () => undefined);
const deleteCategory = vi.fn(async () => undefined);
const replacePrimaryImage = vi.fn(async (_client, _storage, productId, file) => ({ product_id: productId, object_path: `products/${productId}/${file.name}` }));
const validateImage = vi.fn(() => []);
const saveVariant = vi.fn(async (_client, productId, id, input) => ({ id: id ?? 'variant-1', product_id: productId, ...input }));
const deleteVariant = vi.fn(async () => undefined);
const addProductImage = vi.fn(async (_client, _storage, productId, file, primary, sortOrder) => ({ product_id: productId, object_path: `products/${productId}/${file.name}`, is_primary: primary, sort_order: sortOrder }));
const removeProductImage = vi.fn(async () => undefined);
const setPrimaryImage = vi.fn(async () => undefined);
const updateOrderStatus = vi.fn(async () => ({ id: 'order-1', status: 'confirmed' }));
const signIn = vi.fn(async (businessCode: string, password: string) => { if (businessCode !== 'STORE' || password !== 'SecureAdmin123') throw new Error('Invalid credentials'); });
const issueAdminSession = vi.fn(async () => 'session-token');
const securityHeaders = { origin: 'http://localhost', cookie: 'pedid_csrf_token=test-token', 'x-csrf-token': 'test-token' };

vi.mock('@/modules/auth/guard', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: createServerClient, createSupabaseAdminClient: createAdminClient }));
vi.mock('@/modules/catalog/service', () => ({ saveCategory, saveProduct, deleteProduct, deleteCategory, saveVariant, deleteVariant }));
vi.mock('@/modules/media/service', () => ({ replacePrimaryImage, validateImage, addProductImage, removeProductImage, setPrimaryImage }));
vi.mock('@/modules/orders/admin-service', () => ({ updateOrderStatus }));
vi.mock('@/modules/auth/service', () => ({ signIn }));
vi.mock('@/modules/auth/session', () => ({ issueAdminSession }));

describe('admin route boundaries', () => {
  beforeEach(() => { state.authorized = true; vi.clearAllMocks(); });

  it('authorizes upload and persists the replacement through the route', async () => {
    const { POST } = await import('../app/api/admin/media/route');
    const form = new FormData(); form.set('productId', 'product-1'); form.set('file', new File(['image'], 'new.png', { type: 'image/png' }));
    const response = await POST(new Request('http://localhost/api/admin/media', { method: 'POST', body: form, headers: securityHeaders }));
    expect(response.status).toBe(201); expect(replacePrimaryImage).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'product-1', expect.any(File));
    state.authorized = false;
    expect((await POST(new Request('http://localhost/api/admin/media', { method: 'POST', body: form, headers: securityHeaders }))).status).toBe(401);
  });

  it('creates, edits, and deletes variants through guarded routes', async () => {
    const variants = await import('../app/api/admin/variants/route');
    const body = { productId: 'product-1', label: '500 g', unitType: 'grams', quantity: 500, priceArs: 1200, stockQuantity: 4, sortOrder: 1, published: true };
    expect((await variants.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body), headers: { ...securityHeaders, 'content-type': 'application/json' } }))).status).toBe(201);
    expect((await variants.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ ...body, id: 'variant-1' }), headers: { ...securityHeaders, 'content-type': 'application/json' } }))).status).toBe(200);
    expect((await variants.DELETE(new Request('http://localhost/api/admin/variants?productId=product-1&id=variant-1', { method: 'DELETE', headers: securityHeaders }))).status).toBe(204);
    expect(saveVariant).toHaveBeenCalledWith(state.adminClient, 'product-1', undefined, expect.objectContaining({ label: '500 g', unitType: 'grams', quantity: 500, priceArs: 1200, stockQuantity: 4 }));
    expect(deleteVariant).toHaveBeenCalledWith(state.adminClient, 'product-1', 'variant-1');
  });

  it('uploads multiple images and supports primary/delete actions without storage calls in tests', async () => {
    const { POST } = await import('../app/api/admin/media/route');
    const upload = (name: string, primary = false, sortOrder = 0) => { const form = new FormData(); form.set('productId', 'product-1'); form.set('file', new File(['image'], name, { type: 'image/png' })); form.set('action', 'add'); form.set('primary', String(primary)); form.set('sortOrder', String(sortOrder)); return POST(new Request('http://localhost/api/admin/media', { method: 'POST', body: form, headers: securityHeaders })); };
    expect((await upload('one.png', true, 0)).status).toBe(201);
    expect((await upload('two.png', false, 1)).status).toBe(201);
    const primary = new FormData(); primary.set('productId', 'product-1'); primary.set('imageId', 'image-2'); primary.set('action', 'primary');
    expect((await POST(new Request('http://localhost/api/admin/media', { method: 'POST', body: primary, headers: securityHeaders }))).status).toBe(200);
    const deletion = new FormData(); deletion.set('productId', 'product-1'); deletion.set('imageId', 'image-2'); deletion.set('action', 'delete');
    expect((await POST(new Request('http://localhost/api/admin/media', { method: 'POST', body: deletion, headers: securityHeaders }))).status).toBe(204);
    expect(addProductImage).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'product-1', expect.any(File), true, 0);
    expect(setPrimaryImage).toHaveBeenCalledWith(state.adminClient, 'image-2');
    expect(removeProductImage).toHaveBeenCalledWith(state.adminClient, expect.anything(), 'image-2');
  });

  it('rejects unauthorized and internal failures on new endpoints without leaking details', async () => {
    const variants = await import('../app/api/admin/variants/route');
    const request = () => new Request('http://localhost', { method: 'POST', body: JSON.stringify({ productId: 'p', label: 'Unit', unitType: 'unit', quantity: 1, priceArs: 1, stockQuantity: 1, sortOrder: 0, published: false }), headers: { ...securityHeaders, 'content-type': 'application/json' } });
    state.authorized = false;
    expect((await variants.POST(request())).status).toBe(401);
    state.authorized = true; saveVariant.mockRejectedValueOnce(new Error('Supabase secret/internal SQL detail'));
    const response = await variants.POST(request());
    expect(response.status).toBe(500); const body = await response.json();
    expect(body.error).toBe('Invalid presentation'); expect(JSON.stringify(body)).not.toContain('Supabase');
  });

  it('routes category and product CRUD to guarded persistence', async () => {
    const categories = await import('../app/api/admin/categories/route');
    const products = await import('../app/api/admin/products/route');
    expect((await categories.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Drinks' }), headers: { ...securityHeaders, 'content-type': 'application/json' } }))).status).toBe(201);
    expect((await products.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Tea', categoryId: 'category-1', priceArs: 100, stockQuantity: 2, published: true }), headers: { ...securityHeaders, 'content-type': 'application/json' } }))).status).toBe(201);
    expect((await products.DELETE(new Request('http://localhost/api/admin/products?id=product-1', { headers: securityHeaders }))).status).toBe(204);
    expect(saveCategory).toHaveBeenCalledWith(state.adminClient, undefined, 'Drinks'); expect(saveProduct).toHaveBeenCalledWith(state.adminClient, undefined, expect.any(Object)); expect(deleteProduct).toHaveBeenCalledWith(state.adminClient, 'product-1');
  });

  it('uses the admin client and rejects unauthorized category updates', async () => {
    const { POST } = await import('../app/api/admin/categories/route');
    const request = () => new Request('http://localhost', { method: 'POST', body: JSON.stringify({ id: 'category-1', name: 'Hot Drinks' }), headers: { ...securityHeaders, 'content-type': 'application/json' } });
    expect((await POST(request())).status).toBe(200);
    expect(saveCategory).toHaveBeenCalledWith(state.adminClient, 'category-1', 'Hot Drinks');
    expect(createAdminClient).toHaveBeenCalled(); expect(createServerClient).not.toHaveBeenCalled();
    state.authorized = false;
    expect((await POST(request())).status).toBe(401);
  });

  it('uses the service-role client for authorized product updates and preserves fields', async () => {
    const { POST } = await import('../app/api/admin/products/route');
    const body = { id: 'product-1', name: 'Tea', description: 'Green', categoryId: 'category-1', priceArs: 100, stockQuantity: 2, published: true };
    expect((await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body), headers: { ...securityHeaders, 'content-type': 'application/json' } }))).status).toBe(200);
    expect(saveProduct).toHaveBeenCalledWith(state.adminClient, 'product-1', expect.objectContaining({ name: body.name, description: body.description, categoryId: body.categoryId, priceArs: body.priceArs, stockQuantity: body.stockQuantity, published: body.published }));
    expect(createAdminClient).toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('never exposes persistence details from admin catalog routes', async () => {
    saveProduct.mockRejectedValueOnce(new Error('PostgreSQL password or storage bucket detail'));
    const { POST } = await import('../app/api/admin/products/route');
    const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Tea', categoryId: 'category-1', priceArs: 100, stockQuantity: 2, published: true }), headers: { ...securityHeaders, 'content-type': 'application/json' } }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Invalid product');
    expect(JSON.stringify(body)).not.toContain('PostgreSQL');
  });

  it('enforces reassignment before category deletion at the route boundary', async () => {
    deleteCategory.mockRejectedValueOnce(new Error('Reassign every product before deleting this category')).mockResolvedValueOnce(undefined);
    const { DELETE } = await import('../app/api/admin/categories/[id]/route');
    expect((await DELETE(new Request('http://localhost', { headers: securityHeaders }), { params: Promise.resolve({ id: 'category-1' }) })).status).toBe(409);
    expect((await DELETE(new Request('http://localhost', { headers: securityHeaders }), { params: Promise.resolve({ id: 'category-1' }) })).status).toBe(204);
    expect(deleteCategory).toHaveBeenCalledTimes(2); expect(deleteCategory).toHaveBeenLastCalledWith(state.adminClient, 'category-1');
  });

  it('protects order status updates and delegates authorized requests', async () => {
    const { POST } = await import('../app/api/admin/orders/status/route');
    const request = () => new Request('http://localhost', { method: 'POST', body: JSON.stringify({ orderId: 'order-1', status: 'confirmed' }), headers: { ...securityHeaders, 'content-type': 'application/json' } });
    expect((await POST(request())).status).toBe(200);
    state.authorized = false;
    expect((await POST(request())).status).toBe(401);
  });

  it('redirects native order status forms back to the orders page', async () => {
    const { POST } = await import('../app/api/admin/orders/status/route');
    const form = new FormData();
    form.set('orderId', 'order-1');
    form.set('status', 'confirmed');
    const response = await POST(new Request('http://localhost/api/admin/orders/status', { method: 'POST', body: form, headers: securityHeaders }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost/admin/orders');
  });

  it('enforces origin and double-submit token policy', () => {
    const request = (headers: Record<string, string>) => new Request('http://localhost/api/admin/products', { method: 'POST', headers });
    expect(protectAdminMutation(request({ ...securityHeaders }))).toBeNull();
    expect(protectAdminMutation(request({ cookie: securityHeaders.cookie, 'x-csrf-token': securityHeaders['x-csrf-token'] }) )!.status).toBe(403);
    expect(protectAdminMutation(request({ ...securityHeaders, origin: 'https://evil.example' }) )!.status).toBe(403);
    expect(protectAdminMutation(request({ origin: 'http://localhost', cookie: securityHeaders.cookie }) )!.status).toBe(403);
    expect(protectAdminMutation(request({ origin: 'http://localhost', cookie: securityHeaders.cookie, 'x-csrf-token': 'wrong' }) )!.status).toBe(403);
  });

  it('protects the existing logout endpoint', async () => {
    const { POST } = await import('../app/api/admin/logout/route');
    expect((await POST(new Request('http://localhost/api/admin/logout', { method: 'POST', headers: securityHeaders }))).status).toBe(200);
    expect((await POST(new Request('http://localhost/api/admin/logout', { method: 'POST', headers: { ...securityHeaders, origin: 'https://evil.example' } }))).status).toBe(403);
  });

  it('keeps the login endpoint contract and only issues a session for valid credentials', async () => {
    const { POST } = await import('../app/api/admin/login/route');
    const request = (body: unknown) => new Request('http://localhost/api/admin/login', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
    expect((await POST(request({ businessCode: 'STORE', password: 'SecureAdmin123' }))).status).toBe(200);
    expect(issueAdminSession).toHaveBeenCalled();
    const denied = await POST(request({ businessCode: 'STORE', password: 'wrong' }));
    expect(denied.status).toBe(401);
    expect((await denied.json()).error).toBe('Invalid credentials');
  });

  it('renders a browser login form that posts credentials and redirects to catalog', async () => {
    const source = await import('node:fs/promises').then(fs => fs.readFile('app/admin/login/form.tsx', 'utf8'));
    expect(source).toContain('name="businessCode"');
    expect(source).toContain('name="password"');
    expect(source).toContain("fetch('/api/admin/login'");
    expect(source).toContain("router.push('/admin/catalog')");
    expect(source).toContain('role="alert"');
  });
});
