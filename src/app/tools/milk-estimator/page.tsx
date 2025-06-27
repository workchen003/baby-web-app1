'use client';

// --- 核心修正：從 react 的 import 中移除未使用的 ChangeEvent ---
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MilkEstimatorPage() {
  const { userProfile } = useAuth();
  
  const [weight, setWeight] = useState<string>('');
  const [feedsPerDay, setFeedsPerDay] = useState<string>('8');
  
  const [dailyVolume, setDailyVolume] = useState<number>(0);
  const [perFeedVolume, setPerFeedVolume] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (userProfile && userProfile.familyIDs) {
      const familyId = userProfile.familyIDs[0];
      const babyId = 'baby_01'; 

      const recordsRef = collection(db, 'records');
      const q = query(
        recordsRef,
        where('familyId', '==', familyId),
        where('babyId', '==', babyId),
        where('measurementType', '==', 'weight'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      getDocs(q).then(snapshot => {
        if (!snapshot.empty) {
          const latestRecord = snapshot.docs[0].data();
          setWeight(latestRecord.value.toString());
        }
      });
    }
  }, [userProfile]);

  const handleCalculate = () => {
    setError('');
    const weightNum = parseFloat(weight);
    const feedsNum = parseInt(feedsPerDay, 10);

    if (isNaN(weightNum) || weightNum <= 0) {
      setError('請輸入有效的寶寶體重。');
      return;
    }
    if (isNaN(feedsNum) || feedsNum <= 0) {
      setError('請輸入有效的哺乳次數。');
      return;
    }

    const totalMl = weightNum * 150;
    const perFeedMl = totalMl / feedsNum;

    setDailyVolume(totalMl);
    setPerFeedVolume(perFeedMl);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">奶量估算器</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">&larr; 返回儀表板</Link>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">寶寶目前體重 (kg)</label>
            <input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="例如：5.5" />
          </div>
          <div>
            <label htmlFor="feeds" className="block text-sm font-medium text-gray-700">每日哺乳次數</label>
            <input id="feeds" type="number" step="1" value={feedsPerDay} onChange={(e) => setFeedsPerDay(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="例如：8" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleCalculate} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
            計算建議奶量
          </button>
        </div>
        <div className="p-6 bg-blue-50 rounded-lg shadow-inner flex flex-col justify-center items-center text-center">
          {dailyVolume > 0 ? (
            <>
              <p className="text-gray-600">每日建議總奶量約為：</p>
              <p className="text-4xl font-bold text-blue-700 my-2">{dailyVolume.toFixed(0)} <span className="text-xl">ml</span></p>
              <p className="text-gray-600 mt-4">單次建議奶量約為：</p>
              <p className="text-2xl font-semibold text-blue-600">{perFeedVolume.toFixed(0)} <span className="text-lg">ml</span></p>
            </>
          ) : (
            <p className="text-gray-500">請輸入寶寶的體重與哺乳次數以進行估算。</p>
          )}
          <p className="text-xs text-gray-400 mt-8">
            * 此結果為根據通用公式估算之參考值，實際情況請務必諮詢兒科醫師或專業醫療人員。
          </p>
        </div>
      </div>
    </div>
  );
}