// src/lib/growthCalculator.ts (FIXED)

import { lmsData } from '@/data/lmsData';
import { BabyProfile } from './babies';
// --- 修正：從 'firebase/firestore' 引入 Timestamp 型別 ---
import { DocumentData, Timestamp } from 'firebase/firestore';

// 定義測量類型
export type MeasurementMetric = 'weightForAge' | 'lengthForAge' | 'heightForAge' | 'headCircumferenceForAge' | 'bmiForAge';

interface LmsParams {
  L: number;
  M: number;
  S: number;
}

/**
 * 計算兩個日期之間的年齡（以月為單位）
 * @param birthDate 出生日期
 * @param measurementDate 測量日期
 * @returns 年齡（月）
 */
function calculateAgeInMonths(birthDate: Date, measurementDate: Date): number {
  const ageInMillis = measurementDate.getTime() - birthDate.getTime();
  return ageInMillis / (1000 * 60 * 60 * 24 * 30.4375); // 平均每月天數
}

/**
 * 計算矯正年齡（以月為單位），適用於2歲前的早產兒
 * @param birthDate 出生日期
 * @param gestationalAgeWeeks 出生時週數
 * @param measurementDate 測量日期
 * @returns 矯正後的年齡（月）
 */
function calculateCorrectedAgeInMonths(birthDate: Date, gestationalAgeWeeks: number, measurementDate: Date): number {
  const chronologicalAge = calculateAgeInMonths(birthDate, measurementDate);
  // 矯正年齡只計算到2歲
  if (gestationalAgeWeeks >= 37 || chronologicalAge > 24) {
    return chronologicalAge;
  }

  const prematurityInWeeks = 40 - gestationalAgeWeeks;
  const prematurityInMonths = prematurityInWeeks / 4.345; // 平均每月天數

  return Math.max(0, chronologicalAge - prematurityInMonths);
}

/**
 * 使用線性內插法，根據精確年齡估算LMS參數
 * @param metricData 特定指標的LMS數據
 * @param ageInMonths 寶寶年齡
 * @returns 插值後的LMS參數
 */
function getInterpolatedLMS(metricData: { [age: string]: LmsParams }, ageInMonths: number): LmsParams | null {
  const sortedAges = Object.keys(metricData).map(parseFloat).sort((a, b) => a - b);
  
  if (ageInMonths < sortedAges[0] || ageInMonths > sortedAges[sortedAges.length - 1]) {
    return null; // 年齡超出範圍
  }

  // 尋找相鄰的兩個年齡點
  let lowerAge = sortedAges[0];
  let upperAge = sortedAges[sortedAges.length - 1];

  for(let i = 0; i < sortedAges.length; i++) {
    if (sortedAges[i] <= ageInMonths) {
      lowerAge = sortedAges[i];
    }
    if (sortedAges[i] >= ageInMonths) {
      upperAge = sortedAges[i];
      break;
    }
  }

  if (lowerAge === upperAge) {
    // toFixed(4) is important to match the key format
    return metricData[lowerAge.toFixed(4)];
  }

  const lowerParams = metricData[lowerAge.toFixed(4)];
  const upperParams = metricData[upperAge.toFixed(4)];
  
  if (!lowerParams || !upperParams) return null;

  // 線性內插
  const ratio = (ageInMonths - lowerAge) / (upperAge - lowerAge);
  const L = lowerParams.L + ratio * (upperParams.L - lowerParams.L);
  const M = lowerParams.M + ratio * (upperParams.M - lowerParams.M);
  const S = lowerParams.S + ratio * (upperParams.S - lowerParams.S);

  return { L, M, S };
}


/**
 * 根據LMS參數計算Z-score
 * @param value 測量值
 * @param params LMS參數
 * @returns Z-score
 */
function calculateZScore(value: number, { L, M, S }: LmsParams): number {
  // 當 L 接近 0 時，使用特殊公式
  if (Math.abs(L) < 1e-5) {
    return Math.log(value / M) / S;
  }
  return (Math.pow(value / M, L) - 1) / (L * S);
}

/**
 * 將Z-score轉換為百分位
 * 使用標準正態分佈的累積分布函數(CDF)的近似算法
 * @param z Z-score
 * @returns 百分位 (0-100)
 */
function zScoreToPercentile(z: number): number {
  // Abramowitz and Stegun approximation 7.1.26
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const sign = z < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(z));
  const poly = a1*t + a2*Math.pow(t,2) + a3*Math.pow(t,3) + a4*Math.pow(t,4) + a5*Math.pow(t,5);
  const erf = sign * (1 - poly * Math.exp(-Math.pow(z, 2)));
  
  const percentile = (0.5 * (1 + erf / Math.sqrt(2))) * 100;
  return percentile;
}


/**
 * 主函式：計算指定測量紀錄的生長百分位
 * @param babyProfile 寶寶的個人資料
 * @param measurementRecord 一筆測量紀錄
 * @returns 包含百分位和Z-score的物件，或在無法計算時返回null
 */
export function calculateGrowthPercentile(
  babyProfile: BabyProfile,
  measurementRecord: DocumentData
): { percentile: number; zScore: number } | null {

  const { gender, birthDate, gestationalAgeWeeks } = babyProfile;
  const { measurementType, value, timestamp } = measurementRecord;
  const measurementDate = (timestamp as Timestamp).toDate();

  if (!gender || !birthDate || !measurementType || !value) {
    return null;
  }

  // 1. 決定使用哪個年齡（實際或矯正）
  const ageInMonths = calculateCorrectedAgeInMonths(birthDate, gestationalAgeWeeks, measurementDate);

  // 2. 根據測量類型和年齡選擇指標
  let metric: MeasurementMetric | null = null;
  if (measurementType === 'height' || measurementType === 'length') {
    metric = ageInMonths < 24 ? 'lengthForAge' : 'heightForAge';
  } else if (measurementType === 'weight') {
    metric = 'weightForAge';
  } else if (measurementType === 'headCircumference') {
    metric = 'headCircumferenceForAge';
  }

  if (!metric) return null;

  // 3. 從數據庫中獲取LMS參數
  const metricData = lmsData[gender]?.[metric];
  if (!metricData) return null;
  
  const lmsParams = getInterpolatedLMS(metricData, ageInMonths);
  if (!lmsParams) return null;

  // 4. 計算Z-score
  const zScore = calculateZScore(value, lmsParams);
  
  // 5. 將Z-score轉換為百分位
  const percentile = zScoreToPercentile(zScore);

  return {
    percentile,
    zScore,
  };
}