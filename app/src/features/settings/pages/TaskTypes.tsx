/**
 * 任务类型管理页面
 * 支持任务类型的 CRUD 操作，以及任务类型与能力模型的映射管理
 */
import { useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, Link2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  useTaskTypes,
  useCreateTaskType,
  useUpdateTaskType,
  useDeleteTaskType,
  useTaskTypeMappings,
  useCreateTaskTypeMapping,
  useUpdateTaskTypeMapping,
  useDeleteTaskTypeMapping,
  useCapabilityModels,
} from '@/features/org/hooks/useOrg';
import type { TaskTypeConfig, TaskTypeMapping } from '@/lib/api/org.api';

// 预设颜色选项
const COLOR_OPTIONS = [
  { value: 'indigo', label: '靛蓝', color: '#6366F1' },
  { value: 'teal', label: '青色', color: '#14B8A6' },
  { value: 'purple', label: '紫色', color: '#A855F7' },
  { value: 'cyan', label: '天蓝', color: '#06B6D4' },
  { value: 'orange', label: '橙色', color: '#F97316' },
  { value: 'lime', label: '青柠', color: '#84CC16' },
  { value: 'amber', label: '琥珀', color: '#F59E0B' },
  { value: 'blue', label: '蓝色', color: '#3B82F6' },
  { value: 'red', label: '红色', color: '#EF4444' },
  { value: 'pink', label: '粉色', color: '#EC4899' },
  { value: 'green', label: '绿色', color: '#22C55E' },
  { value: 'gray', label: '灰色', color: '#6B7280' },
];

// 分组选项
const GROUP_OPTIONS = [
  { value: 'hardware', label: '硬件开发' },
  { value: 'material', label: '物料管理' },
  { value: 'design', label: '设计管理' },
  { value: 'general', label: '综合职能' },
];

// 获取颜色的 HEX 值
function getColorHex(color: string): string {
  return COLOR_OPTIONS.find(c => c.value === color)?.color || '#6B7280';
}

