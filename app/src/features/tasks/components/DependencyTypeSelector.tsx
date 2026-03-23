/**
 * 依赖类型选择器组件
 * 支持4种依赖类型：FS, SS, FF, SF
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import type { DependencyType } from '../types';
import {
  DEPENDENCY_TYPE_LABELS,
  DEPENDENCY_TYPE_DESCRIPTIONS,
} from '../types';

interface DependencyTypeSelectorProps {
  value: DependencyType;
  onChange: (value: DependencyType) => void;
  disabled?: boolean;
}

export function DependencyTypeSelector({
  value,
  onChange,
  disabled = false,
}: DependencyTypeSelectorProps) {
  const dependencyTypes: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <label className="text-sm font-medium">依赖类型</label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-2 text-sm">
                <p><strong>FS (完成-开始)</strong>：前置任务完成后，后续任务才能开始</p>
                <p><strong>SS (开始-开始)</strong>：前置任务开始后，后续任务才能开始</p>
                <p><strong>FF (完成-完成)</strong>：前置任务完成后，后续任务才能完成</p>
                <p><strong>SF (开始-完成)</strong>：前置任务开始后，后续任务才能完成</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Select
        value={value}
        onValueChange={(v) => onChange(v as DependencyType)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择依赖类型" />
        </SelectTrigger>
        <SelectContent>
          {dependencyTypes.map((type) => (
            <SelectItem key={type} value={type}>
              <div className="flex flex-col">
                <span className="font-medium">{DEPENDENCY_TYPE_LABELS[type]}</span>
                <span className="text-xs text-muted-foreground">
                  {DEPENDENCY_TYPE_DESCRIPTIONS[type]}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * 简洁版依赖类型选择器（仅显示类型代码）
 */
export function DependencyTypeSelectorSimple({
  value,
  onChange,
  disabled = false,
}: DependencyTypeSelectorProps) {
  const dependencyTypes: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as DependencyType)}
      disabled={disabled}
    >
      <SelectTrigger className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {dependencyTypes.map((type) => (
          <SelectItem key={type} value={type}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>{type}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{DEPENDENCY_TYPE_DESCRIPTIONS[type]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
