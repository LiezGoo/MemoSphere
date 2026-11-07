import type { Metadata } from 'next';
import './globals.css';
import '../styles/futuristic.css';

export const metadata: Metadata = {
  title: 'Alaala | A quiet place for what matters',
  description: 'A private space for preserving memories and intentions.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}