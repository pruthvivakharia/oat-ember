import './globals.css';
import {Inter,Space_Grotesk} from 'next/font/google';
import Navbar from '@/components/Navbar';
import Providers from '@/components/Providers';
const inter=Inter({subsets:['latin'],variable:'--font-inter'});const space=Space_Grotesk({subsets:['latin'],variable:'--font-space-grotesk'});
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${inter.variable} ${space.variable}`}><Providers><Navbar/>{children}</Providers></body></html>}
