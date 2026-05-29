import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, JetBrains_Mono } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';
import { cn } from '@/lib/utils';

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'School Syllabus Tracker',
  description: 'Enterprise multi-tenant school syllabus tracking SaaS',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Syllabus Tracker' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-mono', jetbrainsMono.variable)}>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
