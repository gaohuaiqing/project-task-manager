/**
 * 项目管理器 - React Query 优化版本
 *
 * 优化内容：
 * 1. 使用 React Query 管理服务端状态
 * 2. 自动缓存和请求去重
 * 3. 优化的变更操作（自动刷新缓存）
 * 4. 修复 WebSocket 监听器（使用 Query Cache 更新）
 * 5. 骨架屏加载体验
 *
 * @module components/projects/ProjectManagerOptimized
 */

import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformProjectOperation } from '@/types/auth';
import { useProjectQueries } from '@/hooks/useProjectQueries';
import { useProjectForm, useProjectTypeValidation } from '@/hooks/useProjectForm';
import { ProjectList } from './ProjectList';
import { ProjectForm } from './ProjectForm';
import { ProjectTimePlanDialog } from './ProjectTimePlanDialog';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog } from '@/components/common/DialogProvider';
import { ProjectListSkeleton } from './ProjectListSkeleton';
import { mySqlDataService } from '@/services/MySqlDataService';
import { getDisplayMembersMap } from '@/services/MemberService';
import { getOrganization } from '@/utils/organizationManager';
import { useQueryClient } from '@tanstack/react-query';
import type { Project, ProjectFormData } from '@/types/project';
import type { DisplayMember } from '@/types/member';

interface ProjectManagerOptimizedProps {
  /** 初始项目列表（可选，组件会自动加载） */
  initialProjects?: Project[];
}

/**
 * 项目管理器组件 - React Query 优化版本
 */
