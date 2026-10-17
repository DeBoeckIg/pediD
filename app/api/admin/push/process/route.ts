import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { protectAdminMutation } from '@/lib/http/csrf';
import { isPushCronAuthorized, pushJobPatch } from '@/modules/push/state';

const MAX_BATCH = 20;
export async function POST(request: Request) {
  const cron = isPushCronAuthorized(request, process.env.PUSH_CRON_SECRET ?? process.env.CRON_SECRET);
  if (!cron) { const forbidden = protectAdminMutation(request); if (forbidden) return forbidden; await requireAdmin(); }
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT || !publicKey) return NextResponse.json({ error: 'Push worker is not configured' }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, publicKey, process.env.VAPID_PRIVATE_KEY);
  const db: any = createSupabaseAdminClient(); const now = new Date().toISOString();
  const { data: jobs } = await db.from('admin_push_outbox').select('*').in('status', ['pending', 'failed']).lte('next_attempt_at', now).lt('attempts', 5).limit(MAX_BATCH);
  const { data: subscriptions } = await db.from('admin_push_subscriptions').select('*'); let processed = 0;
  for (const job of jobs ?? []) {
    const attempt = Number(job.attempts || 0) + 1; let delivered = 0; let lastError = 'No active push subscriptions';
    for (const sub of subscriptions ?? []) { try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: 'Nuevo pedido', body: `${job.order_reference} · $${job.total_ars}`, url: '/admin/orders' })); delivered++; } catch (error: any) { lastError = String(error?.message || 'Push delivery failed'); if (error?.statusCode === 404 || error?.statusCode === 410) await db.from('admin_push_subscriptions').delete().eq('endpoint', sub.endpoint); } }
    const patch = pushJobPatch(job, delivered, Date.now()); if (delivered === 0) patch.last_error = lastError;
    await db.from('admin_push_outbox').update(patch).eq('id', job.id); processed++;
  }
  return NextResponse.json({ processed });
}
