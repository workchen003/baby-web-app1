// src/app/meal-plan/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import { getMeasurementRecords, RecordData } from '@/lib/records';
import { mealPlanData, AgeStagePlan, Recipe } from '@/data/mealPlanData';
import { startOfWeek, endOfWeek, addDays, subDays, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// --- 子元件 ---
const ShoppingListModal = ({ recipes, onClose }: { recipes: Recipe[], onClose: () => void }) => {
    const shoppingList = useMemo(() => {
        const items = recipes.map(r => r.name);
        return [...new Set(items)];
    }, [recipes]);

    const handleCopy = () => {
        navigator.clipboard.writeText(shoppingList.join('\n'));
        alert('購物清單已複製到剪貼簿！');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">本週採買清單</h2>
                <ul className="space-y-2 max-h-60 overflow-y-auto mb-6">
                    {shoppingList.map(item => (
                        <li key={item} className="p-2 bg-gray-100 rounded">{item}</li>
                    ))}
                </ul>
                <div className="flex gap-4">
                    <button onClick={handleCopy} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">複製清單</button>
                    <button onClick={onClose} className="w-full text-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">關閉</button>
                </div>
            </div>
        </div>
    );
};

// --- 型別定義 ---
interface DailyPlan {
    feedCount: number;
    volumePerFeed: number;
    solidFoodGrams: number;
}

// --- 輔助函式 ---
const calculateAgeInMonths = (birthDate: Date, targetDate: Date = new Date()): number => {
    let age_y = targetDate.getFullYear() - birthDate.getFullYear();
    let age_m = targetDate.getMonth() - birthDate.getMonth();
    if (targetDate.getDate() < birthDate.getDate()) {
        age_m--;
    }
    if (age_m < 0) {
        age_y--;
        age_m += 12;
    }
    return age_y * 12 + age_m;
};


// --- 主元件 ---
export default function MealPlanPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
    const [latestWeight, setLatestWeight] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- vvv 新增：管理整週每日計畫的狀態 vvv ---
    const [weeklyPlans, setWeeklyPlans] = useState<Map<string, DailyPlan>>(new Map());
    // --- ^^^ 新增：管理整週每日計畫的狀態 ^^^ ---

    const weekInterval = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return { start, end };
    }, [currentDate]);

    const daysInWeek = useMemo(() => {
        return eachDayOfInterval(weekInterval);
    }, [weekInterval]);

    // --- vvv 新增：當前選中日期的計畫 vvv ---
    const selectedPlan = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return weeklyPlans.get(dateKey) || {
            feedCount: 6,
            volumePerFeed: 150,
            solidFoodGrams: 50,
        };
    }, [selectedDate, weeklyPlans]);
    // --- ^^^ 新增：當前選中日期的計畫 ^^^ ---


    const activeStage = useMemo((): AgeStagePlan | undefined => {
        if (!babyProfile) return undefined;
        const ageInMonths = calculateAgeInMonths(babyProfile.birthDate, selectedDate);
        return mealPlanData.find(stage => ageInMonths >= stage.ageInMonthsStart && ageInMonths < stage.ageInMonthsEnd);
    }, [babyProfile, selectedDate]);

    const suggestedTotalCalories = useMemo(() => {
        if (!activeStage || !latestWeight) return 0;
        return Math.round(latestWeight * activeStage.caloriesPerKg);
    }, [activeStage, latestWeight]);

    const actualTotalCalories = useMemo(() => {
        if (!babyProfile || !activeStage) return 0;
        const breastMilkCaloriesPerMl = 0.67;
        let milkCalories = 0;

        if (babyProfile.milkType === 'breast') {
            milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * breastMilkCaloriesPerMl;
        } else if (babyProfile.milkType === 'formula' && babyProfile.formulaCalories) {
            milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * (babyProfile.formulaCalories / 100);
        } else if (babyProfile.milkType === 'mixed') {
            milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * (babyProfile.formulaCalories ? babyProfile.formulaCalories / 100 : breastMilkCaloriesPerMl);
        }

        const solidFoodCalories = selectedPlan.solidFoodGrams * (activeStage.recipes[0]?.caloriesPerGram || 0.5);

        return Math.round(milkCalories + solidFoodCalories);
    }, [babyProfile, activeStage, selectedPlan]);

    const calorieDifference = useMemo(() => actualTotalCalories - suggestedTotalCalories, [actualTotalCalories, suggestedTotalCalories]);

    useEffect(() => {
        if (authLoading || !userProfile?.familyIDs?.[0]) return;
        const familyId = userProfile.familyIDs[0];
        const babyId = 'baby_01';

        Promise.all([
            getBabyProfile(babyId),
            getMeasurementRecords(familyId, babyId)
        ]).then(([profile, records]) => {
            if (profile) {
                setBabyProfile(profile);
                const weightRecords = records.filter(r => r.measurementType === 'weight');
                if (weightRecords.length > 0) {
                    setLatestWeight(weightRecords[weightRecords.length - 1].value!);
                }
            }
        }).catch(console.error).finally(() => setIsLoading(false));

    }, [userProfile, authLoading]);

    // --- vvv 新增：更新當日計畫的函式 vvv ---
    const updateSelectedPlan = (field: keyof DailyPlan, value: number) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const newPlans = new Map(weeklyPlans);
        const currentPlan = newPlans.get(dateKey) || selectedPlan;
        newPlans.set(dateKey, { ...currentPlan, [field]: value });
        setWeeklyPlans(newPlans);
    };

    // --- vvv 新增：複製昨日設定的函式 vvv ---
    const copyYesterdayPlan = () => {
        const yesterday = subDays(selectedDate, 1);
        const yesterdayKey = format(yesterday, 'yyyy-MM-dd');
        const yesterdayPlan = weeklyPlans.get(yesterdayKey);
        
        if (yesterdayPlan) {
            const todayKey = format(selectedDate, 'yyyy-MM-dd');
            const newPlans = new Map(weeklyPlans);
            newPlans.set(todayKey, yesterdayPlan);
            setWeeklyPlans(newPlans);
            alert('已成功複製昨日設定！');
        } else {
            alert('昨日沒有可複製的餐食計畫。');
        }
    };
    // --- ^^^ 新增：複製昨日設定的函式 ^^^ ---


    const getDiffColor = () => {
        const percentageDiff = suggestedTotalCalories > 0 ? Math.abs(calorieDifference) / suggestedTotalCalories : 0;
        if (percentageDiff < 0.1) return 'text-green-600';
        if (calorieDifference > 0) return 'text-orange-500';
        return 'text-blue-500';
    }

    const checkAllergen = useCallback((recipe: Recipe): boolean => {
        if (!babyProfile?.knownAllergens || !recipe.allergens) return false;
        return recipe.allergens.some(allergen => babyProfile.knownAllergens?.includes(allergen));
    }, [babyProfile?.knownAllergens]);

    if (isLoading) {
        return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">載入中...</div>;
    }
    
    if (!babyProfile || !latestWeight) {
        return (
            <div className="text-center p-8">
                <p>無法讀取寶寶的資料或最新體重紀錄，請先至「寶寶資料」與「照護紀錄」頁面新增。</p>
                <Link href="/baby/edit" className="text-blue-600 hover:underline">前往設定寶寶資料</Link>
            </div>
        )
    }

    return (
        <>
            {isModalOpen && activeStage && <ShoppingListModal recipes={activeStage.recipes} onClose={() => setIsModalOpen(false)} />}
            <div className="p-4 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setCurrentDate(subDays(currentDate, 7))} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; 上一週</button>
                    <h1 className="text-xl md:text-3xl font-bold text-center">
                        {format(weekInterval.start, 'yyyy年M月d日')} - {format(weekInterval.end, 'M月d日')}
                    </h1>
                    <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">下一週 &rarr;</button>
                </div>

                <div className="flex overflow-x-auto space-x-2 pb-4 mb-8">
                    {daysInWeek.map(day => {
                        const isDisabled = day < new Date(babyProfile.birthDate.setHours(0,0,0,0));
                        return (
                        <button 
                            key={day.toString()}
                            onClick={() => !isDisabled && setSelectedDate(day)}
                            disabled={isDisabled}
                            className={`flex-shrink-0 p-4 rounded-lg text-center transition-all duration-200 ${
                                isSameDay(selectedDate, day)
                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                : isDisabled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white hover:bg-blue-50 shadow-sm'
                            }`}
                        >
                            <p className="font-semibold">{format(day, 'EEE', { locale: zhTW })}</p>
                            <p className="text-2xl font-bold">{format(day, 'd')}</p>
                        </button>
                    )})}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-500">{format(selectedDate, 'M月d日')} 當日階段</h3>
                            <p className="text-2xl font-bold text-blue-600">{activeStage?.stage || '未達副食品階段'}</p>
                        </div>
                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-500">每日建議總熱量</h3>
                            <p className="text-2xl font-bold">{suggestedTotalCalories} kcal</p>
                            <p className="text-xs text-gray-400 mt-1">
                                (依據 {latestWeight}kg x {activeStage?.caloriesPerKg || 0}kcal/kg 推算)
                            </p>
                        </div>
                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-500">目前規劃總熱量</h3>
                            <p className="text-2xl font-bold">{actualTotalCalories} kcal</p>
                            <p className={`text-sm font-semibold mt-1 ${getDiffColor()}`}>
                               {calorieDifference === 0 ? '完美達成！' : `與建議相差 ${calorieDifference} kcal`}
                            </p>
                        </div>
                        {/* --- vvv 新增：實際攝取量對比區塊 (UI Placeholder) vvv --- */}
                        <div className="p-6 bg-white rounded-lg shadow-sm border-t-4 border-indigo-400">
                             <h3 className="font-semibold text-gray-500">當日實際攝取量 (來自照護紀錄)</h3>
                             <p className="text-center text-gray-400 py-8 text-sm">此處未來將顯示實際紀錄與計畫的達成率圖表。</p>
                        </div>
                        {/* --- ^^^ 新增：實際攝取量對比區塊 (UI Placeholder) ^^^ --- */}
                    </div>

                    <div className="lg:col-span-2 p-6 bg-white rounded-lg shadow-sm space-y-6">
                       {activeStage ? (
                        <>
                             {/* --- vvv 新增：複製與範本按鈕區 vvv --- */}
                             <div className="flex justify-end gap-2">
                                <button onClick={copyYesterdayPlan} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-300">複製昨日設定</button>
                                <button onClick={() => alert('「儲存為範本」功能開發中！')} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-300">儲存為範本</button>
                             </div>
                             {/* --- ^^^ 新增：複製與範本按鈕區 ^^^ --- */}

                             <div>
                                <label htmlFor="feedCount" className="block text-sm font-medium text-gray-700">每日餵奶次數</label>
                                <input id="feedCount" type="range" min="3" max="12" step="1" value={selectedPlan.feedCount} onChange={(e) => updateSelectedPlan('feedCount', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"/>
                                <p className="text-center font-bold">{selectedPlan.feedCount} 次</p>
                            </div>
                             <div>
                                <label htmlFor="volumePerFeed" className="block text-sm font-medium text-gray-700">每次奶量 (ml)</label>
                                <input id="volumePerFeed" type="range" min="60" max="300" step="10" value={selectedPlan.volumePerFeed} onChange={(e) => updateSelectedPlan('volumePerFeed', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"/>
                                <p className="text-center font-bold">{selectedPlan.volumePerFeed} ml</p>
                            </div>
                            <div>
                                <label htmlFor="solidFoodGrams" className="block text-sm font-medium text-gray-700">每日副食品總量 (g)</label>
                                <input id="solidFoodGrams" type="range" min="0" max="300" step="10" value={selectedPlan.solidFoodGrams} onChange={(e) => updateSelectedPlan('solidFoodGrams', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"/>
                                <p className="text-center font-bold">{selectedPlan.solidFoodGrams} g</p>
                            </div>
                            <div className="pt-6 border-t">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-lg font-semibold">本階段建議副食品</h4>
                                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700">
                                        一鍵生成採買清單
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                   {activeStage.recipes.map(recipe => {
                                       const isAllergen = checkAllergen(recipe);
                                       return (
                                           <span
                                                key={recipe.name}
                                                className={`px-3 py-1 text-sm font-medium rounded-full ${
                                                    isAllergen
                                                    ? 'bg-red-100 text-red-800 ring-2 ring-red-500'
                                                    : 'bg-green-100 text-green-800'
                                                }`}
                                                title={isAllergen ? '注意：此為寶寶的已知過敏原！' : ''}
                                            >
                                               {isAllergen && '⚠️ '}
                                               {recipe.name}
                                           </span>
                                       )
                                   })}
                                </div>
                            </div>
                        </>
                       ) : (
                        <div className="text-center py-16 text-gray-500">
                            寶寶還小，目前以奶類為主食喔！
                        </div>
                       )}
                    </div>
                </div>
            </div>
        </>
    );
}