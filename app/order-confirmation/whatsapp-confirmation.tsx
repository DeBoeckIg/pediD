'use client';

import { useEffect, useState } from 'react';
import { formatWhatsAppMessage, getWhatsAppUrl, ORDER_HANDOFF_STORAGE_KEY, type OrderHandoff } from '@/modules/orders/whatsapp';

export default function WhatsAppConfirmation({ reference }: { reference?: string }) {
  const [handoff, setHandoff] = useState<OrderHandoff | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem(ORDER_HANDOFF_STORAGE_KEY);
    if (raw) try { setHandoff({ ...JSON.parse(raw), reference: reference ?? JSON.parse(raw).reference }); } catch { /* Ignore malformed client storage. */ }
  }, [reference]);
  const url = handoff && getWhatsAppUrl(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, formatWhatsAppMessage(handoff));
  if (!url) return <p className="mt-4 text-sm">WhatsApp handoff is unavailable because its number is not configured.</p>;
  return <p className="mt-4"><a className="rounded bg-green-600 p-2 text-white" href={url} target="_blank" rel="noreferrer">Send order on WhatsApp</a></p>;
}
