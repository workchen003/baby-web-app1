// src/components/MilestoneChart.tsx

'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { AchievedMilestone } from '@/lib/milestones';

// D3 繪圖所使用的資料點格式
interface ChartDataPoint {
  skill: string;
  start_months: number;
  end_months: number;
  achieved_months?: number;
}

// 元件的 props 型別
interface MilestoneChartProps {
  displayData: Map<string, any[]>; // 接收篩選過的資料
  achievedMilestones: Map<string, AchievedMilestone>;
  birthDate: Date;
  viewWindow: { start: number; end: number }; // 接收顯示範圍
}


// 輔助函式
const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};
const daysToMonths = (days: number) => days / 30.4375;

export default function MilestoneChart({ displayData, achievedMilestones, birthDate, viewWindow }: MilestoneChartProps) {
  const d3Container = useRef<SVGSVGElement | null>(null);

  // *** BUG FIX ***：修正計算寶寶目前年齡的公式
  const babyCurrentAgeInMonths = useMemo(() => {
      if (!birthDate) return 0;
      const ageInMillis = new Date().getTime() - new Date(birthDate).getTime();
      const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);
      return daysToMonths(ageInDays);
  }, [birthDate]);

  // 將傳入的資料轉換為 D3 需要的格式
  const chartDataByCategory = useMemo(() => {
    const categories = new Map<string, ChartDataPoint[]>();
    displayData.forEach((milestones, categoryName) => {
        const categoryData: ChartDataPoint[] = milestones.map(milestone => {
            const achievedRecord = achievedMilestones.get(milestone.skill);
            let achieved_months: number | undefined;

            if (achievedRecord) {
                const birthDateTime = new Date(birthDate).getTime();
                const achievedAgeInMillis = achievedRecord.achievedDate.getTime() - birthDateTime;
                achieved_months = daysToMonths(achievedAgeInMillis / (1000 * 60 * 60 * 24));
            }
            
            const end_days = milestone.end_days === -1 ? milestone.start_days + 730 : milestone.end_days;

            return {
                skill: milestone.skill,
                start_months: daysToMonths(milestone.start_days),
                end_months: daysToMonths(end_days),
                achieved_months: achieved_months,
            };
        });
        categories.set(categoryName, categoryData);
    });
    return categories;
  }, [displayData, achievedMilestones, birthDate]);

  // D3 繪圖邏輯
  useEffect(() => {
    if (!d3Container.current || chartDataByCategory.size === 0) {
        const svg = d3.select(d3Container.current);
        svg.selectAll("*").remove();
        svg.append("text")
           .attr("x", "50%")
           .attr("y", 50)
           .attr("text-anchor", "middle")
           .text("此區間沒有對應的發展項目。");
        return;
    };

    const svg = d3.select(d3Container.current);
    svg.selectAll("*").remove();
    
    const containerWidth = d3Container.current.parentElement?.clientWidth || 600;
    let currentY = 0;

    chartDataByCategory.forEach((data, category) => {
        const margin = { top: 60, right: 30, bottom: 40, left: 160 };
        const chartHeight = data.length * 35;
        const width = containerWidth - margin.left - margin.right;
        const height = chartHeight;

        // X 軸使用傳入的 viewWindow
        const x = d3.scaleLinear()
            .domain([viewWindow.start, viewWindow.end])
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(data.map(d => d.skill))
            .range([0, height])
            .padding(0.3);
        
        const chartGroup = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${currentY})`);

        chartGroup.append("text")
            .attr("x", -margin.left + 10)
            .attr("y", margin.top - 30)
            .attr("text-anchor", "start")
            .style("font-size", "18px")
            .style("font-weight", "600")
            .text(category);

        chartGroup.append("g")
            .attr("transform", `translate(0, ${height + margin.top})`)
            .call(d3.axisBottom(x).ticks(containerWidth / 80).tickFormat(d => `${d}M`)) // 單位改為 M
            .append("text")
            .attr("y", 35)
            .attr("x", width / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text("年齡 (月)");
        
        chartGroup.append("g")
            .attr("transform", `translate(0, ${margin.top})`)
            .call(d3.axisLeft(y).tickFormat((d) => truncateText(d, 15)))
            .selectAll(".tick text")
            .append("title")
            .text(d => d as string);

        const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("position", "absolute").style("visibility", "hidden")
            .style("background", "rgba(255, 255, 255, 0.95)").style("border", "1px solid #ccc")
            .style("border-radius", "5px").style("padding", "10px")
            .style("font-size", "12px").style("pointer-events", "none");

        // 藍色長條
        chartGroup.append("g")
            .attr("transform", `translate(0, ${margin.top})`)
            .selectAll("rect.dev-window")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "dev-window")
            .attr("x", d => x(d.start_months))
            .attr("y", d => y(d.skill) as number)
            .attr("width", d => Math.max(0, x(d.end_months) - x(d.start_months)))
            .attr("height", y.bandwidth())
            .attr("fill", "#a8c5ff")
            .on("mouseover", (event, d) => {
                tooltip.html(`<strong>${d.skill}</strong><br/>建議區間: ${d.start_months.toFixed(1)} - ${d.end_months.toFixed(1)} 個月<br/>${d.achieved_months ? `寶寶達成: ${d.achieved_months.toFixed(1)} 個月` : '尚未記錄'}`);
                return tooltip.style("visibility", "visible");
            })
            .on("mousemove", (event) => tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px"))
            .on("mouseout", () => tooltip.style("visibility", "hidden"));

        // 綠色標記
        chartGroup.append("g")
            .attr("transform", `translate(0, ${margin.top})`)
            .selectAll("rect.achieved-marker")
            .data(data.filter(d => d.achieved_months !== undefined))
            .enter()
            .append("rect")
            .attr("class", "achieved-marker")
            .attr("x", d => x(d.achieved_months!))
            .attr("y", d => y(d.skill) as number)
            .attr("width", 4)
            .attr("height", y.bandwidth())
            .attr("fill", "#34d399");
        
        // 紅色虛線 (僅在可視範圍內時顯示)
        if (babyCurrentAgeInMonths >= viewWindow.start && babyCurrentAgeInMonths <= viewWindow.end) {
            const currentAgeLine = chartGroup.append("g")
                .attr("transform", `translate(0, ${margin.top})`);

            currentAgeLine.append("line")
                .attr("x1", x(babyCurrentAgeInMonths))
                .attr("x2", x(babyCurrentAgeInMonths))
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "#ef4444")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4");

            currentAgeLine.append("text")
                .attr("x", x(babyCurrentAgeInMonths))
                .attr("y", -5)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("fill", "#ef4444")
                .text(`目前 ${babyCurrentAgeInMonths.toFixed(0)}M`);
        }
            
        currentY += height + margin.top + margin.bottom;
    });

    svg.attr("height", currentY);
  }, [chartDataByCategory, babyCurrentAgeInMonths, viewWindow]);

  return <svg ref={d3Container} style={{ width: '100%', minHeight: '200px' }} />;
}