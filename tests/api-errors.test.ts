import { describe, expect, it, vi } from 'vitest';
import { apiError } from '../src/lib/http/errors';

describe('API error boundary', () => {
  it('keeps validation and auth messages safe', async () => {
    expect((await apiError(new Error('Cart cannot be empty'), { fallback: 'Checkout failed' })).status).toBe(400);
    expect((await apiError(new Error('Invalid credentials'), { fallback: 'Login failed' })).status).toBe(401);
  });
  it('maps conflicts without leaking database details', async () => {
    const response = await apiError(new Error('Product unavailable'), { fallback: 'Checkout failed' });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('Product unavailable');
  });
  it('uses a safe fallback for unexpected errors and logs only bounded metadata', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await apiError(new Error('password=secret select * from users'), { fallback: 'Unexpected error', request: new Request('http://localhost', { headers: { 'x-request-id': 'req-1' } }) });
    expect((await response.json()).error).toBe('Unexpected error');
    expect(spy).toHaveBeenCalledWith('[api-error] request=req-1 status=500 message=Unexpected error');
    spy.mockRestore();
  });
});
