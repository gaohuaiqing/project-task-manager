/**
 * 能力维度管理组件
 * 仅部门经理和系统管理员可访问
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  CheckSquare,
  X,
  GripVertical,
  Settings,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CapabilityDimension } from '@/types/capabilityDimension';
import {
  getAllDimensions,
  createDimension,
  updateDimension,
  deleteDimension,
  canManageDimensions,
} from '@/types/capabilityDimension';

export function CapabilityDimensionManager() {
  const { user, isAdmin } = useAuth();
  
  // 检查权限
  const hasPermission = user ? canManageDimensions(user.role) : false;
  
  // 状态管理
  const [dimensions, setDimensions] = useState<CapabilityDimension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 对话框状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDimension, setEditingDimension] = useState<CapabilityDimension | null>(null);
  const [dimensionName, setDimensionName] = useState('');
  const [dimensionDescription, setDimensionDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // 删除确认对话框
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dimensionToDelete, setDimensionToDelete] = useState<CapabilityDimension | null>(null);

  // 加载维度列表
  useEffect(() => {
    loadDimensions();
  }, []);

  const loadDimensions = () => {
    try {
      const dims = getAllDimensions();
      setDimensions(dims.sort((a, b) => a.sortOrder - b.sortOrder));
      setIsLoading(false);
    } catch (err) {
      setError('加载维度数据失败');
      setIsLoading(false);
    }
  };

  // 打开创建对话框
  const handleAddDimension = () => {
    setEditingDimension(null);
    setDimensionName('');
    setDimensionDescription('');
    setIsActive(true);
    setIsDialogOpen(true);
    setError('');
    setSuccess('');
  };

  // 打开编辑对话框
  const handleEditDimension = (dimension: CapabilityDimension) => {
    setEditingDimension(dimension);
    setDimensionName(dimension.name);
    setDimensionDescription(dimension.description);
    setIsActive(dimension.isActive);
    setIsDialogOpen(true);
    setError('');
    setSuccess('');
  };

  // 保存维度
  const handleSaveDimension = () => {
    setError('');
    setSuccess('');

    if (!dimensionName.trim()) {
      setError('维度名称不能为空');
      return;
    }

    if (!user) {
      setError('用户未登录');
      return;
    }

    if (editingDimension) {
      // 更新维度
      const result = updateDimension(
        editingDimension.id,
        {
          name: dimensionName,
          description: dimensionDescription,
          isActive,
        },
        user.id
      );

      if (result.success) {
        setSuccess('维度更新成功');
        loadDimensions();
        setTimeout(() => {
          setIsDialogOpen(false);
          setSuccess('');
        }, 1500);
      } else {
        setError(result.message);
      }
    } else {
      // 创建维度
      const result = createDimension(
        dimensionName,
        dimensionDescription,
        user.id
      );

      if (result.success) {
        setSuccess('维度创建成功');
        loadDimensions();
        setTimeout(() => {
          setIsDialogOpen(false);
          setSuccess('');
        }, 1500);
      } else {
        setError(result.message);
      }
    }
  };

  // 打开删除确认对话框
  const handleDeleteClick = (dimension: CapabilityDimension) => {
    setDimensionToDelete(dimension);
    setIsDeleteDialogOpen(true);
    setError('');
  };

  // 确认删除
  const handleConfirmDelete = () => {
    if (!dimensionToDelete) return;

    const result = deleteDimension(dimensionToDelete.id);

    if (result.success) {
      setSuccess('维度删除成功');
      loadDimensions();
      setTimeout(() => {
        setIsDeleteDialogOpen(false);
        setDimensionToDelete(null);
        setSuccess('');
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  // 移动维度顺序
  const handleMoveDimension = (index: number, direction: 'up' | 'down') => {
    if (!user) return;

    const newDimensions = [...dimensions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newDimensions.length) return;

    // 交换顺序
    const temp = newDimensions[index].sortOrder;
    newDimensions[index].sortOrder = newDimensions[targetIndex].sortOrder;
    newDimensions[targetIndex].sortOrder = temp;

    // 重新排序
    newDimensions.sort((a, b) => a.sortOrder - b.sortOrder);

    // 保存到本地存储
    const dims = getAllDimensions();
    const updatedDims = dims.map(d => {
      const newDim = newDimensions.find(nd => nd.id === d.id);
      if (newDim) {
        return { ...d, sortOrder: newDim.sortOrder };
      }
      return d;
    });
    
    // 使用 updateDimension 更新每个维度
    updatedDims.forEach(d => {
      updateDimension(d.id, { sortOrder: d.sortOrder }, user.id);
    });

    setDimensions(newDimensions);
  };

  // 无权限提示
  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <Alert className="bg-red-500/10 border-red-500/30">
          <Shield className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-400">
            您没有权限访问维度设置功能。请联系管理员获取权限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">能力维度设置</h2>
        </div>
        <Button
          onClick={handleAddDimension}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          新增维度
        </Button>
      </div>

      {/* 提示信息 */}
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <Shield className="w-4 h-4 text-blue-400" />
        <AlertDescription className="text-blue-400">
          维度设置用于定义能力评估的各个维度。系统默认维度不能删除，但可以禁用。
        </AlertDescription>
      </Alert>

      {/* 维度列表 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-white">维度列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-slate-400">加载中...</span>
            </div>
          ) : dimensions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无维度数据</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dimensions.map((dimension, index) => (
                <div
                  key={dimension.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    dimension.isActive
                      ? "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      : "bg-slate-800/20 border-slate-800 opacity-60"
                  )}
                >
                  {/* 拖拽图标 */}
                  <GripVertical className="w-4 h-4 text-slate-500 cursor-move" />

                  {/* 排序按钮 */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveDimension(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-500 hover:text-white disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveDimension(index, 'down')}
                      disabled={index === dimensions.length - 1}
                      className="text-slate-500 hover:text-white disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>

                  {/* 维度信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{dimension.name}</span>
                      {!dimension.isActive && (
                        <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-400">
                          已禁用
                        </Badge>
                      )}
                      {/* 系统默认标记 */}
                      {['boardDev', 'firmwareDev', 'componentImport', 'systemDesign', 'driverInterface'].includes(dimension.id) && (
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                          系统默认
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{dimension.description}</p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20"
                      onClick={() => handleEditDimension(dimension)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                      onClick={() => handleDeleteClick(dimension)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDimension ? '编辑维度' : '新增维度'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingDimension ? '修改维度信息' : '创建新的能力评估维度'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="bg-red-900/50 border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/50 border-green-700">
              <CheckSquare className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">维度名称 <span className="text-red-400">*</span></Label>
              <Input
                value={dimensionName}
                onChange={(e) => setDimensionName(e.target.value)}
                placeholder="请输入维度名称"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">维度描述</Label>
              <textarea
                value={dimensionDescription}
                onChange={(e) => setDimensionDescription(e.target.value)}
                placeholder="请输入维度描述"
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white min-h-[80px]"
              />
            </div>

            {editingDimension && (
              <div className="flex items-center justify-between">
                <Label className="text-white">启用状态</Label>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleSaveDimension}
              >
                {editingDimension ? '保存' : '创建'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card border-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle>删除维度</DialogTitle>
            <DialogDescription className="text-slate-400">
              确定要删除维度 "{dimensionToDelete?.name}" 吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="bg-red-900/50 border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/50 border-green-700">
              <CheckSquare className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200">{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
            >
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CapabilityDimensionManager;
