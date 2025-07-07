// src/data/mealPlanData.ts

// --- vvv 新增：定義更詳細的資料型別 vvv ---
export interface Ingredient {
  name: string;
  // 未來可擴充 quantity, unit 等
}

export interface Macronutrients {
  carbs: number; // 碳水化合物 (g)
  protein: number; // 蛋白質 (g)
  fat: number; // 脂肪 (g)
}

export interface Recipe {
  name: string;
  category: 'staple' | 'protein' | 'vegetable' | 'fruit';
  caloriesPerGram: number;
  allergens?: ('egg' | 'fish' | 'nuts' | 'dairy' | 'gluten' | 'soy')[]; // 新增 soy
  // 新增的詳細資料
  ingredients: Ingredient[];
  nutrientsPer100g: Macronutrients; // 每 100g 的三大營養素估算
}
// --- ^^^ 新增：定義更詳細的資料型別 ^^^ ---


export interface AgeStagePlan {
  stage: string;
  ageInMonthsStart: number;
  ageInMonthsEnd: number;
  caloriesPerKg: number;
  recipes: Recipe[];
}


export const mealPlanData: AgeStagePlan[] = [
  {
    stage: '4-6個月 (嘗試期)',
    ageInMonthsStart: 4,
    ageInMonthsEnd: 6.9,
    caloriesPerKg: 100,
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