'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSharedPlanById, SharedPlanData } from '@/lib/records';
import { mealPlanData, Recipe } from '@/data/mealPlanData';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import Link from 'next/link';
import BabixLogo from '@/components/icons/BabixLogo';

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
            hydratedMenu[mealType] = dailyPlan.menu[mealType].map((meal: { recipeName: string; grams: number }): HydratedMeal => ({
                grams: meal.grams,
                recipe: mealPlanData.flatMap(s => s.recipes).find(r => r.name === meal.recipeName)!,
            })).filter((meal): meal is HydratedMeal => meal.recipe != null);
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
                    <p className="text-gray-500 mt-2">分享於 {format(sharedData.createdAt.toDate(), 'yyyy年M月d日 HH:mm')}</p>
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
