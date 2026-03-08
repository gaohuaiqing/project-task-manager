/**
 * 项目表单组件
 *
 * 功能：
 * - 项目创建/编辑表单
 * - 项目类型选择
 * - 成员选择
 * - 日期计划
 * - 里程碑管理
 * - 表单验证
 *
 * @module components/projects/ProjectForm
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Info, AlertTriangle, Rocket, Users, RefreshCw, Plus, Edit3, Users2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectType, ProjectFormData } from '@/types/project';
import { PROJECT_TYPE_LABELS } from '@/types/project';
import type { WbsTask } from '@/types/wbs';
import { ProjectMemberSelector, SelectedMembersDisplay } from './ProjectMemberSelector';
import { ProjectMilestones } from './ProjectMilestones';
import { ProjectTimelineView } from './ProjectTimelineView';
import { ModernGanttView } from '@/components/gantt';
import { ProjectTimePlanDialog } from './ProjectTimePlanDialog';
import { mergeToTimeNodes, updateWbsTasksFromNodes } from '@/utils/ganttAdapters';
import { useMemo } from 'react';
import type { OrganizationStructure } from '@/types/organization';
import { ProjectTypeManager, type DynamicProjectTypeConfig } from '@/utils/projectTypeManager';

interface ProjectFormProps {
  /** 编辑的项目数据（null 表示创建模式） */
  project: Project | null;
  /** 组织架构数据 */
  organization: OrganizationStructure | null;
  /** 成员信息映射 */
  membersMap: Map<string, { name: string; avatar?: string; department?: string }>;
  /** 表单数据 */
  formData: ProjectFormData;
  /** 表单验证错误 */
  validationErrors: Record<string, string>;
  /** 表单数据变更回调 */
  onFormDataChange: (data: ProjectFormData) => void;
  /** 字段值变更回调 */
  onFieldValueChange: <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => void;
  /** 提交回调 */
  onSubmit: () => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 是否正在提交 */
  isSubmitting?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 打开时间计划编辑器回调 */
  onOpenTimePlanDialog?: () => void;
}

/**
 * 项目类型图标映射
 */
const PROJECT_TYPE_ICONS: Record<ProjectType, React.ComponentType<{ className?: string }>> = {
  product_development: Rocket,
  functional_management: Users,
  material_substitution: RefreshCw,
  troubleshooting: AlertTriangle,
  other: Edit3,
};

/**
 * 获取项目类型图标组件
 */
function getProjectTypeIcon(type: ProjectType) {
  return PROJECT_TYPE_ICONS[type] || Rocket;
}

/**
 * 检查是否有需要清理的数据
 */
function hasDataToClean(type: ProjectType, formData: ProjectFormData): boolean {
  if (type === 'functional_management') {
    return !!(formData.plannedStartDate || formData.plannedEndDate ||
             (formData.milestones && formData.milestones.length > 0));
  }
  return false;
}

/**
 * 项目表单组件
 */
