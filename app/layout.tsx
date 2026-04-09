import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'SplitWise · Neon Pulse', template: '%s · SplitWise' },
  description: 'High-energy expense tracking and split bills management.',
};

export const viewport: Viewport = {
  themeColor: '#c8ff00',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} h-full antialiased`} style={{ colorScheme: 'dark' }}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
