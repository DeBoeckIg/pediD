import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { authorized: true, serverClient: {} as any, adminClient: {} as any };
const requireAdmin = vi.fn(async () => { if (!state.authorized) throw new Error('Unauthorized'); });
const createServerClient = vi.fn(async () => state.serverClient);
const createAdminClient = vi.fn(() => state.adminClient);
const saveCategory = vi.fn(async (_client, id, name) => ({ id: id ?? 'category-1', name }));
const saveProduct = vi.fn(async (_client, id, input) => ({ id: id ?? 'product-1', ...input }));
const deleteProduct = vi.fn(async () => undefined);
const deleteCategory = vi.fn(async () => undefined);
const replacePrimaryImage = vi.fn(async (_client, _storage, productId, file) => ({ product_id: productId, object_path: `products/${productId}/${file.name}` }));
const validateImage = vi.fn(() => []);
const updateOrderStatus = vi.fn(async () => ({ id: 'order-1', status: 'confirmed' }));
const signIn = vi.fn(async (businessCode: string, password: string) => { if (businessCode !== 'STORE' || password !== 'SecureAdmin123') throw new Error('Invalid credentials'); });
const issueAdminSession = vi.fn(async () => 'session-token');

vi.mock('@/modules/auth/guard', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: createServerClient, createSupabaseAdminClient: createAdminClient }));
vi.mock('@/modules/catalog/service', () => ({ saveCategory, saveProduct, deleteProduct, deleteCategory }));
vi.mock('@/modules/media/service', () => ({ replacePrimaryImage, validateImage }));
vi.mock('@/modules/orders/admin-service', () => ({ updateOrderStatus }));
vi.mock('@/modules/auth/service', () => ({ signIn }));
vi.mock('@/modules/auth/session', () => ({ issueAdminSession }));

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
    expect(saveCategory).toHaveBeenCalledWith(state.adminClient, undefined, 'Drinks'); expect(saveProduct).toHaveBeenCalledWith(state.adminClient, undefined, expect.any(Object)); expect(deleteProduct).toHaveBeenCalledWith(state.adminClient, 'product-1');
  });

  it('uses the admin client and rejects unauthorized category updates', async () => {
    const { POST } = await import('../app/api/admin/categories/route');
    const request = () => new Request('http://localhost', { method: 'POST', body: JSON.stringify({ id: 'category-1', name: 'Hot Drinks' }), headers: { 'content-type': 'application/json' } });
    expect((await POST(request())).status).toBe(200);
    expect(saveCategory).toHaveBeenCalledWith(state.adminClient, 'category-1', 'Hot Drinks');
    expect(createAdminClient).toHaveBeenCalled(); expect(createServerClient).not.toHaveBeenCalled();
    state.authorized = false;
    expect((await POST(request())).status).toBe(401);
  });

  it('uses the service-role client for authorized product updates and preserves fields', async () => {
    const { POST } = await import('../app/api/admin/products/route');
    const body = { id: 'product-1', name: 'Tea', description: 'Green', categoryId: 'category-1', priceArs: 100, stockQuantity: 2, published: true };
    expect((await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }))).status).toBe(200);
    expect(saveProduct).toHaveBeenCalledWith(state.adminClient, 'product-1', expect.objectContaining({ name: body.name, description: body.description, categoryId: body.categoryId, priceArs: body.priceArs, stockQuantity: body.stockQuantity, published: body.published }));
    expect(createAdminClient).toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('enforces reassignment before category deletion at the route boundary', async () => {
    deleteCategory.mockRejectedValueOnce(new Error('Reassign every product before deleting this category')).mockResolvedValueOnce(undefined);
    const { DELETE } = await import('../app/api/admin/categories/[id]/route');
    expect((await DELETE(new Request('http://localhost'), { params: Promise.resolve({ id: 'category-1' }) })).status).toBe(409);
    expect((await DELETE(new Request('http://localhost'), { params: Promise.resolve({ id: 'category-1' }) })).status).toBe(204);
    expect(deleteCategory).toHaveBeenCalledTimes(2); expect(deleteCategory).toHaveBeenLastCalledWith(state.adminClient, 'category-1');
  });

  it('protects order status updates and delegates authorized requests', async () => {
    const { POST } = await import('../app/api/admin/orders/status/route');
    const request = () => new Request('http://localhost', { method: 'POST', body: JSON.stringify({ orderId: 'order-1', status: 'confirmed' }), headers: { 'content-type': 'application/json' } });
    expect((await POST(request())).status).toBe(200);
    state.authorized = false;
    expect((await POST(request())).status).toBe(401);
  });

  it('redirects native order status forms back to the orders page', async () => {
    const { POST } = await import('../app/api/admin/orders/status/route');
    const form = new FormData();
    form.set('orderId', 'order-1');
    form.set('status', 'confirmed');
    const response = await POST(new Request('http://localhost/api/admin/orders/status', { method: 'POST', body: form }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost/admin/orders');
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
