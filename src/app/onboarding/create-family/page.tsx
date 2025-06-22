// src/app/onboarding/create-family/page.tsx (更新後)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createFamily } from '@/lib/family';
import Link from 'next/link';

export default function CreateFamilyPage() {
  // 【修改】從 Context 中多取得 userProfile 和 refetchUserProfile
  const { user, userProfile, refetchUserProfile, loading } = useAuth();
  const router = useRouter();

  const [familyName, setFamilyName] = useState('');
  const [role, setRole] = useState('爸爸'); // 【新增】角色 state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('您尚未登入，請重新整理頁面。');
      return;
    }
    if (!familyName) {
      setError('請為您的家庭取個名字。');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 【修改】傳入角色參數
      await createFamily(user, familyName, role);
      // 【修改】在跳轉前，先刷新使用者狀態
      await refetchUserProfile();
      router.push('/');
    } catch (err) {
      setError('建立家庭失敗，請稍後再試。');
      console.error(err);
      setIsLoading(false);
    }
  };

  // 【新增】防止已在家庭中的使用者重複建立
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">載入中...</div>;
  }

  if (userProfile && userProfile.familyIDs && userProfile.familyIDs.length > 0) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center">
            <h1 className="text-2xl font-bold mb-4">您已經是家庭成員了</h1>
            <p className="text-gray-600 mb-8">無法建立新的家庭。</p>
            <Link href="/" className="px-6 py-3 text-white bg-blue-600 rounded-lg font-semibold hover:bg-blue-700">
                返回首頁
            </Link>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">歡迎！請建立您的家庭</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-gray-700">家庭名稱</label>
            <input
              id="familyName"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="例如：快樂的家"
            />
          </div>
          
          {/* 【新增】角色選擇下拉選單 */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">您在家庭中的角色</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            >
              <option>爸爸</option>
              <option>媽媽</option>
              <option>保母</option>
              <option>爺爺</option>
              <option>奶奶</option>
              <option>其他</option>
            </select>
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isLoading ? '建立中...' : '完成並開始使用'}
          </button>
        </form>
      </div>
    </div>
  );
}