/**
 * 统计卡片组件（极简数字样式）
 * 符合需求文档：去除图标，仅显示数字和标题
 */
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  className?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  suffix,
  className,
  onClick,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {title}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {suffix && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
