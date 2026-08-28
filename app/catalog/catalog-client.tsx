'use client';
import { useEffect, useMemo, useState } from 'react';
import type { PublicCategory, PublicProduct } from '@/modules/catalog/dto';
import { normalizeCartEntries, pruneCartEntries } from '@/modules/orders/cart';
import { installationConfig } from '@/config/installation';

export type CartEntry = { productId: string; quantity: number; name?: string; priceArs?: number };
export function toCheckoutItems(items: CartEntry[]) { return items.map(({ productId, quantity }) => ({ product_id: productId, quantity })); }

export default function CatalogClient({ categories }: { categories: PublicCategory[] }) {
  const products = useMemo(() => categories.flatMap(category => category.products), [categories]);
  const [cart, setCart] = useState<CartEntry[]>([]);
  useEffect(() => { const saved = localStorage.getItem('pedid-cart'); const pruned = pruneCartEntries(normalizeCartEntries(saved), products); setCart(pruned); if (saved) localStorage.setItem('pedid-cart', JSON.stringify(pruned)); }, [products]);
  function update(product: PublicProduct, quantity: number) {
    const next = pruneCartEntries(normalizeCartEntries(localStorage.getItem('pedid-cart')), products).filter(item => item.productId !== product.id);
    if (quantity > 0) next.push({ productId: product.id, quantity: Math.min(quantity, 99), name: product.name, priceArs: product.priceArs });
    setCart(next); localStorage.setItem('pedid-cart', JSON.stringify(next));
  }
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const button = 'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';
  return <><div className="sticky top-4 z-10 mb-8 flex justify-end"><a className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" href="/checkout" aria-label={`Ver carrito (${count} productos)`}>Carrito ({count})</a></div>{categories.map(category => <section className="mb-10" key={category.id}><h2 className="mb-4 text-xl font-bold">{category.name}</h2>{category.products.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{category.products.map(product => { const quantity = cart.find(item => item.productId === product.id)?.quantity ?? 0; const available = product.availability === 'available'; return <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" key={product.id}>{product.imageUrl ? <img className="aspect-[4/3] w-full object-cover" src={product.imageUrl} alt={`Imagen de ${product.name}`} /> : <div className="aspect-[4/3] bg-slate-100" aria-hidden="true" />}<div className="p-5"><h3 className="font-semibold">{product.name}</h3><p className="mt-2 min-h-10 text-sm text-slate-600">{product.description}</p><p className="mt-4 text-lg font-bold">{installationConfig.currencyLabel} {product.priceArs.toLocaleString('es-AR')}</p><p className="mt-1 text-sm text-slate-500" aria-label="Disponibilidad">{available ? 'Disponible' : 'No disponible'}</p><div className="mt-4 flex items-center gap-3"><button className={button} disabled={!available || quantity <= 0} onClick={() => update(product, quantity - 1)} aria-label={`Quitar ${product.name}`}>−</button><span className="min-w-5 text-center font-semibold" aria-label={`Cantidad de ${product.name}`}>{quantity}</span><button className={button} disabled={!available} onClick={() => update(product, quantity + 1)} aria-label={`Agregar ${product.name}`}>+</button></div></div></article>; })}</div> : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No hay productos disponibles en esta categoría.</p>}</section>)}</>;
}
