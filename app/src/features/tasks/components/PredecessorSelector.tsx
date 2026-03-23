/**
 * 前置任务选择器组件
 * 支持WBS编码输入和自动完成
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTaskByWbsCode } from '@/lib/api/task.api';
import type { WBSTask } from '../types';

interface PredecessorSelectorProps {
  projectId: string;
  value: string | null;
  onChange: (value: string | null, task: WBSTask | null) => void;
  tasks?: WBSTask[];
  placeholder?: string;
  disabled?: boolean;
  currentTaskId?: string;
}

export function PredecessorSelector({
  projectId,
  value,
  onChange,
  tasks = [],
  placeholder = '输入WBS编码或选择任务',
  disabled = false,
  currentTaskId,
}: PredecessorSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedTask, setSelectedTask] = useState<WBSTask | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // 根据 value 初始化 selectedTask
  useEffect(() => {
    if (value) {
      const task = tasks.find((t) => t.id === value);
      if (task) {
        setSelectedTask(task);
        setInputValue(task.wbsCode);
      }
    } else {
      setSelectedTask(null);
      setInputValue('');
    }
  }, [value, tasks]);

  // 过滤任务列表
  const filteredTasks = useMemo(() => {
    if (!inputValue) return tasks.slice(0, 50); // 限制显示数量

    const searchLower = inputValue.toLowerCase();
    return tasks.filter(
      (task) =>
        task.wbsCode.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
    ).slice(0, 50);
  }, [tasks, inputValue]);

  // 处理选择任务
  const handleSelect = (task: WBSTask) => {
    // 不能选择自己作为前置任务
    if (currentTaskId && task.id === currentTaskId) {
      setSearchError('不能选择当前任务作为前置任务');
      return;
    }

    setSelectedTask(task);
    setInputValue(task.wbsCode);
    onChange(task.id, task);
    setOpen(false);
    setSearchError(null);
  };

  // 处理清除选择
  const handleClear = () => {
    setSelectedTask(null);
    setInputValue('');
    onChange(null, null);
    setSearchError(null);
  };

  // 处理WBS编码输入（直接输入后失焦时查询）
  const handleBlur = async () => {
    if (!inputValue || (selectedTask && selectedTask.wbsCode === inputValue)) {
      return;
    }

    // 尝试通过WBS编码查找任务
    setIsSearching(true);
    setSearchError(null);

    try {
      const task = await getTaskByWbsCode(projectId, inputValue);
      if (task) {
        // 不能选择自己作为前置任务
        if (currentTaskId && task.id === currentTaskId) {
          setSearchError('不能选择当前任务作为前置任务');
          return;
        }
        setSelectedTask(task);
        onChange(task.id, task);
      } else {
        setSearchError(`未找到WBS编码为 "${inputValue}" 的任务`);
      }
    } catch {
      setSearchError('查询任务失败');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between',
              !selectedTask && 'text-muted-foreground'
            )}
          >
            {selectedTask ? (
              <span className="truncate">
                <Badge variant="outline" className="mr-2 font-mono">
                  {selectedTask.wbsCode}
                </Badge>
                {selectedTask.description.slice(0, 30)}
                {selectedTask.description.length > 30 && '...'}
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="输入WBS编码搜索..."
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={handleBlur}
            />
            <CommandList>
              {isSearching ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  搜索中...
                </div>
              ) : filteredTasks.length === 0 ? (
                <CommandEmpty>
                  未找到匹配的任务
                  <br />
                  <span className="text-xs">
                    输入WBS编码后失焦可直接查询
                  </span>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredTasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={task.id}
                      onSelect={() => handleSelect(task)}
                      disabled={currentTaskId === task.id}
                      className={cn(
                        'flex items-start gap-2',
                        currentTaskId === task.id && 'opacity-50'
                      )}
                    >
                      <Check
                        className={cn(
                          'mt-1 h-4 w-4 shrink-0',
                          selectedTask?.id === task.id
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {task.wbsCode}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {task.status}
                          </span>
                        </div>
                        <p className="truncate text-sm">{task.description}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 已选择的任务标签 */}
      {selectedTask && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <span className="font-mono">{selectedTask.wbsCode}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
          <span className="text-xs text-muted-foreground truncate flex-1">
            {selectedTask.description}
          </span>
        </div>
      )}

      {/* 错误提示 */}
      {searchError && (
        <p className="text-xs text-destructive">{searchError}</p>
      )}
    </div>
  );
}
