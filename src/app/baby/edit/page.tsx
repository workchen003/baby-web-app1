// src/app/baby/edit/page.tsx

'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, updateBabyProfile, BabyProfile, MilkType } from '@/lib/babies';
import Link from 'next/link';

// 將 Date 物件轉換為 yyyy-MM-dd 字串的輔助函式
const dateToString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function EditBabyProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  // 狀態管理
  const [isEditing, setIsEditing] = useState(false);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);

  // 表單 State
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(40);
  // --- vvv 新增的表單狀態 vvv ---
  const [milkType, setMilkType] = useState<MilkType>('breast');
  const [formulaBrand, setFormulaBrand] = useState('');
  const [formulaCalories, setFormulaCalories] = useState('');
  // --- ^^^ 新增的表單狀態 ^^^ ---


  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const babyId = 'baby_01'; // 在我們的應用中，暫時固定為單一寶寶

  // 將設定表單狀態的邏輯封裝起來，方便重複使用
  const setFormData = useCallback((profile: BabyProfile | null) => {
    if (profile) {
      setName(profile.name);
      setBirthDate(dateToString(profile.birthDate));
      setGender(profile.gender);
      setGestationalAgeWeeks(profile.gestationalAgeWeeks);
      // --- vvv 設定新欄位的初始值 vvv ---
      setMilkType(profile.milkType || 'breast');
      setFormulaBrand(profile.formulaBrand || '');
      setFormulaCalories(profile.formulaCalories?.toString() || '');
      // --- ^^^ 設定新欄位的初始值 ^^^ ---
    }
  }, []);


  // 載入現有資料並設定表單初始值
  useEffect(() => {
    if (!loading && !user) {
        router.push('/');
        return;
    }
    if (userProfile) {
      setIsLoading(true);
      getBabyProfile(babyId)
        .then((profile) => {
          if (profile) {
            setBabyProfile(profile);
            setFormData(profile);
          } else {
            setIsEditing(true); // 如果沒有資料，直接進入編輯模式
          }
        })
        .catch(err => {
            console.error("Error fetching baby profile:", err);
            setError("讀取寶寶資料失敗。");
        })
        .finally(() => setIsLoading(false));
    }
  }, [user, userProfile, loading, router, setFormData]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (babyProfile) {
      setFormData(babyProfile);
      setIsEditing(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile?.familyIDs) {
        setError('無法驗證使用者身份');
        return;
    }

    setIsSaving(true);
    setError('');

    try {
      const profileData: Partial<BabyProfile> = {
        name,
        birthDate: new Date(birthDate),
        gender,
        gestationalAgeWeeks: Number(gestationalAgeWeeks),
        familyId: userProfile.familyIDs[0],
        // --- vvv 儲存新欄位的值 vvv ---
        milkType,
        formulaBrand: milkType === 'formula' || milkType === 'mixed' ? formulaBrand : '',
        formulaCalories: milkType === 'formula' || milkType === 'mixed' ? Number(formulaCalories) : 0,
        // --- ^^^ 儲存新欄位的值 ^^^ ---
      };

      await updateBabyProfile(babyId, profileData as any); // 使用 any 暫時規避 Omit 的複雜型別問題

      const updatedProfile = await getBabyProfile(babyId);
      setBabyProfile(updatedProfile);

      setIsEditing(false);
      alert('寶寶資料儲存成功！');
    } catch (err) {
      console.error(err);
      setError('儲存失敗，請稍後再試。');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">載入中...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 py-12">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-lg">
        {isEditing ? (
          // --- 編輯模式 ---
          <>
            <h1 className="text-2xl font-bold mb-6 text-center">{babyProfile ? '編輯寶寶資料' : '建立寶寶資料'}</h1>
            <form onSubmit={handleSave} className="space-y-6">
              {/* -- 基本資料 -- */}
              <fieldset className="space-y-4 p-4 border rounded-md">
                <legend className="text-lg font-semibold px-2">基本資料</legend>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">寶寶的名字</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                </div>
                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">出生日期</label>
                  <input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">生理性別</label>
                  <div className="mt-2 flex gap-8"><label className="inline-flex items-center"><input type="radio" value="boy" checked={gender === 'boy'} onChange={() => setGender('boy')} className="form-radio h-4 w-4 text-indigo-600"/><span className="ml-2">男孩</span></label><label className="inline-flex items-center"><input type="radio" value="girl" checked={gender === 'girl'} onChange={() => setGender('girl')} className="form-radio h-4 w-4 text-pink-600"/><span className="ml-2">女孩</span></label></div>
                </div>
                <div>
                  <label htmlFor="gestationalAgeWeeks" className="block text-sm font-medium text-gray-700">出生時的週數</label>
                  <input id="gestationalAgeWeeks" type="number" value={gestationalAgeWeeks} onChange={(e) => setGestationalAgeWeeks(Number(e.target.value))} min="23" max="42" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                  <p className="text-xs text-gray-500 mt-1">用於早產兒矯正年齡計算，預設為 40 (足月)。</p>
                </div>
              </fieldset>

              {/* -- 餐食規劃設定 -- */}
              <fieldset className="space-y-4 p-4 border rounded-md">
                 <legend className="text-lg font-semibold px-2">餐食設定</legend>
                 <div>
                    <label htmlFor="milkType" className="block text-sm font-medium text-gray-700">主要奶類類型</label>
                    <select id="milkType" value={milkType} onChange={(e) => setMilkType(e.target.value as MilkType)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="breast">母乳</option>
                        <option value="formula">配方奶</option>
                        <option value="mixed">混合餵養</option>
                    </select>
                 </div>
                 {(milkType === 'formula' || milkType === 'mixed') && (
                    <>
                        <div>
                            <label htmlFor="formulaBrand" className="block text-sm font-medium text-gray-700">配方奶品牌/系列</label>
                            <input id="formulaBrand" type="text" value={formulaBrand} onChange={(e) => setFormulaBrand(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="例如：能恩水解1號"/>
                        </div>
                        <div>
                            <label htmlFor="formulaCalories" className="block text-sm font-medium text-gray-700">配方奶熱量 (每100ml)</label>
                            <input id="formulaCalories" type="number" value={formulaCalories} onChange={(e) => setFormulaCalories(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="請參考奶粉罐身標示"/>
                        </div>
                    </>
                 )}
              </fieldset>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <div className="flex gap-4 pt-4"><button type="button" onClick={handleCancel} className="w-full text-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button><button type="submit" disabled={isSaving} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 disabled:bg-gray-400">{isSaving ? '儲存中...' : '儲存資料'}</button></div>
            </form>
          </>
        ) : (
          // --- 檢視模式 ---
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">寶寶資訊</h1>
            {babyProfile ? (
            <div className="space-y-4">
                <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">姓名</span><span className="font-semibold text-lg">{babyProfile.name}</span></div>
                <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">生日</span><span className="font-semibold text-lg">{new Date(babyProfile.birthDate).toLocaleDateString('zh-TW')}</span></div>
                <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">生理性別</span><span className="font-semibold text-lg">{babyProfile.gender === 'boy' ? '男孩' : '女孩'}</span></div>
                <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">出生週數</span><span className="font-semibold text-lg">{babyProfile.gestationalAgeWeeks} 週</span></div>
                {/* -- vvv 顯示新增的餐食資訊 vvv -- */}
                <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">奶類類型</span><span className="font-semibold text-lg">{
                    babyProfile.milkType === 'breast' ? '母乳' :
                    babyProfile.milkType === 'formula' ? '配方奶' :
                    babyProfile.milkType === 'mixed' ? '混合餵養' : '未設定'
                }</span></div>
                 {(babyProfile.milkType === 'formula' || babyProfile.milkType === 'mixed') && (
                    <>
                        <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">配方奶品牌</span><span className="font-semibold text-lg">{babyProfile.formulaBrand || '未設定'}</span></div>
                        <div className="flex justify-between items-baseline py-2 border-b"><span className="text-gray-500">配方奶熱量</span><span className="font-semibold text-lg">{babyProfile.formulaCalories ? `${babyProfile.formulaCalories} kcal/100ml` : '未設定'}</span></div>
                    </>
                 )}
                 {/* -- ^^^ 顯示新增的餐食資訊 ^^^ -- */}
            </div>
             ) : (
                <p className="text-center text-gray-500 py-8">尚未建立寶寶資料。</p>
            )}
            <div className="mt-8 pt-6 border-t">
                <button onClick={handleEdit} className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700">
                    編輯詳細資料
                </button>
                <Link href="/dashboard" className="block text-center mt-4 text-sm text-gray-500 hover:underline">
                    返回儀表板
                </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}