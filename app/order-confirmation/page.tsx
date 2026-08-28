import WhatsAppConfirmation from './whatsapp-confirmation';

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  return <main className="mx-auto max-w-xl p-4"><h1 className="text-2xl font-bold">Pedido confirmado</h1><p className="mt-4">La referencia de tu pedido es <strong>{reference ?? 'no disponible'}</strong>.</p><WhatsAppConfirmation reference={reference} /></main>;
}
