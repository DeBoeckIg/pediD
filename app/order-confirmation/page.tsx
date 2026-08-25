export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  return <main className="mx-auto max-w-xl p-4"><h1 className="text-2xl font-bold">Order confirmed</h1><p className="mt-4">Your order reference is <strong>{reference ?? 'unavailable'}</strong>.</p></main>;
}
