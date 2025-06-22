// src/app/dashboard/page.tsx (最終修正版)

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signOutUser } from '@/lib/auth';

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (userProfile && (!userProfile.familyIDs || userProfile.familyIDs.length === 0)) {
      router.replace('/onboarding/create-family');
    }
  }, [user, userProfile, loading, router]);

  if (loading || !userProfile || !userProfile.familyIDs || userProfile.familyIDs.length === 0) {
    return <div className="flex min-h-screen items-center justify-center">載入中或正在重新導向...</div>;
  }

  return (
    // flex, flex-col, min-h-screen 確保頁面置底
    <div className="flex min-h-screen flex-col w-full bg-gray-50">
      
      {/* Header 區塊 */}
      <header className="w-full bg-white shadow-sm flex-shrink-0">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* 拿掉標題文字，保持簡潔 */}
          <div /> 
          <button
            onClick={signOutUser}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            登出
          </button>
        </div>
      </header>
      
      {/* Main Content 區塊 */}
      {/* flex-grow 確保此區塊填滿剩餘空間，將頁尾推到底部 */}
      <main className="w-full container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="p-10 border-2 border-dashed border-gray-300 rounded-lg h-full">
          <p className="text-center text-gray-500">儀表板內容開發中...</p>
        </div>
      </main>

    </div>
  );
}