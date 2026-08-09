import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import AgeGate from '@/components/AgeGate';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Nightfall — Community',
  description: 'Discover profiles from the community.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg antialiased">
        <AgeGate />
        <Header />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#1a1a24', color: '#f4f4f5', border: '1px solid rgba(255,255,255,0.08)' },
          }}
        />
      </body>
    </html>
  );
}
