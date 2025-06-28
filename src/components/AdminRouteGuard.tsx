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
    // 如果還在載入使用者資料，則不執行任何操作
    if (loading) {
      return;
    }

    // 如果載入完成，但 userProfile 不存在 (未登入) 或角色不是 admin
    if (!userProfile || userProfile.role !== 'admin') {
      // 導向首頁
      router.replace('/');
    }
  }, [userProfile, loading, router]);

  // 如果正在載入中，或權限不符即將被導向，可以顯示一個載入畫面
  if (loading || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>正在驗證權限...</p>
      </div>
    );
  }

  // 驗證通過，顯示子元件 (也就是後台頁面內容)
  return <>{children}</>;
}