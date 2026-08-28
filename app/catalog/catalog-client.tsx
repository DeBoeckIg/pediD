'use client';
import { useEffect, useMemo, useState } from 'react';
import type { PublicCategory, PublicProduct } from '@/modules/catalog/dto';
import { normalizeCartEntries, pruneCartEntries } from '@/modules/orders/cart';

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
  return <><div className="mb-4 flex justify-end"><a className="rounded border px-3 py-2" href="/checkout" aria-label={`Ver carrito (${count} productos)`}>Carrito ({count})</a></div>{categories.map(category => <section className="my-6" key={category.id}><h2 className="text-xl font-semibold">{category.name}</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{category.products.map(product => { const quantity = cart.find(item => item.productId === product.id)?.quantity ?? 0; const available = product.availability === 'available'; return <article className="rounded border p-4" key={product.id}>{product.imageUrl && <img className="h-40 w-full object-cover" src={product.imageUrl} alt={`Imagen de ${product.name}`} />}<h3 className="font-semibold">{product.name}</h3><p>{product.description}</p><p>ARS {product.priceArs.toLocaleString('es-AR')}</p><p aria-label="Disponibilidad">{available ? 'Disponible' : 'No disponible'}</p><div className="mt-2 flex items-center gap-2"><button disabled={!available || quantity <= 0} onClick={() => update(product, quantity - 1)} aria-label={`Quitar ${product.name}`}>−</button><span aria-label={`Cantidad de ${product.name}`}>{quantity}</span><button disabled={!available} onClick={() => update(product, quantity + 1)} aria-label={`Agregar ${product.name}`}>+</button></div></article>; })}</div></section>)}</>;
}
