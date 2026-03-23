/**
 * 热更新时间徽章组件
 * 仅在开发环境显示，显示最后一次热更新时间
 */
import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HmrTimeBadgeProps {
  lastUpdate: Date | null;
  isHmr: boolean;
  variant?: 'pill' | 'default';
  className?: string;
}

export function HmrTimeBadge({
  lastUpdate,
  isHmr,
  variant = 'pill',
  className,
}: HmrTimeBadgeProps) {
  if (!lastUpdate) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (variant === 'pill') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          isHmr && 'animate-pulse',
          className
        )}
      >
        <Zap className="h-3 w-3" />
        <span>热更新: {formatTime(lastUpdate)}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
    >
      <Zap className="h-3 w-3" />
      <span>热更新: {formatTime(lastUpdate)}</span>
    </div>
  );
}

/**
 * Hook: 监听 Vite HMR 事件
 */
export function useHmrTime() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isHmr, setIsHmr] = useState(false);

  useEffect(() => {
    // 仅在开发环境运行
    if (import.meta.env.DEV) {
      // 监听 Vite HMR 事件
      const handleHmr = () => {
        setLastUpdate(new Date());
        setIsHmr(true);
        // 2秒后停止闪烁动画
        setTimeout(() => setIsHmr(false), 2000);
      };

      // Vite 注入的全局变量
      if (import.meta.hot) {
        import.meta.hot.on('vite:beforeUpdate', handleHmr);
        import.meta.hot.on('vite:afterUpdate', handleHmr);
      }

      // 初始时间
      setLastUpdate(new Date());
    }
  }, []);

  return { lastUpdate, isHmr };
}
