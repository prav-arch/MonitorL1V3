import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Telecom L1 Monitoring',
  description: 'A sophisticated, locally-hosted GenAI L1 monitoring application for telecom infrastructure',
};

/**
 * Root layout component that wraps all pages
 * 
 * @param children The page content
 * @returns The root layout
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-bs-theme="dark">
      <head>
        <link rel="icon" href="/generated-icon.png" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}