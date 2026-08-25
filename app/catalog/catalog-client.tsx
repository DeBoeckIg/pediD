'use client';
import { useEffect, useState } from 'react';
import type { PublicCategory, PublicProduct } from '@/modules/catalog/dto';

export default function CatalogClient({ categories }: { categories: PublicCategory[] }) {
  const products = categories.flatMap(category => category.products);
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  useEffect(() => { const saved = localStorage.getItem('pedid-cart'); if (saved) setCart(JSON.parse(saved)); }, []);
  function update(product: PublicProduct, quantity: number) {
    const next = cart.filter(item => item.productId !== product.id);
    if (quantity > 0) next.push({ productId: product.id, quantity: Math.min(quantity, 99) });
    setCart(next); localStorage.setItem('pedid-cart', JSON.stringify(next));
  }
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return <><div className="mb-4 flex justify-end"><a className="rounded border px-3 py-2" href="/checkout">Cart ({count})</a></div>{categories.map(category => <section className="my-6" key={category.id}><h2 className="text-xl font-semibold">{category.name}</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{category.products.map(product => { const quantity = cart.find(item => item.productId === product.id)?.quantity ?? 0; const available = product.availability === 'available'; return <article className="rounded border p-4" key={product.id}>{product.imageUrl && <img className="h-40 w-full object-cover" src={product.imageUrl} alt="" />}<h3 className="font-semibold">{product.name}</h3><p>{product.description}</p><p>${product.priceArs.toLocaleString('es-AR')}</p><p aria-label="availability">{product.availability}</p><div className="mt-2 flex items-center gap-2"><button disabled={!available || quantity <= 0} onClick={() => update(product, quantity - 1)} aria-label={`Decrease ${product.name}`}>−</button><span>{quantity}</span><button disabled={!available} onClick={() => update(product, quantity + 1)} aria-label={`Increase ${product.name}`}>+</button></div></article>; })}</div></section>)}</>;
}
