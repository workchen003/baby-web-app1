// src/components/AdminRouteGuard.tsx
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteGuardProps {
  children: ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!userProfile || userProfile.role !== 'admin') {
      router.replace('/');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>正在驗證權限...</p>
      </div>
    );
  }

  return <>{children}</>;
}