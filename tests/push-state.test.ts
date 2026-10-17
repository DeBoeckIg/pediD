import { describe, expect, it } from 'vitest';
import { isPushCronAuthorized, pushJobPatch } from '@/modules/push/state';
describe('push outbox state', () => {
  it('only marks sent after at least one delivery', () => { expect(pushJobPatch({ attempts: 0 }, 0, 0).status).toBe('pending'); expect(pushJobPatch({ attempts: 0 }, 1, 0).status).toBe('sent'); });
  it('stops after max attempts', () => { const patch = pushJobPatch({ attempts: 4, max_attempts: 5 }, 0, 0); expect(patch.status).toBe('failed'); expect(patch.attempts).toBe(5); });
  it('backs off pending retries', () => { const patch = pushJobPatch({ attempts: 1, max_attempts: 5 }, 0, 0); expect(patch.status).toBe('pending'); expect(patch.next_attempt_at).toBe(new Date(4 * 60_000).toISOString()); });

  it.each([
    ['missing secret', new Headers(), undefined, false],
    ['wrong secret', new Headers({ 'x-push-cron-secret': 'wrong' }), 'secret', false],
    ['bearer secret', new Headers({ authorization: 'Bearer secret' }), 'secret', true],
    ['custom header secret', new Headers({ 'x-push-cron-secret': 'secret' }), 'secret', true],
  ])('%s', (_, headers, secret, expected) => {
    expect(isPushCronAuthorized(new Request('http://localhost', { headers }), secret)).toBe(expected);
  });
});