export function ProjectForm({
  project,
  organization,
  membersMap,
  formData,
  validationErrors,
  onFormDataChange,
  onFieldValueChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
  onOpenTimePlanDialog,
}: ProjectFormProps) {
  const [showTypeChangeDialog, setShowTypeChangeDialog] = useState(false);
  const [pendingTypeChange, setPendingTypeChange] = useState<ProjectType | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);

  // 异步加载的项目类型配置状态
  const [typeConfig, setTypeConfig] = useState<DynamicProjectTypeConfig | null>(null);
  const [typeHints, setTypeHints] = useState<string[]>([]);
  const [allTypeConfigs, setAllTypeConfigs] = useState<DynamicProjectTypeConfig[]>([]);
  const [pendingCleanupInfo, setPendingCleanupInfo] = useState<{ needsCleanup: boolean; fieldsToClear: string[] } | null>(null);

  // 监听项目类型变化，异步加载配置
  const currentType = formData.projectType || 'product_development';

  // 异步加载所有项目类型配置
  useEffect(() => {
    const loadConfigs = async () => {
      const configs = await ProjectTypeManager.getAllConfigs();
      setAllTypeConfigs(configs);

      const config = await ProjectTypeManager.getConfig(currentType);
      setTypeConfig(config);
      setTypeHints(config.hints);
    };
    loadConfigs();
  }, [currentType]);

  // 当有待处理的类型变更时，异步加载清理信息
  useEffect(() => {
    const loadCleanupInfo = async () => {
      if (pendingTypeChange) {
        const info = await ProjectTypeManager.needsDataCleanup(currentType, pendingTypeChange);
        setPendingCleanupInfo(info);
      }
    };
    loadCleanupInfo();
  }, [pendingTypeChange, currentType]);

  // 处理项目类型变更
  const handleTypeChange = useCallback(async (newType: ProjectType) => {
    // 如果类型没有变化，直接返回
    if (newType === currentType) return;

    // 异步检查是否需要清理数据
    const cleanupInfo = await ProjectTypeManager.needsDataCleanup(currentType, newType);

    if (cleanupInfo.needsCleanup && hasDataToClean(currentType, formData)) {
      // 需要显示确认对话框
      setPendingTypeChange(newType);
      setShowTypeChangeDialog(true);
    } else {
      // 直接切换类型
      performTypeChange(newType, cleanupInfo);
    }
  }, [currentType, formData]);

  // 执行类型切换
  const performTypeChange = useCallback((newType: ProjectType, cleanupInfo: { needsCleanup: boolean; fieldsToClear: string[] }) => {
    setIsTransitioning(true);

    // 清理不需要的字段数据
    cleanupInfo.fieldsToClear.forEach(field => {
      onFieldValueChange(field as keyof ProjectFormData, field === 'milestones' ? [] : '');
    });

    // 更新项目类型
    onFieldValueChange('projectType', newType);

    // 动画延迟
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [onFieldValueChange]);

  // 确认类型切换
  const handleConfirmTypeChange = useCallback(async () => {
    if (pendingTypeChange) {
      const cleanupInfo = await ProjectTypeManager.needsDataCleanup(currentType, pendingTypeChange);
      performTypeChange(pendingTypeChange, cleanupInfo);
      setShowTypeChangeDialog(false);
      setPendingTypeChange(null);
    }
  }, [pendingTypeChange, currentType, performTypeChange]);

  // 取消类型切换
  const handleCancelTypeChange = useCallback(() => {
    setShowTypeChangeDialog(false);
    setPendingTypeChange(null);
  }, []);

  /**
   * 统一成员 ID 转换和选择逻辑
   * @param memberId - 成员 ID（字符串格式）
   * @param currentMembers - 当前已选择的成员 ID 列表
   * @returns 更新后的成员 ID 列表
   */
  const toggleMemberSelection = (memberId: string, currentMembers: string[] = []) => {
    return currentMembers.includes(memberId)
      ? currentMembers.filter(id => id !== memberId)
      : [...currentMembers, memberId];
  };

  // 处理成员选择
  const handleMemberToggle = (memberId: string) => {
    const newMembers = toggleMemberSelection(memberId, formData.memberIds || []);
    onFieldValueChange('memberIds', newMembers);
  };

  // 处理成员移除（从已选展示区）
  const handleMemberRemove = (memberId: string) => {
    const currentMembers = formData.memberIds || [];
    const newMembers = currentMembers.filter(id => id !== memberId);
    onFieldValueChange('memberIds', newMembers);
  };

  /**
   * 处理里程碑变更
   */
  const handleMilestonesChange = useCallback((milestones: any[]) => {
    onFieldValueChange('milestones', milestones);
  }, [onFieldValueChange]);

  /**
   * 处理WBS任务变更
   */
  const handleWbsTasksChange = useCallback((tasks: WbsTask[]) => {
    onFieldValueChange('wbsTasks', tasks);
  }, [onFieldValueChange]);

  /**
   * 添加新的WBS任务
   */
  const handleAddWbsTask = useCallback(() => {
    const currentTasks = formData.wbsTasks || [];
    const newTask: Omit<WbsTask, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId: formData.id?.toString() || 'new',
      memberId: formData.memberIds?.[0] || '',
      title: '新任务',
      description: '',
      status: 'not_started',
      priority: 'medium',
      plannedStartDate: formData.plannedStartDate || new Date().toISOString().split('T')[0],
      plannedEndDate: formData.plannedEndDate || new Date().toISOString().split('T')[0],
      plannedDays: 1,
      progress: 0,
      level: 0,
      subtasks: [],
      order: currentTasks.length,
      isExpanded: true,
    };
    onFieldValueChange('wbsTasks', [...currentTasks, {
      ...newTask,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      wbsCode: `${currentTasks.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);
  }, [formData.wbsTasks, formData.id, formData.memberIds, formData.plannedStartDate, formData.plannedEndDate, onFieldValueChange]);

  return (
    <div className={cn("", className)}>
      <div className="space-y-4">
        {/* 项目类型选择 - 设计文档第124行：第一个字段 */}
        <div className="space-y-1.5">
          <Label>项目类型 *</Label>
          <Select
            value={currentType}
            onValueChange={(value) => handleTypeChange(value as ProjectType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="请选择项目类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product_development">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-blue-500" />
                  <span>产品开发类</span>
                </div>
              </SelectItem>
              <SelectItem value="functional_management">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>职能管理类</span>
                </div>
              </SelectItem>
              <SelectItem value="material_substitution">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-green-500" />
                  <span>物料改代类</span>
                </div>
              </SelectItem>
              <SelectItem value="troubleshooting">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>故障排查类</span>
                </div>
              </SelectItem>
              <SelectItem value="other">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span>其他</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.projectType && (
            <p className="text-sm text-red-400">{validationErrors.projectType}</p>
          )}
        </div>

        {/* 工艺代号 - 设计文档第125行：第二个字段 */}
        <div className="space-y-1.5">
          <Label htmlFor="project-code">工艺代号 *</Label>
          <Input
            id="project-code"
            value={formData.code}
            onChange={(e) => onFieldValueChange('code', e.target.value)}
            placeholder="例如：PRJ-2024-001"
            className={cn(validationErrors.code && "border-red-500")}
          />
          {validationErrors.code && (
            <p className="text-sm text-red-400">{validationErrors.code}</p>
          )}
        </div>

        {/* 项目名称 - 设计文档第126行：第三个字段 */}
        <div className="space-y-1.5">
          <Label htmlFor="project-name">项目名称 *</Label>
          <Input
            id="project-name"
            value={formData.name}
            onChange={(e) => onFieldValueChange('name', e.target.value)}
            placeholder="输入项目名称"
            maxLength={50}
            className={cn(validationErrors.name && "border-red-500")}
          />
          <div className="flex justify-between items-center">
            {validationErrors.name && (
              <p className="text-sm text-red-400">{validationErrors.name}</p>
            )}
            <span className="text-xs text-muted-foreground">
              {formData.name?.length || 0}/50
            </span>
          </div>
        </div>

        {/* 项目描述 - 设计文档：必填字段 */}
        <div className="space-y-1.5">
          <Label htmlFor="project-desc">项目描述 *</Label>
          <Textarea
            id="project-desc"
            value={formData.description || ''}
            onChange={(e) => onFieldValueChange('description', e.target.value)}
            placeholder="简要描述项目的目标和范围..."
            rows={3}
            className={cn("resize-none", validationErrors.description && "border-red-500")}
          />
          {validationErrors.description && (
            <p className="text-sm text-red-400">{validationErrors.description}</p>
          )}
        </div>

        {/* 项目成员选择 - 设计文档第136-137行 */}
        <div className="space-y-1.5">
          <Label>项目成员 *</Label>
          {organization ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* 已选成员 */}
              {(formData.memberIds || []).map((memberId) => {
                const memberInfo = membersMap.get(memberId);
                return (
                  <Badge key={memberId} variant="secondary" className="flex items-center gap-1">
                    {memberInfo?.name || memberId}
                    <button
                      type="button"
                      onClick={() => handleMemberRemove(memberId)}
                      className="ml-1 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
              {/* 选择成员按钮 */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMemberSelector(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                选择成员
              </Button>
            </div>
          ) : (
            <div className="p-3 text-center border border-dashed border-border rounded-lg bg-muted/30">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Info className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  暂无组织架构数据
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                请先创建或导入组织架构，然后再选择项目成员
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  window.location.href = '/settings?tab=organization';
                }}
              >
                <Users2 className="w-4 h-4 mr-1" />
                前往设置组织架构
              </Button>
            </div>
          )}
          {validationErrors.members && (
            <p className="text-sm text-red-400">{validationErrors.members}</p>
          )}
        </div>

        {/* 时间计划选择 */}
        {typeConfig?.requiresDates && (
          <div className="space-y-3">
            <Label>时间计划</Label>

            {/* 项目整体起止时间 - 固定双列布局 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-foreground" />
                  计划开始日期
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.plannedStartDate || ''}
                  onChange={(e) => onFieldValueChange('plannedStartDate', e.target.value)}
                  className={cn(validationErrors.plannedStartDate && "border-red-500")}
                />
                {validationErrors.plannedStartDate && (
                  <p className="text-sm text-red-400">{validationErrors.plannedStartDate}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-foreground" />
                  计划结束日期
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.plannedEndDate || ''}
                  onChange={(e) => onFieldValueChange('plannedEndDate', e.target.value)}
                  className={cn(validationErrors.plannedEndDate && "border-red-500")}
                />
                {validationErrors.plannedEndDate && (
                  <p className="text-sm text-red-400">{validationErrors.plannedEndDate}</p>
                )}
              </div>
            </div>

            {/* 打开时间计划编辑器按钮 */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onOpenTimePlanDialog?.()}
              disabled={!formData.plannedStartDate || !formData.plannedEndDate}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              配置时间计划详情
            </Button>
          </div>
        )}

        {/* 操作按钮 - 设计文档第144行：按钮靠在一起 */}
        <div className="flex justify-center gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : project ? '保存修改' : '创建项目'}
          </Button>
        </div>
      </div>

      {/* 项目类型切换确认对话框 */}
      {showTypeChangeDialog && pendingTypeChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full mx-4 p-6 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  确认切换项目类型
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  切换到 <span className="text-foreground font-medium">
                    {allTypeConfigs.find(c => c.type === pendingTypeChange)?.label || pendingTypeChange}
                  </span> 将清除以下数据：
                </p>
                <ul className="space-y-1.5 mb-4">
                  {pendingCleanupInfo?.fieldsToClear.map(field => (
                    <li key={field} className="flex items-center gap-2 text-sm text-red-400">
                      <span>•</span>
                      <span>
                        {field === 'plannedStartDate' && '计划开始日期'}
                        {field === 'plannedEndDate' && '计划结束日期'}
                        {field === 'milestones' && '所有里程碑'}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mb-4">
                  此操作无法撤销，是否继续？
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelTypeChange} className="flex-1">
                    取消
                  </Button>
                  <Button onClick={handleConfirmTypeChange} className="flex-1">
                    确认切换
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 成员选择对话框 */}
      {showMemberSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-xl w-full mx-4 p-6 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">选择项目成员</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMemberSelector(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="border border-border rounded-lg max-h-[500px] overflow-x-auto overflow-y-auto mb-4">
              <ProjectMemberSelector
                organization={organization}
                selectedMembers={formData.memberIds || []}
                onMemberToggle={handleMemberToggle}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setShowMemberSelector(false)}
              >
                完成选择
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 简化的项目表单（单页模式，无 Tab）
 */
export interface ProjectFormSimpleProps extends Omit<ProjectFormProps, 'className'> {
  /** 显示模式 */
  mode?: 'create' | 'edit';
  /** 是否显示高级选项 */
  showAdvanced?: boolean;
}

export function ProjectFormSimple({
  project,
  organization,
  membersMap,
  formData,
  validationErrors,
  onFormDataChange,
  onFieldValueChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = 'create',
  showAdvanced = false,
}: ProjectFormSimpleProps) {
  // 异步加载的项目类型配置状态
  const [typeConfig, setTypeConfig] = useState<DynamicProjectTypeConfig | null>(null);
  const [typeHints, setTypeHints] = useState<string[]>([]);
  const [allTypeConfigs, setAllTypeConfigs] = useState<DynamicProjectTypeConfig[]>([]);
  const [showTimePlanDialog, setShowTimePlanDialog] = useState(false);

  const currentType = formData.projectType || 'product_development';

  // 异步加载项目类型配置
  useEffect(() => {
    const loadConfigs = async () => {
      const configs = await ProjectTypeManager.getAllConfigs();
      setAllTypeConfigs(configs);

      const config = await ProjectTypeManager.getConfig(currentType);
      setTypeConfig(config);
      setTypeHints(config.hints);
    };
    loadConfigs();
  }, [currentType]);

  const handleMemberToggle = (memberId: string) => {
    const newMembers = toggleMemberSelection(memberId, formData.memberIds || []);
    onFieldValueChange('memberIds', newMembers);
  };

  const handleMilestonesChange = (milestones: any[]) => {
    onFieldValueChange('milestones', milestones);
  };

  const handleWbsTasksChange = (tasks: WbsTask[]) => {
    onFieldValueChange('wbsTasks', tasks);
  };

  const handleTypeChange = async (newType: ProjectType) => {
    if (newType === currentType) return;

    const cleanupInfo = await ProjectTypeManager.needsDataCleanup(currentType, newType);
    cleanupInfo.fieldsToClear.forEach(field => {
      onFieldValueChange(field as keyof ProjectFormData, field === 'milestones' ? [] : '');
    });
    onFieldValueChange('projectType', newType);
  };

  return (
    <>
      <div className="space-y-4">
        {/* 项目类型选择 */}
        <div className="space-y-2">
          <Label>项目类型</Label>
          <div className="grid grid-cols-2 gap-3">
            {allTypeConfigs.map((config) => {
              const type = config.type;
              const ItemIcon = getProjectTypeIcon(type);

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all duration-200 relative overflow-hidden",
                    formData.projectType === type
                        ? "border-primary bg-primary/20 text-white"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2 relative z-10">
                    <ItemIcon className={cn(
                      "w-4 h-4 flex-shrink-0",
                      formData.projectType === type ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div className={cn(
                      "font-semibold text-sm",
                      formData.projectType === type ? "text-white" : "text-foreground"
                    )}>
                      {config.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {/* 当前类型提示 */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {typeHints.map((hint, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-muted/50">
                {hint}
              </Badge>
            ))}
          </div>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">项目编码 *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => onFieldValueChange('code', e.target.value)}
              placeholder="PRJ-2024-001"
            />
            {validationErrors.code && (
              <p className="text-sm text-red-400">{validationErrors.code}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">项目名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFieldValueChange('name', e.target.value)}
              placeholder="输入项目名称"
            />
            {validationErrors.name && (
              <p className="text-sm text-red-400">{validationErrors.name}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">项目描述</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => onFieldValueChange('description', e.target.value)}
            placeholder="简要描述项目..."
            rows={2}
            className="resize-none"
          />
        </div>

        {/* 成员选择 */}
        <div className="space-y-1.5">
          <Label>项目成员 *</Label>
          <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto">
            <ProjectMemberSelector
              organization={organization}
              selectedMembers={(formData.memberIds || []).map(String)}
              onMemberToggle={handleMemberToggle}
            />
          </div>
          {validationErrors.members && (
            <p className="text-sm text-red-400">{validationErrors.members}</p>
          )}
        </div>

        {/* 根据项目类型显示时间计划相关字段 */}
        {typeConfig?.requiresDates && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">计划开始日期 {typeConfig.requiresDates && '*'}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.plannedStartDate || ''}
                  onChange={(e) => onFieldValueChange('plannedStartDate', e.target.value)}
                />
                {validationErrors.plannedStartDate && (
                  <p className="text-sm text-red-400">{validationErrors.plannedStartDate}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate">计划结束日期 {typeConfig.requiresDates && '*'}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.plannedEndDate || ''}
                  onChange={(e) => onFieldValueChange('plannedEndDate', e.target.value)}
                />
                {validationErrors.plannedEndDate && (
                  <p className="text-sm text-red-400">{validationErrors.plannedEndDate}</p>
                )}
              </div>
            </div>

            {/* 打开时间计划编辑器按钮 */}
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowTimePlanDialog(true)}
                disabled={!formData.plannedStartDate || !formData.plannedEndDate}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                配置时间计划详情
              </Button>
            </div>
          </>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : mode === 'create' ? '创建项目' : '保存修改'}
          </Button>
        </div>
      </div>

      {/* 时间计划编辑对话框 */}
      <ProjectTimePlanDialog
        open={showTimePlanDialog}
        onOpenChange={setShowTimePlanDialog}
        plannedStartDate={formData.plannedStartDate}
        plannedEndDate={formData.plannedEndDate}
        milestones={formData.milestones || []}
        wbsTasks={formData.wbsTasks || []}
        onMilestonesChange={handleMilestonesChange}
        onTasksChange={handleWbsTasksChange}
        onSave={(data) => {
          handleMilestonesChange(data.milestones);
          handleWbsTasksChange(data.tasks);
        }}
        readonly={false}
        projectId={formData.id}
        memberId={formData.memberIds?.[0]?.toString()}
      />
    </>
  );
}
