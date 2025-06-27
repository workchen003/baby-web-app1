'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import { getMeasurementRecords } from '@/lib/records';
import GrowthChart from '@/components/GrowthChart';
import Link from 'next/link';
import { DocumentData } from 'firebase/firestore';

// --- 新增：BMI 也加入 Metric 型別中 ---
type Metric = 'weight' | 'height' | 'headCircumference' | 'bmi';

export default function GrowthPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [records, setRecords] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<Metric>('weight');

  const babyId = 'baby_01'; // 暫時寫死

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (userProfile && userProfile.familyIDs) {
      const familyId = userProfile.familyIDs[0];
      Promise.all([
        getBabyProfile(babyId),
        getMeasurementRecords(familyId, babyId)
      ]).then(([profile, measurementRecords]) => {
        if (profile) {
          setBabyProfile(profile);
          // 在這裡可以加入 BMI 的計算邏輯，並將其加入 records 中
          // 暫時我們先專注於顯示，BMI 紀錄先假設為空
          setRecords(measurementRecords);
        } else {
          router.push('/baby/edit');
        }
      }).catch(console.error).finally(() => setIsLoading(false));
    }
  }, [user, userProfile, authLoading, router]);

  if (authLoading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
  }

  if (!babyProfile) {
    return (
        <div className="flex flex-col min-h-screen items-center justify-center text-center">
            <h1 className="text-2xl font-bold">找不到寶寶資料</h1>
            <p className="mt-2 text-gray-600">請先建立寶寶的基本資料才能查看生長曲線。</p>
            <Link href="/baby/edit" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">
                前往建立
            </Link>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{babyProfile.name}的生長曲線</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">&larr; 返回儀表板</Link>
      </header>

      <div className="mb-6">
        <div className="flex space-x-2 border-b">
          <button onClick={() => setActiveMetric('weight')} className={`px-4 py-2 text-sm font-medium ${activeMetric === 'weight' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>體重</button>
          <button onClick={() => setActiveMetric('height')} className={`px-4 py-2 text-sm font-medium ${activeMetric === 'height' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>身高/身長</button>
          <button onClick={() => setActiveMetric('headCircumference')} className={`px-4 py-2 text-sm font-medium ${activeMetric === 'headCircumference' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>頭圍</button>
          {/* --- 新增：BMI 切換按鈕 --- */}
          <button onClick={() => setActiveMetric('bmi')} className={`px-4 py-2 text-sm font-medium ${activeMetric === 'bmi' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>BMI</button>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow-md">
        <GrowthChart
          metric={activeMetric}
          babyProfile={babyProfile}
          records={records}
        />
      </div>
    </div>
  );
}