// src/app/share/[planId]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSharedPlanById, SharedPlanData } from '@/lib/records';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import Link from 'next/link';
import BabixLogo from '@/components/icons/BabixLogo';
import { Timestamp } from 'firebase/firestore';

// ▼▼▼【核心修正】▼▼▼
// 1. 將所有需要的型別定義直接放在此檔案內，不再依賴外部檔案。
export interface Macronutrients { carbs: number; protein: number; fat: number; }
export interface Ingredient { name: string; }
export interface Recipe {
  name: string;
  category: 'staple' | 'protein' | 'vegetable' | 'fruit';
  caloriesPerGram: number;
  allergens?: ('egg' | 'fish' | 'nuts' | 'dairy' | 'gluten' | 'soy')[];
  ingredients: Ingredient[];
  nutrientsPer100g: Macronutrients;
}
export interface AgeStagePlan {
  stage: string;
  ageInMonthsStart: number;
  ageInMonthsEnd: number;
  caloriesPerKg: number;
  recipes: Recipe[];
  defaultFeedCount: number;
  defaultVolumePerFeed: number;
}

// 2. 將食譜資料直接 hardcode 在此檔案中，讓建置時能找到它。
// 這是為了解決 build error 的臨時作法，理想情況下應改為從資料庫讀取。
const mealPlanData: AgeStagePlan[] = [
  {
    stage: '4-6個月 (嘗試期)',
    ageInMonthsStart: 4,
    ageInMonthsEnd: 6.9,
    caloriesPerKg: 100,
    defaultFeedCount: 6,
    defaultVolumePerFeed: 180,
    recipes: [
      { name: '十倍粥', category: 'staple', caloriesPerGram: 0.36, ingredients: [{name: '米'}], nutrientsPer100g: { carbs: 8, protein: 0.7, fat: 0.1 } },
      { name: '蘋果泥', category: 'fruit', caloriesPerGram: 0.52, ingredients: [{name: '蘋果'}], nutrientsPer100g: { carbs: 14, protein: 0.3, fat: 0.2 } },
      { name: '香蕉泥', category: 'fruit', caloriesPerGram: 0.89, ingredients: [{name: '香蕉'}], nutrientsPer100g: { carbs: 23, protein: 1.1, fat: 0.3 } },
      { name: '南瓜泥', category: 'vegetable', caloriesPerGram: 0.26, ingredients: [{name: '南瓜'}], nutrientsPer100g: { carbs: 7, protein: 1, fat: 0.1 } },
      { name: '胡蘿蔔泥', category: 'vegetable', caloriesPerGram: 0.41, ingredients: [{name: '胡蘿蔔'}], nutrientsPer100g: { carbs: 10, protein: 0.9, fat: 0.2 } },
    ],
  },
  {
    stage: '7-9個月 (進階期)',
    ageInMonthsStart: 7,
    ageInMonthsEnd: 9.9,
    caloriesPerKg: 95,
    defaultFeedCount: 5,
    defaultVolumePerFeed: 210,
    recipes: [
      { name: '七倍粥', category: 'staple', caloriesPerGram: 0.51, ingredients: [{name: '米'}], nutrientsPer100g: { carbs: 11, protein: 1, fat: 0.1 } },
      { name: '雞肉泥', category: 'protein', caloriesPerGram: 1.65, ingredients: [{name: '雞胸肉'}], nutrientsPer100g: { carbs: 0, protein: 31, fat: 3.6 } },
      { name: '蛋黃泥', category: 'protein', caloriesPerGram: 3.22, allergens: ['egg'], ingredients: [{name: '雞蛋'}], nutrientsPer100g: { carbs: 3.6, protein: 16, fat: 27 } },
      { name: '豆腐泥', category: 'protein', caloriesPerGram: 0.76, allergens: ['soy'], ingredients: [{name: '板豆腐'}], nutrientsPer100g: { carbs: 1.9, protein: 8, fat: 4.8 } },
      { name: '綠花椰菜泥', category: 'vegetable', caloriesPerGram: 0.34, ingredients: [{name: '綠花椰菜'}], nutrientsPer100g: { carbs: 7, protein: 2.8, fat: 0.4 } },
      { name: '梨子泥', category: 'fruit', caloriesPerGram: 0.57, ingredients: [{name: '梨子'}], nutrientsPer100g: { carbs: 15, protein: 0.4, fat: 0.1 } },
    ],
  },
  {
    stage: '10-12個月 (轉固體食物期)',
    ageInMonthsStart: 10,
    ageInMonthsEnd: 12.9,
    caloriesPerKg: 90,
    defaultFeedCount: 4,
    defaultVolumePerFeed: 240,
    recipes: [
      { name: '軟飯', category: 'staple', caloriesPerGram: 1.3, ingredients: [{name: '米'}], nutrientsPer100g: { carbs: 28, protein: 2.7, fat: 0.3 } },
      { name: '寶寶炊飯', category: 'staple', caloriesPerGram: 1.1, ingredients: [{name: '米'}, {name: '胡蘿蔔'}, {name: '雞肉'}], nutrientsPer100g: { carbs: 20, protein: 5, fat: 1 } },
      { name: '鮭魚', category: 'protein', caloriesPerGram: 2.08, allergens: ['fish'], ingredients: [{name: '鮭魚'}], nutrientsPer100g: { carbs: 0, protein: 20, fat: 13 } },
      { name: '豬絞肉', category: 'protein', caloriesPerGram: 2.97, ingredients: [{name: '豬肉'}], nutrientsPer100g: { carbs: 0, protein: 25, fat: 21 } },
      { name: '玉米筍丁', category: 'vegetable', caloriesPerGram: 0.33, ingredients: [{name: '玉米筍'}], nutrientsPer100g: { carbs: 8, protein: 1.9, fat: 0.2 } },
      { name: '切丁番茄', category: 'vegetable', caloriesPerGram: 0.18, ingredients: [{name: '番茄'}], nutrientsPer100g: { carbs: 3.9, protein: 0.9, fat: 0.2 } },
    ],
  },
  {
    stage: '12個月以上 (幼兒期)',
    ageInMonthsStart: 13,
    ageInMonthsEnd: 36,
    caloriesPerKg: 85,
    defaultFeedCount: 3,
    defaultVolumePerFeed: 240,
    recipes: [
        { name: '乾飯', category: 'staple', caloriesPerGram: 1.3, ingredients: [{name: '米'}], nutrientsPer100g: { carbs: 28, protein: 2.7, fat: 0.3 } },
        { name: '寶寶麵', category: 'staple', caloriesPerGram: 1.38, allergens: ['gluten'], ingredients: [{name: '麵粉'}], nutrientsPer100g: { carbs: 25, protein: 10, fat: 1.5 } },
        { name: '雞腿肉塊', category: 'protein', caloriesPerGram: 1.70, ingredients: [{name: '雞腿肉'}], nutrientsPer100g: { carbs: 0, protein: 25, fat: 8 } },
        { name: '起司片', category: 'protein', caloriesPerGram: 4.02, allergens: ['dairy'], ingredients: [{name: '牛奶'}, {name: '起司'}], nutrientsPer100g: { carbs: 1.3, protein: 25, fat: 33 } },
        { name: '炒青菜', category: 'vegetable', caloriesPerGram: 0.40, ingredients: [{name: '青江菜'}, {name: '油'}], nutrientsPer100g: { carbs: 5, protein: 2, fat: 2 } },
        { name: '各種水果', category: 'fruit', caloriesPerGram: 0.60, ingredients: [{name: '當季水果'}], nutrientsPer100g: { carbs: 15, protein: 0.5, fat: 0.2 } },
    ],
  },
];
// ▲▲▲【核心修正】▲▲▲


