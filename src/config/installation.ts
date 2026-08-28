export type InstallationConfig = {
  businessName: string;
  shortLabel: string;
  primaryClass: string;
  whatsappNumber?: string;
  currencyLabel: string;
  logoPath?: string;
};

type InstallationEnv = Record<string, string | undefined> & Partial<Record<
  | 'NEXT_PUBLIC_BUSINESS_NAME'
  | 'NEXT_PUBLIC_SHORT_LABEL'
  | 'NEXT_PUBLIC_PRIMARY_COLOR'
  | 'NEXT_PUBLIC_WHATSAPP_NUMBER'
  | 'NEXT_PUBLIC_CURRENCY_LABEL'
  | 'NEXT_PUBLIC_LOGO_PATH', string | undefined>>;

const primaryClasses: Record<string, string> = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  rose: 'text-rose-600',
};

export function normalizeInstallationConfig(env: InstallationEnv = process.env): InstallationConfig {
  const businessName = env.NEXT_PUBLIC_BUSINESS_NAME?.trim() || 'pediD';
  return {
    businessName,
    shortLabel: env.NEXT_PUBLIC_SHORT_LABEL?.trim() || businessName,
    primaryClass: primaryClasses[env.NEXT_PUBLIC_PRIMARY_COLOR?.trim().toLowerCase() || ''] || primaryClasses.indigo,
    whatsappNumber: env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') || '5493813531217',
    currencyLabel: env.NEXT_PUBLIC_CURRENCY_LABEL?.trim() || 'ARS',
    logoPath: env.NEXT_PUBLIC_LOGO_PATH?.trim() || undefined,
  };
}

export const installationConfig = normalizeInstallationConfig();
