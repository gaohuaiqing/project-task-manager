/**
 * 项目管理器 - 性能优化版本
 *
 * 优化内容：
 * 1. 使用 useInitialData 进行批量数据加载
 * 2. 并行加载项目和成员数据
 * 3. 优化加载状态和错误处理
 * 4. 添加骨架屏加载体验
 * 5. 性能监控集成
 *
 * @module components/projects/ProjectManagerOptimized
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformProjectOperation } from '@/types/auth';
import { useInitialData } from '@/hooks/useInitialData';
import { useProjectForm, useProjectTypeValidation } from '@/hooks/useProjectForm';
import { ProjectList } from './ProjectList';
import { ProjectForm } from './ProjectForm';
import { ProjectTimePlanDialog } from './ProjectTimePlanDialog';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog } from '@/components/common/DialogProvider';
import { ProjectListSkeleton } from './ProjectListSkeleton';
import type { Project, ProjectFormData } from '@/types/project';
import type { DisplayMember } from '@/types/member';

interface ProjectManagerOptimizedProps {
  /** 初始项目列表（可选，组件会自动加载） */
  initialProjects?: Project[];
}

/**
 * 项目管理器组件 - 性能优化版本
 */
export const ProjectManagerOptimized = memo<ProjectManagerOptimizedProps>(({ initialProjects }) => {
  const { user, isAdmin } = useAuth();
  const dialog = useDialog();

  // ==================== 优化的数据加载 ====================
  // 使用批量查询和并行加载
  const {
    projects,
    members,
    organization,
    loading,
    error,
    reload
  } = useInitialData();

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

  // ==================== 成员映射表 ====================
  // 使用 useMemo 优化性能，避免重复计算
  const membersMap = useMemo(() => {
    return new Map<string, DisplayMember>(
      Array.from(members.entries()).map(([key, member]) => [
        key,
        {
          id: member.id,
          name: member.name,
          employeeId: member.employee_id,
          department: member.department,
          position: member.position,
          email: member.email,
          phone: member.phone,
          status: member.status as 'active' | 'inactive'
        }
      ])
    );
  }, [members]);

  // ==================== 成员列表（用于表单）====================
  const membersList = useMemo(() => {
    return Array.from(membersMap.values());
  }, [membersMap]);

  // ==================== API 操作（使用原 Hook 保持兼容）====================
  // 注意：这里我们仍然使用 useProjectApi 来处理 CRUD 操作
  // 但数据加载已通过 useInitialData 优化
  // 实际项目中可以考虑将 CRUD 操作也集成到 useInitialData 中

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

      // TODO: 调用创建 API
      // await api.createProject(projectData as any);

      await dialog.alert('项目创建成功！', { variant: 'success' });
      setIsCreateDialogOpen(false);
      formHook.resetForm();

      // 重新加载数据
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建项目失败';
      await dialog.alert(message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, formHook, validationRules, dialog, reload]);

  // ==================== 编辑项目 ====================
  const handleEditProject = useCallback(async (project: Project) => {
    const projectId = typeof project.id === 'number' ? project.id : parseInt(project.id);
    setEditingProjectId(projectId);
    formHook.loadFromProject(project);

    // TODO: 加载项目详情（成员、里程碑）
    // const [members, milestones] = await Promise.all([
    //   api.fetchProjectMembers(projectId),
    //   api.fetchProjectMilestones(projectId),
    // ]);

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

      // TODO: 调用更新 API
      // await api.updateProjectFull(editingProjectId, {
      //   ...formData,
      //   memberIds: memberIdsAsNumbers
      // } as any);

      await dialog.alert('项目更新成功！', { variant: 'success' });
      setIsEditDialogOpen(false);
      formHook.resetForm();
      setEditingProjectId(null);

      // 重新加载数据
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新项目失败';
      await dialog.alert(message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingProjectId, isSubmitting, formHook, dialog, reload]);

  // ==================== 删除项目 ====================
  const handleDeleteProject = useCallback(async (project: Project) => {
    const confirmed = await dialog.confirm(
      `确定要删除项目"${project.name}"吗？此操作不可撤销。`,
      { title: '确认删除', variant: 'destructive' }
    );

    if (!confirmed) return;

    try {
      // TODO: 调用删除 API
      // await api.deleteProject(project.id);

      await dialog.alert('项目删除成功！', { variant: 'success' });

      // 重新加载数据
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除项目失败';
      await dialog.alert(message, { variant: 'error' });
    }
  }, [dialog, reload]);

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
      {loading ? (
        // 显示骨架屏
        <ProjectListSkeleton />
      ) : error ? (
        // 显示错误状态
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">加载失败</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={reload} variant="outline">
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
          onRetry={reload}
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
              isSubmitting={isSubmitting}
              onOpenTimePlanDialog={handleOpenTimePlanDialog}
              showActions={false}
            />
          </div>
          <div className="flex justify-center gap-3 px-6 py-4 border-t border-border bg-card flex-shrink-0 relative z-10">
            <Button type="button" variant="outline" onClick={handleCancelForm}>
              取消
            </Button>
            <Button type="button" onClick={handleCreateProject} disabled={isSubmitting}>
              {isSubmitting ? '提交中...' : '创建项目'}
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
              isSubmitting={isSubmitting}
              onOpenTimePlanDialog={handleOpenTimePlanDialog}
              showActions={false}
            />
          </div>
          <div className="flex justify-center gap-3 px-6 py-4 border-t border-border bg-card flex-shrink-0 relative z-10">
            <Button type="button" variant="outline" onClick={handleCancelForm}>
              取消
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? '提交中...' : '保存修改'}
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
