/**
 * 项目表单组件（动态项目类型版）
 *
 * 功能：
 * - 项目创建/编辑表单
 * - 动态加载项目类型配置
 * - 项目类型选择
 * - 成员选择
 * - 日期计划
 * - 里程碑管理
 * - 表单验证
 *
 * @module components/projects/ProjectFormDynamic
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, AlertTriangle, Loader2, Edit3, Info, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectType, ProjectFormData } from '@/types/project';
import { ProjectMemberSelector } from './ProjectMemberSelector';
import { ProjectTimePlanDialog } from './ProjectTimePlanDialog';
import type { OrganizationStructure } from '@/types/organization';
import { ProjectTypeManager, type DynamicProjectTypeConfig } from '@/utils/projectTypeManager';
import { RefreshCw, Rocket, Users } from 'lucide-react';
import type { WbsTask } from '@/types/wbs';

// Lucide React 图标映射
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Users,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Info,
};

interface ProjectFormDynamicProps {
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
}

/**
 * 项目表单组件（动态项目类型版）
 */
export function ProjectFormDynamic({
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
}: ProjectFormDynamicProps) {
  // 项目类型列表状态
  const [projectTypes, setProjectTypes] = useState<DynamicProjectTypeConfig[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  // 项目类型切换相关状态
  const [showTypeChangeDialog, setShowTypeChangeDialog] = useState(false);
  const [pendingTypeChange, setPendingTypeChange] = useState<ProjectType | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showTimePlanDialog, setShowTimePlanDialog] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);

  // 当前项目类型
  const currentType = formData.projectType || 'product_development';

  // 加载项目类型列表
  useEffect(() => {
    const loadTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const types = await ProjectTypeManager.getAllConfigs();
        setProjectTypes(types);
      } catch (error) {
        console.error('加载项目类型失败:', error);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    loadTypes();
  }, []);

  // 获取当前类型配置
  const currentTypeConfig = projectTypes.find(t => t.type === currentType);

  // 获取图标组件
  const TypeIcon = currentTypeConfig?.icon ? ICON_MAP[currentTypeConfig.icon] || Rocket : Rocket;

  // 处理项目类型变更
  const handleTypeChange = useCallback(async (newType: ProjectType) => {
    if (newType === currentType) return;

    // 检查是否需要清理数据
    const cleanupInfo = await ProjectTypeManager.needsDataCleanup(currentType, newType);

    if (cleanupInfo.needsCleanup && hasDataToClean(currentType, formData)) {
      setPendingTypeChange(newType);
      setShowTypeChangeDialog(true);
    } else {
      performTypeChange(newType);
    }
  }, [currentType, formData]);

  // 检查是否有需要清理的数据
  function hasDataToClean(type: ProjectType, data: ProjectFormData): boolean {
    if (type === 'functional_management') {
      return !!(data.plannedStartDate || data.plannedEndDate ||
               (data.milestones && data.milestones.length > 0));
    }
    return false;
  }

  // 执行类型切换
  const performTypeChange = useCallback((newType: ProjectType) => {
    setIsTransitioning(true);
    onFieldValueChange('projectType', newType);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [onFieldValueChange]);

  // 确认类型切换
  const handleConfirmTypeChange = useCallback(() => {
    if (pendingTypeChange) {
      performTypeChange(pendingTypeChange);
      setShowTypeChangeDialog(false);
      setPendingTypeChange(null);
    }
  }, [pendingTypeChange, performTypeChange]);

  // 取消类型切换
  const handleCancelTypeChange = useCallback(() => {
    setShowTypeChangeDialog(false);
    setPendingTypeChange(null);
  }, []);

  // 处理成员选择
  const handleMemberToggle = (memberId: string) => {
    const currentMembers = formData.memberIds || [];
    const numMemberId = parseInt(memberId, 10);
    const newMembers = currentMembers.includes(numMemberId)
      ? currentMembers.filter(id => id !== numMemberId)
      : [...currentMembers, numMemberId];
    onFieldValueChange('memberIds', newMembers);
  };

  // 处理成员移除
  const handleMemberRemove = (memberId: string) => {
    const currentMembers = formData.memberIds || [];
    const numMemberId = parseInt(memberId, 10);
    const newMembers = currentMembers.filter(id => id !== numMemberId);
    onFieldValueChange('memberIds', newMembers);
  };

  // 处理里程碑变更
  const handleMilestonesChange = (milestones: any[]) => {
    onFieldValueChange('milestones', milestones);
  };

  // 处理WBS任务变更
  const handleWbsTasksChange = (tasks: WbsTask[]) => {
    onFieldValueChange('wbsTasks', tasks);
  };

  // 刷新项目类型
  const handleRefreshTypes = useCallback(async () => {
    setIsLoadingTypes(true);
    await ProjectTypeManager.refresh();
    const types = await ProjectTypeManager.getAllConfigs();
    setProjectTypes(types);
    setIsLoadingTypes(false);
  }, []);

  if (isLoadingTypes) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">加载项目类型配置...</span>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      <div className="space-y-4">
        {/* 项目类型刷新按钮 */}
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshTypes}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新项目类型
          </Button>
        </div>

        {/* 设计文档第117-149行：单页显示所有字段 */}
        {/* 项目类型选择 */}
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
              {projectTypes.map((typeConfig) => {
                const ItemIcon = ICON_MAP[typeConfig.icon] || Rocket;
                return (
                  <SelectItem key={typeConfig.id} value={typeConfig.type}>
                    <div className="flex items-center gap-2">
                      <ItemIcon className={cn(
                        "w-4 h-4",
                        typeConfig.color === 'blue' && "text-blue-500",
                        typeConfig.color === 'purple' && "text-purple-500",
                        typeConfig.color === 'green' && "text-green-500",
                        typeConfig.color === 'red' && "text-red-500",
                        typeConfig.color === 'gray' && "text-gray-500"
                      )} />
                      <span>{typeConfig.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {validationErrors.projectType && (
            <p className="text-sm text-red-400">{validationErrors.projectType}</p>
          )}
        </div>

        {/* 当前项目类型说明 */}
        {currentTypeConfig && (
          <div className={cn(
            "p-3 rounded-lg border transition-all duration-300",
            isTransitioning ? "opacity-50 scale-95" : "opacity-100 scale-100"
          )}>
            <div className="flex items-start gap-2">
              <TypeIcon className={cn(
                "w-5 h-5 flex-shrink-0 mt-0.5",
                currentTypeConfig.color === 'blue' && "text-blue-400",
                currentTypeConfig.color === 'purple' && "text-purple-400",
                currentTypeConfig.color === 'orange' && "text-orange-400",
                currentTypeConfig.color === 'red' && "text-red-400"
              )} />
              <div className="flex-1">
                <h4 className="font-medium text-white text-sm mb-1">
                  {currentTypeConfig.label}
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {currentTypeConfig.detail}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentTypeConfig.hints.map((hint, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-muted/50">
                      {hint}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 项目编码 */}
        <div className="space-y-1.5">
          <Label htmlFor="project-code">项目编码/工艺代号 *</Label>
          <Input
            id="project-code"
            value={formData.code}
            onChange={(e) => onFieldValueChange('code', e.target.value)}
            placeholder={`例如：${currentTypeConfig?.codePrefix || 'PRJ'}-2024-001`}
            className={cn(validationErrors.code && "border-red-500")}
          />
          {validationErrors.code && (
            <p className="text-sm text-red-400">{validationErrors.code}</p>
          )}
        </div>

        {/* 项目名称 */}
        <div className="space-y-1.5">
          <Label htmlFor="project-name">项目名称 *</Label>
          <Input
            id="project-name"
            value={formData.name}
            onChange={(e) => onFieldValueChange('name', e.target.value)}
            placeholder="输入项目名称"
            className={cn(validationErrors.name && "border-red-500")}
          />
          {validationErrors.name && (
            <p className="text-sm text-red-400">{validationErrors.name}</p>
          )}
        </div>

        {/* 项目描述 */}
        <div className="space-y-1.5">
          <Label htmlFor="project-desc">项目描述</Label>
          <Textarea
            id="project-desc"
            value={formData.description || ''}
            onChange={(e) => onFieldValueChange('description', e.target.value)}
            placeholder="简要描述项目的目标和范围..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* 项目成员 - 单行布局 */}
        <div className="space-y-1.5">
          <Label>项目成员 *</Label>
          {organization ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* 已选成员 */}
              {(formData.memberIds || []).map((memberId) => {
                const memberInfo = membersMap.get(String(memberId));
                return (
                  <Badge key={memberId} variant="secondary" className="flex items-center gap-1">
                    {memberInfo?.name || memberId}
                    <button
                      type="button"
                      onClick={() => handleMemberRemove(String(memberId))}
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
            </div>
          )}
          {validationErrors.members && (
            <p className="text-sm text-red-400">{validationErrors.members}</p>
          )}
        </div>

        {/* 时间计划 */}
        {currentTypeConfig?.requiresDates ? (
          <div className="space-y-3">
            <Label>时间计划 *</Label>
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
                  required
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
                  required
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
              onClick={() => setShowTimePlanDialog(true)}
              disabled={!formData.plannedStartDate || !formData.plannedEndDate}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              配置时间计划详情
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            <Calendar className="w-6 h-6 mx-auto mb-1 opacity-50 text-foreground" />
            <p className="text-sm">{currentTypeConfig?.label}不需要填写时间计划</p>
          </div>
        )}

        {/* 操作按钮 - 居中对齐 */}
        <div className="flex justify-center gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : project ? '保存修改' : '创建项目'}
          </Button>
        </div>
      </div>

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
                selectedMembers={(formData.memberIds || []).map(String)}
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

      {/* 项目类型切换确认对话框 */}
      {showTypeChangeDialog && pendingTypeChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full mx-4 p-6 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  确认切换项目类型
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  切换项目类型将清除日期和里程碑数据
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
    </div>
  );
}

export default ProjectFormDynamic;
