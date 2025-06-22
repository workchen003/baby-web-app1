// src/app/onboarding/create-family/page.tsx (簡化後)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createFamily } from '@/lib/family'; // 引入新的 createFamily 函式

export default function CreateFamilyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [familyName, setFamilyName] = useState('');
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
      // 呼叫簡化後的函式
      await createFamily(user, familyName);
      // 成功後導向主頁
      router.push('/');
    } catch (err) {
      setError('建立家庭失敗，請稍後再試。');
      console.error(err);
      setIsLoading(false);
    }
  };

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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="例如：快樂的家"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {isLoading ? '建立中...' : '完成並開始使用'}
          </button>
        </form>
      </div>
    </div>
  );
}