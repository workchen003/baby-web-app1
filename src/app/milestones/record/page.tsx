'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import milestonesData from '@/data/milestones_processed.json';
import { getAchievedMilestones, saveAchievedMilestones } from '@/lib/milestones';
import Link from 'next/link';

// 為 JSON 檔案的內容定義清晰的型別
interface Milestone {
  skill: string;
  start_days: number;
  end_days: number;
}
interface Category {
  name: string;
  milestones: Milestone[];
}
interface MilestoneData {
  title: string;
  description: string;
  categories: Category[];
}

const dateToString = (date: Date): string => date.toISOString().split('T')[0];
const stringToDate = (dateString: string): Date => new Date(dateString);

export default function RecordMilestonesPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  
  const [achievements, setAchievements] = useState<Map<string, Date>>(new Map());
  const [initialAchievements, setInitialAchievements] = useState<Map<string, Date>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const typedMilestonesData: MilestoneData = milestonesData;

  useEffect(() => {
    if (userProfile && userProfile.familyIDs) {
      const babyId = 'baby_01'; // 暫時寫死
      getAchievedMilestones(userProfile.familyIDs[0], babyId).then(data => {
        const dateMap = new Map(Array.from(data.values()).map(item => [item.milestoneId, item.achievedDate]));
        setAchievements(new Map(dateMap));
        setInitialAchievements(new Map(dateMap));
      });
    }
  }, [userProfile]);

  const handleChange = (milestoneId: string, checked: boolean, dateStr?: string) => {
    const newAchievements = new Map(achievements);
    if (checked) {
      const date = dateStr ? stringToDate(dateStr) : new Date();
      newAchievements.set(milestoneId, date);
    } else {
      newAchievements.delete(milestoneId);
    }
    setAchievements(newAchievements);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !userProfile.familyIDs) {
      setError('無法驗證使用者身份');
      return;
    }
    setIsSaving(true);
    setError('');

    const updates = new Map<string, Date | null>();
    const allKeys = new Set([...initialAchievements.keys(), ...achievements.keys()]);

    allKeys.forEach(id => {
      const initialDate = initialAchievements.get(id);
      const currentDate = achievements.get(id);

      // 如果初始狀態和目前狀態不同 (包括新增、刪除、或日期變更)，就加入更新列表
      if (initialDate?.getTime() !== currentDate?.getTime()) {
        updates.set(id, currentDate || null); // 如果 currentDate 不存在，設為 null (代表刪除)
      }
    });

    try {
      if (updates.size > 0) {
        await saveAchievedMilestones(userProfile.familyIDs[0], 'baby_01', user.uid, updates);
      }
      alert('儲存成功！');
      router.push('/milestones');
    } catch (err) {
      console.error(err);
      setError('儲存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading || !userProfile) return <div className="flex min-h-screen items-center justify-center">載入中...</div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">記錄發展里程碑</h1>
        <Link href="/milestones" className="text-blue-600 hover:underline">{'< 返回圖表'}</Link>
      </header>
      
      <div className="space-y-8">
        {(typedMilestonesData.categories || []).map(category => (
          <div key={category.name}>
            <h2 className="text-2xl font-semibold text-gray-700 border-b-2 border-blue-200 pb-2 mb-4">{category.name}</h2>
            <div className="space-y-4">
              {(category.milestones || []).map(milestone => {
                const isChecked = achievements.has(milestone.skill);
                const achievedDate = isChecked ? achievements.get(milestone.skill)! : new Date();
                return (
                  <div key={milestone.skill} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                        checked={isChecked} 
                        onChange={(e) => handleChange(milestone.skill, e.target.checked)} 
                      />
                      <span className="ml-4 text-gray-800">{milestone.skill}</span>
                    </label>
                    {isChecked && (
                      <input 
                        type="date" 
                        className="p-1 border rounded-md text-sm" 
                        value={dateToString(achievedDate)} 
                        onChange={(e) => handleChange(milestone.skill, true, e.target.value)} 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <footer className="sticky bottom-0 bg-white bg-opacity-80 backdrop-blur-sm py-4 mt-8">
        <div className="container mx-auto text-center">
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
            >
                {isSaving ? '儲存中...' : '儲存變更'}
            </button>
        </div>
      </footer>
    </div>
  );
}