/**
 * 成员能力详情组件
 * 展示成员的能力评定数据，格式：模型名称: 维度1:分数 | 维度2:分数 | 维度3:分数
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { Award, TrendingUp, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CapabilityRadarChart, CompactCapabilityDisplay } from '@/features/settings/components/CapabilityRadarChart';
import { getCapabilityLevel, type MemberCapabilityAssessment, type DimensionScore } from '../types';

interface MemberCapabilitiesProps {
  memberId: number;
  className?: string;
  showHistory?: boolean;
  capabilities?: MemberCapabilityAssessment[];
  overallScore?: number;
  lastAssessmentDate?: string | null;
  isLoading?: boolean;
}

export function MemberCapabilities({
  memberId,
  className,
  showHistory = false,
  capabilities = [],
  overallScore = 0,
  lastAssessmentDate = null,
  isLoading = false,
}: MemberCapabilitiesProps) {
  const [expandedModelIds, setExpandedModelIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (capabilities.length === 0) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Award className="h-12 w-12 mb-2 opacity-50" />
            <p>暂无能力数据</p>
            <p className="text-sm mt-1">请先为该成员添加能力评定</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallLevel = getCapabilityLevel(overallScore);

  const toggleExpand = (modelId: string) => {
    setExpandedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  // 获取颜色类
  const getLevelColorClass = (score: number) => {
    const level = getCapabilityLevel(score);
    switch (level.color) {
      case 'emerald': return 'bg-emerald-500';
      case 'blue': return 'bg-blue-500';
      case 'cyan': return 'bg-cyan-500';
      case 'yellow': return 'bg-yellow-500';
      case 'orange': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card data-testid="assignment-profile-container" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              能力档案
            </CardTitle>
            <CardDescription>
              已评定 {capabilities.length} 个能力模型
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">综合评分:</span>
            <Badge className={cn('text-base px-3 py-1', getLevelColorClass(overallScore))}>
              {overallLevel.label} ({overallScore})
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 能力模型列表 */}
        {capabilities.map((cap) => {
          const isExpanded = expandedModelIds.has(cap.id);
          const modelLevel = getCapabilityLevel(cap.overall_score);

          // 格式化维度分数显示：维度1:分数 | 维度2:分数 | 维度3:分数
          const formatDimensionScores = (scores: DimensionScore[]): string => {
            return scores
              .map((s) => `${s.dimension_name}:${s.score}`)
              .join(' | ');
          };

          // 按分数排序取前3个维度用于雷达图
          const topDimensions = [...cap.dimension_scores]
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

          // 转换为雷达图数据格式
          const radarDimensions = topDimensions.map((d) => ({
            name: d.dimension_name,
            score: d.score,
            weight: 100 / topDimensions.length, // 均分权重
          }));

          return (
            <div key={cap.id} className="border rounded-lg overflow-hidden">
              {/* 模型标题栏 */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(cap.id)}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      modelLevel.color === 'emerald' && 'border-emerald-500 text-emerald-600',
                      modelLevel.color === 'blue' && 'border-blue-500 text-blue-600',
                      modelLevel.color === 'cyan' && 'border-cyan-500 text-cyan-600',
                      modelLevel.color === 'yellow' && 'border-yellow-500 text-yellow-600',
                      modelLevel.color === 'orange' && 'border-orange-500 text-orange-600'
                    )}
                  >
                    {cap.model_name}
                    {cap.association_label && ` - ${cap.association_label}`}
                  </Badge>
                  <span className="text-lg font-bold">{cap.overall_score}</span>
                  <span className="text-sm text-muted-foreground">{modelLevel.label}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* 简洁格式展示：模型名称: 维度1:分数 | 维度2:分数 | 维度3:分数 */}
              <div className="px-4 pb-3 text-sm text-muted-foreground border-t bg-muted/30">
                <code className="text-xs">
                  {cap.model_name}: {formatDimensionScores(cap.dimension_scores)}
                </code>
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <div className="p-4 border-t bg-muted/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 雷达图 */}
                    <div className="flex justify-center">
                      {radarDimensions.length >= 3 ? (
                        <CapabilityRadarChart
                          dimensions={radarDimensions}
                          size={200}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                          <Award className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-sm">维度不足3个，无法显示雷达图</p>
                        </div>
                      )}
                    </div>

                    {/* 维度详情 */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">维度得分详情</h4>
                      {cap.dimension_scores.map((dim) => {
                        const dimLevel = getCapabilityLevel(dim.score);
                        return (
                          <div key={dim.dimension_name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{dim.dimension_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{dim.score}</span>
                                <Badge variant="outline" className="text-xs">
                                  {dimLevel.label}
                                </Badge>
                              </div>
                            </div>
                            <Progress value={dim.score} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 评定信息 */}
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>评定时间: {new Date(cap.evaluated_at).toLocaleDateString()}</span>
                      {cap.notes && <span>备注: {cap.notes}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 最后评估时间 */}
        {lastAssessmentDate && (
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
            <span>最后评估时间</span>
            <span>{new Date(lastAssessmentDate).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 紧凑型成员能力展示
 * 用于表格或列表中
 */
interface CompactMemberCapabilityProps {
  capabilities: MemberCapabilityAssessment[];
  maxModels?: number;
}

export function CompactMemberCapability({
  capabilities,
  maxModels = 2,
}: CompactMemberCapabilityProps) {
  if (capabilities.length === 0) {
    return (
      <span className="text-muted-foreground text-sm">暂无能力数据</span>
    );
  }

  const displayCaps = capabilities.slice(0, maxModels);

  return (
    <div className="space-y-1">
      {displayCaps.map((cap) => (
        <div key={cap.id} className="text-xs">
          <span className="font-medium">{cap.model_name}</span>
          <span className="text-muted-foreground">: </span>
          <span>
            {cap.dimension_scores
              .slice(0, 3)
              .map((d) => `${d.dimension_name}:${d.score}`)
              .join(' | ')}
          </span>
          <Badge variant="outline" className="ml-2 text-xs">
            {cap.overall_score}
          </Badge>
        </div>
      ))}
      {capabilities.length > maxModels && (
        <span className="text-xs text-muted-foreground">
          +{capabilities.length - maxModels} 个模型
        </span>
      )}
    </div>
  );
}
