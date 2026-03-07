/**
 * 项目类型管理组件
 *
 * 功能：
 * - 显示所有项目类型列表
 * - 创建新项目类型
 * - 编辑现有项目类型
 * - 删除项目类型（软删除）
 * - 拖拽排序
 *
 * @module components/settings/ProjectTypeManager
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit3, Trash2, GripVertical, Rocket, Users, RefreshCw, AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProjectTypes, createProjectType, updateProjectType, deleteProjectType } from '@/services/ProjectTypeService';
import type { ProjectTypeConfig } from '@/services/ProjectTypeService';

// 图标映射
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Users,
  RefreshCw,
  AlertTriangle,
  Calendar,
};

// 颜色选项
const COLOR_OPTIONS = [
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
  { value: 'purple', label: '紫色', class: 'bg-purple-500' },
  { value: 'orange', label: '橙色', class: 'bg-orange-500' },
  { value: 'red', label: '红色', class: 'bg-red-500' },
  { value: 'green', label: '绿色', class: 'bg-green-500' },
  { value: 'yellow', label: '黄色', class: 'bg-yellow-500' },
  { value: 'cyan', label: '青色', class: 'bg-cyan-500' },
  { value: 'pink', label: '粉色', class: 'bg-pink-500' },
];

interface ProjectTypeFormData {
  code: string;
  name: string;
  description: string;
  detail: string;
  icon: string;
  color: string;
  requiresDates: boolean;
  requiresMilestones: boolean;
  codePrefix: string;
  sortOrder: number;
}

const emptyForm: ProjectTypeFormData = {
  code: '',
  name: '',
  description: '',
  detail: '',
  icon: 'Rocket',
  color: 'blue',
  requiresDates: true,
  requiresMilestones: true,
  codePrefix: '',
  sortOrder: 0,
};

/**
 * 项目类型管理组件
 */
export function ProjectTypeManager() {
  const [types, setTypes] = useState<ProjectTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingType, setEditingType] = useState<ProjectTypeConfig | null>(null);
  const [deletingType, setDeletingType] = useState<ProjectTypeConfig | null>(null);
  const [formData, setFormData] = useState<ProjectTypeFormData>(emptyForm);

  // 加载项目类型列表
  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjectTypes();
      setTypes(data);
    } catch (error) {
      console.error('加载项目类型失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  // 打开创建对话框
  const handleCreate = () => {
    setEditingType(null);
    setFormData({
      ...emptyForm,
      sortOrder: types.length > 0 ? Math.max(...types.map(t => t.sortOrder || 0)) + 1 : 1,
    });
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (type: ProjectTypeConfig) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || '',
      detail: type.detail || '',
      icon: type.icon || 'Rocket',
      color: type.color || 'blue',
      requiresDates: type.requiresDates,
      requiresMilestones: type.requiresMilestones,
      codePrefix: type.codePrefix || '',
      sortOrder: type.sortOrder || 0,
    });
    setShowDialog(true);
  };

  // 确认删除
  const handleDeleteConfirm = (type: ProjectTypeConfig) => {
    setDeletingType(type);
    setShowDeleteDialog(true);
  };

  // 执行删除
  const handleDelete = async () => {
    if (!deletingType) return;

    try {
      await deleteProjectType(deletingType.id);
      await loadTypes();
      setShowDeleteDialog(false);
      setDeletingType(null);
    } catch (error) {
      console.error('删除项目类型失败:', error);
    }
  };

  // 保存项目类型
  const handleSave = async () => {
    try {
      if (editingType) {
        await updateProjectType(editingType.id, formData);
      } else {
        await createProjectType(formData);
      }
      await loadTypes();
      setShowDialog(false);
      setFormData(emptyForm);
    } catch (error: any) {
      console.error('保存项目类型失败:', error);
      alert(error.message || '保存失败，请重试');
    }
  };

  // 获取图标组件
  const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || Rocket;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">项目类型管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理系统中可用的项目类型，配置每种类型的属性和行为
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          新建类型
        </Button>
      </div>

      {/* 项目类型列表 */}
      <div className="space-y-2">
        {types.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">暂无项目类型，点击上方按钮创建</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((type) => {
              const IconComponent = getIconComponent(type.icon || 'Rocket');
              return (
                <div
                  key={type.id}
                  className="relative group p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* 拖拽手柄 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  </div>

                  {/* 图标和名称 */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      `bg-${type.color}-500/20`
                    )}>
                      <IconComponent className={cn(
                        "w-5 h-5",
                        `text-${type.color}-500`
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">
                        {type.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {type.code}
                      </p>
                    </div>
                  </div>

                  {/* 属性标签 */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Badge variant="outline" className="text-xs">
                      {type.requiresDates ? '需要日期' : '无需日期'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {type.requiresMilestones ? '需要里程碑' : '无需里程碑'}
                    </Badge>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(type)}
                      className="flex-1"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConfirm(type)}
                      className="flex-1 hover:text-red-400 hover:border-red-400"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? '编辑项目类型' : '新建项目类型'}</DialogTitle>
            <DialogDescription>
              {editingType ? '修改项目类型的配置和属性' : '创建一个新的项目类型，定义其属性和行为'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">类型编码 *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如: product_development"
                  disabled={!!editingType}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  英文编码，创建后不可修改
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">类型名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: 产品开发类"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">简短描述 *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="一句话描述此类型的项目"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail">详细说明</Label>
              <Textarea
                id="detail"
                value={formData.detail}
                onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                placeholder="详细说明此类型项目的特点和适用场景"
                rows={3}
              />
            </div>

            {/* 外观设置 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>图标</Label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {Object.keys(ICON_MAP).map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>主题颜色</Label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {COLOR_OPTIONS.map(color => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="codePrefix">编码前缀</Label>
                <Input
                  id="codePrefix"
                  value={formData.codePrefix}
                  onChange={(e) => setFormData({ ...formData, codePrefix: e.target.value.toUpperCase() })}
                  placeholder="如: PRD"
                  className="uppercase"
                />
              </div>
            </div>

            {/* 属性配置 */}
            <div className="space-y-3">
              <Label>属性配置</Label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.requiresDates}
                    onChange={(e) => setFormData({ ...formData, requiresDates: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">需要日期计划</div>
                    <div className="text-xs text-muted-foreground">项目需要设置开始和结束时间</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.requiresMilestones}
                    onChange={(e) => setFormData({ ...formData, requiresMilestones: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">需要里程碑</div>
                    <div className="text-xs text-muted-foreground">项目需要设置关键里程碑</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 预览 */}
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">预览</div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  `bg-${formData.color}-500/20`
                )}>
                  {React.createElement(getIconComponent(formData.icon), {
                    className: cn("w-5 h-5", `text-${formData.color}-500`)
                  })}
                </div>
                <div>
                  <div className="font-medium text-white">{formData.name || '类型名称'}</div>
                  <div className="text-xs text-muted-foreground font-mono">{formData.code || 'type_code'}</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!formData.code || !formData.name || !formData.description}>
              {editingType ? '保存修改' : '创建类型'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目类型</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目类型 <span className="text-white font-medium">"{deletingType?.name}"</span> 吗？
              <br /><br />
              此操作将软删除该类型，使其不可再用于创建新项目，但不会影响已创建的项目。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProjectTypeManager;
