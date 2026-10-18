import WhatsAppConfirmation from './whatsapp-confirmation';

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ reference?: string; openWhatsApp?: string }> }) {
  const { reference, openWhatsApp } = await searchParams;
  return <main className="mx-auto max-w-xl px-4 py-12 sm:px-6"><section className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden="true">✓</div><h1 className="mt-5 text-3xl font-bold">Pedido confirmado</h1><p className="mt-4 text-slate-600">La referencia de tu pedido es</p><p className="mt-2 text-xl font-bold text-indigo-600">{reference ?? 'no disponible'}</p><WhatsAppConfirmation reference={reference} autoOpen={openWhatsApp === '1'} /><a className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700" href="/catalog">Volver al catálogo</a></section></main>;
}
