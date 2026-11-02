import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ThemeScript } from '@/components/ThemeScript';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'mfikria Status', template: '%s · mfikria Status' },
  description: 'Pantau status server mfikriaApp dan project Vercel/Netlify dalam satu dashboard.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
