import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Absensi TEFA — Sistem Kehadiran Digital',
  description:
    'Sistem absensi digital berbasis QR Code untuk TEFA. Aman, cepat, dan sulit dicurangi.',
  keywords: ['absensi', 'TEFA', 'QR code', 'kehadiran', 'attendance'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 antialiased text-slate-800 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
