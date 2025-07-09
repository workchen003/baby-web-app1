// src/app/baby/edit-form/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, updateBabyProfile, BabyProfile } from '@/lib/babies';
import { Timestamp } from 'firebase/firestore';

export default function BabyEditFormPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [baby, setBaby] = useState({
    name: '',
    birthDate: '', 
    gender: 'boy',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewProfile, setIsNewProfile] = useState(false);

  const babyId = 'baby_01'; 

  useEffect(() => {
    if (authLoading || !userProfile) return;

    if (!userProfile.familyIDs || userProfile.familyIDs.length === 0) {
      router.push('/onboarding/create-family');
      return;
    }

    getBabyProfile(babyId)
      .then(profile => {
        if (profile) {
          setBaby({
            name: profile.name,
            gender: profile.gender,
            birthDate: (profile.birthDate as unknown as Timestamp).toDate().toISOString().split('T')[0],
          });
          setIsNewProfile(false);
        } else {
          setIsNewProfile(true);
          setBaby(prev => ({ ...prev, birthDate: new Date().toISOString().split('T')[0] }));
        }
      })
      .catch(err => {
        console.error("Error fetching baby profile:", err);
        setError("讀取寶寶資料時發生錯誤。");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authLoading, userProfile, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBaby(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!user || !userProfile || !userProfile.familyIDs?.[0]) {
      setError("使用者或家庭資訊不完整，無法儲存。");
      return;
    }

    if (!baby.name || !baby.birthDate) {
      setError("請填寫寶寶的名字和出生日期。");
      return;
    }

    try {
      setIsLoading(true);
      
      const profileToSave: Omit<BabyProfile, 'id'> = {
        name: baby.name,
        birthDate: Timestamp.fromDate(new Date(baby.birthDate)),
        gender: baby.gender as 'boy' | 'girl',
        familyId: userProfile.familyIDs[0],
      };

      await updateBabyProfile(babyId, profileToSave);
      
      router.push('/dashboard');

    } catch (err) {
      console.error("Failed to save baby profile:", err);
      setError("儲存失敗，請檢查您的網路連線或稍後再試。");
      setIsLoading(false);
    }
  };

  // ✅【關鍵修正】: 移除外層的 <AppLayout>
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {isNewProfile ? "建立寶寶的第一份資料" : "編輯寶寶資料"}
        </h1>
        { (isLoading && !isNewProfile) ? <div className="text-center p-8">讀取資料中...</div> : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">寶寶的名字</label>
              <input
                type="text"
                id="name"
                name="name"
                value={baby.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">出生日期</label>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                value={baby.birthDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">性別</label>
              <select
                id="gender"
                name="gender"
                value={baby.gender}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="boy">男生</option>
                <option value="girl">女生</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {isLoading ? "儲存中..." : "儲存資料"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}