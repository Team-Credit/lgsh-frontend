/**
 * 차트 위젯 컴포넌트
 */
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardLayoutItem, ChartData } from '@/types/dashboard';
import './ChartWidget.css';

interface ChartWidgetProps {
  data: ChartData;
  widget?: DashboardLayoutItem;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ data }) => {
  const { chartType, chartData } = data;

  // 기본 색상 팔레트
  const defaultColors = [
    '#059669', '#10b981', '#d97706', '#ea580c', '#dc2626',
    '#1e3a8a', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
  ];

  const renderChart = () => {
    switch (chartType) {
      case 'PIE':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || defaultColors[index % defaultColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'BAR':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || defaultColors[index % defaultColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'LINE':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1e3a8a"
                strokeWidth={2}
                dot={{ fill: '#1e3a8a', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'AREA': {
        // 등급 변동 추이 데이터 감지: name 형식이 "월_등급" (예: "2024년1월_A")
        const isGradeTrend =
          chartData.length > 0 && /^.+_[ABCDE]$/.test(chartData[0]?.name || '');

        if (isGradeTrend) {
          // 월별로 그룹화: { "2024년1월": { A: 10, B: 20, ... } }
          const monthMap = new Map<string, Record<string, number | string>>();
          chartData.forEach((item) => {
            const lastIdx = item.name.lastIndexOf('_');
            const monthName = item.name.substring(0, lastIdx);
            const grade = item.name.substring(lastIdx + 1);
            if (!monthMap.has(monthName)) monthMap.set(monthName, { name: monthName });
            monthMap.get(monthName)![grade] = Number(item.value ?? 0);
          });
          const groupedData = Array.from(monthMap.values());

          const gradeColors: Record<string, string> = {
            A: '#1D4ED8',
            B: '#16A34A',
            C: '#FACC15',
            D: '#F97316',
            E: '#EF4444',
          };

          return (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={groupedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {['A', 'B', 'C', 'D', 'E'].map((grade) => (
                  <Area
                    key={grade}
                    type="monotone"
                    dataKey={grade}
                    name={`${grade}등급`}
                    stroke={gradeColors[grade]}
                    fill={gradeColors[grade] + '33'}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        }

        // 기본 단일 시리즈 AREA 차트
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#1e3a8a"
                fill="rgba(30, 58, 138, 0.2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      default:
        return <div>지원하지 않는 차트 유형입니다.</div>;
    }
  };

  return <div className="chart-widget">{renderChart()}</div>;
};

export default ChartWidget;
