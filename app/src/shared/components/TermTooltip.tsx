/**
 * 术语说明 Tooltip 组件
 * 用于为专业术语提供悬停说明
 */
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface TermDefinition {
  /** 术语名称 */
  term: string;
  /** 简短描述 */
  shortDesc: string;
  /** 完整说明 */
  fullDesc: string;
  /** 计算公式（可选） */
  formula?: string;
  /** 示例（可选） */
  example?: string;
}

interface TermTooltipProps {
  /** 术语定义 */
  definition: TermDefinition;
  /** 图标大小 */
  iconSize?: 'sm' | 'md';
  /** Tooltip 显示位置 */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 自定义类名 */
  className?: string;
}

export function TermTooltip({
  definition,
  iconSize = 'sm',
  side = 'top',
  className,
}: TermTooltipProps) {
  const iconClass = iconSize === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center text-muted-foreground hover:text-foreground transition-colors ${className || ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className={iconClass} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs p-3">
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">{definition.term}</p>
          <p className="text-muted-foreground">{definition.fullDesc}</p>
          {definition.formula && (
            <div className="bg-muted/50 rounded px-2 py-1 font-mono text-xs">
              {definition.formula}
            </div>
          )}
          {definition.example && (
            <p className="text-xs text-muted-foreground italic">
              示例: {definition.example}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * 带术语说明的标题组件
 * 用于 StatsCard 等需要标题提示的场景
 */
interface TermTitleProps {
  /** 标题文字 */
  title: string;
  /** 术语定义 */
  definition?: TermDefinition;
  /** 自定义提示内容（简化用法） */
  tooltip?: string;
  /** 图标大小 */
  iconSize?: 'sm' | 'md';
}

export function TermTitle({ title, definition, tooltip, iconSize = 'sm' }: TermTitleProps) {
  // 简化用法：只提供 tooltip 字符串
  if (tooltip && !definition) {
    definition = {
      term: title,
      shortDesc: tooltip,
      fullDesc: tooltip,
    };
  }

  if (!definition) {
    return <span>{title}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{title}</span>
      <TermTooltip definition={definition} iconSize={iconSize} />
    </span>
  );
}
