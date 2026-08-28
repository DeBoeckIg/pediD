type SubmissionCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (values: Uint8Array) => Uint8Array;
};

let fallbackCounter = 0;

export function generateSubmissionKey(cryptoSource: SubmissionCrypto | null | undefined = globalThis.crypto): string {
  if (typeof cryptoSource?.randomUUID === 'function') return cryptoSource.randomUUID();

  if (typeof cryptoSource?.getRandomValues === 'function') {
    const bytes = cryptoSource.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return formatUuid(bytes);
  }

  fallbackCounter = (fallbackCounter + 1) % 0x1000000;
  const seed = `${Date.now().toString(16)}-${fallbackCounter.toString(16).padStart(6, '0')}-${Math.random().toString(16).slice(2)}`;
  return `${seed}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`.slice(0, 36);
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
