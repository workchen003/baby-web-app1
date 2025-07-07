// src/app/meal-plan/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import { getMeasurementRecords, RecordData } from '@/lib/records';
import { mealPlanData, AgeStagePlan, Recipe } from '@/data/mealPlanData';

// --- vvv 新增：購物清單 Modal 元件 vvv ---
const ShoppingListModal = ({ recipes, onClose }: { recipes: Recipe[], onClose: () => void }) => {
    const shoppingList = useMemo(() => {
        // 簡單地將所有推薦食譜的名稱作為購物清單項目
        const items = recipes.map(r => r.name);
        return [...new Set(items)]; // 使用 Set 去除重複項目
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
// --- ^^^ 新增：購物清單 Modal 元件 ^^^ ---

const calculateAgeInMonths = (birthDate: Date): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age_y = today.getFullYear() - birth.getFullYear();
    let age_m = today.getMonth() - birth.getMonth();
    if (today.getDate() < birth.getDate()) {
        age_m--;
    }
    if (age_m < 0) {
        age_y--;
        age_m += 12;
    }
    return age_y * 12 + age_m;
};


export default function MealPlanPage() {
    const { user, userProfile, loading: authLoading } = useAuth();

    const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
    const [latestWeight, setLatestWeight] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [feedCount, setFeedCount] = useState(6);
    const [volumePerFeed, setVolumePerFeed] = useState(150);
    const [solidFoodGrams, setSolidFoodGrams] = useState(50);

    // --- vvv 新增：購物清單 Modal 開關狀態 vvv ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    // --- ^^^ 新增：購物清單 Modal 開關狀態 ^^^ ---

    const activeStage = useMemo((): AgeStagePlan | undefined => {
        if (!babyProfile) return undefined;
        const ageInMonths = calculateAgeInMonths(babyProfile.birthDate);
        return mealPlanData.find(stage => ageInMonths >= stage.ageInMonthsStart && ageInMonths < stage.ageInMonthsEnd);
    }, [babyProfile]);

    const suggestedTotalCalories = useMemo(() => {
        if (!activeStage || !latestWeight) return 0;
        return Math.round(latestWeight * activeStage.caloriesPerKg);
    }, [activeStage, latestWeight]);

    const actualTotalCalories = useMemo(() => {
        if (!babyProfile || !activeStage) return 0;
        const breastMilkCaloriesPerMl = 0.67;
        
        let milkCalories = 0;
        if (babyProfile.milkType === 'breast') {
            milkCalories = feedCount * volumePerFeed * breastMilkCaloriesPerMl;
        } else if (babyProfile.milkType === 'formula' && babyProfile.formulaCalories) {
            milkCalories = feedCount * volumePerFeed * (babyProfile.formulaCalories / 100);
        } else if (babyProfile.milkType === 'mixed') {
            milkCalories = feedCount * volumePerFeed * (babyProfile.formulaCalories ? babyProfile.formulaCalories / 100 : breastMilkCaloriesPerMl);
        }

        const solidFoodCalories = solidFoodGrams * (activeStage.recipes[0]?.caloriesPerGram || 0.5);

        return Math.round(milkCalories + solidFoodCalories);
    }, [babyProfile, activeStage, feedCount, volumePerFeed, solidFoodGrams]);

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

    const getDiffColor = () => {
        const percentageDiff = suggestedTotalCalories > 0 ? Math.abs(calorieDifference) / suggestedTotalCalories : 0;
        if (percentageDiff < 0.1) return 'text-green-600';
        if (calorieDifference > 0) return 'text-orange-500';
        return 'text-blue-500';
    }

    // --- vvv 新增：檢查過敏原的邏輯 vvv ---
    const checkAllergen = useCallback((recipe: Recipe): boolean => {
        if (!babyProfile?.knownAllergens || !recipe.allergens) {
            return false;
        }
        // 檢查食譜的過敏原陣列中，是否有任何一項存在於寶寶的已知過敏原陣列中
        return recipe.allergens.some(allergen => 
            babyProfile.knownAllergens?.includes(allergen)
        );
    }, [babyProfile?.knownAllergens]);
    // --- ^^^ 新增：檢查過敏原的邏輯 ^^^ ---


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
            {/* --- vvv 新增：Modal 的渲染判斷 vvv --- */}
            {isModalOpen && activeStage && <ShoppingListModal recipes={activeStage.recipes} onClose={() => setIsModalOpen(false)} />}
            {/* --- ^^^ 新增：Modal 的渲染判斷 ^^^ --- */}
            <div className="p-4 md:p-8">
                <h1 className="text-3xl font-bold mb-2">餐食規劃</h1>
                <p className="text-gray-600 mb-8">根據寶寶最新體重與月齡，提供個人化的餐食建議</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-500">當前階段</h3>
                            <p className="text-2xl font-bold text-blue-600">{activeStage?.stage}</p>
                        </div>
                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-500">每日建議總熱量</h3>
                            <p className="text-2xl font-bold">{suggestedTotalCalories} kcal</p>
                            <p className="text-xs text-gray-400 mt-1">
                                (依據 {latestWeight}kg x {activeStage?.caloriesPerKg}kcal/kg 推算)
                            </p>
                        </div>
                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-500">目前規劃總熱量</h3>
                            <p className="text-2xl font-bold">{actualTotalCalories} kcal</p>
                            <p className={`text-sm font-semibold mt-1 ${getDiffColor()}`}>
                               {calorieDifference === 0 ? '完美達成！' : `與建議相差 ${calorieDifference} kcal`}
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-2 p-6 bg-white rounded-lg shadow-sm space-y-6">
                        <div>
                            <label htmlFor="feedCount" className="block text-sm font-medium text-gray-700">每日餵奶次數</label>
                            <input id="feedCount" type="range" min="3" max="12" step="1" value={feedCount} onChange={(e) => setFeedCount(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"/>
                            <p className="text-center font-bold">{feedCount} 次</p>
                        </div>
                         <div>
                            <label htmlFor="volumePerFeed" className="block text-sm font-medium text-gray-700">每次奶量 (ml)</label>
                            <input id="volumePerFeed" type="range" min="60" max="300" step="10" value={volumePerFeed} onChange={(e) => setVolumePerFeed(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"/>
                            <p className="text-center font-bold">{volumePerFeed} ml</p>
                        </div>
                        <div>
                            <label htmlFor="solidFoodGrams" className="block text-sm font-medium text-gray-700">每日副食品總量 (g)</label>
                            <input id="solidFoodGrams" type="range" min="0" max="300" step="10" value={solidFoodGrams} onChange={(e) => setSolidFoodGrams(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"/>
                            <p className="text-center font-bold">{solidFoodGrams} g</p>
                        </div>
                        <div className="pt-6 border-t">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-lg font-semibold">本階段建議副食品</h4>
                                {/* --- vvv 新增：購物清單按鈕 vvv --- */}
                                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700">
                                    一鍵生成採買清單
                                </button>
                                {/* --- ^^^ 新增：購物清單按鈕 ^^^ --- */}
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {activeStage?.recipes.map(recipe => {
                                   // --- vvv 新增：檢查是否為過敏原 vvv ---
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
                                   // --- ^^^ 新增：檢查是否為過敏原 ^^^ ---
                               })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}