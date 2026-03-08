/**
 * 能力模型设置组件
 *
 * 职责：
 * 1. 管理多组能力模型
 * 2. 每组能力模型可以包含不同的能力维度
 * 3. 支持将能力模型应用到特定技术组
 * 4. 提供能力模型组的 CRUD 操作
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit3, RotateCcw, Info, Layers, Users, ChevronUp, ChevronDown, ChevronUpCircle, ChevronDownCircle } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import {
  getCapabilityModels,
  addCapabilityModel,
  updateCapabilityModel,
  deleteCapabilityModel,
  resetCapabilityModels,
  moveDimension
} from '@/utils/capabilityDimensionManager';
import { getAllTechGroups } from '@/utils/organizationManager';
import type { CapabilityModel, CapabilityDimension, TechGroup } from '@/types/organization';

interface CapabilityModelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DimensionForm {
  name: string;
  description: string;
  color: string;
}

interface ModelForm {
  name: string;
  description: string;
  dimensions: DimensionForm[];
  techGroupIds: string[];
}

export function CapabilityModelSettings({
  isOpen,
  onClose
}: CapabilityModelSettingsProps) {
  const dialog = useDialog();

  // 列表数据
  const [models, setModels] = useState<CapabilityModel[]>([]);
  const [techGroups, setTechGroups] = useState<TechGroup[]>([]);

  // 编辑状态
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState<CapabilityModel | null>(null);
  const [modelForm, setModelForm] = useState<ModelForm>({
    name: '',
    description: '',
    dimensions: [],
    techGroupIds: []
  });

  // 加载数据
  useEffect(() => {
    if (isOpen) {
      const loadedModels = getCapabilityModels();
      setModels(loadedModels);
      const groups = getAllTechGroups();
      setTechGroups(groups);
    }
  }, [isOpen]);

  // 添加新能力模型组
  const handleAddModel = () => {
    setEditingModel(null);
    setModelForm({
      name: '',
      description: '',
      dimensions: [{ name: '', description: '', color: '#3b82f6' }],
      techGroupIds: []
    });
    setShowModelForm(true);
  };

  // 编辑能力模型组
  const handleEditModel = (model: CapabilityModel) => {
    setEditingModel(model);
    setModelForm({
      name: model.name,
      description: model.description,
      dimensions: model.dimensions.map(d => ({ ...d })),
      techGroupIds: [...model.techGroupIds]
    });
    setShowModelForm(true);
  };

  // 删除能力模型组
  const handleDeleteModel = async (model: CapabilityModel) => {
    const confirmed = await dialog.confirm(
      `确定要删除能力模型组"${model.name}"吗？${model.isDefault ? '（这是默认模型组，无法删除）' : ''}`,
      {
        title: '确认删除',
        variant: 'danger'
      }
    );

    if (confirmed) {
      const result = deleteCapabilityModel(model.id);
      if (result.success) {
        const updatedModels = getCapabilityModels();
        setModels(updatedModels);
      } else {
        await dialog.alert(result.message, {
          title: '操作失败',
          variant: 'error'
        });
      }
    }
  };

  // 添加维度到表单
  const handleAddDimension = () => {
    const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];
    setModelForm({
      ...modelForm,
      dimensions: [
        ...modelForm.dimensions,
        { name: '', description: '', color: colors[modelForm.dimensions.length % colors.length] }
      ]
    });
  };

  // 删除维度
  const handleRemoveDimension = (index: number) => {
    if (modelForm.dimensions.length <= 1) {
      dialog.alert('至少需要保留一个能力维度', {
        title: '操作失败',
        variant: 'warning'
      });
      return;
    }
    setModelForm({
      ...modelForm,
      dimensions: modelForm.dimensions.filter((_, i) => i !== index)
    });
  };

  // Bug-P1-011修复：移动维度顺序
  const handleMoveDimension = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const newDimensions = [...modelForm.dimensions];
    const dimension = newDimensions[index];

    switch (direction) {
      case 'up':
        if (index > 0) {
          newDimensions.splice(index, 1);
          newDimensions.splice(index - 1, 0, dimension);
        }
        break;
      case 'down':
        if (index < newDimensions.length - 1) {
          newDimensions.splice(index, 1);
          newDimensions.splice(index + 1, 0, dimension);
        }
        break;
      case 'top':
        newDimensions.splice(index, 1);
        newDimensions.unshift(dimension);
        break;
      case 'bottom':
        newDimensions.splice(index, 1);
        newDimensions.push(dimension);
        break;
    }

    setModelForm({ ...modelForm, dimensions: newDimensions });
  };

  // 更新维度
  const handleUpdateDimension = (index: number, field: keyof DimensionForm, value: string) => {
    const newDimensions = [...modelForm.dimensions];
    newDimensions[index] = { ...newDimensions[index], [field]: value };
    setModelForm({ ...modelForm, dimensions: newDimensions });
  };

  // 切换技术组选中状态
  const handleToggleTechGroup = (techGroupId: string) => {
    const newTechGroupIds = modelForm.techGroupIds.includes(techGroupId)
      ? modelForm.techGroupIds.filter(id => id !== techGroupId)
      : [...modelForm.techGroupIds, techGroupId];
    setModelForm({ ...modelForm, techGroupIds: newTechGroupIds });
  };

  // 保存能力模型组
  const handleSaveModel = async () => {
    // 验证
    if (!modelForm.name.trim()) {
      await dialog.alert('请输入模型组名称', {
        title: '输入错误',
        variant: 'warning'
      });
      return;
    }

    if (modelForm.dimensions.some(d => !d.name.trim())) {
      await dialog.alert('请完善所有能力维度信息', {
        title: '输入错误',
        variant: 'warning'
      });
      return;
    }

    // 生成维度key（使用UUID确保唯一性）
    const dimensions: CapabilityDimension[] = modelForm.dimensions.map((d, index) => ({
      key: editingModel?.dimensions[index]?.key || crypto.randomUUID(),
      name: d.name.trim(),
      description: d.description.trim(),
      color: d.color
    }));

    const modelData = {
      name: modelForm.name.trim(),
      description: modelForm.description.trim(),
      dimensions,
      techGroupIds: modelForm.techGroupIds,
      isDefault: false
    };

    let result;
    if (editingModel) {
      result = updateCapabilityModel(editingModel.id, modelData);
    } else {
      result = addCapabilityModel(modelData);
    }

    if (result.success) {
      const updatedModels = getCapabilityModels();
      setModels(updatedModels);
      setShowModelForm(false);
      setEditingModel(null);
      setModelForm({
        name: '',
        description: '',
        dimensions: [{ name: '', description: '', color: '#3b82f6' }],
        techGroupIds: []
      });
    } else {
      await dialog.alert(result.message, {
        title: '操作失败',
        variant: 'error'
      });
    }
  };

  // 重置为默认
  const handleReset = async () => {
    const confirmed = await dialog.confirm('确定要重置为默认能力模型吗？这将删除所有自定义模型组。', {
      title: '确认重置',
      variant: 'warning'
    });

    if (confirmed) {
      const result = resetCapabilityModels();
      if (result.success) {
        const defaultModels = getCapabilityModels();
        setModels(defaultModels);
      } else {
        await dialog.alert(result.message, {
          title: '操作失败',
          variant: 'error'
        });
      }
    }
  };

  const getTechGroupName = (id: string) => {
    const group = techGroups.find(g => g.id === id);
    return group?.name || id;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-5xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            能力模型设置
          </DialogTitle>
          <p className="text-sm text-slate-400">
            管理多组能力模型，每组可应用于不同的技术组
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* 说明卡片 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">能力模型说明</p>
                <p className="text-xs text-slate-400 mt-1">
                  能力模型定义了一组能力评价维度。您可以创建多组不同的能力模型，
                  每组可以应用于特定的技术组。未分配技术组的模型将作为通用模型使用。
                </p>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handleAddModel}
              className="bg-primary hover:bg-primary/90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加模型组
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              重置默认
            </Button>
          </div>

          {/* 添加/编辑模型表单 */}
          {showModelForm && (
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h3 className="text-white font-semibold mb-4">
                {editingModel ? '编辑能力模型组' : '添加能力模型组'}
              </h3>

              <div className="space-y-4">
                {/* 模型组名称和描述 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white text-sm">模型组名称 *</Label>
                    <Input
                      value={modelForm.name}
                      onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                      placeholder="例如：前端开发能力模型"
                      className="bg-slate-700 border-slate-600 text-white mt-1.5"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-white text-sm">模型组描述</Label>
                    <Textarea
                      value={modelForm.description}
                      onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                      placeholder="简要描述该模型组的用途..."
                      rows={2}
                      className="bg-slate-700 border-slate-600 text-white mt-1.5"
                    />
                  </div>
                </div>

                {/* 能力维度列表 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white text-sm">能力维度</Label>
                    <Button
                      onClick={handleAddDimension}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 h-7"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      添加维度
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {modelForm.dimensions.map((dimension, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-slate-700 rounded-lg">
                        {/* Bug-P1-011修复：添加维度顺序控制按钮 */}
                        <div className="flex flex-col gap-0.5">
                          <Button
                            onClick={() => handleMoveDimension(index, 'up')}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                            disabled={index === 0}
                            title="上移"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleMoveDimension(index, 'down')}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                            disabled={index === modelForm.dimensions.length - 1}
                            title="下移"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={dimension.name}
                              onChange={(e) => handleUpdateDimension(index, 'name', e.target.value)}
                              placeholder="维度名称"
                              className="bg-slate-600 border-slate-500 text-white flex-1"
                            />
                            <div className="flex gap-1">
                              {['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'].map(color => (
                                <button
                                  key={color}
                                  onClick={() => handleUpdateDimension(index, 'color', color)}
                                  className={`w-6 h-6 rounded-full border-2 ${dimension.color === color ? 'border-white' : 'border-transparent'}`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                          <Input
                            value={dimension.description}
                            onChange={(e) => handleUpdateDimension(index, 'description', e.target.value)}
                            placeholder="维度描述"
                            className="bg-slate-600 border-slate-500 text-white"
                          />
                        </div>
                        <Button
                          onClick={() => handleRemoveDimension(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 应用的技术组 */}
                {techGroups.length > 0 && (
                  <div>
                    <Label className="text-white text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      应用的技术组
                      <span className="text-xs text-slate-400 font-normal">
                        （留空表示作为通用模型）
                      </span>
                    </Label>
                    <div className="mt-2 p-3 bg-slate-700 rounded-lg max-h-32 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
                        {techGroups.map(group => (
                          <div key={group.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`techgroup-${group.id}`}
                              checked={modelForm.techGroupIds.includes(group.id)}
                              onCheckedChange={() => handleToggleTechGroup(group.id)}
                              className="border-slate-500"
                            />
                            <label
                              htmlFor={`techgroup-${group.id}`}
                              className="text-sm text-slate-300 cursor-pointer flex-1 truncate"
                            >
                              {group.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setShowModelForm(false);
                      setEditingModel(null);
                      setModelForm({
                        name: '',
                        description: '',
                        dimensions: [{ name: '', description: '', color: '#3b82f6' }],
                        techGroupIds: []
                      });
                    }}
                    variant="outline"
                  >
                    取消
                  </Button>
                  <Button onClick={handleSaveModel} className="bg-primary hover:bg-primary/90">
                    {editingModel ? '更新' : '创建'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 能力模型组列表 */}
          <div className="space-y-3">
            {models.map(model => (
              <div
                key={model.id}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{model.name}</h3>
                      {model.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          默认
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{model.description || '无描述'}</p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      onClick={() => handleEditModel(model)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteModel(model)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                      disabled={model.isDefault}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* 能力维度列表 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {model.dimensions.map(dimension => (
                    <div
                      key={dimension.key}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{ backgroundColor: dimension.color + '20', border: `1px solid ${dimension.color}40` }}
                    >
                      <span
                        className="font-medium"
                        style={{ color: dimension.color }}
                      >
                        {dimension.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 应用的技术组 */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {model.techGroupIds.length === 0 ? (
                    <span className="text-slate-500">通用模型（应用于所有技术组）</span>
                  ) : (
                    <span className="text-slate-400">
                      应用于：{model.techGroupIds.map(getTechGroupName).join('、')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {models.length === 0 && (
            <div className="text-center py-8">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
              <p className="text-slate-400">暂无能力模型组</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
