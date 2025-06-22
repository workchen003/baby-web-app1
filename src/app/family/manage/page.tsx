// src/app/family/manage/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteCode } from '@/lib/functions';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function ManageFamilyPage() {
  const { user, loading } = useAuth();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [error, setError] = useState('');

  // 獲取使用者的家庭 ID
  useEffect(() => {
    const fetchFamilyId = async () => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().familyIDs?.length > 0) {
          // 簡單起見，我們先取第一個家庭 ID
          setFamilyId(userDoc.data().familyIDs[0]);
        }
      }
    };
    fetchFamilyId();
  }, [user]);

  const handleGenerateCode = async () => {
    if (!familyId) {
      setError('找不到您的家庭資訊。');
      return;
    }
    setIsGenerating(true);
    setInviteCode(null);
    setCopySuccess('');
    setError('');
    try {
      const code = await generateInviteCode(familyId);
      setInviteCode(code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopySuccess('已複製！');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  if (loading) return <div>載入中...</div>;
  if (!user) return <div>請先<Link href="/" className="text-blue-600 hover:underline">登入</Link>。</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800">家庭管理</h1>
        <p className="text-center text-gray-600">在這裡產生邀請碼，讓其他家人加入！</p>
        
        <button
          onClick={handleGenerateCode}
          disabled={isGenerating || !familyId}
          className="w-full px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {isGenerating ? '正在產生...' : '產生邀請碼'}
        </button>

        {inviteCode && (
          <div className="p-4 mt-4 text-center bg-gray-100 rounded-md">
            <p className="text-sm text-gray-500">請分享此邀請碼 (24小時內有效):</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <p className="text-2xl font-bold tracking-widest text-gray-800">{inviteCode}</p>
              <button onClick={copyToClipboard} className="px-3 py-1 text-sm text-white bg-green-500 rounded-md hover:bg-green-600">複製</button>
            </div>
            {copySuccess && <p className="mt-2 text-sm text-green-600">{copySuccess}</p>}
          </div>
        )}
        
        {error && <p className="mt-4 text-sm text-center text-red-600">{error}</p>}

        <div className="text-center">
            <Link href="/" className="text-sm text-blue-600 hover:underline">返回首頁</Link>
        </div>
      </div>
    </div>
  );
}