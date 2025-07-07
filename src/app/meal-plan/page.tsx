// src/app/meal-plan/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import { getMeasurementRecords } from '@/lib/records';
// --- vvv 這裡是本次修改的重點 vvv ---
import { mealPlanData, AgeStagePlan, Recipe, Ingredient, Macronutrients } from '@/data/mealPlanData'; // 引入所有需要的型別
// --- ^^^ 這裡是本次修改的重點 ^^^ ---
import { startOfWeek, endOfWeek, addDays, subDays, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

// --- 型別定義 ---
interface Meal {
    recipe: Recipe;
    grams: number;
}
interface DailyMenu {
    breakfast: Meal[];
    lunch: Meal[];
    dinner: Meal[];
    snacks: Meal[];
}
interface DailyPlan {
    feedCount: number;
    volumePerFeed: number;
    menu: DailyMenu;
}

// --- 子元件 ---
const ShoppingListModal = ({ plans, onClose }: { plans: Map<string, DailyPlan>, onClose: () => void }) => {
    const shoppingList = useMemo(() => {
        const ingredients = new Set<string>();
        plans.forEach(plan => {
            Object.values(plan.menu).flat().forEach(meal => {
                // --- vvv 這裡是本次修改的重點 vvv ---
                meal.recipe.ingredients.forEach((ingredient: Ingredient) => { // 明確指定 ingredient 的型別
                    ingredients.add(ingredient.name);
                });
                // --- ^^^ 這裡是本次修改的重點 ^^^ ---
            });
        });
        return Array.from(ingredients);
    }, [plans]);

    const handleCopy = () => {
        navigator.clipboard.writeText(shoppingList.join('\n'));
        alert('購物清單已複製到剪貼簿！');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">本週食材採買清單</h2>
                {shoppingList.length > 0 ? (
                    <ul className="space-y-2 max-h-60 overflow-y-auto mb-6 border p-2 rounded-md">
                        {shoppingList.map(item => <li key={item} className="p-2 bg-gray-100 rounded">{item}</li>)}
                    </ul>
                ) : <p className="text-center text-gray-500 my-8">本週計畫中尚無副食品食材。</p>}
                <div className="flex gap-4">
                    <button onClick={handleCopy} disabled={shoppingList.length === 0} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400">複製清單</button>
                    <button onClick={onClose} className="w-full text-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">關閉</button>
                </div>
            </div>
        </div>
    );
};

// --- 輔助函式 ---
const calculateAgeInMonths = (birthDate: Date, targetDate: Date = new Date()): number => {
    const diff = targetDate.getTime() - birthDate.getTime();
    return diff / (1000 * 60 * 60 * 24 * 30.4375);
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
    const [weeklyPlans, setWeeklyPlans] = useState<Map<string, DailyPlan>>(new Map());

    const weekInterval = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return { start, end };
    }, [currentDate]);

    const daysInWeek = useMemo(() => eachDayOfInterval(weekInterval), [weekInterval]);

    const activeStage = useMemo((): AgeStagePlan | undefined => {
        if (!babyProfile) return undefined;
        const ageInMonths = calculateAgeInMonths(babyProfile.birthDate, selectedDate);
        return mealPlanData.find(stage => ageInMonths >= stage.ageInMonthsStart && ageInMonths < stage.ageInMonthsEnd);
    }, [babyProfile, selectedDate]);
    
    const generateDefaultMenu = useCallback((): DailyMenu => {
        const menu: DailyMenu = { breakfast: [], lunch: [], dinner: [], snacks: [] };
        if (!activeStage) return menu;
    
        const staples = activeStage.recipes.filter(r => r.category === 'staple');
        const proteins = activeStage.recipes.filter(r => r.category === 'protein');
        const vegetables = activeStage.recipes.filter(r => r.category === 'vegetable');
        const fruits = activeStage.recipes.filter(r => r.category === 'fruit');
    
        if (staples.length > 0) menu.breakfast.push({ recipe: staples[0], grams: 20 });
        if (fruits.length > 0) menu.breakfast.push({ recipe: fruits[0], grams: 10 });
    
        if (staples.length > 0) menu.lunch.push({ recipe: staples[0], grams: 30 });
        if (proteins.length > 0) menu.lunch.push({ recipe: proteins[0], grams: 20 });
        if (vegetables.length > 0) menu.lunch.push({ recipe: vegetables[0], grams: 20 });
        
        if (staples.length > 0) menu.dinner.push({ recipe: staples[0], grams: 30 });
        if (proteins.length > 1) menu.dinner.push({ recipe: proteins[1] || proteins[0], grams: 20 });
        if (vegetables.length > 1) menu.dinner.push({ recipe: vegetables[1] || vegetables[0], grams: 20 });
    
        if (fruits.length > 1) menu.snacks.push({ recipe: fruits[1] || fruits[0], grams: 15 });
    
        return menu;
    }, [activeStage]);

    const selectedPlan = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return weeklyPlans.get(dateKey) || {
            feedCount: 6,
            volumePerFeed: 150,
            menu: generateDefaultMenu(),
        };
    }, [selectedDate, weeklyPlans, generateDefaultMenu]);
    
    const suggestedTotalCalories = useMemo(() => {
        if (!activeStage || !latestWeight) return 0;
        return Math.round(latestWeight * activeStage.caloriesPerKg);
    }, [activeStage, latestWeight]);

    const { actualTotalCalories, nutrientTotals } = useMemo(() => {
        if (!babyProfile || !activeStage) return { actualTotalCalories: 0, nutrientTotals: { carbs: 0, protein: 0, fat: 0 } };
        
        const breastMilkCaloriesPerMl = 0.67;
        let milkCalories = 0;

        if (babyProfile.milkType === 'breast') milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * breastMilkCaloriesPerMl;
        else if (babyProfile.milkType === 'formula' && babyProfile.formulaCalories) milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * (babyProfile.formulaCalories / 100);
        else if (babyProfile.milkType === 'mixed') milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * (babyProfile.formulaCalories ? babyProfile.formulaCalories / 100 : breastMilkCaloriesPerMl);

        let solidFoodCalories = 0;
        const nutrients: Macronutrients = { carbs: 0, protein: 0, fat: 0 };
        Object.values(selectedPlan.menu).flat().forEach(meal => {
            solidFoodCalories += meal.grams * meal.recipe.caloriesPerGram;
            nutrients.carbs += (meal.recipe.nutrientsPer100g.carbs / 100) * meal.grams;
            nutrients.protein += (meal.recipe.nutrientsPer100g.protein / 100) * meal.grams;
            nutrients.fat += (meal.recipe.nutrientsPer100g.fat / 100) * meal.grams;
        });

        return {
            actualTotalCalories: Math.round(milkCalories + solidFoodCalories),
            nutrientTotals: nutrients
        };
    }, [babyProfile, activeStage, selectedPlan]);

    const calorieDifference = useMemo(() => actualTotalCalories - suggestedTotalCalories, [actualTotalCalories, suggestedTotalCalories]);
    const nutrientPieData = useMemo(() => [
        { name: '碳水', value: Math.round(nutrientTotals.carbs * 4), fill: '#3b82f6' },
        { name: '蛋白質', value: Math.round(nutrientTotals.protein * 4), fill: '#10b981' },
        { name: '脂肪', value: Math.round(nutrientTotals.fat * 9), fill: '#f97316' },
    ], [nutrientTotals]);

    useEffect(() => {
        if (authLoading || !userProfile?.familyIDs?.[0]) return;
        const familyId = userProfile.familyIDs[0];
        const babyId = 'baby_01';

        Promise.all([ getBabyProfile(babyId), getMeasurementRecords(familyId, babyId) ])
            .then(([profile, records]) => {
                if (profile) {
                    setBabyProfile(profile);
                    const weightRecords = records.filter(r => r.measurementType === 'weight');
                    if (weightRecords.length > 0) setLatestWeight(weightRecords[weightRecords.length - 1].value!);
                }
            }).catch(console.error).finally(() => setIsLoading(false));
    }, [userProfile, authLoading]);

    const updatePlan = (updates: Partial<DailyPlan>) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const newPlans = new Map(weeklyPlans);
        const currentPlan = newPlans.get(dateKey) || selectedPlan;
        newPlans.set(dateKey, { ...currentPlan, ...updates });
        setWeeklyPlans(newPlans);
    };

    const handleMealChange = (mealType: keyof DailyMenu, index: number, field: keyof Meal, value: any) => {
        const newMenu = { ...selectedPlan.menu };
        (newMenu[mealType][index] as any)[field] = value;
        updatePlan({ menu: newMenu });
    };

    const copyYesterdayPlan = () => {
        const yesterdayKey = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
        const yesterdayPlan = weeklyPlans.get(yesterdayKey);
        if (yesterdayPlan) {
            updatePlan(yesterdayPlan);
            alert('已成功複製昨日設定！');
        } else alert('昨日沒有可複製的餐食計畫。');
    };

    const checkAllergen = useCallback((recipe: Recipe): boolean => {
        if (!babyProfile?.knownAllergens || !recipe.allergens) return false;
        return recipe.allergens.some(allergen => babyProfile.knownAllergens?.includes(allergen));
    }, [babyProfile?.knownAllergens]);

    if (isLoading) return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
    if (!babyProfile || !latestWeight) return <div className="p-8 text-center"><p>無法讀取寶寶資料或最新體重紀錄。</p><Link href="/baby/edit" className="text-blue-600 hover:underline">前往設定</Link></div>;

    // The rest of the component's JSX remains the same
    return (
        <>
            {isModalOpen && activeStage && <ShoppingListModal plans={weeklyPlans} onClose={() => setIsModalOpen(false)} />}
            <div className="p-4 md:p-8">
                {/* Header and Date Navigation */}
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setCurrentDate(subDays(currentDate, 7))} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr;</button>
                    <h1 className="text-xl md:text-2xl font-bold text-center">
                        {format(weekInterval.start, 'yyyy年M月d日')} - {format(weekInterval.end, 'M月d日')}
                    </h1>
                    <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&rarr;</button>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 relative">
                    <div className="bg-blue-400 h-2.5 rounded-full" style={{ width: `${((calculateAgeInMonths(babyProfile.birthDate) / 12)) * 100}%` }}></div>
                    <span className="text-xs absolute -bottom-5" style={{left: `${((calculateAgeInMonths(babyProfile.birthDate) / 12)) * 100}%`}}>寶寶現在在這！</span>
                </div>

                <div className="flex overflow-x-auto space-x-2 pb-4 mb-8">
                    {daysInWeek.map(day => {
                        const isDisabled = day < new Date(babyProfile.birthDate.setHours(0, 0, 0, 0));
                        return (
                            <button key={day.toString()} onClick={() => !isDisabled && setSelectedDate(day)} disabled={isDisabled}
                                className={`flex-shrink-0 p-4 rounded-lg text-center transition-all duration-200 ${isSameDay(selectedDate, day) ? 'bg-blue-600 text-white shadow-md scale-105' : isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-blue-50 shadow-sm'}`}>
                                <p className="font-semibold">{format(day, 'EEE', { locale: zhTW })}</p>
                                <p className="text-2xl font-bold">{format(day, 'd')}</p>
                            </button>
                        )
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Dashboard */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-4 bg-white rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-500">{format(selectedDate, 'M月d日')} 規劃目標</h3>
                            <div className="flex justify-between items-baseline mt-2">
                                <span className="text-lg">建議總熱量</span>
                                <span className="text-lg font-bold">{suggestedTotalCalories} kcal</span>
                            </div>
                            <div className="flex justify-between items-baseline mt-1">
                                <span className="text-lg text-blue-600">目前總熱量</span>
                                <span className="text-lg font-bold text-blue-600">{actualTotalCalories} kcal</span>
                            </div>
                             <p className={`text-sm font-semibold mt-2 text-right ${calorieDifference > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                               {calorieDifference === 0 ? '完美達成！' : `與建議相差 ${calorieDifference} kcal`}
                            </p>
                        </div>
                        <div className="p-4 bg-white rounded-lg shadow-sm">
                             <h3 className="font-semibold text-gray-500 mb-2">副食品營養素佔比 (熱量估算)</h3>
                             <ResponsiveContainer width="100%" height={150}>
                                <PieChart>
                                    <Pie data={nutrientPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}kcal`} />
                                    <Tooltip />
                                </PieChart>
                             </ResponsiveContainer>
                        </div>
                        <div className="p-6 bg-white rounded-lg shadow-sm border-t-4 border-indigo-400">
                             <h3 className="font-semibold text-gray-500">當日實際攝取量 (來自照護紀錄)</h3>
                             <p className="text-center text-gray-400 py-8 text-sm">此處未來將顯示實際紀錄與計畫的達成率圖表。</p>
                        </div>
                    </div>

                    {/* Right Column: Planner */}
                    <div className="lg:col-span-2 p-6 bg-white rounded-lg shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">每日計畫：{format(selectedDate, 'M月d日')}</h2>
                            <div className="flex gap-2">
                                <button onClick={copyYesterdayPlan} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-300">複製昨日</button>
                                <button onClick={() => setIsModalOpen(true)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-green-700">採買清單</button>
                            </div>
                        </div>
                        <div className="p-4 border rounded-md">
                            <h4 className="font-semibold mb-2">奶類</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="feedCount" className="block text-sm font-medium text-gray-700">餵奶次數</label>
                                    <input id="feedCount" type="number" min="1" max="12" value={selectedPlan.feedCount} onChange={(e) => updatePlan({ feedCount: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded"/>
                                </div>
                                <div>
                                    <label htmlFor="volumePerFeed" className="block text-sm font-medium text-gray-700">每次奶量(ml)</label>
                                    <input id="volumePerFeed" type="number" min="30" max="300" step="10" value={selectedPlan.volumePerFeed} onChange={(e) => updatePlan({ volumePerFeed: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded"/>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border rounded-md">
                            <h4 className="font-semibold mb-2">副食品</h4>
                            {activeStage ? (
                                <div className="space-y-4">
                                    {(Object.keys(selectedPlan.menu) as (keyof DailyMenu)[]).map(mealType => (
                                        <div key={mealType}>
                                            <h5 className="font-semibold capitalize text-gray-600">{mealType}</h5>
                                            {selectedPlan.menu[mealType].map((meal, index) => (
                                                <div key={index} className="flex items-center gap-2 mt-1">
                                                    <select value={meal.recipe.name} onChange={e => handleMealChange(mealType, index, 'recipe', activeStage.recipes.find(r => r.name === e.target.value))} className="p-2 border rounded w-1/2">
                                                        {activeStage.recipes.map(r => <option key={r.name} value={r.name}>{r.name}{checkAllergen(r) ? '⚠️' : ''}</option>)}
                                                    </select>
                                                    <input type="number" value={meal.grams} onChange={e => handleMealChange(mealType, index, 'grams', Number(e.target.value))} className="p-2 border rounded w-1/4" />
                                                    <span className="text-sm text-gray-500">克</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-gray-500 text-center py-4">寶寶目前階段不需副食品。</p>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}