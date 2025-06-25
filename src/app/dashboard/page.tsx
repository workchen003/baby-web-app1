// src/app/dashboard/page.tsx

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOutUser } from '@/lib/auth';
import { addRecord } from '@/lib/records';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const [latestRecords, setLatestRecords] = useState<DocumentData[]>([]);
  const [isRecordsLoading, setRecordsLoading] = useState(true);
  // 【新增】建立一個 state 來存放錯誤訊息
  const [recordsError, setRecordsError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (userProfile) {
      if (!userProfile.familyIDs || userProfile.familyIDs.length === 0) {
        router.replace('/onboarding/create-family');
        return;
      }
      
      const currentFamilyId = userProfile.familyIDs[0];
      
      const q = query(
        collection(db, "records"),
        where("familyId", "==", currentFamilyId),
        orderBy("timestamp", "desc"),
        limit(5)
      );

      // 【修改】在 onSnapshot 中加入錯誤處理的回呼函式
      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          // 成功時的邏輯
          const records: DocumentData[] = [];
          querySnapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
          });
          setLatestRecords(records);
          setRecordsLoading(false);
          setRecordsError(null); // 成功時清除舊的錯誤訊息
        }, 
        (error) => {
          // 【使用】失敗時，更新錯誤狀態
          console.error("Firestore snapshot error:", error);
          setRecordsError("無法載入紀錄，請稍後再試。");
          setRecordsLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, userProfile, loading, router]);

  const handleAddTestRecord = async () => {
    if (userProfile && userProfile.familyIDs && userProfile.familyIDs.length > 0 && user) {
      try {
        await addRecord(userProfile.familyIDs[0], user.uid);
        alert('測試記錄已新增！');
      } catch (error) {
        alert('新增失敗！');
      }
    } else {
        alert('無法獲取家庭資訊，請重新整理。');
    }
  };
  
  if (loading || !userProfile || !userProfile.familyIDs || userProfile.familyIDs.length === 0) {
    return <div className="flex min-h-screen items-center justify-center">載入中或正在重新導向...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col w-full bg-gray-50">
      <header className="w-full bg-white shadow-sm flex-shrink-0">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            {userProfile.displayName}的儀表板
          </h1>
          <button onClick={signOutUser} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
            登出
          </button>
        </div>
      </header>
      
      <main className="w-full container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">快速新增</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg shadow text-center cursor-pointer hover:bg-gray-100">餵奶</div>
            <div className="p-4 bg-white rounded-lg shadow text-center cursor-pointer hover:bg-gray-100">換尿布</div>
            <div className="p-4 bg-white rounded-lg shadow text-center cursor-pointer hover:bg-gray-100">睡眠</div>
            <div className="p-4 bg-white rounded-lg shadow text-center cursor-pointer hover:bg-gray-100">其他</div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">近期時間軸</h2>
            <button onClick={handleAddTestRecord} className="text-sm bg-gray-200 px-3 py-1 rounded-md hover:bg-gray-300">新增測試記錄</button>
          </div>
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            {isRecordsLoading ? (
              <p>正在載入記錄...</p>
            ) : recordsError ? ( // 【使用】當有錯誤時，顯示錯誤訊息
              <p className="text-center text-red-500 py-4">{recordsError}</p>
            ) : latestRecords.length > 0 ? (
              latestRecords.map((record) => (
                <div key={record.id} className="p-2 border-b last:border-b-0">
                  <p className="font-semibold">類型: {record.type}</p>
                  <p>備註: {record.notes}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    時間: {record.timestamp?.toDate().toLocaleString() || 'N/A'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">目前沒有任何記錄。</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}