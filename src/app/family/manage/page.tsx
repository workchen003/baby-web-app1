// src/app/join/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { joinFamilyWithCode } from '@/lib/functions';
import Link from 'next/link';

export default function JoinFamilyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) {
      setError('請輸入邀請碼。');
      return;
    }
    setIsJoining(true);
    setError('');
    setSuccess('');
    try {
      const result = await joinFamilyWithCode(inviteCode.toUpperCase());
      if (result.success) {
        setSuccess('成功加入家庭！即將為您導向主頁...');
        setTimeout(() => router.push('/'), 2000);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('加入失敗，請確認邀請碼是否正確。');
      }
      setIsJoining(false);
    }
  };

  if (loading) return <div>載入中...</div>;
  if (!user) return <div>請先<Link href="/" className="text-blue-600 hover:underline">登入</Link>後再加入家庭。</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800">加入一個家庭</h1>
        <p className="text-center text-gray-600">請在這裡貼上您收到的邀請碼。</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="ABC123"
            disabled={isJoining}
            className="w-full px-3 py-2 text-center text-lg tracking-widest border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
          />
          <button
            type="submit"
            disabled={isJoining}
            className="w-full px-4 py-2 mt-4 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {isJoining ? '正在加入...' : '送出邀請碼'}
          </button>
        </form>

        {success && <p className="mt-4 text-sm text-center text-green-600">{success}</p>}
        {error && <p className="mt-4 text-sm text-center text-red-600">{error}</p>}
        
        <div className="text-center">
            <Link href="/" className="text-sm text-blue-600 hover:underline">返回首頁</Link>
        </div>
      </div>
    </div>
  );
}