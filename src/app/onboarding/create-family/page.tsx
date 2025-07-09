'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createFamily } from '@/lib/family';

export default function CreateFamilyPage() {
  const { user, userProfile } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) {
      setError('使用者資料尚未載入，請稍後再試。');
      return;
    }
    if (!familyName.trim()) {
      setError('請為您的家庭取一個溫馨的名字吧！');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await createFamily(userProfile, familyName);
      
      // ✅【最終修正】: 手動觸發頁面跳轉至儀表板
      // 這會讓 AppLayout 的導向邏輯接手，並將您帶到正確的下一步。
      router.push('/dashboard');
      
    } catch (err) {
      console.error("Failed to create family:", err);
      setError('建立家庭時發生錯誤，請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800">歡迎！</h1>
        <p className="mt-2 text-gray-600">
          看起來您還沒有加入任何家庭，就從建立您的第一個家庭開始吧！
        </p>
      </div>
      <div className="max-w-md w-full bg-white mt-8 p-8 rounded-xl shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-gray-700">家庭名稱</label>
            <input
              type="text"
              id="familyName"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="例如：陳家的小天地"
              required
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isLoading ? '建立中...' : '建立家庭'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}