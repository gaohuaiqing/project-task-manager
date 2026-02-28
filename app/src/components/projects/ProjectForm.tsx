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

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectType, ProjectFormData } from '@/types/project';
import { PROJECT_TYPE_LABELS } from '@/types/project';
import { ProjectMemberSelector, SelectedMembersDisplay } from './ProjectMemberSelector';
import { ProjectMilestones } from './ProjectMilestones';
import type { OrganizationStructure } from '@/types/organization';

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
}

/**
 * 获取项目类型说明
 */
function getProjectTypeDescription(type: ProjectType): string {
  switch (type) {
    case 'product_development':
      return '产品开发类项目需要明确时间计划和关键里程碑';
    case 'functional_management':
      return '职能管理类项目以团队建设和日常管理为主';
  }
}

/**
 * 获取项目类型提示
 */
function getProjectTypeHints(type: ProjectType): string[] {
  switch (type) {
    case 'product_development':
      return [
        '必须填写计划开始和结束时间',
        '必须添加至少一个关键里程碑',
        '里程碑将用于跟踪项目进度',
      ];
    case 'functional_management':
      return [
        '时间计划为可选项',
        '不需要添加里程碑',
        '重点关注团队成员配置',
      ];
  }
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
}: ProjectFormProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'members' | 'plan'>('basic');

  // 监听项目类型变化，自动切换到对应提示
  const currentType = formData.projectType || 'product_development';

  // 监听项目类型变化，清理不需要的字段
  React.useEffect(() => {
    if (currentType === 'functional_management') {
      // 职能管理类项目不需要日期和里程碑，清空这些字段
      if (formData.plannedStartDate || formData.plannedEndDate) {
        onFieldValueChange('plannedStartDate', '');
        onFieldValueChange('plannedEndDate', '');
      }
      if (formData.milestones && formData.milestones.length > 0) {
        onFieldValueChange('milestones', []);
      }
    }
  }, [currentType]);

  // 处理成员选择
  const handleMemberToggle = (memberId: string) => {
    const currentMembers = formData.memberIds || [];
    // 统一转换为 number 类型进行比较
    const numMemberId = parseInt(memberId, 10);
    const newMembers = currentMembers.includes(numMemberId)
      ? currentMembers.filter(id => id !== numMemberId)
      : [...currentMembers, numMemberId];
    onFieldValueChange('memberIds', newMembers);
  };

  // 处理成员移除（从已选展示区）
  const handleMemberRemove = (memberId: string) => {
    const currentMembers = formData.memberIds || [];
    // 统一转换为 number 类型进行比较
    const numMemberId = parseInt(memberId, 10);
    const newMembers = currentMembers.filter(id => id !== numMemberId);
    onFieldValueChange('memberIds', newMembers);
  };

  // 处理里程碑变更
  const handleMilestonesChange = (milestones: any[]) => {
    onFieldValueChange('milestones', milestones);
  };

  // 处理下一步/上一步
  const handleNextTab = () => {
    if (activeTab === 'basic') setActiveTab('members');
    else if (activeTab === 'members') setActiveTab('plan');
  };

  const handlePrevTab = () => {
    if (activeTab === 'members') setActiveTab('basic');
    else if (activeTab === 'plan') setActiveTab('members');
  };

  // 类型提示
  const typeHints = getProjectTypeHints(currentType);

  return (
    <div className={cn("", className)}>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="members">
              项目成员
              {(formData.memberIds?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {formData.memberIds?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="plan">
              时间计划
              {currentType === 'product_development' && <Badge variant="destructive" className="ml-1 text-xs">*</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* 基本信息 Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* 项目类型选择 */}
            <div className="space-y-2">
              <Label>项目类型 *</Label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onFieldValueChange('projectType', type)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      formData.projectType === type
                        ? "border-primary bg-primary/30 text-white"
                        : "border-slate-800 bg-slate-900/10 text-slate-600 hover:bg-slate-800/20"
                    )}
                  >
                    <div className="font-semibold text-sm mb-1">
                      {PROJECT_TYPE_LABELS[type]}
                    </div>
                    <div className="text-xs">
                      {getProjectTypeDescription(type)}
                    </div>
                  </button>
                ))}
              </div>
              {validationErrors.projectType && (
                <p className="text-sm text-red-400">{validationErrors.projectType}</p>
              )}
            </div>

            {/* 项目编码 */}
            <div className="space-y-1.5">
              <Label htmlFor="project-code">项目编码/工艺代号 *</Label>
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

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={handleNextTab}>
                下一步：项目成员
              </Button>
            </div>
          </TabsContent>

          {/* 项目成员 Tab */}
          <TabsContent value="members" className="space-y-4 mt-4">
            {/* 成员选择器 */}
            <div className="space-y-1.5">
              <Label>选择项目成员 *</Label>
              <div className="border border-border rounded-lg max-h-[400px] overflow-y-auto">
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

            {/* 已选成员展示 */}
            <div className="space-y-1.5">
              <Label>已选择成员 ({(formData.memberIds || []).length}人)</Label>
              <SelectedMembersDisplay
                selectedMembers={(formData.memberIds || []).map(String)}
                membersMap={membersMap}
                onRemove={handleMemberRemove}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={handlePrevTab}>
                上一步
              </Button>
              <Button type="button" onClick={handleNextTab}>
                下一步：时间计划
              </Button>
            </div>
          </TabsContent>

          {/* 时间计划 Tab */}
          <TabsContent value="plan" className="space-y-4 mt-4">
            {currentType === 'product_development' ? (
              <>
                {/* 计划时间 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="start-date" className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      计划开始日期 *
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
                      <Calendar className="w-3.5 h-3.5" />
                      计划结束日期 *
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

                {/* 里程碑 */}
                <div className="space-y-1.5">
                  <Label>关键里程碑 *</Label>
                  <ProjectMilestones
                    milestones={formData.milestones || []}
                    onChange={handleMilestonesChange}
                  />
                  {validationErrors.milestones && (
                    <p className="text-sm text-red-400">{validationErrors.milestones}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>职能管理类项目不需要填写时间计划和里程碑</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={handlePrevTab}>
                上一步
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  取消
                </Button>
                <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
                  {isSubmitting ? '提交中...' : project ? '保存修改' : '创建项目'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
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
  const currentType = formData.projectType || 'product_development';

  const handleMemberToggle = (memberId: string) => {
    const currentMembers = formData.memberIds || [];
    // 统一转换为 number 类型进行比较
    const numMemberId = parseInt(memberId, 10);
    const newMembers = currentMembers.includes(numMemberId)
      ? currentMembers.filter(id => id !== numMemberId)
      : [...currentMembers, numMemberId];
    onFieldValueChange('memberIds', newMembers);
  };

  const handleMilestonesChange = (milestones: any[]) => {
    onFieldValueChange('milestones', milestones);
  };

  return (
    <div className="space-y-4">
        {/* 项目类型选择 */}
        <div className="space-y-2">
          <Label>项目类型</Label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onFieldValueChange('projectType', type)}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all",
                  formData.projectType === type
                      ? "border-primary bg-primary/30 text-white"
                      : "border-slate-800 bg-slate-900/10 text-slate-600 hover:bg-slate-800/20"
                )}
              >
                <div className="font-semibold text-sm">
                  {PROJECT_TYPE_LABELS[type]}
                </div>
              </button>
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

        {/* 产品开发类项目的额外字段 */}
        {currentType === 'product_development' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">计划开始日期 *</Label>
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
                <Label htmlFor="endDate">计划结束日期 *</Label>
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

            <div className="space-y-1.5">
              <Label>关键里程碑 *</Label>
              <ProjectMilestones
                milestones={formData.milestones || []}
                onChange={handleMilestonesChange}
              />
              {validationErrors.milestones && (
                <p className="text-sm text-red-400">{validationErrors.milestones}</p>
              )}
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
  );
}
