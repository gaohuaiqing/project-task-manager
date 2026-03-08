/**
 * 项目时间计划编辑对话框
 *
 * 可调整大小的对话框，统一视图展示里程碑和任务
 * @module components/projects/ProjectTimePlanDialog
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResizableDialogContent } from './ResizableDialogContent';
import { TimePlanUnifiedView } from './TimePlanUnifiedView';
import {
  createFullMilestone,
  createFullWbsTask,
  calculateMiddleDate,
  validateDateRange,
} from '@/utils/timePlanHelpers';
import type { ProjectMilestone } from '@/types/project';
import type { WbsTask } from '@/types/wbs';

export interface ProjectTimePlanDialogProps {
  /** 是否打开对话框 */
  open: boolean;
  /** 对话框打开状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 计划开始日期 */
  plannedStartDate?: string;
  /** 计划结束日期 */
  plannedEndDate?: string;
  /** 里程碑列表 */
  milestones: ProjectMilestone[];
  /** WBS任务列表 */
  wbsTasks: WbsTask[];
  /** 里程碑变更回调 */
  onMilestonesChange: (milestones: ProjectMilestone[]) => void;
  /** 任务变更回调 */
  onTasksChange: (tasks: WbsTask[]) => void;
  /** 项目日期范围变更回调（用于自动扩展项目起止时间） */
  onProjectDateRangeChange?: (startDate: string, endDate: string) => void;
  /** 保存回调 */
  onSave: (data: { milestones: ProjectMilestone[]; tasks: WbsTask[] }) => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 项目ID（用于创建新任务） */
  projectId?: string | number;
  /** 成员ID（用于创建新任务） */
  memberId?: string;
}

/**
 * 项目时间计划编辑对话框组件
 */
