import type { Metadata } from 'next';
import './globals.css';
import '../styles/futuristic.css';

export const metadata: Metadata = {
  title: 'MemoSphere | A quiet place for what matters',
  description: 'MemoSphere is a private AI-powered digital diary designed to preserve personal memories, stories, and meaningful experiences for future generations.',
  icons: {
    icon: '/images/logoo.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}