// src/app/meal-plan/page.tsx
'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const dailyPlanData = {
    // 這是範例資料，未來會從資料庫讀取
    '2025-06-30': { meals: 5, perMealMl: 230, totalMl: 1150, solidFoodG: 80, kcal: 789, targetKcal: 804 },
    '2025-07-01': { meals: 5, perMealMl: 230, totalMl: 1150, solidFoodG: 80, kcal: 789, targetKcal: 804 },
    '2025-07-02': { meals: 5, perMealMl: 230, totalMl: 1150, solidFoodG: 80, kcal: 789, targetKcal: 804 },
};

export default function MealPlanPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
    
    const footer = selectedDay ? <p>您選擇了 {format(selectedDay, 'PPP', { locale: zhTW })}.</p> : <p>請選擇一個日期.</p>;

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-8">餐食規劃</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 左側日曆 */}
                <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm">
                    <DayPicker
                        mode="single"
                        selected={selectedDay}
                        onSelect={setSelectedDay}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        locale={zhTW}
                        showOutsideDays
                        fixedWeeks
                    />
                     <div className="mt-4 text-center text-sm text-gray-500">{footer}</div>
                </div>
                {/* 右側規劃列表 */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">每日建議總熱量</p>
                            <p className="text-2xl font-bold">804 kcal</p>
                        </div>
                         <button className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm">一鍵配平</button>
                    </div>

                    {Object.entries(dailyPlanData).map(([date, plan]) => (
                        <div key={date} className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">{format(new Date(date), 'M月d日 EEEE', { locale: zhTW })}</p>
                                <p className="font-bold text-lg">{plan.kcal} / {plan.targetKcal} kcal</p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(plan.kcal/plan.targetKcal)*100}%` }}></div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <p>餐數: {plan.meals}餐</p>
                                <p>每餐: {plan.perMealMl}ml</p>
                                <p>總奶量: {plan.totalMl}ml</p>
                                <p>副食品: {plan.solidFoodG}g</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
