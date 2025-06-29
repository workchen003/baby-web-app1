// src/app/solid-food-info/page.tsx
'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const stages = [
    { 
        name: "4-6個月", 
        content: "此階段是寶寶初次嘗試副食品的探索期。主要目標是讓寶寶習慣湯匙、嘗試不同食物的味道與質地，而非攝取大量熱量。母乳或配方奶仍是主要營養來源。",
        foods: ["米糊", "麥糊", "蘋果泥", "香蕉泥", "南瓜泥", "胡蘿蔔泥"],
        texture: "細滑、無顆粒的泥狀",
        pieData: [{ name: '奶類', value: 90 }, { name: '副食品', value: 10 }]
    },
    { 
        name: "7-9個月", 
        content: "寶寶的咀嚼與吞嚥能力增強，可以開始嘗試更濃稠、帶有微小顆粒的食物。此階段副食品提供的熱量與營養佔比逐漸提高。",
        foods: ["燕麥粥", "雞肉泥", "魚肉泥", "豆腐", "蛋黃泥", "綠花椰菜泥"],
        texture: "濃稠泥狀、可帶有細小軟爛顆粒",
        pieData: [{ name: '奶類', value: 70 }, { name: '副食品', value: 30 }]
    },
    { 
        name: "10-12個月", 
        content: "寶寶開始能用牙齦磨碎軟質食物，可以提供剁碎或小丁狀的食物，鼓勵寶寶練習抓握與自行進食。一日三餐的模式逐漸成形。",
        foods: ["軟飯", "剁碎的蔬菜", "小肉塊", "起司條", "水果丁"],
        texture: "剁碎、小丁、條狀等軟質固體",
        pieData: [{ name: '奶類', value: 50 }, { name: '副食品', value: 50 }]
    }
];
const COLORS = ['#3b82f6', '#f97316'];

export default function SolidFoodInfoPage() {
    const [activeStage, setActiveStage] = useState(stages[0]);

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-8">副食品資訊</h1>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* 左側選單 */}
                <aside className="lg:w-1/4">
                    <div className="bg-white p-4 rounded-lg shadow-sm sticky top-24">
                        <h3 className="font-semibold mb-3">分齡資訊頁籤</h3>
                        <ul className="space-y-2">
                            {stages.map(stage => (
                                <li key={stage.name}>
                                    <button 
                                        onClick={() => setActiveStage(stage)}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors ${activeStage.name === stage.name ? 'bg-blue-500 text-white font-bold' : 'hover:bg-gray-100'}`}
                                    >
                                        {stage.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
                {/* 右側內容 */}
                <main className="lg:w-3/4">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-2xl font-bold border-b pb-2 mb-4">{activeStage.name}</h2>
                        <div className="prose max-w-none">
                            <p>{activeStage.content}</p>
                            <h3>重點內容</h3>
                            <ul>
                                <li><strong>建議食材：</strong>{activeStage.foods.join('、')}</li>
                                <li><strong>食材稠度建議：</strong>{activeStage.texture}</li>
                            </ul>
                            <h3>熱量來源佔比圖</h3>
                            <p>此階段官方建議的「奶類」與「副食品」熱量來源比例：</p>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={activeStage.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                            {activeStage.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

