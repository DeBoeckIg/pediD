'use client';
import { useEffect, useMemo, useState } from 'react';
import type { PublicCategory, PublicProduct } from '@/modules/catalog/dto';
import { normalizeCartEntries, pruneCartEntries } from '@/modules/orders/cart';
import { installationConfig } from '@/config/installation';

export type CartEntry = { productId: string; variantId?: string; quantity: number; name?: string; variantLabel?: string; priceArs?: number };
export function toCheckoutItems(items: CartEntry[]) { return items.map(({ productId, variantId, quantity }) => ({ product_id: productId, ...(variantId ? { variant_id: variantId } : {}), quantity })); }

export default function CatalogClient({ categories }: { categories: PublicCategory[] }) {
  const products = useMemo(() => categories.flatMap(category => category.products), [categories]);
  const [cart, setCart] = useState<CartEntry[]>([]);
  useEffect(() => { const saved = localStorage.getItem('pedid-cart'); const pruned = pruneCartEntries(normalizeCartEntries(saved), products); setCart(pruned); if (saved) localStorage.setItem('pedid-cart', JSON.stringify(pruned)); }, [products]);
  function update(product: PublicProduct, variantId: string, quantity: number) {
    const variant = product.variants.find(item => item.id === variantId);
    const next = pruneCartEntries(normalizeCartEntries(localStorage.getItem('pedid-cart')), products).filter(item => !(item.productId === product.id && item.variantId === variantId));
    if (quantity > 0 && variant) next.push({ productId: product.id, variantId, quantity: Math.min(quantity, 99), name: product.name, variantLabel: variant.label, priceArs: variant.priceArs });
    setCart(next); localStorage.setItem('pedid-cart', JSON.stringify(next));
  }
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const button = 'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';
  return <><div className="sticky top-4 z-10 mb-8 flex justify-end"><a className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white" href="/checkout" aria-label={`Ver carrito (${count} productos)`}>Carrito ({count})</a></div>{categories.map(category => <section className="mb-10" key={category.id}><h2 className="mb-4 text-xl font-bold">{category.name}</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{category.products.map(product => <ProductCard key={product.id} product={product} cart={cart} update={update} button={button} />)}</div></section>)}</>;
}

function ProductCard({ product, cart, update, button }: { product: PublicProduct; cart: CartEntry[]; update: (product: PublicProduct, variantId: string, quantity: number) => void; button: string }) {
  const [selectedId, setSelectedId] = useState(product.variants[0]?.id); const [selectedImage, setSelectedImage] = useState(product.imageUrl); const variant = product.variants.find(item => item.id === selectedId) ?? product.variants[0]; const entry = cart.find(item => item.productId === product.id && item.variantId === variant?.id) ?? cart.find(item => item.productId === product.id && !item.variantId); const quantity = entry?.quantity ?? 0; const available = variant?.availability === 'available';
  const images = product.imageUrls.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
  return <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{selectedImage ? <img className="aspect-[4/3] w-full object-cover" src={selectedImage} alt={`Imagen de ${product.name}`} /> : <div className="aspect-[4/3] bg-slate-100" aria-hidden="true" />}{images.length > 1 && <div className="flex gap-2 overflow-x-auto p-3" aria-label={`Imágenes de ${product.name}`}>{images.map((url, index) => <button type="button" key={url} className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 ${selectedImage === url ? 'border-indigo-600' : 'border-slate-200'}`} aria-label={`Ver imagen ${index + 1} de ${product.name}`} aria-pressed={selectedImage === url} onClick={() => setSelectedImage(url)}><img className="h-full w-full object-cover" src={url} alt="" /></button>)}</div>}<div className="p-5"><h3 className="font-semibold">{product.name}</h3><p className="mt-2 min-h-10 text-sm text-slate-600">{product.description}</p><label className="mt-3 block text-sm">Presentación<select className="mt-1 w-full rounded border p-2" value={variant?.id} onChange={event => setSelectedId(event.target.value)}>{product.variants.map(item => <option key={item.id} value={item.id}>{item.label} · {installationConfig.currencyLabel} {item.priceArs.toLocaleString('es-AR')} · {item.availability === 'available' ? 'Disponible' : 'No disponible'}</option>)}</select></label><p className="mt-2 text-sm text-slate-500">{available ? 'Disponible' : 'No disponible'}</p><div className="mt-4 flex items-center gap-3"><button className={button} disabled={!available || quantity <= 0} onClick={() => variant && update(product, variant.id, quantity - 1)}>−</button><span>{quantity}</span><button className={button} disabled={!available} onClick={() => variant && update(product, variant.id, quantity + 1)}>+</button></div></div></article>;
}
