'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, updateBabyProfile } from '@/lib/babies';
import Link from 'next/link';

// 將 Date 物件轉換為 yyyy-MM-dd 字串
const dateToString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function EditBabyProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  // 表單 State
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(dateToString(new Date()));
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(40);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // 為了簡化，我們先假設每個家庭只有一個寶寶
  const babyId = 'baby_01'; 

  // 載入現有資料
  useEffect(() => {
    if (userProfile) {
      getBabyProfile(babyId)
        .then((profile) => {
          if (profile) {
            setName(profile.name);
            setBirthDate(dateToString(profile.birthDate));
            setGender(profile.gender);
            setGestationalAgeWeeks(profile.gestationalAgeWeeks);
          }
        })
        .catch(err => {
            console.error("Error fetching baby profile:", err);
            setError("讀取寶寶資料失敗，請確認權限或網路狀態。");
        })
        .finally(() => setIsLoading(false));
    }
  }, [userProfile]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !userProfile.familyIDs) {
        setError('無法驗證使用者身份');
        return;
    }
    
    setIsSaving(true);
    setError('');

    try {
      const profileData = {
        name,
        birthDate: new Date(birthDate),
        gender,
        gestationalAgeWeeks: Number(gestationalAgeWeeks),
        familyId: userProfile.familyIDs[0]
      };
      await updateBabyProfile(babyId, profileData);
      alert('寶寶資料儲存成功！');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('儲存失敗，請稍後再試。');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">寶寶基本資料</h1>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">寶寶的名字</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">出生日期</label>
            <input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">生理性別</label>
            <div className="mt-2 flex gap-8">
              <label className="inline-flex items-center">
                <input type="radio" value="boy" checked={gender === 'boy'} onChange={() => setGender('boy')} className="form-radio h-4 w-4 text-indigo-600"/>
                <span className="ml-2">男孩</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" value="girl" checked={gender === 'girl'} onChange={() => setGender('girl')} className="form-radio h-4 w-4 text-pink-600"/>
                <span className="ml-2">女孩</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="gestationalAgeWeeks" className="block text-sm font-medium text-gray-700">出生時的週數 (用於早產兒矯正)</label>
            <input id="gestationalAgeWeeks" type="number" value={gestationalAgeWeeks} onChange={(e) => setGestationalAgeWeeks(Number(e.target.value))} min="23" max="42" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
            <p className="text-xs text-gray-500 mt-1">預設為 40 週 (足月)。如為早產兒，請填寫實際週數。</p>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="flex gap-4 pt-4">
            <Link href="/dashboard" className="w-full text-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</Link>
            <button
                type="submit"
                disabled={isSaving}
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 disabled:bg-gray-400"
            >
                {isSaving ? '儲存中...' : '儲存資料'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}