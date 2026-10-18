# Admin push notifications

## Configuration

The pediD backend requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. The cron endpoint accepts `PUSH_CRON_SECRET`; `CRON_SECRET` is also supported for Vercel compatibility. Keep the private key server-only. The rociAtz frontend uses the matching public key as `VITE_VAPID_PUBLIC_KEY`.

Generate keys with `npx web-push generate-vapid-keys` and do not commit secrets.

## Local invocation

Start the local database and applications, enable notifications from the authenticated admin panel, then invoke the processor directly:

```bash
curl -X POST http://localhost:3000/api/admin/push/process \
  -H "x-push-cron-secret: $PUSH_CRON_SECRET"
```

Without a valid cron secret, the route uses the normal admin session and CSRF protection. Production push subscriptions require HTTPS; localhost is suitable for local development.

## Vercel cron behavior

Vercel Hobby does not run the five-minute processor cron. Configure an external scheduler to invoke `/api/admin/push/process` every five minutes with `Authorization: Bearer <PUSH_CRON_SECRET>`. The worker processes pending and retryable outbox jobs, retries up to five times, removes subscriptions returning HTTP 404 or 410, and marks a job sent only after at least one device accepts delivery.

Checkout only queues the notification; push delivery is asynchronous and cannot roll back an order.

## Testing boundary

Unit tests prove authorization, retry state, subscription cleanup, VAPID configuration handling, and route protection. They do not prove delivery through a real browser, push service, HTTPS deployment, Vercel scheduling, or a live Supabase database.
