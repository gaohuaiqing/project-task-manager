/**
 * 任务类型管理页面
 * 包含任务类型与能力模型的映射管理
 */
import { useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, Link2 } from 'lucide-react';
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
import { TASK_TYPE_CONFIG, TASK_TYPE_OPTIONS, type TaskType } from '@/shared/constants';
import { useToast } from '@/hooks/use-toast';
import {
  useTaskTypeMappings,
  useCreateTaskTypeMapping,
  useUpdateTaskTypeMapping,
  useDeleteTaskTypeMapping,
  useCapabilityModels,
} from '@/features/org/hooks/useOrg';
import type { TaskTypeMapping } from '@/lib/api/org.api';

export function TaskTypesSettings() {
  const { toast } = useToast();

  // 映射管理状态
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<TaskTypeMapping | null>(null);
  const [formData, setFormData] = useState<{
    taskType: string;
    modelId: string;
    priority: number;
  }>({
    taskType: '',
    modelId: '',
    priority: 1,
  });

  // 查询
  const { data: mappings = [], isLoading: isLoadingMappings } = useTaskTypeMappings();
  const { data: capabilityModels = [], isLoading: isLoadingModels } = useCapabilityModels();

  // 变更
  const createMutation = useCreateTaskTypeMapping();
  const updateMutation = useUpdateTaskTypeMapping(selectedMapping?.id || 0);
  const deleteMutation = useDeleteTaskTypeMapping();

  // 获取任务类型的显示名称
  const getTaskTypeLabel = (type: string): string => {
    return TASK_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type;
  };

  // 获取任务类型的颜色
  const getTaskTypeColor = (type: string): string => {
    return (TASK_TYPE_CONFIG as Record<string, { color: string }>)[type]?.color || '#6B7280';
  };

  // 打开创建映射对话框
  const handleCreateMapping = () => {
    setSelectedMapping(null);
    setFormData({ taskType: '', modelId: '', priority: 1 });
    setMappingDialogOpen(true);
  };

  // 打开编辑映射对话框
  const handleEditMapping = (mapping: TaskTypeMapping) => {
    setSelectedMapping(mapping);
    setFormData({
      taskType: mapping.taskType,
      modelId: mapping.modelId,
      priority: mapping.priority,
    });
    setMappingDialogOpen(true);
  };

  // 打开删除确认对话框
  const handleDeleteClick = (mapping: TaskTypeMapping) => {
    setSelectedMapping(mapping);
    setDeleteDialogOpen(true);
  };

  // 提交映射表单
  const handleSubmitMapping = async () => {
    if (!formData.taskType || !formData.modelId) {
      toast({ title: '错误', description: '请选择任务类型和能力模型', variant: 'destructive' });
      return;
    }

    try {
      if (selectedMapping) {
        await updateMutation.mutateAsync(formData);
        toast({ title: '成功', description: '映射更新成功' });
      } else {
        await createMutation.mutateAsync(formData);
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

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!selectedMapping) return;

    try {
      await deleteMutation.mutateAsync(selectedMapping.id);
      toast({ title: '成功', description: '映射删除成功' });
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: '错误',
        description: error.response?.data?.message || '删除失败',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 任务类型配置说明 */}
      <Card>
        <CardHeader>
          <CardTitle>任务类型配置</CardTitle>
          <CardDescription>
            系统预定义的任务类型，用于任务分类和智能推荐
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TASK_TYPE_OPTIONS.map((type) => (
              <Badge
                key={type.value}
                style={{
                  backgroundColor: `${getTaskTypeColor(type.value)}20`,
                  color: getTaskTypeColor(type.value),
                }}
              >
                {type.label}
              </Badge>
            ))}
          </div>
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
          <Button size="sm" onClick={handleCreateMapping} data-testid="tasktype-btn-add">
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
            <Table data-testid="tasktype-table">
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
                  <TableRow key={mapping.id} data-testid="tasktype-table-row">
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: `${getTaskTypeColor(mapping.taskType)}20`,
                          color: getTaskTypeColor(mapping.taskType),
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
                        onClick={() => handleDeleteClick(mapping)}
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

      {/* 创建/编辑映射对话框 */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen} data-testid="tasktype-dialog-form">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMapping ? '编辑映射' : '添加映射'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label>任务类型 *</Label>
              <Select
                value={formData.taskType}
                onValueChange={(value) => setFormData({ ...formData, taskType: value })}
                disabled={!!selectedMapping}
              >
                <SelectTrigger data-testid="tasktype-select-task-type">
                  <SelectValue placeholder="请选择任务类型" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getTaskTypeColor(type.value) }}
                        />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>能力模型 *</Label>
              <Select
                value={formData.modelId}
                onValueChange={(value) => setFormData({ ...formData, modelId: value })}
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
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
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
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedMapping ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
