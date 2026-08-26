'use client';
import { useState } from 'react';

export async function uploadProductImage(productId: string, file: File): Promise<void> {
  const form = new FormData(); form.append('productId', productId); form.append('file', file);
  const response = await fetch('/api/admin/media', { method: 'POST', body: form });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Unable to upload image'); }
}

export function productUpdatePayload(product: any, published: boolean) {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    categoryId: product.category_id,
    priceArs: product.price_ars,
    stockQuantity: product.stock_quantity,
    published,
  };
}

export default function AdminCatalogClient({ initial }: { initial: { categories: any[]; products: any[] } }) {
  const [category, setCategory] = useState(''); const [name, setName] = useState(''); const [categoryId, setCategoryId] = useState(initial.categories[0]?.id ?? ''); const [price, setPrice] = useState(0); const [stock, setStock] = useState(0); const [uploading, setUploading] = useState<string | null>(null); const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const submit = (url: string, method: string, body?: unknown) => fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error((await r.json()).error); location.reload(); });
  async function handleImage(productId: string, file?: File) { if (!file) return; setUploading(productId); setUploadError(e => ({ ...e, [productId]: '' })); try { await uploadProductImage(productId, file); location.reload(); } catch (cause) { setUploadError(e => ({ ...e, [productId]: cause instanceof Error ? cause.message : 'Unable to upload image' })); } finally { setUploading(null); } }
  return <main className="mx-auto max-w-6xl p-4"><h1 className="text-2xl font-bold">Catalog administration</h1><div className="grid gap-6 md:grid-cols-2"><section><h2>Categories</h2><form onSubmit={e => { e.preventDefault(); void submit('/api/admin/categories', 'POST', { name: category }); }}><input aria-label="Category name" value={category} onChange={e => setCategory(e.target.value)} required /><button type="submit">Create</button></form>{initial.categories.map(c => <p key={c.id}>{c.name} <button onClick={() => void submit(`/api/admin/categories/${c.id}`, 'DELETE')}>Delete</button></p>)}</section><section><h2>Products</h2><form onSubmit={e => { e.preventDefault(); void submit('/api/admin/products', 'POST', { name, categoryId, priceArs: price, stockQuantity: stock, published: false }); }}><input aria-label="Product name" value={name} onChange={e => setName(e.target.value)} required /><select aria-label="Product category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>{initial.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input aria-label="Price" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} /><input aria-label="Stock" type="number" value={stock} onChange={e => setStock(Number(e.target.value))} /><button type="submit">Create product</button></form>{initial.products.map(p => <div key={p.id}><span>{p.name}</span> <span aria-label={`Publication status for ${p.name}`}>{p.published ? 'Published' : 'Unpublished'}</span> <button onClick={() => void submit('/api/admin/products', 'POST', productUpdatePayload(p, !p.published))}>{p.published ? 'Unpublish' : 'Publish'}</button> <input aria-label={`Image for ${p.name}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading === p.id} onChange={e => void handleImage(p.id, e.target.files?.[0])} />{uploading === p.id && <span role="status">Uploading…</span>}{uploadError[p.id] && <p role="alert">{uploadError[p.id]}</p>} <button onClick={() => void submit(`/api/admin/products?id=${p.id}`, 'DELETE')}>Delete</button></div>)}</section></div></main>;
}
