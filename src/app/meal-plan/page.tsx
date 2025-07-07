// src/app/meal-plan/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import { 
    getMeasurementRecords, 
    saveMealPlan, 
    getMealPlan, 
    MealPlan, 
    RecordData, 
    CreatableRecordType, 
    getRecordsForDateRange,
    createSharedPlan 
} from '@/lib/records';
import { mealPlanData, AgeStagePlan, Recipe, Ingredient, Macronutrients } from '@/data/mealPlanData';
import { startOfWeek, endOfWeek, addDays, subDays, format, eachDayOfInterval, isSameDay, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import { Share2 } from 'lucide-react';
import AddRecordModal from '@/components/AddRecordModal';
import { Timestamp } from 'firebase/firestore';

// --- 型別定義 ---
interface Meal { recipe: Recipe; grams: number; }
interface DailyMenu { breakfast: Meal[]; lunch: Meal[]; dinner: Meal[]; snacks: Meal[]; }
interface DailyPlan { feedCount: number; volumePerFeed: number; menu: DailyMenu; }
const mealTypeToChinese: Record<keyof DailyMenu, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snacks: '點心' };

// --- 子元件 ---
const ShoppingListModal = ({ plans, onClose }: { plans: Map<string, DailyPlan>, onClose: () => void }) => {
    const shoppingList = useMemo(() => {
        const ingredients = new Set<string>();
        plans.forEach(plan => {
            Object.values(plan.menu).flat().forEach((meal: Meal) => {
                meal.recipe.ingredients.forEach((ingredient: Ingredient) => ingredients.add(ingredient.name));
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

const calculateAgeInMonths = (birthDate: Date, targetDate: Date = new Date()): number => {
    const diff = targetDate.getTime() - new Date(birthDate).getTime();
    return diff / (1000 * 60 * 60 * 24 * 30.4375);
};

// --- 主元件 ---
export default function MealPlanPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
    const [latestWeightRecord, setLatestWeightRecord] = useState<RecordData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weeklyPlans, setWeeklyPlans] = useState<Map<string, DailyPlan>>(new Map());
    const [isShoppingListModalOpen, setIsShoppingListModalOpen] = useState(false);
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ type: CreatableRecordType, initialData: Partial<RecordData> } | null>(null);
    const [todaysRecords, setTodaysRecords] = useState<RecordData[]>([]);
    const [isSharing, setIsSharing] = useState(false);

    const familyId = userProfile?.familyIDs?.[0];
    if (authLoading || !familyId) {
        return <div className="flex min-h-screen items-center justify-center">正在驗證使用者與家庭資料...</div>;
    }

    const weekInterval = useMemo(() => ({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }), [currentDate]);
    const daysInWeek = useMemo(() => eachDayOfInterval(weekInterval), [weekInterval]);

    const activeStage = useMemo((): AgeStagePlan | undefined => {
        if (!babyProfile) return undefined;
        const ageInMonths = calculateAgeInMonths(babyProfile.birthDate, selectedDate);
        return mealPlanData.find(stage => ageInMonths >= stage.ageInMonthsStart && ageInMonths < stage.ageInMonthsEnd);
    }, [babyProfile, selectedDate]);
    
    const generateDefaultPlanForDate = useCallback((date: Date): DailyPlan => {
        const currentStage = mealPlanData.find(stage => {
            if (!babyProfile) return false;
            const ageInMonths = calculateAgeInMonths(babyProfile.birthDate, date);
            return ageInMonths >= stage.ageInMonthsStart && ageInMonths < stage.ageInMonthsEnd
        });

        const menu: DailyMenu = { breakfast: [], lunch: [], dinner: [], snacks: [] };
        if (currentStage) {
            const dayOfWeek = date.getDay(); 
            const { recipes } = currentStage;
            const getRecipe = (cat: Recipe['category'], index: number) => {
                const list = recipes.filter(r => r.category === cat);
                if (list.length === 0) return null;
                return list[index % list.length];
            };
            
            const staple1 = getRecipe('staple', dayOfWeek);
            const protein1 = getRecipe('protein', dayOfWeek);
            const veggie1 = getRecipe('vegetable', dayOfWeek);
            const fruit1 = getRecipe('fruit', dayOfWeek);
            const protein2 = getRecipe('protein', dayOfWeek + 1) || protein1;
            const veggie2 = getRecipe('vegetable', dayOfWeek + 1) || veggie1;
            const fruit2 = getRecipe('fruit', dayOfWeek + 1) || fruit1;

            if (staple1 && fruit1) menu.breakfast.push({ recipe: staple1, grams: 20 }, { recipe: fruit1, grams: 10 });
            if (staple1 && protein1 && veggie1) menu.lunch.push({ recipe: staple1, grams: 30 }, { recipe: protein1, grams: 20 }, { recipe: veggie1, grams: 20 });
            if (staple1 && protein2 && veggie2) menu.dinner.push({ recipe: staple1, grams: 30 }, { recipe: protein2, grams: 20 }, { recipe: veggie2, grams: 20 });
            if (fruit2) menu.snacks.push({ recipe: fruit2, grams: 15 });
        }
        return {
            feedCount: currentStage?.defaultFeedCount || 6,
            volumePerFeed: currentStage?.defaultVolumePerFeed || 150,
            menu,
        };
    }, [babyProfile]);

    const selectedPlan = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return weeklyPlans.get(dateKey) || generateDefaultPlanForDate(selectedDate);
    }, [selectedDate, weeklyPlans, generateDefaultPlanForDate]);
    
    const suggestedTotalCalories = useMemo(() => {
        if (!activeStage || !latestWeightRecord?.value) return 0;
        return Math.round(latestWeightRecord.value * activeStage.caloriesPerKg);
    }, [activeStage, latestWeightRecord]);

    const { actualTotalCalories, nutrientTotals } = useMemo(() => {
        if (!babyProfile) return { actualTotalCalories: 0, nutrientTotals: { carbs: 0, protein: 0, fat: 0 } };
        const breastMilkCaloriesPerMl = 0.67;
        let milkCalories = 0;
        if (babyProfile.milkType === 'breast') milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * breastMilkCaloriesPerMl;
        else if (babyProfile.milkType === 'formula' && babyProfile.formulaCalories) milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * (babyProfile.formulaCalories / 100);
        else if (babyProfile.milkType === 'mixed') milkCalories = selectedPlan.feedCount * selectedPlan.volumePerFeed * (babyProfile.formulaCalories ? babyProfile.formulaCalories / 100 : breastMilkCaloriesPerMl);
        
        let solidFoodCalories = 0;
        const nutrients: Macronutrients = { carbs: 0, protein: 0, fat: 0 };
        Object.values(selectedPlan.menu).flat().forEach((meal: Meal) => {
            if (meal && meal.recipe) {
                solidFoodCalories += meal.grams * meal.recipe.caloriesPerGram;
                nutrients.carbs += (meal.recipe.nutrientsPer100g.carbs / 100) * meal.grams;
                nutrients.protein += (meal.recipe.nutrientsPer100g.protein / 100) * meal.grams;
                nutrients.fat += (meal.recipe.nutrientsPer100g.fat / 100) * meal.grams;
            }
        });
        return { actualTotalCalories: Math.round(milkCalories + solidFoodCalories), nutrientTotals: nutrients };
    }, [babyProfile, selectedPlan]);

    const calorieDifference = useMemo(() => actualTotalCalories - suggestedTotalCalories, [actualTotalCalories, suggestedTotalCalories]);
    
    const nutrientPieData = useMemo(() => [
        { name: '碳水', value: Math.round(nutrientTotals.carbs * 4), fill: '#3b82f6' },
        { name: '蛋白質', value: Math.round(nutrientTotals.protein * 4), fill: '#10b981' },
        { name: '脂肪', value: Math.round(nutrientTotals.fat * 9), fill: '#f97316' },
    ].filter(item => item.value > 0), [nutrientTotals]);
    
    const realIntake = useMemo(() => {
        let totalMilk = 0;
        let totalSolidGrams = 0;
        todaysRecords.forEach(r => {
            if (r.type === 'feeding') totalMilk += r.amount || 0;
            if (r.type === 'solid-food') totalSolidGrams += r.amount || 0;
        });
        return { totalMilk, totalSolidGrams };
    }, [todaysRecords]);

    useEffect(() => {
        if (!babyProfile) return;
        const babyId = 'baby_01';
        const start = new Date(selectedDate);
        start.setHours(0,0,0,0);
        const end = new Date(selectedDate);
        end.setHours(23,59,59,999);
        getRecordsForDateRange(familyId, babyId, start, end).then(setTodaysRecords);
    }, [selectedDate, familyId, babyProfile]);

    useEffect(() => {
        const babyId = 'baby_01';
        setIsLoading(true);
        Promise.all([getBabyProfile(babyId), getMeasurementRecords(familyId, babyId), getMealPlan(familyId)])
            .then(([profile, records, savedPlan]) => {
                if (profile) setBabyProfile(profile);
                const weightRecords = records.filter(r => r.measurementType === 'weight');
                if (weightRecords.length > 0) {
                    setLatestWeightRecord(weightRecords[weightRecords.length - 1]);
                }
                if (savedPlan) {
                    const hydratedPlans = new Map<string, DailyPlan>();
                    Object.entries(savedPlan).forEach(([dateKey, plan]) => {
                         const hydratedMenu: DailyMenu = { breakfast: [], lunch: [], dinner: [], snacks: [] };
                        (Object.entries(plan.menu) as [keyof DailyMenu, { recipeName: string; grams: number }[]][]).forEach(([mealType, meals]) => {
                            hydratedMenu[mealType] = meals.map(meal => ({
                                grams: meal.grams,
                                recipe: mealPlanData.flatMap(s => s.recipes).find(r => r.name === meal.recipeName)!,
                            })).filter((meal): meal is Meal => meal.recipe != null);
                        });
                        hydratedPlans.set(dateKey, { feedCount: plan.feedCount, volumePerFeed: plan.volumePerFeed, menu: hydratedMenu });
                    });
                    setWeeklyPlans(hydratedPlans);
                }
            }).catch(console.error).finally(() => setIsLoading(false));
    }, [familyId]);

    const weightRecordInfo = useMemo(() => {
        if (!latestWeightRecord) return { isValid: false, message: "尚未有任何體重紀錄，請先新增一筆！" };
        const daysAgo = differenceInDays(new Date(), latestWeightRecord.timestamp.toDate());
        if (daysAgo > 14) return { isValid: false, message: `最新體重紀錄是 ${daysAgo} 天前，建議更新以獲得更精準的熱量建議。` };
        return { isValid: true, message: `使用 ${format(latestWeightRecord.timestamp.toDate(), 'M/d')} 的體重紀錄 (${latestWeightRecord.value} kg)` };
    }, [latestWeightRecord]);

    const handleRecordClick = (type: CreatableRecordType, initialData: Partial<RecordData>) => {
        setModalConfig({ type, initialData: { ...initialData, timestamp: Timestamp.fromDate(selectedDate) } });
        setIsRecordModalOpen(true);
    };

    const updatePlan = useCallback((updates: Partial<DailyPlan>) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        setWeeklyPlans(prevPlans => {
            const newPlans = new Map(prevPlans);
            const currentPlan = newPlans.get(dateKey) || generateDefaultPlanForDate(selectedDate);
            const updatedPlan = { ...currentPlan, ...updates };
            newPlans.set(dateKey, updatedPlan);
            return newPlans;
        });
    }, [selectedDate, generateDefaultPlanForDate]);

    const handleMealChange = useCallback((mealType: keyof DailyMenu, index: number, field: keyof Meal, value: any) => {
        const newMenu = { ...selectedPlan.menu };
        const mealToUpdate = { ...newMenu[mealType][index] };
        if (field === 'recipe') {
            mealToUpdate[field] = value;
        } else {
            (mealToUpdate as any)[field] = value;
        }
        newMenu[mealType][index] = mealToUpdate;
        updatePlan({ menu: newMenu });
    }, [selectedPlan.menu, updatePlan]);

    const copyYesterdayPlan = useCallback(() => {
        const yesterdayKey = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
        const yesterdayPlan = weeklyPlans.get(yesterdayKey);
        if (yesterdayPlan) {
            const todayKey = format(selectedDate, 'yyyy-MM-dd');
            setWeeklyPlans(prev => new Map(prev).set(todayKey, yesterdayPlan));
            alert('已成功複製昨日設定！');
        } else {
            alert('昨日沒有可複製的餐食計畫。');
        }
    }, [selectedDate, weeklyPlans]);

    const handleSavePlan = async () => {
        if (!userProfile) return alert("無法獲取家庭資訊！");
        const plansToSave: MealPlan = {};
        weeklyPlans.forEach((plan, dateKey) => {
            const menuToSave = Object.fromEntries(
                Object.entries(plan.menu).map(([mealType, meals]) => [
                    mealType,
                    meals.map((meal: Meal) => ({ recipeName: meal.recipe.name, grams: meal.grams }))
                ])
            ) as any;
            plansToSave[dateKey] = { feedCount: plan.feedCount, volumePerFeed: plan.volumePerFeed, menu: menuToSave };
        });

        try { 
            await saveMealPlan(familyId, plansToSave); 
            alert("本週計畫已成功儲存！"); 
        } catch (error) { 
            console.error("儲存計畫失敗:", error); 
            alert("儲存失敗，請稍後再試。"); 
        }
    };
    
    const handleShare = async () => {
        if (!userProfile || !babyProfile) return;
        setIsSharing(true);
        try {
            const plansToShare: MealPlan = {};
            weeklyPlans.forEach((plan, dateKey) => {
                const menuToSave = Object.fromEntries(
                    Object.entries(plan.menu).map(([mealType, meals]) => [
                        mealType,
                        meals.map((meal: Meal) => ({ recipeName: meal.recipe.name, grams: meal.grams }))
                    ])
                ) as any;
                plansToShare[dateKey] = { feedCount: plan.feedCount, volumePerFeed: plan.volumePerFeed, menu: menuToSave };
            });
            
            const sharedPlanId = await createSharedPlan({ plan: plansToShare, babyName: babyProfile.name, sharerId: userProfile.uid });
            const shareUrl = `${window.location.origin}/share/${sharedPlanId}`;
            await navigator.clipboard.writeText(shareUrl);
            alert(`本週計畫的分享連結已複製到剪貼簿！\n${shareUrl}`);

        } catch (error) {
            console.error("分享失敗:", error);
            alert("建立分享連結時發生錯誤。");
        } finally {
            setIsSharing(false);
        }
    };

    const checkAllergen = useCallback((recipe: Recipe): boolean => {
        if (!babyProfile?.knownAllergens || !recipe.allergens) return false;
        return recipe.allergens.some(allergen => babyProfile.knownAllergens?.includes(allergen));
    }, [babyProfile?.knownAllergens]);

    if (isLoading) return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
    if (!babyProfile) return <div className="p-8 text-center"><p>無法讀取寶寶資料。</p><Link href="/baby/edit" className="text-blue-600 hover:underline">前往設定</Link></div>;

    return (
        <>
            {isShoppingListModalOpen && <ShoppingListModal plans={weeklyPlans} onClose={() => setIsShoppingListModalOpen(false)} />}
            {isRecordModalOpen && modalConfig && <AddRecordModal recordType={modalConfig.type} initialData={modalConfig.initialData} onClose={() => setIsRecordModalOpen(false)} babyProfile={babyProfile} />}
            <div className="p-4 md:p-8">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setCurrentDate(subDays(currentDate, 7))} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr;</button>
                    <h1 className="text-xl md:text-2xl font-bold text-center">{format(weekInterval.start, 'yyyy年M月d日')} - {format(weekInterval.end, 'M月d日')}</h1>
                    <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&rarr;</button>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8 relative">
                    <div className="bg-blue-400 h-2.5 rounded-full" style={{ width: `${(calculateAgeInMonths(babyProfile.birthDate) / 12) * 100}%` }}></div>
                    <span className="text-xs absolute -bottom-5 transform -translate-x-1/2" style={{left: `${(calculateAgeInMonths(babyProfile.birthDate) / 12) * 100}%`}}>寶寶現在在這！</span>
                </div>
                <div className="flex overflow-x-auto space-x-2 pb-4 mb-8">
                    {daysInWeek.map(day => {
                        const isDisabled = day < new Date(babyProfile.birthDate.setHours(0, 0, 0, 0));
                        return (<button key={day.toString()} onClick={() => !isDisabled && setSelectedDate(day)} disabled={isDisabled} className={`flex-shrink-0 p-4 rounded-lg text-center transition-all duration-200 ${isSameDay(selectedDate, day) ? 'bg-blue-600 text-white shadow-md scale-105' : isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-blue-50 shadow-sm'}`}><p className="font-semibold">{format(day, 'EEE', { locale: zhTW })}</p><p className="text-2xl font-bold">{format(day, 'd')}</p></button>)
                    })}
                </div>
                {!weightRecordInfo.isValid && (<div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert"><p className="font-bold">提醒</p><p>{weightRecordInfo.message}</p></div>)}
                <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${!weightRecordInfo.isValid ? 'opacity-30 pointer-events-none' : ''}`}>
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-4 bg-white rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-500">{format(selectedDate, 'M月d日')} 規劃目標</h3>
                            <div className="flex justify-between items-baseline mt-2"><span className="text-lg">建議總熱量</span><span className="text-lg font-bold">{suggestedTotalCalories} kcal</span></div>
                            <p className="text-xs text-gray-400 mt-1 text-right">({latestWeightRecord?.value || 0}kg x {activeStage?.caloriesPerKg || 0}kcal/kg 推算)</p>
                            <div className="flex justify-between items-baseline mt-2"><span className="text-lg text-blue-600">目前總熱量</span><span className="text-lg font-bold text-blue-600">{actualTotalCalories} kcal</span></div>
                            <p className={`text-sm font-semibold mt-1 text-right ${calorieDifference > 0 ? 'text-orange-500' : 'text-green-600'}`}>{calorieDifference === 0 ? '完美達成！' : `與建議相差 ${calorieDifference} kcal`}</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg shadow-sm">
                             <h3 className="font-semibold text-gray-500 mb-2">副食品營養素佔比 (熱量估算)</h3>
                             <ResponsiveContainer width="100%" height={150}>
                                <PieChart><Pie data={nutrientPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} labelLine={false} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} /><Tooltip /></PieChart>
                             </ResponsiveContainer>
                        </div>
                        <div className="p-6 bg-white rounded-lg shadow-sm border-t-4 border-indigo-400"><h3 className="font-semibold text-gray-500 mb-4">計畫 vs 實際達成率</h3><div className="space-y-2 text-sm"><p>總奶量: {realIntake.totalMilk} ml / {selectedPlan.feedCount * selectedPlan.volumePerFeed} ml</p><p>副食品: {realIntake.totalSolidGrams} g / {Object.values(selectedPlan.menu).flat().reduce((sum, meal) => sum + meal.grams, 0)} g</p></div></div>
                    </div>
                    <div className="lg:col-span-2 p-6 bg-white rounded-lg shadow-sm space-y-6">
                        <div className="flex justify-between items-center"><h2 className="text-xl font-bold">每日計畫：{format(selectedDate, 'M月d日')}</h2><div className="flex items-center gap-2"><button onClick={handleShare} disabled={isSharing} className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50" title="分享本週計畫"><Share2 size={16} /></button><button onClick={copyYesterdayPlan} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-300">複製昨日</button><button onClick={() => setIsShoppingListModalOpen(true)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-green-700">採買清單</button><button onClick={handleSavePlan} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700">儲存本週計畫</button></div></div>
                        <div className="p-4 border rounded-md">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-baseline gap-2">
                                    <h4 className="font-semibold">奶類</h4>
                                    <span className="text-xs text-white px-2 py-0.5 rounded-full bg-blue-400">{babyProfile.milkType === 'breast' ? '母乳' : babyProfile.milkType === 'formula' ? `配方奶 (${babyProfile.formulaBrand || '未設定品牌'})` : '混合餵養'}</span>
                                </div>
                                <button onClick={() => handleRecordClick('feeding', { amount: selectedPlan.volumePerFeed })} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded hover:bg-blue-200 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>紀錄</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label htmlFor="feedCount" className="block text-sm font-medium text-gray-700">餵奶次數</label><input id="feedCount" type="number" min="1" max="12" value={selectedPlan.feedCount} onChange={(e) => updatePlan({ ...selectedPlan, feedCount: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded"/></div>
                                <div><label htmlFor="volumePerFeed" className="block text-sm font-medium text-gray-700">每次奶量(ml)</label><input id="volumePerFeed" type="number" min="30" max="300" step="10" value={selectedPlan.volumePerFeed} onChange={(e) => updatePlan({ ...selectedPlan, volumePerFeed: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded"/></div>
                            </div>
                        </div>
                        <div className="p-4 border rounded-md">
                            <h4 className="font-semibold mb-2">副食品</h4>
                            {activeStage ? (
                                <div className="space-y-4">
                                    {(Object.keys(selectedPlan.menu) as (keyof DailyMenu)[]).map(mealType => (
                                        selectedPlan.menu[mealType].length > 0 && (
                                            <div key={mealType}>
                                                <h5 className="font-semibold capitalize text-gray-600">{mealTypeToChinese[mealType]}</h5>
                                                {selectedPlan.menu[mealType].map((meal, index) => (
                                                    <div key={index} className="flex items-center gap-2 mt-1">
                                                        <select value={meal.recipe.name} onChange={e => handleMealChange(mealType, index, 'recipe', activeStage.recipes.find(r => r.name === e.target.value))} className="p-2 border rounded w-1/2">
                                                            {activeStage.recipes.map(r => <option key={r.name} value={r.name}>{r.name}{checkAllergen(r) ? '⚠️' : ''}</option>)}
                                                        </select>
                                                        <input type="number" value={meal.grams} onChange={e => handleMealChange(mealType, index, 'grams', Number(e.target.value))} className="p-2 border rounded w-1/4" />
                                                        <span className="text-sm text-gray-500">克</span>
                                                        <button onClick={() => handleRecordClick('solid-food', { foodItems: meal.recipe.name, amount: meal.grams })} className="p-2 bg-blue-100 text-blue-700 text-xs font-bold rounded hover:bg-blue-200 flex items-center justify-center" title={`紀錄${meal.recipe.name}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )
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