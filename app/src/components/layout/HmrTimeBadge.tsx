import { Zap, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HmrTimeBadgeProps {
  time: string;
  isHmr: boolean;
  className?: string;
  variant?: 'pill' | 'compact' | 'minimal';
}

export function HmrTimeBadge({ time, isHmr, className, variant = 'pill' }: HmrTimeBadgeProps) {
  const label = isHmr ? '热更新' : '构建';
  const Icon = isHmr ? Zap : Package;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        "transition-all duration-200",
        // 浅色模式
        "bg-muted/60 text-muted-foreground border border-border/50",
        // 悬停效果
        "hover:bg-muted hover:text-foreground hover:border-border",
        className
      )}
    >
      {/* 图标 */}
      <Icon className="w-4 h-4" />

      {/* 文字 */}
      <span>
        {label}: {time}
      </span>

      {/* 状态点 */}
      {isHmr && (
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      )}
    </div>
  );
}
