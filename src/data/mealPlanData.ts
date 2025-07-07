// src/data/mealPlanData.ts

export interface Recipe {
  name: string;
  category: 'staple' | 'protein' | 'vegetable' | 'fruit'; // 主食, 蛋白質, 蔬菜, 水果
  caloriesPerGram: number; // 每公克的卡路里估算值
}

export interface AgeStagePlan {
  stage: string;
  ageInMonthsStart: number;
  ageInMonthsEnd: number;
  caloriesPerKg: number; // 該階段每公斤體重建議熱量
  recipes: Recipe[];
}

// 這是我們的適齡食譜與營養資料庫
// 未來可以擴充更多樣的食譜，或從後台讀取
export const mealPlanData: AgeStagePlan[] = [
  {
    stage: '4-6個月 (嘗試期)',
    ageInMonthsStart: 4,
    ageInMonthsEnd: 6.9,
    caloriesPerKg: 100,
    recipes: [
      { name: '十倍粥', category: 'staple', caloriesPerGram: 0.36 },
      { name: '蘋果泥', category: 'fruit', caloriesPerGram: 0.52 },
      { name: '香蕉泥', category: 'fruit', caloriesPerGram: 0.89 },
      { name: '南瓜泥', category: 'vegetable', caloriesPerGram: 0.26 },
      { name: '胡蘿蔔泥', category: 'vegetable', caloriesPerGram: 0.41 },
    ],
  },
  {
    stage: '7-9個月 (進階期)',
    ageInMonthsStart: 7,
    ageInMonthsEnd: 9.9,
    caloriesPerKg: 95,
    recipes: [
      { name: '七倍粥', category: 'staple', caloriesPerGram: 0.51 },
      { name: '雞肉泥', category: 'protein', caloriesPerGram: 1.65 },
      { name: '蛋黃泥', category: 'protein', caloriesPerGram: 3.22 },
      { name: '豆腐泥', category: 'protein', caloriesPerGram: 0.76 },
      { name: '綠花椰菜泥', category: 'vegetable', caloriesPerGram: 0.34 },
      { name: '梨子泥', category: 'fruit', caloriesPerGram: 0.57 },
    ],
  },
  {
    stage: '10-12個月 (轉固體食物期)',
    ageInMonthsStart: 10,
    ageInMonthsEnd: 12.9,
    caloriesPerKg: 90,
    recipes: [
      { name: '軟飯', category: 'staple', caloriesPerGram: 1.3 },
      { name: '寶寶炊飯', category: 'staple', caloriesPerGram: 1.1 },
      { name: '鮭魚', category: 'protein', caloriesPerGram: 2.08 },
      { name: '豬絞肉', category: 'protein', caloriesPerGram: 2.97 },
      { name: '玉米筍丁', category: 'vegetable', caloriesPerGram: 0.33 },
      { name: '切丁番茄', category: 'vegetable', caloriesPerGram: 0.18 },
    ],
  },
  {
    stage: '12個月以上 (幼兒期)',
    ageInMonthsStart: 13,
    ageInMonthsEnd: 36, // 假設到3歲
    caloriesPerKg: 85,
    recipes: [
        { name: '乾飯', category: 'staple', caloriesPerGram: 1.3 },
        { name: '寶寶麵', category: 'staple', caloriesPerGram: 1.38 },
        { name: '雞腿肉塊', category: 'protein', caloriesPerGram: 1.70 },
        { name: '起司片', category: 'protein', caloriesPerGram: 4.02 },
        { name: '炒青菜', category: 'vegetable', caloriesPerGram: 0.40 }, // 估算值
        { name: '各種水果', category: 'fruit', caloriesPerGram: 0.60 }, // 估算值
    ],
  },
];