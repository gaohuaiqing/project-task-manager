import React, { useState } from 'react';
import type { MemberCapabilities } from '@/types';
import { getCapabilityDimensions } from '@/utils/capabilityDimensionManager';

interface RadarChartProps {
  capabilities: { [key: string]: number };
  onChange?: (key: string, value: number) => void;
  editable?: boolean;
  showValues?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// 获取能力维度标签
const getCapabilityLabels = (): Record<string, string> => {
  const dimensions = getCapabilityDimensions();
  const labels: Record<string, string> = {};
  dimensions.forEach(dim => {
    labels[dim.key] = dim.name;
  });
  return labels;
};

const RadarChart: React.FC<RadarChartProps> = ({
  capabilities,
  onChange,
  editable = false,
  showValues = true,
  size = 'medium'
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const maxValue = 10;
  const keys = Object.keys(capabilities) as string[];
  const angleStep = (2 * Math.PI) / keys.length;

  // 获取动态标签
  const capabilityLabels = getCapabilityLabels();

  // 使用简化的标签（只取前3个字）用于SVG显示
  const getShortLabel = (label: string): string => {
    if (label.length <= 4) return label;
    // 尝试智能截取：保留关键词
    const keyWords = ['板卡', '固件', '外购', '系统', '驱动', '接口'];
    for (const word of keyWords) {
      if (label.includes(word)) {
        const idx = label.indexOf(word);
        return label.substring(idx, Math.min(idx + 4, label.length));
      }
    }
    return label.substring(0, 4);
  };

  // 根据尺寸调整参数
  const sizeConfig = {
    small: { width: 150, height: 150, center: 75, radius: 50, labelRadius: 65, fontSize: 8 },
    medium: { width: 240, height: 240, center: 120, radius: 80, labelRadius: 105, fontSize: 10 },
    large: { width: 280, height: 280, center: 140, radius: 100, labelRadius: 120, fontSize: 11 }
  };

  const { width, height, center, radius, labelRadius, fontSize } = sizeConfig[size];

  // 计算点的坐标
  const getPointCoordinates = (value: number, index: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const pointRadius = (value / maxValue) * radius;
    return {
      x: center + pointRadius * Math.cos(angle),
      y: center + pointRadius * Math.sin(angle),
    };
  };

  // 生成多边形路径
  const polygonPath = keys
    .map((key, index) => {
      const { x, y } = getPointCoordinates(capabilities[key], index);
      return `${x},${y}`;
    })
    .join(' ');

  // 生成网格路径
  const getGridPath = (level: number) => {
    const levelRadius = (level / maxValue) * radius;
    return keys
      .map((_, index) => {
        const angle = -Math.PI / 2 + index * angleStep;
        return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
      })
      .join(' ');
  };

  // 生成轴线路径
  const getAxisPath = (index: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return `M ${center} ${center} L ${center + radius * Math.cos(angle)} ${center + radius * Math.sin(angle)}`;
  };

  // 处理值变化
  const handleValueChange = (key: string, delta: number) => {
    if (onChange) {
      const currentValue = capabilities[key];
      const newValue = Math.max(1, Math.min(10, currentValue + delta));
      onChange(key, newValue);
    }
  };

  // 获取能力等级颜色
  const getCapabilityColor = (value: number) => {
    if (value >= 8) return 'rgba(16, 185, 129, 0.8)';
    if (value >= 5) return 'rgba(59, 130, 246, 0.8)';
    return 'rgba(245, 158, 11, 0.8)';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* 背景网格 */}
        {[2, 4, 6, 8, 10].map((level) => (
          <polygon
            key={level}
            points={getGridPath(level)}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        ))}

        {/* 轴线 */}
        {keys.map((_, index) => (
          <path
            key={index}
            d={getAxisPath(index)}
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1"
          />
        ))}

        {/* 能力多边形 */}
        <polygon
          points={polygonPath}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth="2"
        />

        {/* 能力点 */}
        {keys.map((key, index) => {
          const { x, y } = getPointCoordinates(capabilities[key], index);
          const capabilityColor = getCapabilityColor(capabilities[key]);
          
          return (
            <g 
              key={key}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {/* 能力点 */}
              <circle
                cx={x}
                cy={y}
                r={size === 'small' ? 3 : 4}
                fill={capabilityColor}
                stroke="white"
                strokeWidth="1"
                className="cursor-pointer"
              />
              
              {/* 悬停时显示的值 */}
              {hoveredKey === key && showValues && (
                <text
                  x={x}
                  y={y - (size === 'small' ? 10 : 15)}
                  textAnchor="middle"
                  className="text-xs font-bold fill-white"
                >
                  {capabilities[key]}
                </text>
              )}
              
              {/* 可编辑时的增减按钮 */}
              {editable && onChange && (
                <>
                  <circle
                    cx={x - (size === 'small' ? 12 : 15)}
                    cy={y}
                    r={size === 'small' ? 8 : 10}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.5)"
                    strokeWidth="1"
                    className="cursor-pointer hover:stroke-white"
                    onClick={() => handleValueChange(key, -1)}
                  />
                  <text
                    x={x - (size === 'small' ? 12 : 15)}
                    y={y + 4}
                    textAnchor="middle"
                    className="text-xs fill-white cursor-pointer"
                    onClick={() => handleValueChange(key, -1)}
                  >
                    -
                  </text>
                  <circle
                    cx={x + (size === 'small' ? 12 : 15)}
                    cy={y}
                    r={size === 'small' ? 8 : 10}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.5)"
                    strokeWidth="1"
                    className="cursor-pointer hover:stroke-white"
                    onClick={() => handleValueChange(key, 1)}
                  />
                  <text
                    x={x + (size === 'small' ? 12 : 15)}
                    y={y + 4}
                    textAnchor="middle"
                    className="text-xs fill-white cursor-pointer"
                    onClick={() => handleValueChange(key, 1)}
                  >
                    +
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* 标签 */}
        {keys.map((key, index) => {
          const angle = -Math.PI / 2 + index * angleStep;
          const labelX = center + labelRadius * Math.cos(angle);
          const labelY = center + labelRadius * Math.sin(angle);
          const fullLabel = capabilityLabels[key];
          const shortLabel = getShortLabel(fullLabel);

          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (Math.cos(angle) > 0.3) textAnchor = 'start';
          if (Math.cos(angle) < -0.3) textAnchor = 'end';

          return (
            <g key={key}>
              {/* SVG标签 */}
              <text
                x={labelX}
                y={labelY + 3}
                textAnchor={textAnchor}
                className="fill-white font-medium"
                style={{ fontSize: `${fontSize}px` }}
              >
                {shortLabel}
              </text>
              {/* 悬停时显示完整标签 */}
              {hoveredKey === key && shortLabel !== fullLabel && (
                <foreignObject
                  x={labelX - 50}
                  y={labelY - 25}
                  width="100"
                  height="20"
                >
                  <div className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap text-center border border-slate-700">
                    {fullLabel}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* 能力值列表 */}
      {showValues && size !== 'small' && (
        <div className="grid grid-cols-1 gap-1.5 mt-4">
          {keys.map((key) => {
            const capabilityColor = getCapabilityColor(capabilities[key]);
            return (
              <div
                key={key}
                className="flex justify-between items-center text-xs text-white px-2 py-1 rounded bg-slate-800/50"
                style={{ borderLeft: `3px solid ${capabilityColor}` }}
              >
                <span className="truncate flex-1" title={capabilityLabels[key]}>{capabilityLabels[key]}</span>
                <span className="font-medium ml-2">{capabilities[key]}/10</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RadarChart;