interface HydratedMeal {
    recipe: Recipe;
    grams: number;
}
interface HydratedDailyMenu {
    breakfast: HydratedMeal[];
    lunch: HydratedMeal[];
    dinner: HydratedMeal[];
    snacks: HydratedMeal[];
}
interface HydratedDailyPlan {
    feedCount: number;
    volumePerFeed: number;
    menu: HydratedDailyMenu;
}

const mealTypeToChinese: Record<keyof HydratedDailyMenu, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snacks: '點心',
};

const hydratePlan = (plan: SharedPlanData['plan']): Map<string, HydratedDailyPlan> => {
    const hydrated = new Map<string, HydratedDailyPlan>();
    Object.keys(plan).forEach(dateKey => {
        const dailyPlan = plan[dateKey];
        const hydratedMenu: HydratedDailyMenu = { breakfast: [], lunch: [], dinner: [], snacks: [] };

        (Object.keys(dailyPlan.menu) as (keyof HydratedDailyMenu)[]).forEach(mealType => {
            hydratedMenu[mealType] = dailyPlan.menu[mealType].map((meal: { recipeName: string; grams: number }): HydratedMeal | null => {
                // 3. 修正 TypeScript 的型別推斷問題
                const recipe = mealPlanData.flatMap((s: AgeStagePlan) => s.recipes).find((r: Recipe) => r.name === meal.recipeName);
                if (!recipe) return null;
                return { grams: meal.grams, recipe };
            }).filter((meal): meal is HydratedMeal => meal != null);
        });

        hydrated.set(dateKey, { ...dailyPlan, menu: hydratedMenu });
    });
    return hydrated;
};

