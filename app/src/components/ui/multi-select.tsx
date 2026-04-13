/**
 * MultiSelect 多选下拉组件
 * 基于 Popover + Command 实现，支持多选、搜索、全选功能
 */
import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  /** 选项列表 */
  options: MultiSelectOption[];
  /** 已选值 */
  value: string[];
  /** 值变化回调 */
  onChange: (value: string[]) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 触发器宽度 */
  triggerClassName?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 下拉面板宽度 */
  panelWidth?: string | number;
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = '请选择',
  triggerClassName,
  disabled = false,
  panelWidth = 220,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // 过滤选项
  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  // 已选数量
  const selectedCount = value.length;

  // 显示文本
  const displayText = React.useMemo(() => {
    if (selectedCount === 0) return placeholder;
    if (selectedCount === 1) {
      const selected = options.find((opt) => opt.value === value[0]);
      return selected?.label || value[0];
    }
    return `已选择 ${selectedCount} 项`;
  }, [selectedCount, value, options, placeholder]);

  // 切换选项
  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  // 全选
  const selectAll = () => {
    onChange(options.map((opt) => opt.value));
  };

  // 清空
  const clearAll = () => {
    onChange([]);
  };

  // 是否全选
  const isAllSelected = selectedCount === options.length && options.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-9 justify-between font-normal',
            selectedCount > 0 && 'text-foreground',
            triggerClassName
          )}
        >
          <span className={cn('truncate', selectedCount === 0 && 'text-muted-foreground')}>
            {displayText}
          </span>
          {selectedCount > 0 ? (
            <span className="ml-1 flex items-center gap-1">
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {selectedCount}
              </Badge>
            </span>
          ) : null}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: typeof panelWidth === 'number' ? `${panelWidth}px` : panelWidth }}
        align="start"
      >
        <Command disablePointerSelection>
          <CommandInput
            placeholder="搜索..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>无匹配选项</CommandEmpty>
            <CommandGroup>
              {/* 全选/清空按钮 */}
              <div className="flex items-center justify-between border-b px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={selectAll}
                  disabled={isAllSelected}
                >
                  全选
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={clearAll}
                  disabled={selectedCount === 0}
                >
                  清空
                </Button>
              </div>
              {/* 选项列表 */}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggleOption(option.value)}
                >
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      value.includes(option.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50'
                    )}
                  >
                    {value.includes(option.value) && <Check className="h-3 w-3" />}
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
