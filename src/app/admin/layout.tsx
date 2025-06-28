// src/app/admin/layout.tsx
import AdminRouteGuard from '@/components/AdminRouteGuard';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteGuard>{children}</AdminRouteGuard>;
}