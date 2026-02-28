import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  MessageSquare,
  Target,
  Award,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  MemberCapabilities,
  CapabilityAssessmentRecord,
  CAPABILITY_LEVELS
} from '@/types';
import type { CapabilityDimension } from '@/types/organization';
import { CAPABILITY_LEVELS as levels } from '@/types';
import { getCapabilityDimensions } from '@/utils/capabilityDimensionManager';
import RadarChart from './RadarChart';

interface CapabilityAssessmentProps {
  capabilities: MemberCapabilities;
  previousCapabilities?: MemberCapabilities;
  onChange?: (key: string, value: number) => void;
  onSubmit?: (assessment: {
    capabilities: MemberCapabilities;
    comments: string;
    assessmentType: 'initial' | 'periodic' | 'promotion' | 'project';
  }) => void;
  editable?: boolean;
  showHistory?: boolean;
  history?: CapabilityAssessmentRecord[];
  showLevelGuide?: boolean;
}

const getLevelInfo = (value: number) => {
  for (const [key, level] of Object.entries(levels)) {
    if (value >= level.min && value <= level.max) {
      return { key, ...level };
    }
  }
  return { key: 'beginner', ...levels.beginner };
};

const getLevelColor = (color: string) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return colorMap[color] || colorMap.orange;
};

const getLevelBarColor = (color: string) => {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-400',
    blue: 'from-blue-500 to-blue-400',
    cyan: 'from-cyan-500 to-cyan-400',
    yellow: 'from-yellow-500 to-yellow-400',
    orange: 'from-orange-500 to-orange-400',
  };
  return colorMap[color] || colorMap.orange;
};

