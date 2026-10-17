export function pushJobPatch(job: { attempts?: number; max_attempts?: number }, delivered: number, now = Date.now()) {
  const attempts = Number(job.attempts || 0) + 1;
  if (delivered > 0) return { status: 'sent', sent_at: new Date(now).toISOString(), attempts, last_error: null };
  const max = Number(job.max_attempts || 5);
  return { status: attempts >= max ? 'failed' : 'pending', attempts, next_attempt_at: new Date(now + Math.min(60 * 60_000, 2 ** attempts * 60_000)).toISOString(), last_error: 'Push delivery failed' };
}

export function isPushCronAuthorized(request: Request, secret = process.env.PUSH_CRON_SECRET) {
  const supplied = request.headers.get('x-push-cron-secret') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(secret && supplied && supplied.length === secret.length && supplied === secret);
}
