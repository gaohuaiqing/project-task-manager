/**
 * 项目管理器
 *
 * 使用新组件和 Hooks 重写，替换原有的 1766 行大组件
 *
 * 特点：
 * - 使用 useProjectApi 管理数据
 * - 使用 useProjectForm 处理表单
 * - 使用拆分后的子组件
 * - 移除直接 fetch 调用
 * - 支持搜索、筛选、排序
 *
 * @module components/projects/ProjectManager
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformProjectOperation } from '@/types/auth';
import { useProjectApi } from '@/hooks/useProjectApi';
import { useProjectForm, useProjectTypeValidation } from '@/hooks/useProjectForm';
import { ProjectList } from './ProjectList';
import { ProjectForm } from './ProjectForm';
import { ProjectTimePlanDialog } from './ProjectTimePlanDialog';
import { getOrganizationSync } from '@/utils/organizationManager';
import { memberService, getDisplayMembersMap } from '@/services/MemberService';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog } from '@/components/common/DialogProvider';
import type { Project, ProjectFormData } from '@/types/project';
import type { OrganizationStructure } from '@/types/organization';
import type { DisplayMember } from '@/types/member';

interface ProjectManagerProps {
  /** 初始项目列表（可选，组件会自动加载） */
  initialProjects?: Project[];
}

/**
 * 项目管理器组件
 */
