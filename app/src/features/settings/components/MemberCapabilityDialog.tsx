/**
 * 成员能力评定对话框
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Loader2, Star, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCapabilityModels } from '@/features/org/hooks/useOrg';
import { submitCapabilityAssessment } from '@/lib/api/org.api';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Member } from '@/lib/api/org.api';
import type { CapabilityModel, CapabilityDimensionConfig } from '@/features/assignment/types';

interface MemberCapabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
}

interface DimensionScoreInput {
  dimensionName: string;
  score: number;
}

export function MemberCapabilityDialog({
  open,
  onOpenChange,
  member,
}: MemberCapabilityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 状态
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [associationLabel, setAssociationLabel] = useState('');
  const [dimensionScores, setDimensionScores] = useState<DimensionScoreInput[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 查询能力模型列表
  const { data: capabilityModels = [], isLoading: isLoadingModels } = useCapabilityModels();

  // 获取选中的模型
  const selectedModel = capabilityModels.find((m) => m.id === selectedModelId);

  // 当选择模型时，初始化维度分数
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = capabilityModels.find((m) => m.id === modelId);
    if (model) {
      setDimensionScores(
        model.dimensions.map((d) => ({
          dimensionName: d.name,
          score: 60, // 默认分数
        }))
      );
    } else {
      setDimensionScores([]);
    }
  };

  // 更新维度分数
  const updateDimensionScore = (dimensionName: string, score: number) => {
    setDimensionScores((prev) =>
      prev.map((d) =>
        d.dimensionName === dimensionName ? { ...d, score: Math.min(100, Math.max(0, score)) } : d
      )
    );
  };

  // 计算综合分数
  const calculateOverallScore = (): number => {
    if (!selectedModel || dimensionScores.length === 0) return 0;

    let weightedSum = 0;
    for (const dim of selectedModel.dimensions) {
      const score = dimensionScores.find((d) => d.dimensionName === dim.name)?.score || 0;
      weightedSum += score * (dim.weight / 100);
    }
    return Math.round(weightedSum);
  };

  const overallScore = calculateOverallScore();

  // 获取等级
  const getLevel = (score: number): { label: string; color: string } => {
    if (score >= 90) return { label: '专家', color: 'text-emerald-600' };
    if (score >= 75) return { label: '熟练', color: 'text-blue-600' };
    if (score >= 60) return { label: '胜任', color: 'text-cyan-600' };
    if (score >= 40) return { label: '发展中', color: 'text-yellow-600' };
    return { label: '入门', color: 'text-orange-600' };
  };

  const level = getLevel(overallScore);

  // 提交评定
  const handleSubmit = async () => {
    if (!selectedModelId) {
      toast({ title: '错误', description: '请选择能力模型', variant: 'destructive' });
      return;
    }

    if (dimensionScores.some((d) => d.score < 0 || d.score > 100)) {
      toast({ title: '错误', description: '分数必须在 0-100 之间', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCapabilityAssessment({
        userId: member!.id,
        modelId: selectedModelId,
        associationLabel,
        dimensionScores,
        notes,
      });

      // 刷新成员能力数据
      queryClient.invalidateQueries({ queryKey: ['org', 'capabilities', member!.id] });
      queryClient.invalidateQueries({ queryKey: ['org', 'capabilities'] });

      toast({ title: '成功', description: '能力评定已保存' });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '保存失败', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setSelectedModelId('');
    setAssociationLabel('');
    setDimensionScores([]);
    setNotes('');
  };

  // 关闭时重置
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>能力评定 - {member.name}</DialogTitle>
          <DialogDescription>
            为成员进行能力评估，选择能力模型并为各维度打分
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 选择能力模型 */}
          <div className="space-y-2">
            <Label>能力模型 *</Label>
            <Select value={selectedModelId} onValueChange={handleModelSelect}>
              <SelectTrigger>
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

          {/* 关联标签 */}
          <div className="space-y-2">
            <Label>关联标签（可选）</Label>
            <Input
              placeholder="如：固件方向、驱动方向"
              value={associationLabel}
              onChange={(e) => setAssociationLabel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              同一模型可以多次评定，通过标签区分不同方向
            </p>
          </div>

          {/* 维度评分 */}
          {selectedModel && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <Label>维度评分</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">综合分数:</span>
                  <Badge className={`${level.color} bg-opacity-20`}>
                    {overallScore} - {level.label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                {selectedModel.dimensions.map((dim) => {
                  const currentScore = dimensionScores.find(
                    (d) => d.dimensionName === dim.name
                  )?.score || 0;

                  return (
                    <div key={dim.name} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{dim.name}</p>
                          <p className="text-xs text-muted-foreground">
                            权重: {dim.weight}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={currentScore}
                            onChange={(e) =>
                              updateDimensionScore(dim.name, parseInt(e.target.value) || 0)
                            }
                            className="w-20 text-center"
                          />
                          <span className="text-sm text-muted-foreground">分</span>
                        </div>
                      </div>

                      {/* 分数条 */}
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${currentScore}%` }}
                        />
                      </div>

                      {/* 星级显示 */}
                      <div className="flex items-center gap-1 mt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              currentScore >= (i + 1) * 20
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 备注 */}
          {selectedModel && (
            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="评定说明、改进建议等"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedModelId || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存评定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
