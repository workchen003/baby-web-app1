// src/app/baby/edit/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
// --- vvv 修正：移除 addRecord，因為此頁面不再負責寫入紀錄 vvv ---
import { getMeasurementRecords } from '@/lib/records';
// --- ^^^ 修正：移除 addRecord ^^^ ---
import Link from 'next/link';

const dateToString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function EditBabyProfilePage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  // --- vvv 新增：只保留顯示用的體重狀態 vvv ---
  const [latestWeight, setLatestWeight] = useState<string>('');
  // --- ^^^ 新增：只保留顯示用的體重狀態 ^^^ ---

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const babyId = 'baby_01'; 

  // 載入資料
  useEffect(() => {
    if (!loading && !userProfile) {
        router.push('/');
        return;
    }
    if (userProfile?.familyIDs?.[0]) {
      setIsLoading(true);
      const familyId = userProfile.familyIDs[0];
      Promise.all([
        getBabyProfile(babyId),
        getMeasurementRecords(familyId, babyId)
      ]).then(([profile, records]) => {
          if (profile) setBabyProfile(profile);
          const weightRecords = records.filter(r => r.measurementType === 'weight');
          if (weightRecords.length > 0) {
            setLatestWeight(weightRecords[weightRecords.length - 1].value?.toString() || '未記錄');
          }
        })
        .catch(err => {
            console.error("讀取寶寶資料失敗:", err);
            setError("讀取寶寶資料失敗。");
        })
        .finally(() => setIsLoading(false));
    }
  }, [userProfile, loading, router]);


  if (loading || isLoading) {
    return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">載入中...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 py-12">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">寶寶資訊</h1>
        {babyProfile ? (
        <div className="space-y-4">
            <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">姓名</span><span className="font-semibold text-lg">{babyProfile.name}</span></div>
            <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">最新體重</span><span className="font-semibold text-lg">{latestWeight ? `${latestWeight} kg` : '未記錄'}</span></div>
            <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">生日</span><span className="font-semibold text-lg">{new Date(babyProfile.birthDate).toLocaleDateString('zh-TW')}</span></div>
            <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">生理性別</span><span className="font-semibold text-lg">{babyProfile.gender === 'boy' ? '男孩' : '女孩'}</span></div>
            <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">出生週數</span><span className="font-semibold text-lg">{babyProfile.gestationalAgeWeeks} 週</span></div>
            <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">奶類類型</span><span className="font-semibold text-lg">{ babyProfile.milkType === 'breast' ? '母乳' : babyProfile.milkType === 'formula' ? '配方奶' : babyProfile.milkType === 'mixed' ? '混合餵養' : '未設定' }</span></div>
             {(babyProfile.milkType === 'formula' || babyProfile.milkType === 'mixed') && (
                <>
                    <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">配方奶品牌</span><span className="font-semibold text-lg">{babyProfile.formulaBrand || '未設定'}</span></div>
                    <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">配方奶熱量</span><span className="font-semibold text-lg">{babyProfile.formulaCalories ? `${babyProfile.formulaCalories} kcal/100ml` : '未設定'}</span></div>
                </>
             )}
             <div className="flex justify-between items-baseline py-2 border-b">
                <span className="text-gray-500">已知過敏原</span>
                <span className="font-semibold text-lg text-right">
                    {babyProfile.knownAllergens && babyProfile.knownAllergens.length > 0 ? babyProfile.knownAllergens.join('、') : '無'}
                </span>
             </div>
        </div>
         ) : (
            <p className="text-center text-gray-500 py-8">尚未建立寶寶資料。</p>
        )}
        <div className="mt-8 pt-6 border-t">
            <Link href="/baby/edit-form" className="w-full block text-center px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700">
                編輯詳細資料
            </Link>
            <Link href="/dashboard" className="block text-center mt-4 text-sm text-gray-500 hover:underline">
                返回儀表板
            </Link>
        </div>
      </div>
    </div>
  );
}