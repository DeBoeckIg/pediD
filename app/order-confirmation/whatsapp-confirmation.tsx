'use client';

import { useEffect, useState } from 'react';
import { formatWhatsAppMessage, getWhatsAppUrl, ORDER_HANDOFF_STORAGE_KEY, type OrderHandoff } from '@/modules/orders/whatsapp';
import { installationConfig } from '@/config/installation';

export default function WhatsAppConfirmation({ reference, autoOpen = false }: { reference?: string; autoOpen?: boolean }) {
  const [handoff, setHandoff] = useState<OrderHandoff | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem(ORDER_HANDOFF_STORAGE_KEY);
    if (raw) try { setHandoff({ ...JSON.parse(raw), reference: reference ?? JSON.parse(raw).reference }); } catch { /* Ignore malformed client storage. */ }
  }, [reference]);
  const url = handoff && getWhatsAppUrl(installationConfig.whatsappNumber, formatWhatsAppMessage(handoff, installationConfig.currencyLabel));
  useEffect(() => {
    if (autoOpen && url) window.open(url, '_blank', 'noopener,noreferrer');
  }, [autoOpen, url]);
  if (!url) return <p className="mt-4 text-sm">No se puede enviar el pedido por WhatsApp porque el número no está configurado.</p>;
  return <div className="mt-4"><p className="text-sm text-slate-600">Podés enviar el pedido por WhatsApp para coordinar la confirmación.</p><a className="mt-3 inline-block rounded bg-green-600 p-2 text-white" href={url} target="_blank" rel="noreferrer" aria-label="Enviar pedido por WhatsApp">Enviar pedido por WhatsApp</a></div>;
}
