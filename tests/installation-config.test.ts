import { describe, expect, it } from 'vitest';
import { normalizeInstallationConfig } from '../src/config/installation';

describe('installation configuration', () => {
  it('preserves current defaults', () => {
    expect(normalizeInstallationConfig({})).toMatchObject({ businessName: 'pediD', shortLabel: 'pediD', currencyLabel: 'ARS', whatsappNumber: '5493813531217' });
  });
  it('trims values, normalizes WhatsApp digits, and restricts color classes', () => {
    expect(normalizeInstallationConfig({ NEXT_PUBLIC_BUSINESS_NAME: ' Tienda ', NEXT_PUBLIC_SHORT_LABEL: ' TD ', NEXT_PUBLIC_PRIMARY_COLOR: 'emerald', NEXT_PUBLIC_WHATSAPP_NUMBER: '+54 9 11-1234', NEXT_PUBLIC_CURRENCY_LABEL: ' USD ', NEXT_PUBLIC_LOGO_PATH: ' /logo.svg ' })).toEqual({ businessName: 'Tienda', shortLabel: 'TD', primaryClass: 'text-emerald-600', whatsappNumber: '549111234', currencyLabel: 'USD', logoPath: '/logo.svg' });
    expect(normalizeInstallationConfig({ NEXT_PUBLIC_PRIMARY_COLOR: 'bg-red-999' }).primaryClass).toBe('text-indigo-600');
  });
});
