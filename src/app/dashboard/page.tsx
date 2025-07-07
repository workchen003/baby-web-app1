// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';

export default function DashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [latestRecords, setLatestRecords] = useState<DocumentData[]>([]);
  const [isRecordsLoading, setRecordsLoading] = useState(true);

  // ▼▼▼【關鍵修改】▼▼▼
  // 這個判斷現在會同時處理載入狀態和確保 familyIDs 存在，從而解決 TypeScript 錯誤。
  const familyId = userProfile?.familyIDs?.[0];
  if (authLoading || !familyId) {
    return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">正在驗證使用者與家庭資料...</div>;
  }
  // ▲▲▲【關鍵修改】▲▲▲

  useEffect(() => {
    // 由於上面的判斷，現在可以確信 familyId 存在。
    const q = query(collection(db, "records"), where("familyId", "==", familyId), orderBy("timestamp", "desc"), limit(10));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLatestRecords(records);
      setRecordsLoading(false);
    }, (error) => {
      console.error("Dashboard snapshot error:", error);
      setRecordsLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]); // 依賴項現在是 familyId，更精確。

  const getRecordTitle = (record: DocumentData) => {
    switch(record.type) {
      case 'feeding': return '餵奶';
      case 'diaper': return '換尿布';
      case 'sleep': return '睡眠';
      case 'solid-food': return '副食品';
      case 'snapshot': return '照片手札';
      case 'bmi': return 'BMI';
      case 'measurement':
        switch(record.measurementType) {
          case 'height': return '身高';
          case 'weight': return '體重';
          case 'headCircumference': return '頭圍';
          default: return '生長記錄';
        }
      default: return '紀錄';
    }
  }

  return (
    <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">儀表板總覽</h1>
        <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">近期活動時間軸</h2>
            <Link href="/timeline" className="text-sm font-medium text-blue-600 hover:underline">查看完整時間軸 &rarr;</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-4 space-y-3 min-h-[300px]">
            {isRecordsLoading ? <p className="text-center p-4">正在載入記錄...</p> : latestRecords.length > 0 ? (
            latestRecords.map((record) => (
                <div key={record.id} className="p-3 border-b last:border-b-0">
                <p className="font-semibold">類型: {getRecordTitle(record)}</p>
                {record.notes && <p className="text-gray-600">備註: {record.notes}</p>}
                <p className="text-xs text-gray-500 mt-1">時間: {(record.timestamp as Timestamp)?.toDate().toLocaleString('zh-TW') || 'N/A'}</p>
                </div>
            ))
            ) : <p className="text-center text-gray-500 py-8">目前沒有任何記錄，快去「照護紀錄」新增第一筆吧！</p>}
        </div>
        </section>
    </div>
  );
}