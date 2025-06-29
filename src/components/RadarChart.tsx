// src/components/RadarChart.tsx

'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import milestonesData from '@/data/milestones_processed.json';
import { AchievedMilestone } from '@/lib/milestones';

// 定義元件的 props
interface RadarChartProps {
  achievedMilestones: Map<string, AchievedMilestone>;
}

// 定義處理後的資料格式
interface RadarData {
  axis: string;
  value: number; // 已完成的項目數
  total: number; // 總項目數
}

// JSON 資料的型別定義
interface Milestone { skill: string; }
interface Category { name: string; milestones: Milestone[]; }
interface MilestoneData { categories: Category[]; }

export default function RadarChart({ achievedMilestones }: RadarChartProps) {
  const d3Container = useRef<SVGSVGElement | null>(null);

  // 使用 useMemo 處理資料，計算每個分類的達成數量
  const data = useMemo((): RadarData[] => {
    const typedMilestonesData: MilestoneData = milestonesData;
    
    // 我們只取參考圖中的四個主要維度
    const targetCategories = ["粗動作", "精細動作與適應力", "語言", "身體處理能力與社交"];
    
    // 簡化顯示名稱
    const axisMapping: { [key: string]: string } = {
        "粗動作": "粗大動作",
        "精細動作與適應力": "精細動作",
        "語言": "語言與溝通",
        "身體處理能力與社交": "社會與認知",
    };

    return typedMilestonesData.categories
      .filter(category => targetCategories.includes(category.name))
      .map(category => {
        const total = category.milestones.length;
        const value = category.milestones.filter(m => achievedMilestones.has(m.skill)).length;
        return {
          axis: axisMapping[category.name] || category.name,
          value,
          total
        };
      });
  }, [achievedMilestones]);
  
  // 使用 useEffect 執行 D3 繪圖
  useEffect(() => {
    if (!d3Container.current || data.length === 0) return;

    const svg = d3.select(d3Container.current);
    svg.selectAll("*").remove(); // 清空舊圖

    const width = 280;
    const height = 280;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const radius = Math.min(width, height) / 2 - 10;
    const g = svg.attr("width", width + margin.left + margin.right)
                 .attr("height", height + margin.top + margin.bottom)
                 .append("g")
                 .attr("transform", `translate(${width/2 + margin.left}, ${height/2 + margin.top})`);
    
    const maxValue = 8; // 雷達圖的最大值
    const allAxis = data.map(i => i.axis);
    const total = allAxis.length;
    const angleSlice = Math.PI * 2 / total;

    // --- 繪製雷達圖背景格線 ---
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, maxValue]);
    const axisGrid = g.append("g").attr("class", "axisWrapper");
    
    axisGrid.selectAll(".levels")
       .data(d3.range(1, (maxValue / 2) + 1).reverse())
       .enter()
       .append("polygon")
       .attr("points", (d) => {
         const levelFactor = radius * (d * 2 / maxValue);
         return allAxis.map((_, i) => `${levelFactor * Math.cos(angleSlice * i - Math.PI/2)}, ${levelFactor * Math.sin(angleSlice*i - Math.PI/2)}`).join(" ");
       })
       .style("fill", "#CDCDCD")
       .style("stroke", "#CDCDCD")
       .style("fill-opacity", 0.1);

    // --- 繪製從中心點出發的軸線 ---
    const axis = axisGrid.selectAll(".axis")
      .data(allAxis)
      .enter()
      .append("g")
      .attr("class", "axis");

    axis.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (_, i) => rScale(maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (_, i) => rScale(maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("class", "line")
      .style("stroke", "white")
      .style("stroke-width", "2px");

    // --- 繪製軸線標籤 ---
    axis.append("text")
      .attr("class", "legend")
      .style("font-size", "12px")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("x", (_, i) => rScale(maxValue * 1.25) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (_, i) => rScale(maxValue * 1.25) * Math.sin(angleSlice * i - Math.PI / 2))
      .text(d => d);

    // --- 繪製資料區域 ---
    const radarLine = d3.lineRadial<{axis: string, value: number}>()
      .radius(d => rScale(d.value))
      .angle((_, i) => i * angleSlice);

    g.append("path")
      .datum(data)
      .attr("d", radarLine)
      .style("fill", "#3b82f6") // 藍色
      .style("fill-opacity", 0.5)
      .style("stroke", "#1d4ed8") // 深藍色
      .style("stroke-width", 2);

  }, [data]); // 當資料變更時重新繪製

  return <svg ref={d3Container} />;
}