const CapabilityAssessment: React.FC<CapabilityAssessmentProps> = ({
  capabilities,
  previousCapabilities,
  onChange,
  onSubmit,
  editable = false,
  showHistory = false,
  history = [],
  showLevelGuide = true,
}) => {
  // 获取动态能力维度
  const capabilityDimensions = getCapabilityDimensions();
  const capabilityKeys = capabilityDimensions.map(d => d.key);

  // 创建维度信息的映射，方便快速查找
  const dimensionsMap = capabilityDimensions.reduce((acc, dim) => {
    acc[dim.key] = dim;
    return acc;
  }, {} as Record<string, CapabilityDimension>);

  const [comments, setComments] = useState('');
  const [assessmentType, setAssessmentType] = useState<'initial' | 'periodic' | 'promotion' | 'project'>('periodic');
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  const overallScore = useMemo(() => {
    const values = Object.values(capabilities);
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length * 10) / 10;
  }, [capabilities]);

  const overallLevel = useMemo(() => getLevelInfo(Math.round(overallScore)), [overallScore]);

  const changes = useMemo(() => {
    if (!previousCapabilities) return null;
    const result: Record<string, { from: number; to: number; change: number }> = {} as any;
    capabilityKeys.forEach(key => {
      result[key] = {
        from: previousCapabilities[key] || 5,
        to: capabilities[key] || 5,
        change: (capabilities[key] || 5) - (previousCapabilities[key] || 5),
      };
    });
    return result;
  }, [capabilities, previousCapabilities, capabilityKeys]);

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        capabilities,
        comments,
        assessmentType,
      });
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
    if (change < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-slate-400" />;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getAssessmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initial: '初始评估',
      periodic: '定期评估',
      promotion: '晋升评估',
      project: '项目评估',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              能力评估
            </h3>
            <Badge className={cn("text-sm", getLevelColor(overallLevel.color))}>
              {overallLevel.label} ({overallScore.toFixed(1)})
            </Badge>
          </div>

          <div className="flex items-center justify-center p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <RadarChart
              capabilities={capabilities as unknown as { [key: string]: number }}
              onChange={onChange}
              editable={editable}
              size="large"
            />
          </div>

          {editable && onSubmit && (
            <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="space-y-2">
                <Label className="text-white">评估类型</Label>
                <Select value={assessmentType} onValueChange={(v: any) => setAssessmentType(v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="initial">初始评估</SelectItem>
                    <SelectItem value="periodic">定期评估</SelectItem>
                    <SelectItem value="promotion">晋升评估</SelectItem>
                    <SelectItem value="project">项目评估</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">评估备注</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="请输入评估说明..."
                  className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
                />
              </div>
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleSubmit}
              >
                提交评估
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            能力详情
          </h3>

          <div className="space-y-3">
            {capabilityKeys.map((key) => {
              const value = capabilities[key];
              const levelInfo = getLevelInfo(value);
              const dimensionInfo = dimensionsMap[key];
              const change = changes?.[key];
              const isExpanded = expandedDimension === key;

              return (
                <div 
                  key={key} 
                  className="bg-slate-800/30 rounded-lg border border-slate-700 overflow-hidden"
                >
                  <div 
                    className="p-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
                    onClick={() => setExpandedDimension(isExpanded ? null : key)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{dimensionInfo.name}</span>
                        {change && (
                          <div className="flex items-center gap-1">
                            {getChangeIcon(change.change)}
                            <span className={cn(
                              "text-xs",
                              change.change > 0 ? "text-emerald-400" : 
                              change.change < 0 ? "text-red-400" : "text-slate-400"
                            )}>
                              {change.change > 0 ? '+' : ''}{change.change}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", getLevelColor(levelInfo.color))}>
                          {levelInfo.label}
                        </Badge>
                        <span className="text-sm font-semibold text-white">{value}/10</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full bg-gradient-to-r rounded-full transition-all duration-500",
                          getLevelBarColor(levelInfo.color)
                        )}
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-slate-700 bg-slate-800/50">
                      <p className="text-xs text-slate-400 mt-2 mb-2">{dimensionInfo.description}</p>
                      <div className="flex items-start gap-2">
                        <Info className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-300">{levelInfo.description}</p>
                      </div>
                      
                      {editable && onChange && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-slate-400">调整评分:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <button
                                key={num}
                                onClick={() => onChange(key, num)}
                                className={cn(
                                  "w-6 h-6 rounded text-xs font-medium transition-all",
                                  value === num 
                                    ? "bg-blue-500 text-white" 
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                )}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showLevelGuide && (
        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              能力等级说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(levels).map(([key, level]) => (
                <div 
                  key={key}
                  className="p-2 rounded-lg bg-slate-700/30 border border-slate-600"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-xs", getLevelColor(level.color))}>
                      {level.label}
                    </Badge>
                    <span className="text-xs text-slate-400">{level.min}-{level.max}分</span>
                  </div>
                  <p className="text-xs text-slate-300">{level.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showHistory && history.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader 
            className="pb-2 cursor-pointer hover:bg-slate-700/30 transition-colors"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
          >
            <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                评估历史 ({history.length})
              </div>
              {showHistoryPanel ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </CardTitle>
          </CardHeader>
          
          {showHistoryPanel && (
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {history.slice().reverse().map((record) => (
                  <div 
                    key={record.id}
                    className="p-3 rounded-lg bg-slate-700/30 border border-slate-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                          {getAssessmentTypeLabel(record.assessmentType)}
                        </Badge>
                        <span className="text-xs text-slate-400">{formatDate(record.assessmentDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <User className="w-3 h-3" />
                        {record.assessorName}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-sm font-medium text-white">{record.overallScore.toFixed(1)}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        {capabilityKeys.map((key) => (
                          <div key={key} className="flex-1">
                            <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(record.capabilities[key] / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {record.comments && (
                      <div className="flex items-start gap-2 text-xs text-slate-300">
                        <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p>{record.comments}</p>
                      </div>
                    )}

                    {record.changes && Object.keys(record.changes).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(record.changes).map(([key, change]) => (
                          <Badge
                            key={key}
                            className={cn(
                              "text-xs",
                              change.to > change.from
                                ? "bg-emerald-500/20 text-emerald-400"
                                : change.to < change.from
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-slate-500/20 text-slate-400"
                            )}
                          >
                            {dimensionsMap[key]?.name || key}: {change.from} → {change.to}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default CapabilityAssessment;