export const ProjectManagerOptimized = memo<ProjectManagerOptimizedProps>(({ initialProjects }) => {
  const { user, isAdmin } = useAuth();
  const dialog = useDialog();
  const queryClient = useQueryClient();

  // ==================== 使用 React Query 加载数据 ====================
  const { data: projects = [], isLoading, error } = useProjects();

  // ==================== 使用 Mutations ====================
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  // ==================== 成员和组织数据 ====================
  const [membersMap, setMembersMap] = useState<Map<string, DisplayMember>>(new Map());
  const [organization, setOrganization] = useState<any>(null);
  const [membersLoaded, setMembersLoaded] = useState(false);

  // 加载成员和组织数据（一次性）
  useEffect(() => {
    let isMounted = true;

    const loadMembersAndOrganization = async () => {
      try {
        const [members, org] = await Promise.all([
          getDisplayMembersMap(),
          getOrganization().catch(() => null),
        ]);

        if (isMounted) {
          setMembersMap(members);
          setOrganization(org);
          setMembersLoaded(true);
        }
      } catch (err) {
        console.error('[ProjectManagerOptimized] 加载成员数据失败:', err);
        if (isMounted) {
          setMembersLoaded(true);
        }
      }
    };

    loadMembersAndOrganization();

    return () => {
      isMounted = false;
    };
  }, []);

  // 成员列表（用于表单）
  const membersList = useMemo(() => {
    return Array.from(membersMap.values());
  }, [membersMap]);

  // ==================== 表单 Hooks ====================
  const formHook = useProjectForm();
  const validationRules = useProjectTypeValidation(formHook.formData.projectType || 'product_development');

  // ==================== 对话框状态 ====================
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePlanDialog, setShowTimePlanDialog] = useState(false);

  // ==================== 权限检查 ====================
  const canCreate = isAdmin || canPerformProjectOperation(user, 'create');
  const canEdit = isAdmin || canPerformProjectOperation(user, 'update');
  const canDelete = isAdmin || canPerformProjectOperation(user, 'delete');

  // ==================== WebSocket 实时更新（修复版）====================
  useEffect(() => {
    // 订阅项目数据更新
    const unsubscribe = mySqlDataService.on('projects', ({ operation, record }) => {
      console.log('[ProjectManagerOptimized] 收到项目更新:', operation, record);

      // 直接更新 Query Cache，不触发 fetchProjects（避免重复请求）
      queryClient.setQueryData(['projects'], (old: Project[] = []) => {
        switch (operation) {
          case 'create':
            return [...old, record];
          case 'update':
            return old.map(p => p.id === record.id ? record : p);
          case 'delete':
            return old.filter(p => p.id !== record.id);
          default:
            return old;
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]); // 只依赖 queryClient，避免频繁重建

  // ==================== 创建项目 ====================
  const handleCreateProject = useCallback(async () => {
    if (isSubmitting) return;

    if (!formHook.validate(validationRules)) {
      await dialog.alert('请检查表单，有必填字段未填写或填写有误', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = formHook.getFormDataForSubmit();

      // 转换 memberIds 为数字数组
      const memberIdsAsNumbers = (formData.memberIds || []).map(id =>
        typeof id === 'string' ? parseInt(id) : id
      );

      const projectData = {
        ...formData,
        memberIds: memberIdsAsNumbers
      };

      // 调用创建 API（React Query 会自动刷新缓存）
      await createProjectMutation.mutateAsync(projectData as any);

      await dialog.alert('项目创建成功！', { variant: 'success' });
      setIsCreateDialogOpen(false);
      formHook.resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建项目失败';
      await dialog.alert(message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, formHook, validationRules, dialog, createProjectMutation]);

  // ==================== 编辑项目 ====================
  const handleEditProject = useCallback(async (project: Project) => {
    const projectId = typeof project.id === 'number' ? project.id : parseInt(project.id);
    setEditingProjectId(projectId);
    formHook.loadFromProject(project);
    setIsEditDialogOpen(true);
  }, [formHook]);

  // ==================== 保存编辑 ====================
  const handleSaveEdit = useCallback(async () => {
    if (!editingProjectId || isSubmitting) {
      return;
    }

    // 编辑现有项目时，使用宽松验证
    const editValidationRules = {
      requireDates: false,
      requireMilestones: false,
    };

    const isValid = formHook.validate(editValidationRules);

    if (!isValid) {
      const errorMessages = Object.values(formHook.validationErrors).join('\n');
      await dialog.alert(`表单验证失败：\n${errorMessages}`, { variant: 'error' });
      return;
    }

    // 对于产品开发类项目，如果没有里程碑，给出警告但允许保存
    if (formHook.formData.projectType === 'product_development' &&
        (!formHook.formData.milestones || formHook.formData.milestones.length === 0)) {
      const confirmed = await dialog.confirm(
        '该产品开发类项目没有设置里程碑，建议添加里程碑以更好地跟踪项目进度。是否继续保存？',
        { title: '提示', variant: 'warning' }
      );
      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = formHook.getFormDataForSubmit();

      // 转换 memberIds 为数字数组
      const memberIdsAsNumbers = (formData.memberIds || []).map(id =>
        typeof id === 'string' ? parseInt(id) : id
      );

      // 调用更新 API（React Query 会自动刷新缓存）
      await updateProjectMutation.mutateAsync({
        id: editingProjectId,
        data: {
          ...formData,
          memberIds: memberIdsAsNumbers
        } as any
      });

      await dialog.alert('项目更新成功！', { variant: 'success' });
      setIsEditDialogOpen(false);
      formHook.resetForm();
      setEditingProjectId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新项目失败';
      await dialog.alert(message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingProjectId, isSubmitting, formHook, dialog, updateProjectMutation]);

  // ==================== 删除项目 ====================
  const handleDeleteProject = useCallback(async (project: Project) => {
    const confirmed = await dialog.confirm(
      `确定要删除项目"${project.name}"吗？此操作不可撤销。`,
      { title: '确认删除', variant: 'destructive' }
    );

    if (!confirmed) return;

    try {
      // 调用删除 API（React Query 会自动刷新缓存）
      await deleteProjectMutation.mutateAsync(project.id as number);

      await dialog.alert('项目删除成功！', { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除项目失败';
      await dialog.alert(message, { variant: 'error' });
    }
  }, [dialog, deleteProjectMutation]);

  // ==================== 项目点击 ====================
  const handleProjectClick = useCallback((project: Project) => {
    console.log('[ProjectManagerOptimized] 项目被点击:', project.id);
    // TODO: 处理项目点击事件（打开详情页）
  }, []);

  // ==================== 对话框操作 ====================
  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      formHook.resetForm();
      setEditingProjectId(null);
      setIsSubmitting(false);
    }
  }, [formHook]);

  const handleCancelForm = useCallback(() => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    formHook.resetForm();
    setEditingProjectId(null);
    setIsSubmitting(false);
  }, [formHook]);

  const handleMilestonesChange = useCallback((milestones: any[]) => {
    formHook.setFieldValue('milestones', milestones);
  }, [formHook]);

  const handleWbsTasksChange = useCallback((tasks: any[]) => {
    formHook.setFieldValue('wbsTasks', tasks);
  }, [formHook]);

  const handleSaveTimePlan = useCallback((data: { milestones: any[]; tasks: any[] }) => {
    handleMilestonesChange(data.milestones);
    handleWbsTasksChange(data.tasks);
  }, [handleMilestonesChange, handleWbsTasksChange]);

  const handleOpenCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleOpenTimePlanDialog = useCallback(() => {
    setShowTimePlanDialog(true);
  }, []);

  const handleTimePlanDialogOpenChange = useCallback((open: boolean) => {
    setShowTimePlanDialog(open);
  }, []);

  const handleCreateDialogOpenChange = useCallback((open: boolean) => {
    if (!open) handleDialogClose(open);
    else setIsCreateDialogOpen(true);
  }, [handleDialogClose]);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    if (!open) handleDialogClose(open);
    else setIsEditDialogOpen(true);
  }, [handleDialogClose]);

  // ==================== 渲染 ====================
  return (
    <>
      {isLoading || !membersLoaded ? (
        // 显示骨架屏
        <ProjectListSkeleton />
      ) : error ? (
        // 显示错误状态
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">加载失败</h3>
            <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })} variant="outline">
              重试
            </Button>
          </div>
        </div>
      ) : (
        // 显示项目列表
        <ProjectList
          projects={projects}
          members={membersList}
          canEdit={canEdit}
          canCreate={canCreate}
          canDelete={canDelete}
          onProjectClick={handleProjectClick}
          onCreateProject={handleOpenCreateDialog}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          isLoading={false}
          error={null}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
        />
      )}

      {/* 创建项目对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0 pr-12">
            <DialogTitle className="text-xl font-semibold text-foreground">新建项目</DialogTitle>
          </DialogHeader>
          <div className="px-6 overflow-y-auto flex-1" style={{ paddingBottom: '80px' }}>
            <ProjectForm
              project={null}
              organization={organization}
              membersMap={membersMap}
              formData={formHook.formData}
              validationErrors={formHook.validationErrors}
              onFormDataChange={formHook.setFormData}
              onFieldValueChange={formHook.setFieldValue}
              onSubmit={handleCreateProject}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting || createProjectMutation.isPending}
              onOpenTimePlanDialog={handleOpenTimePlanDialog}
              showActions={false}
            />
          </div>
          <div className="flex justify-center gap-3 px-6 py-4 border-t border-border bg-card flex-shrink-0 relative z-10">
            <Button type="button" variant="outline" onClick={handleCancelForm}>
              取消
            </Button>
            <Button type="button" onClick={handleCreateProject} disabled={isSubmitting || createProjectMutation.isPending}>
              {isSubmitting || createProjectMutation.isPending ? '提交中...' : '创建项目'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑项目对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-4 pb-3 border-b border-border flex-shrink-0 pr-12">
            <DialogTitle className="text-xl font-semibold text-foreground">编辑项目</DialogTitle>
          </DialogHeader>
          <div className="px-6 overflow-y-auto flex-1" style={{ paddingBottom: '80px' }}>
            <ProjectForm
              project={projects.find(p => p.id === editingProjectId) || null}
              organization={organization}
              membersMap={membersMap}
              formData={formHook.formData}
              validationErrors={formHook.validationErrors}
              onFormDataChange={formHook.setFormData}
              onFieldValueChange={formHook.setFieldValue}
              onSubmit={handleSaveEdit}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting || updateProjectMutation.isPending}
              onOpenTimePlanDialog={handleOpenTimePlanDialog}
              showActions={false}
            />
          </div>
          <div className="flex justify-center gap-3 px-6 py-4 border-t border-border bg-card flex-shrink-0 relative z-10">
            <Button type="button" variant="outline" onClick={handleCancelForm}>
              取消
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={isSubmitting || updateProjectMutation.isPending}>
              {isSubmitting || updateProjectMutation.isPending ? '提交中...' : '保存修改'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={dialog.confirmDialog.isOpen}
        options={dialog.confirmDialog.options}
        onConfirm={dialog.confirmDialog.handleConfirm}
        onCancel={dialog.confirmDialog.handleCancel}
      />

      {/* 时间计划编辑对话框 */}
      <ProjectTimePlanDialog
        open={showTimePlanDialog}
        onOpenChange={handleTimePlanDialogOpenChange}
        plannedStartDate={formHook.formData.plannedStartDate}
        plannedEndDate={formHook.formData.plannedEndDate}
        milestones={formHook.formData.milestones || []}
        wbsTasks={formHook.formData.wbsTasks || []}
        onMilestonesChange={handleMilestonesChange}
        onTasksChange={handleWbsTasksChange}
        onSave={handleSaveTimePlan}
        readonly={false}
        projectId={formHook.formData.id}
        memberId={formHook.formData.memberIds?.[0]?.toString()}
      />
    </>
  );
});

ProjectManagerOptimized.displayName = 'ProjectManagerOptimized';

export default ProjectManagerOptimized;
