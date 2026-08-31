import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/Navbar';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Oat & Ember — Coffee, Curbside, Office', template: '%s · Oat & Ember' },
  description: 'Small-batch coffee, pastries and matcha made for fast curbside pickup and effortless office handovers in Surat.',
  applicationName: 'Oat & Ember',
  keywords: ['Oat & Ember', 'Surat cafe', 'coffee', 'curbside pickup', 'office coffee'],
  openGraph: {
    title: 'Oat & Ember — Coffee, Curbside, Office',
    description: 'Order coffee, choose your handover and keep moving.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e0c0b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${inter.variable} ${space.variable}`}><Providers><Navbar />{children}</Providers></body></html>;
}
