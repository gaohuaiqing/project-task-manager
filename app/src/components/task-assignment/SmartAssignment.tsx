import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  User, 
  Loader2,
  Target,
  Zap,
  Award,
  FolderKanban,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskDifficulties, priorities } from '@/data/mockData';
import type { Member, TaskFormData, Candidate, Project } from '@/types';
import { wbsTaskApiService } from '@/services/WbsTaskApiService';
import type { WbsTask } from '@/types/wbs';

// 任务类型接口
interface TaskType {
  value: string;
  label: string;
  color: string;
}

interface SmartAssignmentProps {
  members: Member[];
}

export function SmartAssignment({ members }: SmartAssignmentProps) {
  // 从 localStorage 获取任务类型设置
  const [taskTypesList, setTaskTypesList] = useState<TaskType[]>([]);
  // 从 localStorage 获取项目列表（与项目管理同步）
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  
  useEffect(() => {
    const savedTypes = localStorage.getItem('taskTypes');
    if (savedTypes) {
      try {
        setTaskTypesList(JSON.parse(savedTypes));
      } catch (error) {
        console.error('[SmartAssignment] 解析任务类型失败:', error);
        // 使用默认类型
        const defaultTypes: TaskType[] = [
          { value: 'frontend', label: '前端开发', color: '#60a5fa' },
          { value: 'backend', label: '后端开发', color: '#4ade80' },
          { value: 'test', label: '测试', color: '#facc15' },
          { value: 'design', label: '设计', color: '#f472b6' },
          { value: 'other', label: '其他', color: '#9ca3af' },
        ];
        setTaskTypesList(defaultTypes);
      }
    } else {
      const defaultTypes: TaskType[] = [
        { value: 'frontend', label: '前端开发', color: '#60a5fa' },
        { value: 'backend', label: '后端开发', color: '#4ade80' },
        { value: 'test', label: '测试', color: '#facc15' },
        { value: 'design', label: '设计', color: '#f472b6' },
        { value: 'other', label: '其他', color: '#9ca3af' },
      ];
      setTaskTypesList(defaultTypes);
      localStorage.setItem('taskTypes', JSON.stringify(defaultTypes));
    }
  }, []);

  // 监听项目列表变化
  useEffect(() => {
    const loadProjects = () => {
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        try {
          setProjectsList(JSON.parse(savedProjects));
        } catch (error) {
          console.error('[SmartAssignment] 解析项目列表失败:', error);
        }
      }
    };

    loadProjects();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'projects') {
        loadProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [formData, setFormData] = useState<TaskFormData & { projectId?: string }>({
    title: '',
    type: 'frontend',
    difficulty: 'medium',
    estimatedHours: 8,
    deadline: '',
    priority: 'medium',
    requiredSkills: [],
    description: '',
    projectId: ''
  });

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false); // 添加分配中的加载状态
  const [assignedTask, setAssignedTask] = useState<{ success: boolean; message: string } | null>(null);

  // 智能推荐算法
  const calculateCandidates = (): Candidate[] => {
    // 定义配置常量
    const LOAD_FACTOR_WEIGHT = 15; // 每个任务对负载的影响
    const MAX_SKILL_SCORE = 100; // 技能评分上限

    return members.map(member => {
      // 防御性检查：提供默认值
      const caps = member.capabilities || {
        boardDev: 0,
        firmwareDev: 0,
        componentImport: 0,
        systemDesign: 0,
        driverInterface: 0
      };
      const avgCapability = (caps.boardDev + caps.firmwareDev + caps.componentImport + caps.systemDesign + caps.driverInterface) / 5;
      // 添加评分上限限制
      const skillMatch = Math.min(avgCapability * 10, MAX_SKILL_SCORE);

      const availability = 100 - (member.saturation ?? 0);

      const experience = Math.min(((member.completedTasks ?? 0) / 50) * 100, 100);

      const loadFactor = Math.max(0, 100 - ((member.currentTasks ?? 0) * LOAD_FACTOR_WEIGHT));

      const score = Math.round(
        skillMatch * 0.35 +
        availability * 0.30 +
        experience * 0.20 +
        loadFactor * 0.15
      );

      const reasons: string[] = [];
      if (skillMatch >= 80) reasons.push('能力高度匹配');
      else if (skillMatch >= 50) reasons.push('能力匹配良好');

      if (availability >= 60) reasons.push('时间充裕');
      else if (availability >= 40) reasons.push('有一定时间');

      if (experience >= 70) reasons.push('经验丰富');
      if (loadFactor >= 70) reasons.push('负载较低');

      return {
        member,
        score,
        reasons: reasons.slice(0, 3),
        skillMatch: Math.round(skillMatch),
        availability: Math.round(availability),
        experience: Math.round(experience),
        loadFactor: Math.round(loadFactor)
      };
    }).sort((a, b) => b.score - a.score);
  };

  const handleAnalyze = () => {
    if (!formData.title || !formData.deadline) return;
    
    setIsAnalyzing(true);
    setShowResults(false);
    setAssignedTask(null);
    
    setTimeout(() => {
      const results = calculateCandidates();
      setCandidates(results);
      setIsAnalyzing(false);
      setShowResults(true);
    }, 1500);
  };

  const handleAssign = async (candidateId: string) => {
    setSelectedCandidate(candidateId);
    setIsAssigning(true);

    const member = members.find(m => m.id === candidateId);
    if (!member || !formData.projectId) {
      setAssignedTask({
        success: false,
        message: '缺少必要信息'
      });
      setIsAssigning(false);
      setSelectedCandidate(null);
      return;
    }

    try {
      // 将智能分配的数据转换为 WbsTask 格式
      const taskData: Partial<WbsTask> = {
        projectId: formData.projectId,
        memberId: candidateId,
        title: formData.title,
        description: formData.description || '',
        status: 'not_started',
        priority: mapPriorityToWbsTask(formData.priority),
        plannedEndDate: formData.deadline || undefined,
        estimatedHours: formData.estimatedHours,
        wbsCode: '', // 将由后端生成
        level: 0,
        subtasks: [],
        progress: 0,
        order: 0,
        isExpanded: true,
      };

      // 使用 wbsTaskApiService 创建任务
      const createdTask = await wbsTaskApiService.createTask(taskData);

      setAssignedTask({
        success: true,
        message: `任务"${formData.title}"已成功分配给 ${member.name}`
      });
      setSelectedCandidate(null);

      // 3秒后清除成功消息
      setTimeout(() => setAssignedTask(null), 3000);

      // 触发事件通知其他组件
      window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'tasks' } }));
    } catch (error) {
      console.error('[SmartAssignment] 分配任务失败:', error);
      setAssignedTask({
        success: false,
        message: `分配失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // 将智能分配的优先级映射到 WbsTask 的优先级
  const mapPriorityToWbsTask = (priority: string): WbsTask['priority'] => {
    const priorityMap: Record<string, WbsTask['priority']> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'urgent': 'urgent', // 保持紧急优先级
    };
    return priorityMap[priority] || 'medium';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    return 'bg-orange-500/20';
  };

  return (
    <div className="space-y-6">
      {/* 成功提示 */}
      {assignedTask?.success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-900/20 border border-green-700/50 text-green-200">
          <CheckCircle2 className="w-5 h-5" />
          <span>{assignedTask.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 任务输入表单 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              任务信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 项目工艺代号选择 */}
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                项目工艺代号
              </Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger className="bg-background border-border text-white">
                  <SelectValue placeholder="选择项目工艺代号..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {projectsList.length === 0 ? (
                    <SelectItem value="" disabled className="text-muted-foreground">
                      暂无项目，请在项目管理中创建
                    </SelectItem>
                  ) : (
                    projectsList.map(project => (
                      <SelectItem key={project.id} value={project.id} className="text-white">
                        {project.code}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 项目名称（只读，根据工艺代号自动显示） */}
            <div className="space-y-2">
              <Label className="text-white">项目名称</Label>
              <Input
                value={formData.projectId ? projectsList.find(p => p.id === formData.projectId)?.name || '' : ''}
                readOnly
                className="bg-background border-border text-white/70 cursor-not-allowed"
                placeholder="选择项目工艺代号后自动显示"
              />
            </div>

            {/* 任务名称 */}
            <div className="space-y-2">
              <Label className="text-white">任务名称</Label>
              <Input
                placeholder="输入任务名称..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-background border-border text-white"
              />
            </div>

            {/* 任务类型和难度 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">任务类型</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as TaskFormData['type'] }))}
                >
                  <SelectTrigger className="bg-background border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {taskTypesList.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-white">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">任务难度</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value as TaskFormData['difficulty'] }))}
                >
                  <SelectTrigger className="bg-background border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {taskDifficulties.map(diff => (
                      <SelectItem key={diff.value} value={diff.value} className="text-white">
                        {diff.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 预计工时和截止日期 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">预计工时（天）</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 0 }))}
                  className="bg-background border-border text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">目标完成时间</Label>
                <Input
                  type="date"
                  placeholder="年/月/日"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  className="bg-background border-border text-white"
                />
              </div>
            </div>

            {/* 优先级 */}
            <div className="space-y-2">
              <Label className="text-white">优先级</Label>
              <div className="flex gap-2">
                {priorities.map(p => (
                  <Button
                    key={p.value}
                    type="button"
                    variant={formData.priority === p.value ? 'default' : 'outline'}
                    className={cn(
                      "flex-1 transition-all",
                      formData.priority === p.value 
                        ? p.value === 'low'
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : p.value === 'medium'
                          ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                          : 'bg-red-500 text-white hover:bg-red-600'
                        : 'border-border text-muted-foreground hover:text-white'
                    )}
                    onClick={() => setFormData(prev => ({ ...prev, priority: p.value as TaskFormData['priority'] }))}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 任务描述 */}
            <div className="space-y-2">
              <Label className="text-white">任务描述</Label>
              <Textarea
                placeholder="输入任务详细描述..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-background border-border text-white min-h-[80px]"
              />
            </div>

            {/* 分析按钮 */}
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white"
              onClick={handleAnalyze}
              disabled={!formData.title || !formData.deadline || !formData.projectId || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  智能分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  智能推荐人选
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 推荐结果 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              智能推荐结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showResults ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-accent/50 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {isAnalyzing ? '正在分析最佳人选...' : '填写任务信息后点击分析按钮'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.slice(0, 5).map((candidate, index) => (
                  <div
                    key={candidate.member.id}
                    className={cn(
                      "relative p-4 rounded-lg border transition-all",
                      index === 0
                        ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
                        : "bg-accent/30 border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    {/* 排名 */}
                    <div className={cn(
                      "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-yellow-500 text-black" :
                      index === 1 ? "bg-gray-400 text-black" :
                      index === 2 ? "bg-orange-400 text-black" :
                      "bg-secondary text-white"
                    )}>
                      {index + 1}
                    </div>

                    <div className="flex items-start gap-3">
                      {/* 头像 */}
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={candidate.member.avatar} />
                        <AvatarFallback className="bg-primary text-white">
                          {candidate.member.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h4 className="text-sm font-medium text-white">{candidate.member.name}</h4>
                            <p className="text-xs text-muted-foreground">{candidate.member.role}</p>
                          </div>
                          <div className={cn("px-3 py-1 rounded-lg", getScoreBgColor(candidate.score))}>
                            <span className={cn("text-lg font-bold", getScoreColor(candidate.score))}>
                              {candidate.score}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">分</span>
                          </div>
                        </div>

                        {/* 推荐理由 */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {candidate.reasons.map((reason, i) => (
                            <Badge 
                              key={i}
                              variant="secondary"
                              className="text-xs bg-green-500/20 text-green-400"
                            >
                              <Award className="w-3 h-3 mr-1" />
                              {reason}
                            </Badge>
                          ))}
                        </div>

                        {/* 详细分数 */}
                        <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                          <div className="text-center p-1.5 bg-secondary/50 rounded">
                            <p className="text-muted-foreground">技能</p>
                            <p className="text-white font-medium">{candidate.skillMatch}%</p>
                          </div>
                          <div className="text-center p-1.5 bg-secondary/50 rounded">
                            <p className="text-muted-foreground">时间</p>
                            <p className="text-white font-medium">{candidate.availability}%</p>
                          </div>
                          <div className="text-center p-1.5 bg-secondary/50 rounded">
                            <p className="text-muted-foreground">经验</p>
                            <p className="text-white font-medium">{candidate.experience}%</p>
                          </div>
                          <div className="text-center p-1.5 bg-secondary/50 rounded">
                            <p className="text-muted-foreground">负载</p>
                            <p className="text-white font-medium">{candidate.loadFactor}%</p>
                          </div>
                        </div>

                        {/* 分配按钮 */}
                        <Button
                          size="sm"
                          className={cn(
                            "w-full",
                            index === 0
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black"
                              : "bg-primary hover:bg-secondary text-white"
                          )}
                          onClick={() => handleAssign(candidate.member.id)}
                          disabled={isAssigning || selectedCandidate === candidate.member.id}
                        >
                          {selectedCandidate === candidate.member.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              分配中...
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 mr-2" />
                              {index === 0 ? '选择最佳人选' : '选择此人'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 使用 React.memo 优化组件渲染（移除自定义比较函数，使用默认浅比较）
export default React.memo(SmartAssignment);
