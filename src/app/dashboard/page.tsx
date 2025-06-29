// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const [latestRecords, setLatestRecords] = useState<DocumentData[]>([]);
  const [isRecordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    
    let unsubscribe: () => void = () => {};
    let isMounted = true;

    if (userProfile?.familyIDs?.[0]) {
      const currentFamilyId = userProfile.familyIDs[0];
      const q = query(collection(db, "records"), where("familyId", "==", currentFamilyId), orderBy("timestamp", "desc"), limit(10));
      
      unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (isMounted) {
          const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLatestRecords(records);
          setRecordsLoading(false);
        }
      }, (error) => {
        console.error("Dashboard snapshot error:", error);
        if (isMounted) setRecordsLoading(false);
      });
    } else if (!loading) {
        router.replace('/onboarding/create-family');
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user, userProfile, loading, router]);

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

  if (loading || !userProfile) {
    return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">載入中...</div>;
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
