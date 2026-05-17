'use client';

import { ReactNode } from 'react';
import { PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = [
  '#96EDD6',
  '#82ca9d',
  '#66d1c1',
  '#4db6ac',
  '#26a69a',
  '#1f9e89',
  '#18a999',
];

interface DonutChartDataItem {
  name: string;
  value: number;
}

interface DonutChartProps {
  width?: number;
  height?: number;
  data?: DonutChartDataItem[];
  innerRadius?: number;
  outerRadius?: number;
  children?: ReactNode;
  highlightIndex?: number | null;
  dimOpacity?: number;
  cornerRadius?: number;
  noAnimation?: boolean;
  colors?: string[];
  onSliceHover?: (index: number | null) => void;
}

export default function DonutChart({
  width = 480,
  height = 480,
  data = [],
  innerRadius = 190,
  outerRadius = 228,
  children,
  highlightIndex = null,
  dimOpacity = 0.25,
  cornerRadius = 4,
  noAnimation = false,
  colors,
  onSliceHover,
}: DonutChartProps) {
  return (
    <div style={{ position: 'relative', width, height }}>
      <PieChart width={width} height={height}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          label={false}
          labelLine={false}
          legendType="none"
          paddingAngle={3}
          cornerRadius={cornerRadius}
          isAnimationActive={!noAnimation}
          onMouseEnter={(_: unknown, index: number) => onSliceHover?.(index)}
          onMouseLeave={() => onSliceHover?.(null)}
        >
          {data.map((_, index) => {
            const resolvedColors = colors ?? CHART_COLORS;
            const color = resolvedColors[index % resolvedColors.length];
            return (
            <Cell
              key={`slice-${index}`}
              fill={color}
              stroke={color}
              fillOpacity={
                highlightIndex === null || highlightIndex === undefined
                  ? 1
                  : index === highlightIndex
                  ? 1
                  : dimOpacity
              }
              strokeOpacity={
                highlightIndex === null || highlightIndex === undefined
                  ? 1
                  : index === highlightIndex
                  ? 1
                  : dimOpacity
              }
            />
            );
          })}
        </Pie>
      </PieChart>
      {children ? (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ pointerEvents: 'none' }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
