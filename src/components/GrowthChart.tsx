'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { lmsData } from '@/data/lmsData';
import { BabyProfile } from '@/lib/babies';
import { DocumentData } from 'firebase/firestore';

type Metric = 'weight' | 'height' | 'headCircumference' | 'bmi';

interface GrowthChartProps {
  metric: Metric;
  babyProfile: BabyProfile;
  records: DocumentData[];
}

// --- 新增：為圖表數據點定義一個清晰的 interface ---
interface ChartPoint {
    age: number;
    '3rd'?: number;
    '15th'?: number;
    '50th'?: number;
    '85th'?: number;
    '97th'?: number;
    '您的寶寶'?: number;
}

const metricDetails = {
  weight: { unit: 'kg', name: '體重', lmsKey: 'weightForAge' },
  height: { unit: 'cm', name: '身高/身長', lmsKey: ['lengthForAge', 'heightForAge'] },
  headCircumference: { unit: 'cm', name: '頭圍', lmsKey: 'headCircumferenceForAge' },
  bmi: { unit: '', name: 'BMI', lmsKey: 'bmiForAge' },
};

export default function GrowthChart({ metric, babyProfile, records }: GrowthChartProps) {
  const chartData = useMemo((): ChartPoint[] => {
    if (!babyProfile) return [];

    const { gender, birthDate } = babyProfile;
    const details = metricDetails[metric];
    const dataGenderKey = gender === 'boy' ? 'boys' : 'girls';

    const dataMap = new Map<string, ChartPoint>();
    const lmsKeys = Array.isArray(details.lmsKey) ? details.lmsKey : [details.lmsKey];
    
    lmsKeys.forEach(key => {
      const dataSet = lmsData[dataGenderKey]?.[key] || {};
      Object.keys(dataSet).forEach(ageStr => {
        const age = parseFloat(ageStr);
        const point = dataSet[ageStr];
        const ageKey = age.toFixed(4);
        
        dataMap.set(ageKey, {
          ...dataMap.get(ageKey),
          age: age,
          '3rd': point.P3, '15th': point.P15, '50th': point.P50,
          '85th': point.P85, '97th': point.P97,
        });
      });
    });

    const babyDataPoints = records
      .filter(r => {
        if (metric === 'bmi') {
            return r.type === 'bmi' && r.value > 0;
        }
        return r.measurementType === metric && r.value > 0;
      })
      .map(r => {
        const measurementDate = r.timestamp.toDate();
        const ageInMonths = (measurementDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
        return {
          age: ageInMonths,
          '您的寶寶': r.value,
        };
      });

    babyDataPoints.forEach(babyPoint => {
      const ageKey = babyPoint.age.toFixed(4);
      const existingPoint = dataMap.get(ageKey) || { age: babyPoint.age };
      dataMap.set(ageKey, {
        ...existingPoint,
        '您的寶寶': babyPoint['您的寶寶'],
      });
    });
    
    return Array.from(dataMap.values()).sort((a, b) => a.age - b.age);

  }, [metric, babyProfile, records]);

  const details = metricDetails[metric];

  if (chartData.length === 0) {
      return <div className="text-center p-8 text-gray-500">沒有足夠的數據來繪製圖表。</div>
  }

  return (
    <ResponsiveContainer width="100%" height={500}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
            dataKey="age" 
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(tick) => `${Math.round(tick)}m`}
            label={{ value: '年齡 (月)', position: 'insideBottom', offset: -10 }}
            allowDuplicatedCategory={false}
        />
        <YAxis 
            domain={['dataMin - 2', 'dataMax + 2']}
            label={{ value: `${details.name} ${details.unit ? `(${details.unit})` : ''}`, angle: -90, position: 'insideLeft' }}
            allowDataOverflow={true}
        />
        <Tooltip
            formatter={(value, name) => [`${(value as number).toFixed(1)}`, name]}
            labelFormatter={(label) => `年齡: ${label.toFixed(1)} 個月`}
        />
        <Legend />
        <Line connectNulls type="monotone" dataKey="3rd" stroke="#d946ef" strokeWidth={2} dot={false} name="3 百分位" />
        <Line connectNulls type="monotone" dataKey="15th" stroke="#f97316" strokeWidth={2} dot={false} name="15 百分位" />
        <Line connectNulls type="monotone" dataKey="50th" stroke="#10b981" strokeWidth={3} dot={false} name="50 百分位" />
        <Line connectNulls type="monotone" dataKey="85th" stroke="#f59e0b" strokeWidth={2} dot={false} name="85 百分位" />
        <Line connectNulls type="monotone" dataKey="97th" stroke="#ef4444" strokeWidth={2} dot={false} name="97 百分位" />
        <Line 
          connectNulls 
          type="monotone" 
          dataKey="您的寶寶" 
          stroke="#3b82f6" 
          strokeWidth={3} 
          name="您的寶寶" 
          dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}