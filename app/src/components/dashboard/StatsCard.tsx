import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  accentColor: string;
  delay?: number;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  suffix = '',
  change,
  changeLabel = '较上周',
  icon,
  accentColor,
  delay = 0,
  onClick
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-system-green';
    if (change < 0) return 'text-system-red';
    return 'text-gray-400';
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        "relative overflow-hidden cursor-pointer group",
        "bg-gradient-to-br from-primary/5 to-primary/[0.02]",
        "backdrop-blur-xl border border-border/50",
        "rounded-apple-card",
        "transition-all duration-500 ease-apple-out",
        "hover:shadow-apple-prominent hover:-translate-y-1",
        "opacity-100 translate-y-0 min-h-[130px] flex flex-col"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isHovered
          ? `0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), ${accentColor}15 0 0 20px`
          : '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* 背景光效 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${accentColor}10, transparent 70%)`,
        }}
      />

      {/* 顶部发光条 */}
      <div
        className="absolute top-0 left-4 right-4 h-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
        }}
      />

      {/* 内容容器 */}
      <div className="relative flex items-start justify-between flex-1 p-6">
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide">
            {title}
          </p>

          {/* 数值 */}
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-4xl font-bold text-foreground tracking-tight">
              {displayValue.toLocaleString()}
            </span>
            {suffix && (
              <span className="text-lg text-muted-foreground font-medium">{suffix}</span>
            )}
          </div>

          {/* 趋势指示 */}
          {change !== undefined && (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 backdrop-blur-sm border border-border/50", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-xs font-semibold">{Math.abs(change)}%</span>
              <span className="text-xs text-muted-foreground/70">{changeLabel}</span>
            </div>
          )}
        </div>

        {/* 图标容器 - 苹果风格发光效果 */}
        <div
          className={cn(
            "relative p-4 rounded-2xl transition-all duration-500 ease-apple-out",
            "group-hover:scale-110 group-hover:rotate-3"
          )}
          style={{
            background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}15)`,
            boxShadow: isHovered
              ? `${accentColor}40 0 8px 24px, ${accentColor}30 0 0 1px inset`
              : `${accentColor}20 0 4px 12px, transparent 0 0 0 inset`,
          }}
        >
          {/* 图标内发光 */}
          <div
            className="relative z-10"
            style={{
              color: accentColor,
              filter: isHovered ? 'drop-shadow(0 0 8px currentColor)' : 'none',
            }}
          >
            {icon}
          </div>

          {/* 装饰性光点 */}
          {isHovered && (
            <div
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: accentColor }}
            />
          )}
        </div>
      </div>

      {/* 底部装饰线 */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-apple-out",
          "group-hover:w-full w-0"
        )}
        style={{
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40)`,
        }}
      />
    </Card>
  );
}
