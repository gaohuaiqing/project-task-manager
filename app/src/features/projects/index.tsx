/**
 * 项目管理页面
 */
import { useState } from 'react';
import { ProjectList } from './components/ProjectList';
import { ProjectForm } from './components/ProjectForm';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './hooks/useProjectMutations';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from './types';

export default function ProjectsPage() {
  // 对话框状态
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Mutations
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject(selectedProject?.id ?? '');
  const deleteMutation = useDeleteProject();

  // 处理创建项目
  const handleCreateProject = () => {
    setSelectedProject(null);
    setFormOpen(true);
  };

  // 处理编辑项目
  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setFormOpen(true);
  };

  // 处理删除项目
  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setDeleteOpen(true);
  };

  // 提交表单
  const handleFormSubmit = async (data: CreateProjectRequest | UpdateProjectRequest) => {
    if (selectedProject) {
      await updateMutation.mutateAsync(data as UpdateProjectRequest);
    } else {
      await createMutation.mutateAsync(data as CreateProjectRequest);
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (selectedProject) {
      await deleteMutation.mutateAsync(selectedProject.id);
      setDeleteOpen(false);
      setSelectedProject(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">项目管理</h1>
        <p className="text-muted-foreground">管理所有项目和里程碑</p>
      </div>

      {/* 项目列表 */}
      <ProjectList
        onCreateProject={handleCreateProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* 项目表单对话框 */}
      <ProjectForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setSelectedProject(null);
        }}
        project={selectedProject}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelectedProject(null);
        }}
        title="删除项目"
        description={`确定要删除项目 "${selectedProject?.name}" 吗？此操作无法撤销。`}
        confirmText="删除"
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
