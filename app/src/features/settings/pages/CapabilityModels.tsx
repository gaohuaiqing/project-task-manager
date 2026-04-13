/**
 * 能力模型管理页面
 * 连接真实 API，实现完整 CRUD 功能
 */
import { useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, AlertCircle, Weight } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useCapabilityModels,
  useCreateCapabilityModel,
  useUpdateCapabilityModel,
  useDeleteCapabilityModel,
} from '@/features/org/hooks/useOrg';
import { useToast } from '@/hooks/use-toast';
import type { CapabilityModel, CapabilityDimension } from '@/lib/api/org.api';

interface DimensionFormData {
  name: string;
  weight: number;
  description: string;
}

const defaultDimension: DimensionFormData = {
  name: '',
  weight: 0,
  description: '',
};

export function CapabilityModelsSettings() {
  const { toast } = useToast();

  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<CapabilityModel | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [dimensions, setDimensions] = useState<DimensionFormData[]>([defaultDimension]);

  // 查询
  const { data: models = [], isLoading, error } = useCapabilityModels();

  // 变更
  const createMutation = useCreateCapabilityModel();
  const updateMutation = useUpdateCapabilityModel(selectedModel?.id || '');
  const deleteMutation = useDeleteCapabilityModel();

  // 计算权重总和
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  // 重置表单
  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setDimensions([{ name: '', weight: 0, description: '' }]);
    setSelectedModel(null);
  };

  // 打开创建对话框
  const handleCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (model: CapabilityModel) => {
    setSelectedModel(model);
    setFormData({
      name: model.name,
      description: model.description || '',
    });
    setDimensions(
      model.dimensions.map((d) => ({
        name: d.name,
        weight: d.weight,
        description: d.description || '',
      }))
    );
    setEditDialogOpen(true);
  };

  // 打开删除对话框
  const handleDelete = (model: CapabilityModel) => {
    setSelectedModel(model);
    setDeleteDialogOpen(true);
  };

  // 添加维度
  const addDimension = () => {
    if (dimensions.length >= 10) {
      toast({
        title: '提示',
        description: '最多支持 10 个维度',
        variant: 'destructive',
      });
      return;
    }
    setDimensions([...dimensions, { ...defaultDimension }]);
  };

  // 删除维度
  const removeDimension = (index: number) => {
    if (dimensions.length <= 1) {
      toast({
        title: '提示',
        description: '至少需要 1 个维度',
        variant: 'destructive',
      });
      return;
    }
    setDimensions(dimensions.filter((_, i) => i !== index));
  };

  // 更新维度
  const updateDimension = (index: number, field: keyof DimensionFormData, value: string | number) => {
    const updated = [...dimensions];
    updated[index] = { ...updated[index], [field]: value };
    setDimensions(updated);
  };

  // 提交创建
  const submitCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入模型名称', variant: 'destructive' });
      return;
    }

    if (!isWeightValid) {
      toast({ title: '错误', description: '所有维度权重之和必须为 100%', variant: 'destructive' });
      return;
    }

    const hasEmptyDimension = dimensions.some((d) => !d.name.trim());
    if (hasEmptyDimension) {
      toast({ title: '错误', description: '所有维度名称不能为空', variant: 'destructive' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        dimensions: dimensions.map((d) => ({
          name: d.name.trim(),
          weight: d.weight,
          description: d.description.trim() || undefined,
        })),
      });
      toast({ title: '成功', description: '能力模型创建成功' });
      setCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '创建失败', variant: 'destructive' });
    }
  };

  // 提交更新
  const submitEdit = async () => {
    if (!selectedModel) return;

    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入模型名称', variant: 'destructive' });
      return;
    }

    if (!isWeightValid) {
      toast({ title: '错误', description: '所有维度权重之和必须为 100%', variant: 'destructive' });
      return;
    }

    const hasEmptyDimension = dimensions.some((d) => !d.name.trim());
    if (hasEmptyDimension) {
      toast({ title: '错误', description: '所有维度名称不能为空', variant: 'destructive' });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        dimensions: dimensions.map((d) => ({
          name: d.name.trim(),
          weight: d.weight,
          description: d.description.trim() || undefined,
        })),
      });
      toast({ title: '成功', description: '能力模型更新成功' });
      setEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '更新失败', variant: 'destructive' });
    }
  };

  // 提交删除
  const submitDelete = async () => {
    if (!selectedModel) return;

    try {
      await deleteMutation.mutateAsync(selectedModel.id);
      toast({ title: '成功', description: '能力模型删除成功' });
      setDeleteDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '删除失败', variant: 'destructive' });
    }
  };

  // 渲染维度编辑器
  const renderDimensionEditor = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>评价维度</Label>
        <div className="flex items-center gap-2">
          <Badge variant={isWeightValid ? 'default' : 'destructive'} className="flex items-center gap-1">
            <Weight className="h-3 w-3" />
            权重总和: {totalWeight.toFixed(0)}%
          </Badge>
          <Button type="button" variant="outline" size="sm" onClick={addDimension}>
            <Plus className="h-4 w-4 mr-1" />
            添加维度
          </Button>
        </div>
      </div>

      {!isWeightValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>所有维度权重之和必须等于 100%</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {dimensions.map((dim, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className="flex-1 grid grid-cols-12 gap-3">
              <div className="col-span-5 space-y-1">
                <Input
                  placeholder="维度名称"
                  value={dim.name}
                  onChange={(e) => updateDimension(index, 'name', e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    placeholder="权重"
                    min={0}
                    max={100}
                    value={dim.weight}
                    onChange={(e) => updateDimension(index, 'weight', parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="col-span-5 space-y-1">
                <Input
                  placeholder="维度描述（可选）"
                  value={dim.description}
                  onChange={(e) => updateDimension(index, 'description', e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => removeDimension(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  // 加载状态
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-destructive">
          <AlertCircle className="h-12 w-12 mb-2 opacity-50" />
          <p>加载能力模型数据失败</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>能力模型管理</CardTitle>
            <CardDescription>
              配置能力评估模型，定义评价维度和权重
            </CardDescription>
          </div>
          <Button onClick={handleCreate} data-testid="model-btn-add">
            <Plus className="h-4 w-4 mr-2" />
            添加模型
          </Button>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Weight className="h-12 w-12 mb-2 opacity-50" />
              <p>暂无能力模型</p>
              <Button variant="outline" className="mt-4" onClick={handleCreate}>
                创建第一个模型
              </Button>
            </div>
          ) : (
            <Table data-testid="model-table">
              <TableHeader>
                <TableRow>
                  <TableHead>模型名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>维度数量</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {model.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{model.dimensions.length} 个维度</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(model.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(model)} data-testid="model-btn-edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(model)}
                          data-testid="model-btn-delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} data-testid="model-dialog-form">
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建能力模型</DialogTitle>
            <DialogDescription>
              配置能力评估模型，定义评价维度和权重。所有维度权重之和必须等于 100%。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">模型名称 *</Label>
              <Input
                id="name"
                placeholder="如：嵌入式开发能力"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="model-input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">模型描述</Label>
              <Textarea
                id="description"
                placeholder="描述该能力模型的用途和评估范围"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                data-testid="model-textarea-description"
              />
            </div>

            <Separator />

            {renderDimensionEditor()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submitCreate} disabled={createMutation.isPending || !isWeightValid}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen} data-testid="model-dialog-form">
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑能力模型</DialogTitle>
            <DialogDescription>
              修改能力模型的配置。所有维度权重之和必须等于 100%。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">模型名称 *</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="model-input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">模型描述</Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                data-testid="model-textarea-description"
              />
            </div>

            <Separator />

            {renderDimensionEditor()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending || !isWeightValid}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} data-testid="model-dialog-delete-confirm">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除能力模型</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除能力模型 "{selectedModel?.name}" 吗？此操作无法撤销，已关联的成员能力评定数据将保留但可能显示异常。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={submitDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
