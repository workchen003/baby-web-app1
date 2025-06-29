// src/components/GrowthChart.tsx

'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { lmsData } from '@/data/lmsData';
import { BabyProfile } from '@/lib/babies';
import { DocumentData } from 'firebase/firestore';

// 定義圖表指標的型別
type Metric = 'weight' | 'height' | 'headCircumference' | 'bmi';

// 圖表元件的 props 型別
interface GrowthChartProps {
  metric: Metric;
  babyProfile: BabyProfile;
  records: DocumentData[];
}

// D3 繪圖所需的資料點格式
interface ChartPoint {
    age: number; // 月齡
    P3?: number;
    P15?: number;
    P50?: number;
    P85?: number;
    P97?: number;
    babyValue?: number;
}

// 指標的詳細資訊，方便取用
const metricDetails = {
  weight: { unit: 'kg', name: '體重', lmsKey: 'weightForAge' },
  height: { unit: 'cm', name: '身高/身長', lmsKey: ['lengthForAge', 'heightForAge'] },
  headCircumference: { unit: 'cm', name: '頭圍', lmsKey: 'headCircumferenceForAge' },
  bmi: { unit: '', name: 'BMI', lmsKey: 'bmiForAge' },
};

export default function GrowthChart({ metric, babyProfile, records }: GrowthChartProps) {
    const d3Container = useRef<SVGSVGElement | null>(null);

    // 使用 useMemo 處理與合併資料
    const chartData = useMemo((): ChartPoint[] => {
        if (!babyProfile) return [];

        const { gender, birthDate } = babyProfile;
        const details = metricDetails[metric];
        const dataGenderKey = gender === 'boy' ? 'boys' : 'girls';
        
        // 處理LMS百分位參考數據
        const dataMap = new Map<number, ChartPoint>();
        const lmsKeys = Array.isArray(details.lmsKey) ? details.lmsKey : [details.lmsKey];
        
        lmsKeys.forEach(key => {
            const dataSet = lmsData[dataGenderKey]?.[key] || {};
            Object.keys(dataSet).forEach(ageStr => {
                const age = parseFloat(ageStr);
                const point = dataSet[ageStr];
                dataMap.set(age, {
                    ...dataMap.get(age),
                    age: age,
                    P3: point.P3, P15: point.P15, P50: point.P50,
                    P85: point.P85, P97: point.P97,
                });
            });
        });

        // 處理寶寶的實際紀錄
        const babyRecords = records
            .filter(r => (metric === 'bmi' ? r.type === 'bmi' : r.measurementType === metric) && r.value > 0)
            .map(r => {
                const measurementDate = r.timestamp.toDate();
                const ageInMonths = (measurementDate.getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
                return { age: ageInMonths, babyValue: r.value };
            });

        // 將寶寶紀錄合併到 dataMap
        babyRecords.forEach(rec => {
            const existing = dataMap.get(rec.age) || { age: rec.age };
            dataMap.set(rec.age, { ...existing, babyValue: rec.babyValue });
        });
        
        return Array.from(dataMap.values()).sort((a, b) => a.age - b.age);

    }, [metric, babyProfile, records]);

    // 使用 useEffect 執行 D3 DOM 操作
    useEffect(() => {
        if (!d3Container.current || chartData.length === 0) return;

        const svg = d3.select(d3Container.current);
        svg.selectAll("*").remove();

        const containerWidth = d3Container.current.parentElement?.clientWidth || 600;
        const containerHeight = 500;

        const margin = { top: 20, right: 40, bottom: 50, left: 50 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const chartGroup = svg
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // --- 座標軸範圍 ---
        const xMax = d3.max(chartData, d => d.age) as number;
        const yMax = d3.max(chartData, d => d.P97 || d.babyValue || 0) as number;
        const yMin = d3.min(chartData, d => d.P3 || d.babyValue || 0) as number;

        const x = d3.scaleLinear().domain([0, xMax * 1.05]).range([0, width]);
        const y = d3.scaleLinear().domain([yMin * 0.9, yMax * 1.1]).range([height, 0]);

        // --- 繪製座標軸 ---
        chartGroup.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .append("text")
            .attr("y", 40)
            .attr("x", width / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text("年齡 (月)");

        const yAxisLabel = `${metricDetails[metric].name} ${metricDetails[metric].unit ? `(${metricDetails[metric].unit})` : ''}`;
        chartGroup.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .attr("dy", "0.71em")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text(yAxisLabel);
        
        // --- 繪製格線 ---
        chartGroup.append("g")
          .attr("class", "grid")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x).tickSize(-height).tickFormat(() => ""));

        chartGroup.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""));

        // --- 繪製線條的生成器 ---
        const createLine = (yValue: keyof ChartPoint) => d3.line<ChartPoint>()
            .x(d => x(d.age))
            .y(d => y(d[yValue] as number))
            .defined(d => d[yValue] != null);

        const percentileKeys: (keyof ChartPoint)[] = ['P3', 'P15', 'P50', 'P85', 'P97'];
        const percentileColors = ['#d946ef', '#f97316', '#10b981', '#f59e0b', '#ef4444'];
        const percentileNames = ['3rd', '15th', '50th', '85th', '97th'];

        // --- 繪製百分位線 ---
        percentileKeys.forEach((key, i) => {
            chartGroup.append("path")
                .datum(chartData)
                .attr("fill", "none")
                .attr("stroke", percentileColors[i])
                .attr("stroke-width", key === 'P50' ? 2.5 : 1.5)
                .attr("d", createLine(key));
        });

        // --- 繪製寶寶數據線和點 ---
        const babyData = chartData.filter(d => d.babyValue != null);
        chartGroup.append("path")
            .datum(babyData)
            .attr("fill", "none")
            .attr("stroke", "#3b82f6") // 藍色
            .attr("stroke-width", 2.5)
            .attr("d", createLine('babyValue'));

        chartGroup.selectAll("dot")
            .data(babyData)
            .enter().append("circle")
            .attr("r", 4)
            .attr("cx", d => x(d.age))
            .attr("cy", d => y(d.babyValue!))
            .attr("fill", "#3b82f6");

    }, [chartData, metric]); // 當資料或指標變更時重新繪圖

    if (chartData.length === 0) {
        return <div className="text-center p-8 text-gray-500">沒有足夠的數據來繪製圖表。</div>
    }

    return (
        <svg ref={d3Container} />
    );
}