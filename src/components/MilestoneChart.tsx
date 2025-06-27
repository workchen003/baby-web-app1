'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import milestonesData from '@/data/milestones_processed.json';
import { AchievedMilestone } from '@/lib/milestones';
// --- 修正 #1：移除未使用的 BabyProfile import ---
// import { BabyProfile } from '@/lib/babies';

// 為 JSON 檔案的內容定義清晰的型別
interface Milestone {
  skill: string;
  start_days: number;
  end_days: number;
}
interface Category {
  name: string;
  milestones: Milestone[];
}
interface MilestoneData {
  title: string;
  description: string;
  categories: Category[];
}

interface MilestoneChartProps {
  achievedMilestones: Map<string, AchievedMilestone>;
  birthDate: Date;
}

interface ChartDataPoint {
  skill: string;
  startPadding: number;
  developmentWindow: number;
  achieved?: number;
}

// --- 修正 #2：為 Tooltip 的 props 定義精確的型別 ---
interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ChartDataPoint }[];
  label?: string;
}

// 自訂 Tooltip 的內容
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const start = data.startPadding;
    const end = start + data.developmentWindow;

    return (
      <div className="p-2 bg-white border border-gray-300 rounded shadow-lg">
        <p className="font-bold">{label}</p>
        <p className="text-sm text-indigo-600">{`建議區間: ${Math.round(start)} - ${Math.round(end)} 天`}</p>
        {data.achieved && (
          <p className="text-sm text-amber-500">{`寶寶達成日: 第 ${Math.round(data.achieved)} 天`}</p>
        )}
      </div>
    );
  }
  return null;
};


export default function MilestoneChart({ achievedMilestones, birthDate }: MilestoneChartProps) {
  const chartDataByCategory = useMemo(() => {
    const categories = new Map<string, ChartDataPoint[]>();
    const typedMilestonesData: MilestoneData = milestonesData;

    typedMilestonesData.categories.forEach(category => {
      const categoryData: ChartDataPoint[] = [];
      category.milestones.forEach(milestone => {
        const achievedRecord = achievedMilestones.get(milestone.skill);
        let achievedDays: number | undefined;

        if (achievedRecord) {
          const birthDateTime = new Date(birthDate).getTime();
          const achievedAgeInMillis = achievedRecord.achievedDate.getTime() - birthDateTime;
          achievedDays = achievedAgeInMillis / (1000 * 60 * 60 * 24);
        }

        const startDays = milestone.start_days;
        const endDays = milestone.end_days === -1 ? (startDays + 730) : milestone.end_days;

        categoryData.push({
          skill: milestone.skill,
          startPadding: startDays,
          developmentWindow: Math.max(0, endDays - startDays),
          achieved: achievedDays,
        });
      });
      categories.set(category.name, categoryData);
    });
    return categories;
  }, [achievedMilestones, birthDate]);


  return (
    <div className="space-y-12">
      {Array.from(chartDataByCategory.entries()).map(([category, data]) => (
        <div key={category}>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">{category}</h3>
          <ResponsiveContainer width="100%" height={data.length * 40}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: '年齡 (天)', position: 'insideBottom', offset: 0 }} />
              <YAxis dataKey="skill" type="category" width={150} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar dataKey="startPadding" stackId="a" fill="transparent" name="等待期" />
              <Bar dataKey="developmentWindow" stackId="a" fill="#8884d8" name="建議發展區間" />
              {data.filter(d => d.achieved !== undefined).map(d => (
                <ReferenceLine key={d.skill} x={d.achieved} stroke="#ffc658" strokeWidth={2} ifOverflow="extendDomain">
                   <Legend payload={[{ value: '寶寶達成日', type: 'line', color: '#ffc658' }]} />
                </ReferenceLine>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}