// ✅ 使用 React.memo 优化组件，防止不必要的重渲染
export const ProjectManagerV2 = memo<ProjectManagerProps>(({ initialProjects }) => {
  const { user, isAdmin } = useAuth();
  const dialog = useDialog();

  // ==================== API Hooks ====================
  const api = useProjectApi();

  // ==================== 表单 Hooks ====================
  const formHook = useProjectForm();
  const validationRules = useProjectTypeValidation(formHook.formData.projectType || 'product_development');

  // ==================== 对话框状态 ====================
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimePlanDialog, setShowTimePlanDialog] = useState(false);

  // ==================== 组织架构数据 ====================
  const organization = getOrganizationSync() as OrganizationStructure | null;
  const [membersMap, setMembersMap] = useState<Map<string, DisplayMember>>(new Map());

  // 加载成员映射表
  useEffect(() => {
    getDisplayMembersMap().then(setMembersMap);
  }, []);

  // ==================== 权限检查 ====================
  const canCreate = isAdmin || canPerformProjectOperation(user, 'create');
  const canEdit = isAdmin || canPerformProjectOperation(user, 'update');  // 修复: 'edit' -> 'update'
  const canDelete = isAdmin || canPerformProjectOperation(user, 'delete');

  // ==================== 创建项目 ====================
  // ✅ 使用 useCallback 优化回调函数
  const handleCreateProject = useCallback(async () => {
    console.log('[DEBUG] handleCreateProject 开始执行', { isSubmitting });

    if (isSubmitting) {
      console.log('[DEBUG] 提前返回：正在提交');
      return;
    }

    console.log('[DEBUG] 开始验证表单');
    const isValid = formHook.validate(validationRules);
    console.log('[DEBUG] 验证结果', { isValid, errors: formHook.validationErrors });

    if (!isValid) {
      console.log('[DEBUG] 验证失败，显示错误提示');
      try {
        await dialog.alert('请检查表单，有必填字段未填写或填写有误', { variant: 'error' });
      } catch (dialogError) {
        console.error('[ERROR] 对话框调用失败', dialogError);
      }
      return;
    }

    console.log('[DEBUG] 验证通过，开始提交');
    setIsSubmitting(true);
    console.log('[DEBUG] isSubmitting 已设置为 true');

    try {
      const formData = formHook.getFormDataForSubmit();
      console.log('[DEBUG] 表单数据已准备', { formData });

      // 转换 memberIds 为数字数组
      const memberIdsAsNumbers = (formData.memberIds || []).map(id =>
        typeof id === 'string' ? parseInt(id) : id
      );

      const projectData = {
        ...formData,
        memberIds: memberIdsAsNumbers
      };

      console.log('[DEBUG] 开始调用 API 创建项目');

      // 添加超时保护（30秒）
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API调用超时（30秒），请检查网络连接')), 30000)
      );

      // 使用 Promise.race 防止 API 调用卡住
      await Promise.race([
        api.createProject(projectData as any),
        timeoutPromise
      ]);

      console.log('[DEBUG] API 调用成功');

      // 显示成功对话框（添加错误处理）
      try {
        await dialog.alert('项目创建成功！', { variant: 'success' });
        console.log('[DEBUG] 成功对话框已关闭');
      } catch (dialogError) {
        console.error('[ERROR] 成功对话框调用失败', dialogError);
        // 继续执行，不影响后续流程
      }

      setIsCreateDialogOpen(false);
      formHook.resetForm();
    } catch (error) {
      console.error('[ERROR] 创建失败', error);
      const message = error instanceof Error ? error.message : '创建项目失败';
      try {
        await dialog.alert(message, { variant: 'error' });
      } catch (dialogError) {
        console.error('[ERROR] 错误对话框调用失败', dialogError);
      }
    } finally {
      console.log('[DEBUG] finally 块执行，重置 isSubmitting');
      setIsSubmitting(false);
    }
  }, [formHook, validationRules, api, dialog]);

  // ==================== 编辑项目 ====================
  // ✅ 使用 useCallback 优化回调函数
  const handleEditProject = useCallback(async (project: Project) => {
    const projectId = typeof project.id === 'number' ? project.id : parseInt(project.id);
    setEditingProjectId(projectId);
    formHook.loadFromProject(project);

    try {
      const [members, milestones] = await Promise.all([
        api.fetchProjectMembers(projectId),
        api.fetchProjectMilestones(projectId),
      ]);

      // 添加默认值处理，防止 undefined 导致错误
      formHook.setFieldValue('memberIds', (members || []).map((m: any) => m.memberId || m.user_id || m.id));

      const milestoneFormData = (milestones || []).map((m: any) => ({
        name: m.name,
        description: m.description,
        plannedDate: m.plannedDate,
        status: m.status,
      }));
      formHook.setFieldValue('milestones', milestoneFormData);
    } catch (error) {
      console.error('加载项目详情失败:', error);
      // 即使加载失败也打开编辑对话框，使用项目已有数据
      await dialog.alert('加载项目详情失败，将使用已有数据进行编辑', { variant: 'warning' });
    }

    setIsEditDialogOpen(true);
  }, [api, formHook, dialog]);

  // ✅ 使用 useCallback 优化回调函数
  const handleSaveEdit = useCallback(async () => {
    console.log('[DEBUG] handleSaveEdit 开始执行', { editingProjectId, isSubmitting });

    if (!editingProjectId || isSubmitting) {
      console.log('[DEBUG] 提前返回：无项目ID或正在提交');
      return;
    }

    // 编辑现有项目时，使用宽松验证（不强制要求里程碑和日期）
    const editValidationRules = {
      requireDates: false,
      requireMilestones: false, // 编辑模式不强制要求里程碑
    };

    // 验证表单
    console.log('[DEBUG] 开始验证表单', { formData: formHook.formData, validationRules: editValidationRules });
    const isValid = formHook.validate(editValidationRules);
    console.log('[DEBUG] 验证结果', { isValid, errors: formHook.validationErrors });

    if (!isValid) {
      console.log('[DEBUG] 验证失败，显示错误提示', formHook.validationErrors);

      // 构造详细的错误消息
      const errorMessages = Object.values(formHook.validationErrors).join('\n');
      try {
        await dialog.alert(`表单验证失败：\n${errorMessages}`, { variant: 'error' });
      } catch (dialogError) {
        console.error('[ERROR] 对话框调用失败', dialogError);
      }
      return;
    }

    // 对于产品开发类项目，如果没有里程碑，给出警告但允许保存
    if (formHook.formData.projectType === 'product_development' &&
        (!formHook.formData.milestones || formHook.formData.milestones.length === 0)) {
      console.log('[DEBUG] 产品开发类项目没有里程碑，给出警告');
      try {
        const confirmed = await dialog.confirm(
          '该产品开发类项目没有设置里程碑，建议添加里程碑以更好地跟踪项目进度。是否继续保存？',
          { title: '提示', variant: 'warning' }
        );
        if (!confirmed) {
          return;
        }
      } catch (dialogError) {
        console.error('[ERROR] 确认对话框调用失败', dialogError);
        return;
      }
    }

    console.log('[DEBUG] 验证通过，开始提交');
    setIsSubmitting(true);
    console.log('[DEBUG] isSubmitting 已设置为 true');

    try {
      const formData = formHook.getFormDataForSubmit();
      console.log('[DEBUG] 表单数据已准备', { formData });

      // 转换 memberIds 为数字数组
      const memberIdsAsNumbers = (formData.memberIds || []).map(id =>
        typeof id === 'string' ? parseInt(id) : id
      );

      console.log('[DEBUG] 成员ID已转换', { memberIdsAsNumbers });
      console.log('[DEBUG] 开始调用 API...', { editingProjectId });

      // 添加超时保护（30秒）
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API调用超时（30秒），请检查网络连接')), 30000)
      );

      // 使用 Promise.race 防止 API 调用卡住
      await Promise.race([
        api.updateProjectFull(editingProjectId, {
          code: formData.code,
          name: formData.name,
          description: formData.description,
          projectType: formData.projectType,
          plannedStartDate: formData.plannedStartDate,
          plannedEndDate: formData.plannedEndDate,
          memberIds: memberIdsAsNumbers,
          milestones: formData.milestones,
        }),
        timeoutPromise
      ]);

      console.log('[DEBUG] API 调用成功');

      // 显示成功对话框（添加错误处理）
      try {
        await dialog.alert('项目更新成功！', { variant: 'success' });
        console.log('[DEBUG] 成功对话框已关闭');
      } catch (dialogError) {
        console.error('[ERROR] 成功对话框调用失败', dialogError);
        // 继续执行，不影响后续流程
      }

      setIsEditDialogOpen(false);
      formHook.resetForm();
      setEditingProjectId(null);
    } catch (error) {
      console.error('[ERROR] 保存失败', error);
      const message = error instanceof Error ? error.message : '更新项目失败';
      try {
        await dialog.alert(message, { variant: 'error' });
      } catch (dialogError) {
        console.error('[ERROR] 错误对话框调用失败', dialogError);
        // 对话框失败也要继续执行
      }
    } finally {
      console.log('[DEBUG] finally 块执行，重置 isSubmitting');
      setIsSubmitting(false);
    }
  }, [editingProjectId, formHook, api, dialog]);

  // ==================== 关闭对话框前确认 ====================
  // ✅ 使用 useCallback 优化回调函数
  const handleDialogClose = useCallback((open: boolean) => {
    console.log('handleDialogClose 被调用', { open, isDirty: formHook.isDirty });

    if (!open && formHook.isDirty) {
      // 有未保存的更改，显示确认对话框
      console.log('有未保存更改，显示确认对话框');
      dialog.confirm('有未保存的更改，确定要离开吗？', {
        title: '确认',
        variant: 'warning'
      }).then((confirmed) => {
        console.log('确认对话框结果', confirmed);
        if (confirmed) {
          formHook.resetForm();
          setEditingProjectId(null);
          setIsSubmitting(false); // 重置提交状态
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
        }
      });
    } else if (open) {
      // 打开对话框
      setIsCreateDialogOpen(true);
      setIsEditDialogOpen(true);
    } else {
      // 关闭对话框（没有未保存更改）
      console.log('直接关闭对话框');
      formHook.resetForm();
      setEditingProjectId(null);
      setIsSubmitting(false); // 重置提交状态
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
    }
  }, [formHook, dialog]);

  // ==================== 删除项目 ====================
  // ✅ 使用 useCallback 优化回调函数
  const handleDeleteProject = useCallback(async (project: Project) => {
    if (!canDelete) {
      await dialog.alert('权限不足：您没有删除项目的权限', { variant: 'error' });
      return;
    }

    const confirmed = await dialog.confirm(
      `确定要删除项目"${project.name}"吗？此操作不可恢复。`,
      {
        title: '确认删除项目',
        variant: 'danger'
      }
    );

    if (!confirmed) return;

    try {
      const projectId = typeof project.id === 'number' ? project.id : parseInt(project.id);
      await api.deleteProject(projectId);

      await dialog.alert('项目删除成功！', { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除项目失败';
      await dialog.alert(message, { variant: 'error' });
    }
  }, [canDelete, dialog, api]);

  // ==================== 项目点击 ====================
  // ✅ 使用 useCallback 优化回调函数
  const handleProjectClick = useCallback((project: Project) => {
    // 可以导航到项目详情页或打开详情对话框
    console.log('点击项目:', project);
  }, []);

  // ==================== 取消创建/编辑 ====================
  // ✅ 使用 useCallback 优化回调函数
  const handleCancelForm = useCallback(() => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    formHook.resetForm();
    setEditingProjectId(null);
    setIsSubmitting(false); // 重置提交状态
  }, [formHook]);

  // ==================== 时间计划编辑器 ====================
  // ✅ 使用 useCallback 优化回调函数
  const handleMilestonesChange = useCallback((milestones: any[]) => {
    formHook.setFieldValue('milestones', milestones);
  }, [formHook]);

  // ✅ 使用 useCallback 优化回调函数
  const handleWbsTasksChange = useCallback((tasks: any[]) => {
    formHook.setFieldValue('wbsTasks', tasks);
  }, [formHook]);

  // ✅ 使用 useCallback 优化回调函数
  const handleSaveTimePlan = useCallback((data: { milestones: any[]; tasks: any[] }) => {
    handleMilestonesChange(data.milestones);
    handleWbsTasksChange(data.tasks);
  }, [handleMilestonesChange, handleWbsTasksChange]);

  // ✅ 使用 useCallback 优化打开创建对话框的回调
  const handleOpenCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  // ✅ 使用 useCallback 优化打开时间计划对话框的回调
  const handleOpenTimePlanDialog = useCallback(() => {
    setShowTimePlanDialog(true);
  }, []);

  // ✅ 使用 useCallback 优化时间计划对话框状态变化的回调
  const handleTimePlanDialogOpenChange = useCallback((open: boolean) => {
    setShowTimePlanDialog(open);
  }, []);

  // ✅ 使用 useCallback 优化创建对话框状态变化的回调
  const handleCreateDialogOpenChange = useCallback((open: boolean) => {
    if (!open) handleDialogClose(open);
    else setIsCreateDialogOpen(true);
  }, [handleDialogClose]);

  // ✅ 使用 useCallback 优化编辑对话框状态变化的回调
  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    if (!open) handleDialogClose(open);
    else setIsEditDialogOpen(true);
  }, [handleDialogClose]);

  // ==================== 渲染 ====================
  return (
    <>
      <ProjectList
        projects={api.projects}
        members={Array.from(membersMap.values())}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
        onProjectClick={handleProjectClick}
        onCreateProject={handleOpenCreateDialog}
        onEdit={handleEditProject}
        onDelete={handleDeleteProject}
        isLoading={api.projectsLoading}
        error={api.projectsError}
        onRetry={api.refreshProjects}
      />

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
          {/* 固定在底部的操作按钮 */}
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
              project={api.projects.find(p => p.id === editingProjectId) || null}
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
          {/* 固定在底部的操作按钮 */}
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

      {/* 时间计划编辑对话框 - 独立渲染 */}
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

ProjectManagerV2.displayName = 'ProjectManagerV2';

/**
 * 导出别名，便于渐进式迁移
 */
export const ProjectManager = ProjectManagerV2;

export default ProjectManager;
