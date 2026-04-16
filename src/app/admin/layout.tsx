import type { Metadata } from 'next';
import AdminOnlyRoute from '@/components/AdminOnlyRoute';
import AdminLayoutClient from '@/components/admin/AdminLayout';

export const metadata: Metadata = {
  title: 'Admin Panel — Kumami World',
  description: 'Content management and administration for Kumami World.',
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminOnlyRoute>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AdminOnlyRoute>
  );
}
