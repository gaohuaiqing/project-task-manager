/**
 * 统计卡片组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  accentColor?: string;
  className?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  suffix,
  change,
  changeLabel,
  icon: Icon,
  accentColor = '#60a5fa',
  className,
  onClick,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      {/* Accent color bar */}
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: accentColor }}
      />

      <CardHeader className="flex flex-row items-center justify-between pb-2 pl-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: accentColor }} />
          </div>
        )}
      </CardHeader>

      <CardContent className="pl-4 pb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {suffix && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>

        {change !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span
              className={cn(
                'font-medium',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isPositive ? '+' : ''}{change}%
            </span>
            {changeLabel && (
              <span className="text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
