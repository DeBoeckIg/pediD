import type { ReactNode } from 'react';
import { installationConfig } from '@/config/installation';
export const metadata = { title: installationConfig.businessName };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="es"><body className="min-h-screen bg-slate-50 text-slate-900 antialiased"><header className="border-b border-slate-200 bg-white px-4 py-3"><span className="font-bold">{installationConfig.shortLabel}</span></header>{children}</body></html>; }
