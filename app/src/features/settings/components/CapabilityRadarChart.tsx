/**
 * 能力雷达图组件
 * 使用 SVG 绘制简单的雷达图
 */
import { cn } from '@/lib/utils';

interface DimensionData {
  name: string;
  score: number;
  weight: number;
}

interface CapabilityRadarChartProps {
  dimensions: DimensionData[];
  size?: number;
  className?: string;
}

export function CapabilityRadarChart({
  dimensions,
  size = 200,
  className,
}: CapabilityRadarChartProps) {
  const center = size / 2;
  const radius = size / 2 - 40;
  const levels = 5;
  const angleStep = (2 * Math.PI) / dimensions.length;

  // 生成多边形点
  const getPolygonPoints = (level: number) => {
    const r = (radius * level) / levels;
    return dimensions
      .map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
  };

  // 生成数据多边形点
  const getDataPoints = () => {
    return dimensions
      .map((d, i) => {
        const r = (radius * d.score) / 100;
        const angle = angleStep * i - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
  };

  // 生成标签位置
  const getLabelPosition = (index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const labelRadius = radius + 25;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className={cn('relative', className)}>
      <svg width={size} height={size} className="overflow-visible">
        {/* 背景网格 */}
        {Array.from({ length: levels }).map((_, level) => (
          <polygon
            key={level}
            points={getPolygonPoints(level + 1)}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            className="text-muted-foreground"
          />
        ))}

        {/* 轴线 */}
        {dimensions.map((_, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.2}
              className="text-muted-foreground"
            />
          );
        })}

        {/* 数据区域 */}
        <polygon
          points={getDataPoints()}
          fill="currentColor"
          fillOpacity={0.2}
          stroke="currentColor"
          strokeWidth={2}
          className="text-primary"
        />

        {/* 数据点 */}
        {dimensions.map((d, i) => {
          const r = (radius * d.score) / 100;
          const angle = angleStep * i - Math.PI / 2;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill="currentColor"
              className="text-primary"
            />
          );
        })}

        {/* 标签 */}
        {dimensions.map((d, i) => {
          const pos = getLabelPosition(i);
          return (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-current text-muted-foreground"
            >
              {d.name}
            </text>
          );
        })}
      </svg>

      {/* 分数显示 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {Math.round(
              dimensions.reduce((sum, d) => sum + d.score * (d.weight / 100), 0)
            )}
          </div>
          <div className="text-xs text-muted-foreground">综合分</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 紧凑型能力展示
 * 用于列表中展示
 */
interface CompactCapabilityDisplayProps {
  dimensions: DimensionData[];
  maxDisplay?: number;
}

export function CompactCapabilityDisplay({
  dimensions,
  maxDisplay = 3,
}: CompactCapabilityDisplayProps) {
  // 按权重排序，取前 N 个
  const displayDimensions = [...dimensions]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxDisplay);

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * (d.weight / 100), 0)
  );

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 space-y-1">
        {displayDimensions.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 truncate">
              {d.name}
            </span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${d.score}%` }}
              />
            </div>
            <span className="text-xs font-medium w-8 text-right">{d.score}</span>
          </div>
        ))}
      </div>
      <div className="text-center px-2">
        <div className="text-lg font-bold text-primary">{overallScore}</div>
        <div className="text-[10px] text-muted-foreground">综合</div>
      </div>
    </div>
  );
}
