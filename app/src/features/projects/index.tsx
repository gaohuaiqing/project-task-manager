/**
 * 项目管理页面入口
 *
 * @module features/projects
 * @description 根据路由参数显示项目列表或项目详情页
 * - /projects -> 项目列表
 * - /projects/:id -> 项目详情（包含时间线入口）
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectList } from './components/ProjectList';
import { ProjectForm } from './components/ProjectForm';
import { ProjectDetail } from './components/ProjectDetail';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './hooks/useProjectMutations';
import { useProject, useProjectMilestones } from './hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from './types';

/**
 * 项目列表页面组件
 */
function ProjectListPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // 对话框状态
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Mutations
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject(selectedProject?.id ?? '');
  const deleteMutation = useDeleteProject();

  // 获取选中项目的里程碑（用于编辑表单）
  const { data: existingMilestones = [] } = useProjectMilestones(selectedProject?.id);

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
  const handleFormSubmit = async (data: CreateProjectRequest | UpdateProjectRequest): Promise<string | boolean> => {
    try {
      if (selectedProject) {
        await updateMutation.mutateAsync(data as UpdateProjectRequest);
        toast({ title: '成功', description: '项目更新成功' });
        return true;
      } else {
        const result = await createMutation.mutateAsync(data as CreateProjectRequest);
        toast({ title: '成功', description: '项目创建成功' });
        // 返回新创建的项目ID
        return result.id;
      }
    } catch (error: any) {
      if (error.code === 'VERSION_CONFLICT') {
        toast({
          title: '保存冲突',
          description: '数据已被其他人修改，请刷新后重试',
          variant: 'destructive'
        });
      } else {
        toast({
          title: '保存失败',
          description: error.message || '操作失败，请稍后重试',
          variant: 'destructive'
        });
      }
      return false;
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (selectedProject) {
      try {
        await deleteMutation.mutateAsync(selectedProject.id);
        toast({ title: '成功', description: '项目已删除' });
        setDeleteOpen(false);
        setSelectedProject(null);
      } catch (error: any) {
        toast({
          title: '删除失败',
          description: error.message || '操作失败，请稍后重试',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
        existingMilestones={existingMilestones}
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

/**
 * 项目详情页面组件
 */
function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // 对话框状态（用于编辑/删除）
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 获取项目数据
  const { data: project } = useProject(id);

  // Mutations
  const updateMutation = useUpdateProject(id ?? '');
  const deleteMutation = useDeleteProject();

  // 获取里程碑（用于编辑表单）
  const { data: existingMilestones = [] } = useProjectMilestones(id);

  // 处理编辑
  const handleEdit = () => {
    setFormOpen(true);
  };

  // 处理删除
  const handleDelete = () => {
    setDeleteOpen(true);
  };

  // 提交表单
  const handleFormSubmit = async (data: UpdateProjectRequest) => {
    try {
      await updateMutation.mutateAsync(data);
      toast({ title: '成功', description: '项目更新成功' });
      return true;
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
      return false;
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (id) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: '成功', description: '项目已删除' });
        setDeleteOpen(false);
        navigate('/projects');
      } catch (error: any) {
        toast({
          title: '删除失败',
          description: error.message || '操作失败，请稍后重试',
          variant: 'destructive',
        });
      }
    }
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">项目 ID 无效</p>
      </div>
    );
  }

  return (
    <>
      <ProjectDetail
        projectId={id}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 编辑表单对话框 */}
      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={project}
        existingMilestones={existingMilestones}
        onSubmit={handleFormSubmit}
        isLoading={updateMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除项目"
        description={`确定要删除项目 "${project?.name}" 吗？此操作无法撤销。`}
        confirmText="删除"
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </>
  );
}

/**
 * 项目管理页面入口
 * 根据路由参数决定显示列表或详情
 */
export default function ProjectsPage() {
  const { id } = useParams<{ id: string }>();

  // 有 ID 参数时显示详情页
  if (id) {
    return <ProjectDetailPage />;
  }

  // 否则显示列表页
  return <ProjectListPage />;
}
