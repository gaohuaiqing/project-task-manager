/**
 * WBS 任务表格组件 - 简化版
 *
 * 职责：
 * - 任务数据展示和操作
 * - 表格整体布局
 * - 协调各个子组件
 *
 * 架构：
 * - 筛选 → WbsTaskFilters 组件
 * - 批量操作 → WbsTaskBulkActions 组件
 * - 行渲染 → WbsTaskRow 组件
 * - 筛选逻辑 → useWbsTaskFilters Hook
 * - 选择逻辑 → useWbsTaskSelection Hook
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download, Columns } from 'lucide-react';
import type { WbsTask } from '@/types/wbs';
import { buildWbsTree, validateTaskData, generateWbsCode } from '@/utils/wbsCalculator';
import { getTaskTypes } from '@/utils/taskTypeManager';
import { getAllHolidayDates } from '@/utils/holidayManager';
import { WbsTaskFilters } from './wbs-table/WbsTaskFilters';
import { WbsTaskBulkActions } from './wbs-table/WbsTaskBulkActions';
import { WbsTaskRow } from './wbs-table/WbsTaskRow';
import { useWbsTaskFilters } from '@/hooks/useWbsTaskFilters';
import { useWbsTaskSelection } from '@/hooks/useWbsTaskSelection';

interface WbsTaskTableProps {
  tasks: WbsTask[];
  members: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  onTasksChange: (tasks: WbsTask[]) => void;
  userRole?: string;
  isAdmin?: boolean;
}

export function WbsTaskTable({
  tasks,
  members,
  projects,
  onTasksChange,
  userRole,
  isAdmin,
}: WbsTaskTableProps) {
  // ================================================================
  // 状态管理
  // ================================================================
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // 筛选逻辑
  const {
    searchQuery,
    setSearchQuery,
    filterProject,
    setFilterProject,
    filterMember,
    setFilterMember,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    activeFilterCount,
    clearFilters,
    applyFilters,
  } = useWbsTaskFilters();

  // 选择逻辑
  const filteredTasks = useMemo(() => applyFilters(tasks), [tasks, applyFilters]);
  const taskIds = useMemo(() => filteredTasks.map(t => t.id), [filteredTasks]);
  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    isSelected,
    toggleSelection,
    toggleAll,
    clearSelection,
  } = useWbsTaskSelection(taskIds);

  // ================================================================
  // 数据加载
  // ================================================================
  useEffect(() => {
    const loadTaskTypes = async () => {
      try {
        const types = await getTaskTypes();
        setTaskTypes(types);
      } catch (error) {
        console.error('Failed to load task types:', error);
      }
    };

    const loadHolidayDates = async () => {
      try {
        const dates = await getAllHolidayDates();
        setHolidayDates(dates);
      } catch (error) {
        console.error('Failed to load holiday dates:', error);
        setHolidayDates([]);
      }
    };

    loadTaskTypes();
    loadHolidayDates();
    const interval = setInterval(loadTaskTypes, 1000);
    const holidayInterval = setInterval(loadHolidayDates, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(holidayInterval);
    };
  }, []);

  // ================================================================
  // 树形结构
  // ================================================================
  const taskTree = useMemo(() => {
    return buildWbsTree(filteredTasks);
  }, [filteredTasks]);

  // 展平树形结构用于渲染
  const flatTasks = useMemo(() => {
    const result: Array<{ task: WbsTask; level: number; hasChildren: boolean }> = [];

    const flatten = (tasks: WbsTask[], level: number = 0) => {
      for (const task of tasks) {
        const hasChildren = task.children && task.children.length > 0;
        result.push({ task, level, hasChildren });

        if (hasChildren && expandedTasks.has(task.id)) {
          flatten(task.children || [], level + 1);
        }
      }
    };

    flatten(taskTree);
    return result;
  }, [taskTree, expandedTasks]);

  // ================================================================
  // 事件处理
  // ================================================================
  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    setEditingTask(taskId);
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    // TODO: 实现删除逻辑
    console.log('Delete task:', taskId);
  }, []);

  const handleBatchDelete = useCallback(async () => {
    // TODO: 实现批量删除逻辑
    console.log('Batch delete tasks:', Array.from(selectedIds));
    clearSelection();
  }, [selectedIds, clearSelection]);

  const handleBatchStatusUpdate = useCallback(async (status: string) => {
    // TODO: 实现批量状态更新逻辑
    console.log('Batch update status:', status, 'for tasks:', Array.from(selectedIds));
  }, [selectedIds]);

  const handleBatchAssign = useCallback(async (memberId: string) => {
    // TODO: 实现批量分配逻辑
    console.log('Batch assign to:', memberId, 'for tasks:', Array.from(selectedIds));
  }, [selectedIds]);

  const handleExport = useCallback(async () => {
    // TODO: 实现导出逻辑
    console.log('Export tasks');
  }, []);

  const handleExportSelected = useCallback(async () => {
    // TODO: 实现选中项导出逻辑
    console.log('Export selected tasks:', Array.from(selectedIds));
  }, [selectedIds]);

  // ================================================================
  // 渲染
  // ================================================================
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>WBS 任务分解表</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Columns className="w-4 h-4 mr-1" />
              列设置
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              <Download className="w-4 h-4 mr-1" />
              导出全部
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              新建任务
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 筛选器 */}
        <WbsTaskFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterProject={filterProject}
          onProjectFilterChange={setFilterProject}
          filterMember={filterMember}
          onMemberFilterChange={setFilterMember}
          filterStatus={filterStatus}
          onStatusFilterChange={setFilterStatus}
          filterPriority={filterPriority}
          onPriorityFilterChange={setFilterPriority}
          projects={projects}
          members={members}
          activeFilterCount={activeFilterCount}
          onClearFilters={clearFilters}
        />

        {/* 批量操作 */}
        <WbsTaskBulkActions
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          onDeleteSelected={handleBatchDelete}
          onExportSelected={handleExportSelected}
          onBatchStatusUpdate={handleBatchStatusUpdate}
          members={members}
          onBatchAssign={handleBatchAssign}
        />

        {/* 任务表格 */}
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-accent/50">
              <tr>
                <th className="p-2 w-10" />
                <th className="p-2 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = isSomeSelected;
                      }
                    }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="p-2 text-left text-sm font-medium">WBS 编码</th>
                <th className="p-2 text-left text-sm font-medium">任务名称</th>
                <th className="p-2 text-left text-sm font-medium">状态</th>
                <th className="p-2 text-left text-sm font-medium">优先级</th>
                <th className="p-2 text-left text-sm font-medium">负责人</th>
                <th className="p-2 text-left text-sm font-medium">工期</th>
                <th className="p-2 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {flatTasks.map(({ task, level, hasChildren }) => (
                <WbsTaskRow
                  key={task.id}
                  task={task}
                  level={level}
                  isExpanded={expandedTasks.has(task.id)}
                  isSelected={isSelected(task.id)}
                  isEditing={editingTask === task.id}
                  hasChildren={hasChildren}
                  onToggleExpand={() => toggleExpand(task.id)}
                  onToggleSelect={() => toggleSelection(task.id)}
                  onEdit={() => handleEditTask(task.id)}
                  onDelete={() => handleDeleteTask(task.id)}
                  holidayDates={holidayDates}
                />
              ))}
            </tbody>
          </table>

          {flatTasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              暂无任务数据
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