export function ProjectTimePlanDialog({
  open,
  onOpenChange,
  plannedStartDate = '',
  plannedEndDate = '',
  milestones: initialMilestones,
  wbsTasks: initialTasks,
  onMilestonesChange,
  onTasksChange,
  onProjectDateRangeChange,
  onSave,
  readonly = false,
  projectId = 'new',
  memberId = '',
}: ProjectTimePlanDialogProps) {
  // ==================== 状态管理 ====================
  const [localMilestones, setLocalMilestones] = useState<ProjectMilestone[]>(initialMilestones);
  const [localTasks, setLocalTasks] = useState<WbsTask[]>(initialTasks);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [dialogSize, setDialogSize] = useState({ width: 900, height: 700 });

  // ==================== 同步初始数据 ====================
  useEffect(() => {
    setLocalMilestones(initialMilestones);
    setLocalTasks(initialTasks);
    setHasUnsavedChanges(false);
  }, [initialMilestones, initialTasks, open]);

  // ==================== 检测数据变更 ====================
  useEffect(() => {
    const milestonesChanged = JSON.stringify(localMilestones) !== JSON.stringify(initialMilestones);
    const tasksChanged = JSON.stringify(localTasks) !== JSON.stringify(initialTasks);
    setHasUnsavedChanges(milestonesChanged || tasksChanged);
  }, [localMilestones, localTasks, initialMilestones, initialTasks]);

  // ==================== 处理里程碑变更 ====================
  const handleMilestonesChange = useCallback((milestones: ProjectMilestone[]) => {
    setLocalMilestones(milestones);
  }, []);

  // ==================== 处理任务变更 ====================
  const handleTasksChange = useCallback((tasks: WbsTask[]) => {
    setLocalTasks(tasks);
  }, []);

  // ==================== 添加里程碑 ====================
  const handleAddMilestone = useCallback(() => {
    if (!plannedStartDate || !plannedEndDate) return;

    const middleDate = calculateMiddleDate(plannedStartDate, plannedEndDate);
    const newMilestone = createFullMilestone(middleDate, localMilestones.length, Number(projectId));
    setLocalMilestones([...localMilestones, newMilestone]);
  }, [plannedStartDate, plannedEndDate, localMilestones, projectId]);

  // ==================== 添加任务 ====================
  const handleAddTask = useCallback(() => {
    if (!plannedStartDate || !plannedEndDate) return;

    const newTask = createFullWbsTask(
      String(projectId),
      memberId || '1',
      plannedStartDate,
      plannedEndDate,
      localTasks.length,
      generateNextWbsCode()
    );
    setLocalTasks([...localTasks, newTask]);
  }, [plannedStartDate, plannedEndDate, localTasks, projectId, memberId]);

  /**
   * 生成下一个WBS编码
   */
  const generateNextWbsCode = useCallback(() => {
    const rootTasks = localTasks.filter(t => !t.parentId);
    const maxOrder = rootTasks.length > 0 ? Math.max(...rootTasks.map(t => parseInt(t.wbsCode) || 0)) : 0;
    return String(maxOrder + 1);
  }, [localTasks]);

  // ==================== 自动排列 ====================
  const handleAutoArrange = useCallback(() => {
    if (!plannedStartDate || !plannedEndDate) return;

    // 自动排列里程碑
    if (localMilestones.length > 0) {
      const startDate = new Date(plannedStartDate);
      const endDate = new Date(plannedEndDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const interval = Math.floor(totalDays / (localMilestones.length + 1));

      const arrangedMilestones = localMilestones.map((milestone, index) => {
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() + interval * (index + 1));
        return {
          ...milestone,
          plannedDate: newDate.toISOString().split('T')[0],
        };
      });
      setLocalMilestones(arrangedMilestones);
    }

    // 自动排列任务
    if (localTasks.length > 0) {
      const startDate = new Date(plannedStartDate);
      const endDate = new Date(plannedEndDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const rootTasks = localTasks.filter(t => !t.parentId);
      const interval = Math.floor(totalDays / (rootTasks.length + 1));

      const arrangedTasks = localTasks.map(task => {
        if (!task.parentId) {
          const index = rootTasks.findIndex(t => t.id === task.id);
          const taskStart = new Date(startDate);
          taskStart.setDate(taskStart.getDate() + interval * index);
          const taskEnd = new Date(taskStart);
          taskEnd.setDate(taskEnd.getDate() + (task.plannedDays || 1));
          return {
            ...task,
            plannedStartDate: taskStart.toISOString().split('T')[0],
            plannedEndDate: taskEnd.toISOString().split('T')[0],
          };
        }
        return task;
      });
      setLocalTasks(arrangedTasks);
    }
  }, [plannedStartDate, plannedEndDate, localMilestones, localTasks]);

  // ==================== 重置更改 ====================
  const handleReset = useCallback(() => {
    setLocalMilestones(initialMilestones);
    setLocalTasks(initialTasks);
    setHasUnsavedChanges(false);
  }, [initialMilestones, initialTasks]);

  // ==================== 保存更改 ====================
  const handleSave = useCallback(() => {
    // 验证日期范围
    const dateValidation = validateDateRange(plannedStartDate, plannedEndDate);
    if (!dateValidation.valid) {
      alert(dateValidation.error);
      return;
    }

    // 更新父组件数据
    onMilestonesChange(localMilestones);
    onTasksChange(localTasks);

    // 调用保存回调
    onSave({
      milestones: localMilestones,
      tasks: localTasks,
    });

    setHasUnsavedChanges(false);
  }, [localMilestones, localTasks, onMilestonesChange, onTasksChange, onSave, plannedStartDate, plannedEndDate]);

  // ==================== 处理关闭 ====================
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !readonly) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasUnsavedChanges, readonly, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleCancelClose = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  // ==================== 验证日期 ====================
  const dateValidation = validateDateRange(plannedStartDate, plannedEndDate);
  const isValidDates = dateValidation.valid;

  // ==================== 处理对话框尺寸变更 ====================
  const handleDialogResize = useCallback((width: number, height: number) => {
    setDialogSize({ width, height });
  }, []);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          // 只在主动设置为 false 时才处理（即通过按钮触发）
          if (!newOpen && !hasUnsavedChanges) {
            onOpenChange(false);
          } else if (!newOpen && hasUnsavedChanges && !readonly) {
            // 有未保存更改时，阻止关闭并显示确认对话框
            setShowCloseConfirm(true);
          }
        }}
        onInteractOutside={(event) => {
          // 阻止点击外部的默认关闭行为
          if (hasUnsavedChanges && !readonly) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          // 阻止 ESC 键的默认关闭行为
          if (hasUnsavedChanges && !readonly) {
            event.preventDefault();
          }
        }}
      >
        <ResizableDialogContent
          open={open}
          storageKey="timePlanDialog"
          defaultWidth={900}
          defaultHeight={700}
          minWidth={700}
          minHeight={500}
          maxWidth={1920}
          maxHeight="95vh"
          showSizeIndicator={true}
          onResize={handleDialogResize}
          draggable={true}
        >
          {/* 标题栏 */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <DialogTitle className="text-lg font-semibold">
                  项目时间计划编辑器
                </DialogTitle>
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-500 rounded-md">
                    未保存
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {plannedStartDate && plannedEndDate ? (
                  <span>
                    {plannedStartDate} ~ {plannedEndDate}
                  </span>
                ) : (
                  <span className="text-destructive">请先设置项目日期范围</span>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* 统一视图内容 */}
          <div className="flex-1 overflow-hidden">
            {!isValidDates ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    请先在项目表单中设置有效的开始和结束日期
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dateValidation.error}
                  </p>
                </div>
              </div>
            ) : (
              <TimePlanUnifiedView
                plannedStartDate={plannedStartDate}
                plannedEndDate={plannedEndDate}
                milestones={localMilestones}
                wbsTasks={localTasks}
                onMilestonesChange={handleMilestonesChange}
                onTasksChange={handleTasksChange}
                onProjectDateRangeChange={onProjectDateRangeChange}
                onAddMilestone={handleAddMilestone}
                onAddTask={handleAddTask}
                onAutoArrange={handleAutoArrange}
                onReset={handleReset}
                readonly={readonly}
                projectId={projectId}
                memberId={memberId}
                className="h-full"
              />
            )}
          </div>

          {/* 底部按钮 */}
          <DialogFooter className="px-6 py-4 border-t border-border">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              {!readonly && (
                <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
                  <Save className="w-4 h-4 mr-2" />
                  保存更改
                </Button>
              )}
            </div>
          </DialogFooter>
        </ResizableDialogContent>
      </Dialog>

      {/* 关闭确认对话框 */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  确认关闭？
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  您有未保存的更改，关闭对话框将丢失这些更改。是否继续？
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelClose} className="flex-1">
                    继续编辑
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmClose} className="flex-1">
                    放弃更改
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 默认导出
 */
export default ProjectTimePlanDialog;
