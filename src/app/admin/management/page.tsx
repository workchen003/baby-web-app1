// src/app/admin/management/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import { callDeleteUserAccount, callDeleteFamily } from '@/lib/functions';

export default function ManagementPage() {
  const [users, setUsers] = useState<DocumentData[]>([]);
  const [families, setFamilies] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const familiesSnapshot = await getDocs(collection(db, "families"));
        setFamilies(familiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        setError(null);
    } catch (err) {
        console.error("Error fetching data:", err);
        setError("無法載入管理資料。");
    } finally {
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (window.confirm(`【高風險操作】\n您確定要永久刪除使用者：${userEmail} (${userId}) 嗎？\n此操作將移除他所有家庭的成員資格，並刪除其登入帳號，無法復原！`)) {
        try {
            const result = await callDeleteUserAccount(userId);
            alert(result.message);
            fetchData(); // 重新整理資料
        } catch (err) {
            console.error(err);
            alert(`刪除失敗：${err instanceof Error ? err.message : '未知錯誤'}`);
        }
    }
  };

  const handleDeleteFamily = async (familyId: string, familyName: string) => {
    if (window.confirm(`【極高風險操作】\n您確定要永久刪除家庭：${familyName} (${familyId}) 嗎？\n這將會刪除此家庭、底下所有寶寶、所有照片、以及所有相關紀錄，無法復原！`)) {
        try {
            const result = await callDeleteFamily(familyId);
            alert(result.message);
            fetchData(); // 重新整理資料
        } catch (err) {
            console.error(err);
            alert(`刪除失敗：${err instanceof Error ? err.message : '未知錯誤'}`);
        }
    }
  };

  if (isLoading) return <div className="p-8 text-center">正在載入管理資料...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">使用者與家庭管理</h1>
      <Link href="/admin" className="text-sm text-blue-600 hover:underline mb-8 block">&larr; 返回管理儀表板</Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 使用者列表 */}
        <section>
          <h2 className="text-xl font-semibold mb-3">使用者列表 ({users.length})</h2>
          <div className="bg-white rounded-lg shadow max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b">
                    <td className="p-3 font-mono text-xs">{user.email}</td>
                    <td className="p-3">{user.role === 'admin' ? <span className="font-bold text-red-500">Admin</span> : 'User'}</td>
                    <td className="p-3">
                      <button onClick={() => handleDeleteUser(user.id, user.email)} className="text-red-600 hover:text-red-800 text-xs">刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 家庭列表 */}
        <section>
          <h2 className="text-xl font-semibold mb-3">家庭列表 ({families.length})</h2>
           <div className="bg-white rounded-lg shadow max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3">家庭名稱</th>
                  <th className="p-3">成員數</th>
                  <th className="p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {families.map(family => (
                  <tr key={family.id} className="border-b">
                    <td className="p-3">{family.familyName} <span className="text-gray-400 text-xs font-mono">({family.id})</span></td>
                    <td className="p-3">{family.memberUIDs?.length || 0}</td>
                    <td className="p-3">
                       <button onClick={() => handleDeleteFamily(family.id, family.familyName)} className="text-red-600 hover:text-red-800 text-xs">刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}