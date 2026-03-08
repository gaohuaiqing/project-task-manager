/**
 * 任务类型管理组件
 *
 * 功能：
 * 1. 添加新任务类型
 * 2. 删除任务类型
 * 3. 类型颜色选择
 *
 * @module components/settings/TaskTypesManager
 */

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Plus, Trash2, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTaskTypes, saveTaskTypes } from '@/utils/taskTypeManager';

export interface TaskType {
  value: string;
  label: string;
  color: string;
}

/**
 * 颜色选项配置
 */
const COLOR_OPTIONS = [
  { value: '#60a5fa', label: '蓝色' },
  { value: '#4ade80', label: '绿色' },
  { value: '#facc15', label: '黄色' },
  { value: '#f472b6', label: '粉色' },
  { value: '#fb923c', label: '橙色' },
  { value: '#a78bfa', label: '紫色' },
  { value: '#f87171', label: '红色' },
  { value: '#9ca3af', label: '灰色' },
];

export interface TaskTypesManagerProps {
  /** 任务类型列表 */
  taskTypes: TaskType[];
  /** 更新任务类型列表 */
  onChange: (types: TaskType[]) => void;
}

/**
 * 任务类型管理组件
 *
 * @example
 * ```tsx
 * <TaskTypesManager
 *   taskTypes={taskTypes}
 *   onChange={setTaskTypes}
 * />
 * ```
 */
export function TaskTypesManager({
  taskTypes,
  onChange,
}: TaskTypesManagerProps) {
  const [newTypeName, setNewTypeName] = React.useState('');
  const [newTypeColor, setNewTypeColor] = React.useState('#60a5fa');

  /**
   * 从后端加载任务类型
   */
  useEffect(() => {
    const loadTaskTypes = async () => {
      try {
        const types = await getTaskTypes();
        onChange(types);
      } catch (error) {
        console.error('Failed to load task types:', error);
      }
    };
    loadTaskTypes();
  }, [onChange]);

  /**
   * 添加任务类型
   */
  const addTaskType = async () => {
    if (!newTypeName.trim()) return;

    const newType: TaskType = {
      value: `custom_${Date.now()}`,
      label: newTypeName.trim(),
      color: newTypeColor,
    };

    const updatedTypes = [...taskTypes, newType];
    onChange(updatedTypes);
    await saveTaskTypes(updatedTypes);
    setNewTypeName('');
  };

  /**
   * 删除任务类型
   */
  const deleteTaskType = async (value: string) => {
    const updatedTypes = taskTypes.filter((t) => t.value !== value);
    onChange(updatedTypes);
    await saveTaskTypes(updatedTypes);
  };

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-orange-400" />
          任务类型设置
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 添加新类型 */}
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label className="text-foreground">类型名称</Label>
            <Input
              placeholder="输入任务类型名称..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="bg-background border-border text-white"
              onKeyDown={(e) => e.key === 'Enter' && addTaskType()}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1">
              <Palette className="w-4 h-4" />
              颜色
            </Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewTypeColor(color.value)}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-all',
                    newTypeColor === color.value
                      ? 'ring-2 ring-white'
                      : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={addTaskType}
            disabled={!newTypeName.trim()}
            className="bg-primary hover:bg-secondary text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加
          </Button>
        </div>

        {/* 类型列表 */}
        <div className="space-y-2">
          <Label className="text-foreground">现有任务类型</Label>
          <div className="flex flex-wrap gap-2">
            {taskTypes.map((type) => (
              <Badge
                key={type.value}
                variant="secondary"
                className="px-3 py-2 text-sm flex items-center gap-2"
                style={{
                  backgroundColor: `${type.color}30`,
                  color: type.color,
                  border: `1px solid ${type.color}50`,
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                {type.label}
                <button
                  onClick={() => deleteTaskType(type.value)}
                  className="ml-1 hover:opacity-70 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Badge>
            ))}
          </div>
          {taskTypes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无任务类型，请添加
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskTypesManager;