const DailyPlanView = ({ date, plan }: { date: Date; plan: HydratedDailyPlan }) => (
    <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold text-lg mb-3 border-b pb-2">{format(date, 'M月d日 (EEE)', { locale: zhTW })}</h3>
        <div className="space-y-3 text-sm">
            <div className="bg-blue-50 p-2 rounded-md">
                <p className="font-semibold text-blue-800">奶類計畫</p>
                <p>{plan.feedCount} 次 / 每次約 {plan.volumePerFeed} ml</p>
            </div>
            {Object.entries(plan.menu).map(([mealType, meals]) =>
                meals.length > 0 && (
                    <div key={mealType} className="bg-green-50 p-2 rounded-md">
                        <p className="font-semibold text-green-800 capitalize">{mealTypeToChinese[mealType as keyof HydratedDailyMenu]}</p>
                        <ul className="list-disc list-inside ml-2 text-gray-700">
                            {meals.map((meal: HydratedMeal, index: number) => (
                                <li key={index}>{meal.recipe.name} - {meal.grams}g</li>
                            ))}
                        </ul>
                    </div>
                )
            )}
        </div>
    </div>
);

export default function SharePage({ params }: { params: { planId: string } }) {
    const { planId } = params;
    const [sharedData, setSharedData] = useState<SharedPlanData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (planId) {
            getSharedPlanById(planId)
                .then(data => {
                    if (data) setSharedData(data);
                    else setError('找不到這個分享計畫，連結可能已失效。');
                })
                .catch(() => setError('讀取計畫時發生錯誤。'))
                .finally(() => setIsLoading(false));
        }
    }, [planId]);

    const hydratedPlans = useMemo(() => {
        if (!sharedData) return new Map<string, HydratedDailyPlan>();
        return hydratePlan(sharedData.plan);
    }, [sharedData]);

    const dateKeys = useMemo(() => Array.from(hydratedPlans.keys()).sort(), [hydratedPlans]);

    if (isLoading) return <div className="flex min-h-screen items-center justify-center">正在載入分享的計畫...</div>;
    if (error) return <div className="flex min-h-screen items-center justify-center text-red-500">{error}</div>;
    if (!sharedData) return <div className="flex min-h-screen items-center justify-center">找不到資料。</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                <header className="text-center border-b pb-6 mb-6">
                    <Link href="/" className="inline-block mb-4">
                        <BabixLogo className="w-auto h-12 text-blue-600 mx-auto" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">{sharedData.babyName}的餐食計畫</h1>
                    <p className="text-gray-500 mt-2">分享於 {format((sharedData.createdAt as Timestamp).toDate(), 'yyyy年M月d日 HH:mm')}</p>
                </header>
                <main className="space-y-6">
                    {dateKeys.map(dateKey => (
                        <DailyPlanView key={dateKey} date={new Date(dateKey)} plan={hydratedPlans.get(dateKey)!} />
                    ))}
                </main>
                <footer className="text-center mt-8 pt-6 border-t">
                    <p className="text-sm text-gray-400">由 Babix 智慧育兒助理產生</p>
                </footer>
            </div>
        </div>
    );
}