export function TaskTypesSettings() {
  const { toast } = useToast();

  // 任务类型状态
  const [taskTypeDialogOpen, setTaskTypeDialogOpen] = useState(false);
  const [deleteTaskTypeDialogOpen, setDeleteTaskTypeDialogOpen] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskTypeConfig | null>(null);
  const [taskTypeFormData, setTaskTypeFormData] = useState<{
    code: string;
    name: string;
    color: string;
    description: string;
    groupName: string;
    isActive: boolean;
    sortOrder: number;
  }>({
    code: '',
    name: '',
    color: 'gray',
    description: '',
    groupName: '',
    isActive: true,
    sortOrder: 0,
  });

  // 映射管理状态
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [deleteMappingDialogOpen, setDeleteMappingDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<TaskTypeMapping | null>(null);
  const [mappingFormData, setMappingFormData] = useState<{
    taskType: string;
    modelId: string;
    priority: number;
  }>({
    taskType: '',
    modelId: '',
    priority: 1,
  });

  // 查询
  const { data: taskTypes = [], isLoading: isLoadingTaskTypes } = useTaskTypes();
  const { data: mappings = [], isLoading: isLoadingMappings } = useTaskTypeMappings();
  const { data: capabilityModels = [], isLoading: isLoadingModels } = useCapabilityModels();

  // 变更
  const createTaskTypeMutation = useCreateTaskType();
  const updateTaskTypeMutation = useUpdateTaskType(selectedTaskType?.id || 0);
  const deleteTaskTypeMutation = useDeleteTaskType();
  const createMappingMutation = useCreateTaskTypeMapping();
  const updateMappingMutation = useUpdateTaskTypeMapping(selectedMapping?.id || 0);
  const deleteMappingMutation = useDeleteTaskTypeMapping();

  // ========== 任务类型 CRUD ==========

  const handleCreateTaskType = () => {
    setSelectedTaskType(null);
    setTaskTypeFormData({
      code: '',
      name: '',
      color: 'gray',
      description: '',
      groupName: '',
      isActive: true,
      sortOrder: taskTypes.length + 1,
    });
    setTaskTypeDialogOpen(true);
  };

  const handleEditTaskType = (taskType: TaskTypeConfig) => {
    setSelectedTaskType(taskType);
    setTaskTypeFormData({
      code: taskType.code,
      name: taskType.name,
      color: taskType.color,
      description: taskType.description || '',
      groupName: taskType.groupName || '',
      isActive: taskType.isActive,
      sortOrder: taskType.sortOrder,
    });
    setTaskTypeDialogOpen(true);
  };

  const handleDeleteTaskTypeClick = (taskType: TaskTypeConfig) => {
    setSelectedTaskType(taskType);
    setDeleteTaskTypeDialogOpen(true);
  };

  const handleSubmitTaskType = async () => {
    if (!taskTypeFormData.code.trim() || !taskTypeFormData.name.trim()) {
      toast({ title: '错误', description: '编码和名称不能为空', variant: 'destructive' });
      return;
    }

    // 验证编码格式
    if (!/^[a-z][a-z0-9_]*$/.test(taskTypeFormData.code)) {
      toast({ title: '错误', description: '编码只能包含小写字母、数字和下划线，且必须以字母开头', variant: 'destructive' });
      return;
    }

    try {
      if (selectedTaskType) {
        await updateTaskTypeMutation.mutateAsync({
          name: taskTypeFormData.name,
          color: taskTypeFormData.color,
          description: taskTypeFormData.description || undefined,
          groupName: taskTypeFormData.groupName || undefined,
          isActive: taskTypeFormData.isActive,
          sortOrder: taskTypeFormData.sortOrder,
        });
        toast({ title: '成功', description: '任务类型更新成功' });
      } else {
        await createTaskTypeMutation.mutateAsync(taskTypeFormData);
        toast({ title: '成功', description: '任务类型创建成功' });
      }
      setTaskTypeDialogOpen(false);
    } catch (error: any) {
      toast({
        title: '错误',
        description: error.response?.data?.message || error.message || '操作失败',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDeleteTaskType = async () => {
    if (!selectedTaskType) return;

    try {
      const result = await deleteTaskTypeMutation.mutateAsync(selectedTaskType.id);
      toast({
        title: '删除成功',
        description: result.affectedTasks > 0
          ? `已删除任务类型，${result.affectedTasks} 个任务已改为"其它"类型`
          : '任务类型已删除',
      });
      setDeleteTaskTypeDialogOpen(false);
    } catch (error: any) {
      toast({
        title: '错误',
        description: error.response?.data?.message || '删除失败',
        variant: 'destructive',
      });
    }
  };

  // ========== 映射 CRUD ==========

  const handleCreateMapping = () => {
    setSelectedMapping(null);
    setMappingFormData({ taskType: '', modelId: '', priority: 1 });
    setMappingDialogOpen(true);
  };

  const handleEditMapping = (mapping: TaskTypeMapping) => {
    setSelectedMapping(mapping);
    setMappingFormData({
      taskType: mapping.taskType,
      modelId: mapping.modelId,
      priority: mapping.priority,
    });
    setMappingDialogOpen(true);
  };

  const handleDeleteMappingClick = (mapping: TaskTypeMapping) => {
    setSelectedMapping(mapping);
    setDeleteMappingDialogOpen(true);
  };

  const handleSubmitMapping = async () => {
    if (!mappingFormData.taskType || !mappingFormData.modelId) {
      toast({ title: '错误', description: '请选择任务类型和能力模型', variant: 'destructive' });
      return;
    }

    try {
      if (selectedMapping) {
        await updateMappingMutation.mutateAsync(mappingFormData);
        toast({ title: '成功', description: '映射更新成功' });
      } else {
        await createMappingMutation.mutateAsync(mappingFormData);
        toast({ title: '成功', description: '映射创建成功' });
      }
      setMappingDialogOpen(false);
    } catch (error: any) {
      toast({
        title: '错误',
        description: error.response?.data?.message || '操作失败',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDeleteMapping = async () => {
    if (!selectedMapping) return;

    try {
      await deleteMappingMutation.mutateAsync(selectedMapping.id);
      toast({ title: '成功', description: '映射删除成功' });
      setDeleteMappingDialogOpen(false);
    } catch (error: any) {
      toast({
        title: '错误',
        description: error.response?.data?.message || '删除失败',
        variant: 'destructive',
      });
    }
  };

  // 获取任务类型的显示名称
  const getTaskTypeLabel = (code: string): string => {
    return taskTypes.find(t => t.code === code)?.name || code;
  };

  // 获取任务类型的颜色
  const getTaskTypeColor = (code: string): string => {
    return taskTypes.find(t => t.code === code)?.color || 'gray';
  };

  return (
    <div className="space-y-6">
      {/* 任务类型列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>任务类型配置</CardTitle>
            <CardDescription>
              管理任务类型列表，支持自定义添加、编辑和删除
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleCreateTaskType} data-testid="tasktype-btn-add-type">
            <Plus className="h-4 w-4 mr-2" />
            添加类型
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingTaskTypes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : taskTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p>暂无任务类型数据</p>
              <p className="text-xs mt-1">请添加任务类型</p>
            </div>
          ) : (
            <Table data-testid="tasktype-table">
              <TableHeader>
                <TableRow>
                  <TableHead>编码</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>颜色</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskTypes.map((taskType) => (
                  <TableRow key={taskType.id} data-testid="tasktype-table-row">
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-0.5 rounded">{taskType.code}</code>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{taskType.name}</span>
                      {taskType.description && (
                        <p className="text-xs text-muted-foreground mt-1">{taskType.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getColorHex(taskType.color) }}
                        />
                        <span className="text-sm">{taskType.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {taskType.groupName ? (
                        <Badge variant="outline">
                          {GROUP_OPTIONS.find(g => g.value === taskType.groupName)?.label || taskType.groupName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={taskType.isActive ? 'default' : 'secondary'}>
                        {taskType.isActive ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTaskType(taskType)}
                        data-testid="tasktype-btn-edit-type"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTaskTypeClick(taskType)}
                        disabled={taskType.code === 'other'}
                        data-testid="tasktype-btn-delete-type"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 任务类型 - 能力模型映射 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              任务类型 - 能力模型映射
            </CardTitle>
            <CardDescription>
              配置任务类型对应的能力模型，用于智能推荐负责人
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleCreateMapping} data-testid="tasktype-btn-add">
            <Plus className="h-4 w-4 mr-2" />
            添加映射
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingMappings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Link2 className="h-12 w-12 mb-2 opacity-50" />
              <p>暂无映射配置</p>
              <p className="text-xs mt-1">添加映射后，创建任务时可智能推荐负责人</p>
            </div>
          ) : (
            <Table data-testid="tasktype-mapping-table">
              <TableHeader>
                <TableRow>
                  <TableHead>任务类型</TableHead>
                  <TableHead>能力模型</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id} data-testid="tasktype-mapping-table-row">
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: `${getColorHex(getTaskTypeColor(mapping.taskType))}20`,
                          color: getColorHex(getTaskTypeColor(mapping.taskType)),
                        }}
                      >
                        {getTaskTypeLabel(mapping.taskType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{mapping.modelName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{mapping.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditMapping(mapping)}
                        data-testid="tasktype-btn-edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMappingClick(mapping)}
                        data-testid="tasktype-btn-delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑任务类型对话框 */}
      <Dialog open={taskTypeDialogOpen} onOpenChange={setTaskTypeDialogOpen} data-testid="tasktype-dialog-form">
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedTaskType ? '编辑任务类型' : '添加任务类型'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-1 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">编码 *</Label>
              <Input
                id="code"
                placeholder="如：firmware"
                value={taskTypeFormData.code}
                onChange={(e) => setTaskTypeFormData({ ...taskTypeFormData, code: e.target.value })}
                disabled={!!selectedTaskType}
                data-testid="tasktype-input-code"
              />
              {!selectedTaskType && (
                <p className="text-xs text-muted-foreground">
                  只能包含小写字母、数字和下划线，且必须以字母开头
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                placeholder="如：固件"
                value={taskTypeFormData.name}
                onChange={(e) => setTaskTypeFormData({ ...taskTypeFormData, name: e.target.value })}
                data-testid="tasktype-input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">颜色</Label>
              <Select
                value={taskTypeFormData.color}
                onValueChange={(value) => setTaskTypeFormData({ ...taskTypeFormData, color: value })}
              >
                <SelectTrigger data-testid="tasktype-select-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                placeholder="可选描述"
                value={taskTypeFormData.description}
                onChange={(e) => setTaskTypeFormData({ ...taskTypeFormData, description: e.target.value })}
                data-testid="tasktype-input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupName">分组</Label>
              <Select
                value={taskTypeFormData.groupName || 'none'}
                onValueChange={(value) => setTaskTypeFormData({ ...taskTypeFormData, groupName: value === 'none' ? '' : value })}
              >
                <SelectTrigger data-testid="tasktype-select-group">
                  <SelectValue placeholder="选择分组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无分组</SelectItem>
                  {GROUP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">启用状态</Label>
              <Switch
                id="isActive"
                checked={taskTypeFormData.isActive}
                onCheckedChange={(checked) => setTaskTypeFormData({ ...taskTypeFormData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskTypeDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmitTaskType}
              disabled={createTaskTypeMutation.isPending || updateTaskTypeMutation.isPending}
            >
              {(createTaskTypeMutation.isPending || updateTaskTypeMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedTaskType ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除任务类型确认对话框 */}
      <Dialog open={deleteTaskTypeDialogOpen} onOpenChange={setDeleteTaskTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除任务类型</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">警告</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  删除后，使用该类型的任务将自动改为"其它"类型
                </p>
              </div>
            </div>
            <p className="text-muted-foreground">
              确定要删除任务类型 <strong>{selectedTaskType?.name}</strong> 吗？
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTaskTypeDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteTaskType}
              disabled={deleteTaskTypeMutation.isPending}
            >
              {deleteTaskTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建/编辑映射对话框 */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen} data-testid="tasktype-dialog-mapping">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMapping ? '编辑映射' : '添加映射'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label>任务类型 *</Label>
              <Select
                value={mappingFormData.taskType}
                onValueChange={(value) => setMappingFormData({ ...mappingFormData, taskType: value })}
                disabled={!!selectedMapping}
              >
                <SelectTrigger data-testid="tasktype-select-task-type">
                  <SelectValue placeholder="请选择任务类型" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.filter(t => t.isActive).map((taskType) => (
                    <SelectItem key={taskType.id} value={taskType.code}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getColorHex(taskType.color) }}
                        />
                        {taskType.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>能力模型 *</Label>
              <Select
                value={mappingFormData.modelId}
                onValueChange={(value) => setMappingFormData({ ...mappingFormData, modelId: value })}
                disabled={isLoadingModels}
              >
                <SelectTrigger data-testid="tasktype-select-model">
                  <SelectValue placeholder="请选择能力模型" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingModels ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : capabilityModels.length === 0 ? (
                    <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                      暂无能力模型，请先创建
                    </div>
                  ) : (
                    capabilityModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>优先级</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={mappingFormData.priority}
                onChange={(e) =>
                  setMappingFormData({ ...mappingFormData, priority: parseInt(e.target.value) || 1 })
                }
                data-testid="tasktype-input-priority"
              />
              <p className="text-xs text-muted-foreground">
                同一任务类型可映射多个模型，优先级越高越优先使用
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmitMapping}
              disabled={createMappingMutation.isPending || updateMappingMutation.isPending}
            >
              {(createMappingMutation.isPending || updateMappingMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedMapping ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除映射确认对话框 */}
      <Dialog open={deleteMappingDialogOpen} onOpenChange={setDeleteMappingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除映射</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="text-muted-foreground">
              确定要删除该映射吗？删除后，该任务类型将不再使用此能力模型进行推荐。
            </p>
            {selectedMapping && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">任务类型:</span>{' '}
                  {getTaskTypeLabel(selectedMapping.taskType)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">能力模型:</span> {selectedMapping.modelName}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMappingDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMapping}
              disabled={deleteMappingMutation.isPending}
            >
              {deleteMappingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
