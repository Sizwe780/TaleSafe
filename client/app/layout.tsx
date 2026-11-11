import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'TaleSafe Africa', description: 'Protect the stories that shape us.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
