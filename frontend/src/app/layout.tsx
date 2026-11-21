import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../styles/futuristic.css';
import '../styles/files.css';
import '../styles/beneficiary-portal.css';

export const metadata: Metadata = {
  title: 'MemoSphere | A quiet place for what matters',
  description: 'MemoSphere is a private AI-powered digital diary designed to preserve personal memories, stories, and meaningful experiences for future generations.',
  icons: {
    icon: '/images/logoo.png',
  },
};

// The browser theme-color meta content must be a literal, mirrored from --color-bg-0.
export const viewport: Viewport = {
  themeColor: '#070827',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
