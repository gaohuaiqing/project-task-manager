import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * 加载指示器组件
 */
export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

/**
 * 全屏加载指示器
 */
export function FullPageLoader({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

/**
 * 内联页面加载指示器
 * 用于 Suspense fallback，在主内容区域内显示，
 * 避免全屏白屏造成的"卡死"感
 */
export function InlinePageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px] animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <span className="text-sm text-muted-foreground">加载中...</span>
      </div>
    </div>
  );
}

export default LoadingSpinner;
