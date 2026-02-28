import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Edit3,
  Trash2,
  Play,
  Check,
  X,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Member, Project } from '@/types';
import type { WbsTask, TaskApprovalRecord, ForceRefreshRecord } from '@/types/wbs';
import { WbsTaskTable } from './WbsTaskTable';
import { MemberSelect } from './MemberSelect';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_CONFIG, canPerformTaskOperation, canForceRefreshTaskPlan } from '@/types/auth';
import {
  calculateWbsStats,
  identifyCriticalPath,
  detectDateConflicts,
  generateWbsCode,
  isNearDeadline,
  isOverdue,
  calculateTaskStatus
} from '@/utils/wbsCalculator';
import { initializeTestRecords } from '@/utils/testDataGenerator';
import { wbsTaskApiService } from '@/services/WbsTaskApiService';
import { approvalApiService, ApprovalStatus } from '@/services/ApprovalApiService';
import { useDialog } from '@/hooks/useDialog';
import { useDebounce } from '@/hooks/useDebounce';

interface TaskManagementProps {
  members: Member[];
  projects: Project[];
  tasks?: WbsTask[]; // 添加可选的 tasks 属性
}

export function TaskManagement({ members, projects, tasks: initialTasks = [] }: TaskManagementProps) {
  const { user, isAdmin } = useAuth();
  const dialog = useDialog();

  // 任务列表：使用 props 传递的 tasks 或内部状态（向后兼容）
  const [tasks, setTasks] = useState<WbsTask[]>(initialTasks);
  const [isInternalData, setIsInternalData] = useState(false); // 标记是否使用内部数据

  // 审批记录（使用后端 API）
  const [approvalRecords, setApprovalRecords] = useState<TaskApprovalRecord[]>([]);

  // 加载待审批记录
  useEffect(() => {
    const loadPendingApprovals = async () => {
      if (isAdmin || user?.role === 'tech_manager') {
        const records = await approvalApiService.getPendingApprovals(100);
        setApprovalRecords(records);
      } else if (user) {
        // 工程师只能看到自己的审批请求
        const records = await approvalApiService.getUserApprovalRequests(user.id);
        setApprovalRecords(records);
      }
    };

    loadPendingApprovals();
  }, [user, isAdmin]);

  const [searchQuery, setSearchQuery] = useState('');
  // 使用防抖优化搜索，减少频繁的过滤计算（本地数据过滤使用150ms）
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const [filterProject, setFilterProject] = useState<string[]>(['all']);
  const [filterMember, setFilterMember] = useState<string[]>(['all']);
  const [filterStatus, setFilterStatus] = useState<string[]>(['all']);
  const [filterPriority, setFilterPriority] = useState<string[]>(['all']);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WbsTask | null>(null);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set(members.map(m => m.id)));
  const [permissionError, setPermissionError] = useState<string>('');
  
  // 审批相关状态
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [selectedApprovalRecord, setSelectedApprovalRecord] = useState<TaskApprovalRecord | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  
  // 强行刷新相关状态
  const [isForceRefreshDialogOpen, setIsForceRefreshDialogOpen] = useState(false);
  const [forceRefreshTask, setForceRefreshTask] = useState<WbsTask | null>(null);
  const [forceRefreshDescription, setForceRefreshDescription] = useState('');
  
  // 强行刷新记录
  const [forceRefreshRecords, setForceRefreshRecords] = useState<ForceRefreshRecord[]>(() => {
    const saved = localStorage.getItem('forceRefreshRecords');
    return saved ? JSON.parse(saved) : [];
  });
  
  // 保存强行刷新记录到 localStorage
  useEffect(() => {
    localStorage.setItem('forceRefreshRecords', JSON.stringify(forceRefreshRecords));
  }, [forceRefreshRecords]);

  // 初始化测试数据
  useEffect(() => {
    if (tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);
      initializeTestRecords(taskIds);
    }
  }, [tasks]);

  // 同步外部传入的 tasks（性能优化：使用 App.tsx 的数据）
  useEffect(() => {
    if (initialTasks.length > 0) {
      setTasks(initialTasks);
      setIsInternalData(false);
    }
  }, [initialTasks]);

  // 向后兼容：如果没有传入 tasks，则从后端加载
  useEffect(() => {
    if (initialTasks.length === 0 && !isInternalData) {
      const loadTasks = async () => {
        try {
          // 使用 wbsTaskApiService 替代 dataService
          const loadedTasks = await wbsTaskApiService.getTasks();
          if (loadedTasks && loadedTasks.length > 0) {
            setTasks(loadedTasks);
            setIsInternalData(true);
          }
        } catch (error) {
          console.error('[TaskManagement] 加载任务失败:', error);
        }
      };

      loadTasks();
    }
  }, [initialTasks, isInternalData]);

  // 监听后端数据变化
  useEffect(() => {
    const unsubscribe = wbsTaskApiService.onBackendChange((operation, task) => {
      setTasks(prevTasks => {
        switch (operation) {
          case 'create':
            return [...prevTasks, task];
          case 'update':
            return prevTasks.map(t => t.id === task.id ? task : t);
          case 'delete':
            return prevTasks.filter(t => t.id !== task.id);
          default:
            return prevTasks;
        }
      });
    });

    return unsubscribe;
  }, []);

  // 检查用户是否有任务编辑权限
  const hasTaskPermission = (task: WbsTask): boolean => {
    if (!user) return false;
    if (isAdmin) return true; // 管理员有所有权限

    const userRole = user.role;

    // 首先检查用户是否有权限访问任务所属的项目
    const hasProjectAccess = (() => {
      // 如果用户是管理员、部门经理或技术经理，可以访问所有项目
      if (userRole === 'admin' || userRole === 'dept_manager' || userRole === 'tech_manager') {
        return true;
      }
      // 工程师只能访问自己参与的项目（通过检查是否有该项目下的任务分配给自己）
      if (userRole === 'engineer') {
        // 检查当前用户是否有该项目下的任何任务
        return tasks.some(t => t.projectId === task.projectId && t.memberId === user.id);
      }
      return false;
    })();

    if (!hasProjectAccess) {
      return false;
    }

    switch (userRole) {
      case 'admin':
        return true;
      case 'dept_manager':
        // 部门经理：假设可以查看所有任务
        return true;
      case 'tech_manager':
        // 技术经理：假设可以查看所有任务
        return true;
      case 'engineer':
        // 工程师：只能查看分配给自己的任务
        return task.memberId === user.id;
      default:
        return false;
    }
  };

  // 根据用户权限过滤任务
  const filteredTasksByPermission = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return tasks;
    
    const userRole = user.role;
    
    switch (userRole) {
      case 'admin':
        return tasks;
      case 'dept_manager':
      case 'tech_manager':
        // 经理级别可以查看所有任务
        return tasks;
      case 'engineer':
        // 工程师只能查看分配给自己的任务
        return tasks.filter(task => task.memberId === user.id);
      default:
        return [];
    }
  }, [tasks, user, isAdmin]);

  // 保存审批记录到 localStorage（暂时保留，后续可迁移到后端）
  useEffect(() => {
    localStorage.setItem('taskApprovalRecords', JSON.stringify(approvalRecords));
  }, [approvalRecords]);

  const [newTask, setNewTask] = useState<Partial<WbsTask>>({
    projectId: '',
    memberId: '',
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    plannedStartDate: '',
    plannedEndDate: '',
    plannedDays: 1,
    progress: 0,
    predecessor: '',
  });

  // 筛选任务（结合权限过滤）
  const filteredTasks = useMemo(() => {
    return filteredTasksByPermission.filter(task => {
      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch = (task.title?.toLowerCase() || '').includes(searchLower) ||
        (task.description?.toLowerCase() || '').includes(searchLower) ||
        (task.wbsCode || '').includes(debouncedSearchQuery);
      const matchesProject = filterProject.includes('all') || filterProject.includes(task.projectId);
      const matchesMember = filterMember.includes('all') || filterMember.includes(task.memberId);

      // 计算任务状态
      const taskStatus = calculateTaskStatus(task);
      const matchesStatus = filterStatus.includes('all') || filterStatus.includes(taskStatus.statusCode);

      const matchesPriority = filterPriority.includes('all') || filterPriority.includes(task.priority);
      return matchesSearch && matchesProject && matchesMember && matchesStatus && matchesPriority;
    });
  }, [filteredTasksByPermission, debouncedSearchQuery, filterProject, filterMember, filterStatus, filterPriority]);

  const getStatusConfig = (status: WbsTask['status']) => {
    switch (status) {
      case 'not_started':
        return { label: '未开始', color: 'bg-gray-500/20 text-gray-400', icon: <Clock className="w-4 h-4" /> };
      case 'in_progress':
        return { label: '进行中', color: 'bg-blue-500/20 text-blue-400', icon: <Play className="w-4 h-4" /> };
      case 'completed':
        return { label: '已完成', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'delayed':
        return { label: '已延期', color: 'bg-red-500/20 text-red-400', icon: <AlertTriangle className="w-4 h-4" /> };
    }
  };

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || '未分配';
  };

  const getTaskTitle = (taskId: string) => {
    return tasks.find(t => t.id === taskId)?.title || '-';
  };

  const toggleExpandMember = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  // 计算任务工期
  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  };

  // 添加任务
  const addTask = async () => {
    if (!newTask.title || !newTask.projectId || !newTask.plannedStartDate || !newTask.plannedEndDate) {
      return;
    }

    // 工程师只能分配给自己
    const memberId = user?.role === 'engineer' ? user.id : newTask.memberId;
    if (!memberId) {
      return;
    }

    const memberTasks = tasks.filter(t => t.memberId === memberId);
    const wbsCode = generateWbsCode('', memberTasks.length);

    // 工程师创建的任务需要审批（保留现有审批机制）
    const needsApproval = user?.role === 'engineer';
    const approvalStatus = needsApproval ? 'pending' : 'approved';

    const taskData: Partial<WbsTask> = {
      projectId: newTask.projectId,
      memberId: memberId,
      title: newTask.title,
      description: newTask.description || '',
      status: 'not_started',
      priority: newTask.priority as WbsTask['priority'],
      approvalStatus,
      plannedStartDate: newTask.plannedStartDate,
      plannedEndDate: newTask.plannedEndDate,
      plannedDays: calculateDays(newTask.plannedStartDate, newTask.plannedEndDate),
      predecessor: newTask.predecessor || undefined,
      wbsCode,
      level: 0,
      subtasks: [],
      progress: 0,
      order: memberTasks.length,
      isExpanded: true,
    };

    try {
      // 使用 wbsTaskApiService 创建任务
      const createdTask = await wbsTaskApiService.createTask(taskData);

      // 更新本地状态
      setTasks(prev => [...prev, createdTask]);

      // 如果需要审批，创建后端审批记录
      if (needsApproval && user) {
        await approvalApiService.createApproval({
          taskId: createdTask.id,
          taskTitle: createdTask.title,
          requesterRole: user.role,
          requestType: 'create_task'
        });
      }

      // 重置表单
      setNewTask({
        title: '',
        projectId: '',
        memberId: '',
        description: '',
        priority: 'medium',
        plannedStartDate: '',
        plannedEndDate: '',
        predecessor: '',
      });
      setIsCreateDialogOpen(false);

      // 通知父组件刷新数据
      window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'tasks' } }));

      await dialog.alert('任务创建成功！', { variant: 'success' });
    } catch (error) {
      console.error('[TaskManagement] 创建任务失败:', error);
      await dialog.alert('创建任务失败：' + (error instanceof Error ? error.message : '未知错误'), { variant: 'error' });
    }
  };

  // 删除任务
  const deleteTask = async (taskId: string) => {
    try {
      // 使用 wbsTaskApiService 删除任务
      await wbsTaskApiService.deleteTask(taskId);

      // 更新本地状态
      setTasks(prev => prev.filter(t => t.id !== taskId));

      // 通知父组件刷新数据
      window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'tasks' } }));

      await dialog.alert('任务删除成功！', { variant: 'success' });
    } catch (error) {
      console.error('[TaskManagement] 删除任务失败:', error);
      await dialog.alert('删除任务失败：' + (error instanceof Error ? error.message : '未知错误'), { variant: 'error' });
    }
  };
  
  // 审批任务（通过）
  const approveTask = async (recordId: string) => {
    const record = approvalRecords.find(r => r.id === recordId);
    if (!record || !user) return;

    try {
      // 使用后端 API 进行审批
      const result = await approvalApiService.approveApproval(recordId, approvalComment);

      if (result.success) {
        // 从待审批列表中移除
        setApprovalRecords(prev => prev.filter(r => r.id !== recordId));

        // 更新任务状态
        setTasks(prev => prev.map(t =>
          t.id === record.taskId ? { ...t, approvalStatus: 'approved' } : t
        ));

        setIsApprovalDialogOpen(false);
        setSelectedApprovalRecord(null);
        setApprovalComment('');

        await dialog.alert('任务审批通过！', { variant: 'success' });
      } else {
        await dialog.alert('审批失败：' + (result.message || '未知错误'), { variant: 'error' });
      }
    } catch (error) {
      console.error('[TaskManagement] 审批任务失败:', error);
      await dialog.alert('审批失败：' + (error instanceof Error ? error.message : '未知错误'), { variant: 'error' });
    }
  };

  // 审批任务（拒绝）
  const rejectTask = async (recordId: string) => {
    const record = approvalRecords.find(r => r.id === recordId);
    if (!record || !user) return;

    try {
      // 使用后端 API 进行审批
      const result = await approvalApiService.rejectApproval(recordId, approvalComment);

      if (result.success) {
        // 从待审批列表中移除
        setApprovalRecords(prev => prev.filter(r => r.id !== recordId));

        // 更新任务状态
        setTasks(prev => prev.map(t =>
          t.id === record.taskId ? { ...t, approvalStatus: 'rejected' } : t
        ));

        setIsApprovalDialogOpen(false);
        setSelectedApprovalRecord(null);
        setApprovalComment('');

        await dialog.alert('任务已拒绝！', { variant: 'info' });
      } else {
        await dialog.alert('操作失败：' + (result.message || '未知错误'), { variant: 'error' });
      }
    } catch (error) {
      console.error('[TaskManagement] 拒绝任务失败:', error);
      await dialog.alert('操作失败：' + (error instanceof Error ? error.message : '未知错误'), { variant: 'error' });
    }
  };
  
  // 获取待审批的任务记录
  const pendingApprovals = useMemo(() => {
    return approvalRecords.filter(r => r.approvalStatus === 'pending');
  }, [approvalRecords]);
  
  // 强行刷新任务计划
  const handleForceRefresh = async () => {
    if (!forceRefreshTask || !user || !forceRefreshDescription.trim()) return;

    const originalTask = tasks.find(t => t.id === forceRefreshTask.id);
    if (!originalTask) return;

    try {
      // 创建强行刷新记录
      const record: ForceRefreshRecord = {
        id: Date.now().toString(),
        taskId: forceRefreshTask.id,
        taskTitle: forceRefreshTask.title,
        operator: user.id,
        operatorName: user.name,
        operatorRole: user.role,
        operationDate: new Date().toISOString(),
        changeDescription: forceRefreshDescription,
        before: {
          startDate: originalTask.plannedStartDate,
          endDate: originalTask.plannedEndDate,
          days: originalTask.plannedDays,
          progress: originalTask.progress,
        },
        after: {
          startDate: forceRefreshTask.plannedStartDate,
          endDate: forceRefreshTask.plannedEndDate,
          days: calculateDays(forceRefreshTask.plannedStartDate, forceRefreshTask.plannedEndDate),
          progress: forceRefreshTask.progress,
        },
        createdAt: new Date().toISOString(),
      };

      // 获取当前任务
      const currentTask = tasks.find(t => t.id === forceRefreshTask.id);
      if (!currentTask) return;

      // 准备更新数据
      const taskUpdates = {
        ...forceRefreshTask,
        plannedDays: calculateDays(forceRefreshTask.plannedStartDate, forceRefreshTask.plannedEndDate),
        approvalStatus: 'approved' as const
      };

      // 使用 wbsTaskApiService 更新任务
      const updatedTask = await wbsTaskApiService.updateTask(forceRefreshTask.id, taskUpdates);

      // 更新本地状态
      setForceRefreshRecords(prev => [...prev, record]);
      setTasks(prev => prev.map(t => t.id === forceRefreshTask.id ? updatedTask : t));

      setIsForceRefreshDialogOpen(false);
      setForceRefreshTask(null);
      setForceRefreshDescription('');

      await dialog.alert('任务计划刷新成功！', { variant: 'success' });
    } catch (error) {
      console.error('[TaskManagement] 强行刷新任务失败:', error);
      await dialog.alert('刷新失败：' + (error instanceof Error ? error.message : '未知错误'), { variant: 'error' });
    }
  };

  // 更新任务状态
  const updateTaskStatus = async (taskId: string, status: WbsTask['status']) => {
    try {
      // 查找当前任务
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) return;

      // 计算更新
      const updates: Partial<WbsTask> = { status };
      if (status === 'in_progress' && !currentTask.actualStartDate) {
        updates.actualStartDate = new Date().toISOString().split('T')[0];
      }
      if (status === 'completed') {
        updates.actualEndDate = new Date().toISOString().split('T')[0];
        updates.progress = 100;
        if (currentTask.actualStartDate) {
          updates.actualDays = calculateDays(currentTask.actualStartDate, updates.actualEndDate!);
        }
      }

      // 使用 wbsTaskApiService 更新任务
      const updatedTask = await wbsTaskApiService.updateTask(taskId, updates);

      // 更新本地状态
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

      // 通知父组件刷新数据
      window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'tasks' } }));
    } catch (error) {
      console.error('[TaskManagement] 更新任务状态失败:', error);
      await dialog.alert('更新任务状态失败：' + (error instanceof Error ? error.message : '未知错误'), { variant: 'error' });
    }
  };

  // 处理任务变更（来自WbsTaskTable）
  const handleTasksChange = async (newTasks: WbsTask[]) => {
    try {
      // 使用 wbsTaskApiService 批量保存
      const result = await wbsTaskApiService.saveTasks(newTasks);

      if (result.success) {
        // 更新本地状态
        setTasks(newTasks);

        // 通知父组件刷新数据
        window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'tasks' } }));
      } else {
        await dialog.alert('保存任务失败：' + (result.message || '未知错误'), { variant: 'error' });
      }
    } catch (error) {
      console.error('[TaskManagement] 保存任务失败:', error);
      await dialog.alert('保存任务失败：' + (error instanceof Error ? error.message : '未知错误'), { variant: 'error' });
    }
  };

  // 保存编辑
  const saveEditTask = async () => {
    if (!editingTask) return;

    try {
      const originalTask = tasks.find(t => t.id === editingTask.id);

      // 检查日期是否变更
      const dateChanged = originalTask && (
        originalTask.plannedStartDate !== editingTask.plannedStartDate ||
        originalTask.plannedEndDate !== editingTask.plannedEndDate
      );

      let updatedApprovalRecords = [...approvalRecords];
      const taskUpdates = {
        ...editingTask,
        plannedDays: calculateDays(editingTask.plannedStartDate, editingTask.plannedEndDate)
      };

      // 工程师的任务日期变更需要审批
      if (dateChanged && user?.role === 'engineer' && originalTask?.approvalStatus === 'approved') {
        // 创建日期变更审批记录
        const approvalRecord: TaskApprovalRecord = {
          id: Date.now().toString() + '_date_change',
          taskId: editingTask.id,
          taskTitle: editingTask.title,
          requester: user.id,
          requesterName: user.name,
          requesterRole: user.role,
          requestDate: new Date().toISOString(),
          approvalStatus: 'pending',
          createdAt: new Date().toISOString(),
        };
        updatedApprovalRecords = [...approvalRecords, approvalRecord];

        // 标记任务为待审批状态
        taskUpdates.approvalStatus = 'pending';

        setPermissionError('日期变更已提交，等待技术经理审批');
        setTimeout(() => setPermissionError(''), 3000);
      }

      // 使用 wbsTaskApiService 更新任务
      const updatedTask = await wbsTaskApiService.updateTask(editingTask.id, taskUpdates);

      // 更新本地状态
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
      setApprovalRecords(updatedApprovalRecords);

      setIsEditDialogOpen(false);
      setEditingTask(null);

      // 通知父组件刷新数据
      window.dispatchEvent(new CustomEvent('data-changed', { detail: { type: 'tasks' } }));

      await dialog.alert('任务更新成功！', { variant: 'success' });
    } catch (error) {
      console.error('[TaskManagement] 保存编辑任务失败:', error);
      await dialog.alert('更新失败：' + (error instanceof Error ? error.message : '未知错误'), { variant: 'error' });
    }
  };

  // 渲染任务行
  const renderTaskRow = (task: WbsTask) => {
    const nearDeadline = isNearDeadline(task);
    const overdue = isOverdue(task);
    const status = getStatusConfig(task.status);

    return (
      <div 
        key={task.id}
        className={cn(
          "grid grid-cols-12 gap-2 p-3 rounded-lg hover:bg-accent/30 transition-colors items-center text-sm border-l-4",
          overdue && "bg-red-500/5 border-red-500",
          nearDeadline && !overdue && "bg-yellow-500/5 border-yellow-500",
          !overdue && !nearDeadline && "border-transparent"
        )}
      >
        {/* WBS等级 */}
        <div className="col-span-1">
          <span className="text-muted-foreground font-mono text-xs">{task.wbsCode}</span>
        </div>

        {/* 任务描述 */}
        <div className="col-span-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "truncate",
              task.status === 'completed' && "line-through text-muted-foreground"
            )}>
              {task.title}
            </span>
            {overdue && (
              <Badge variant="secondary" className="bg-red-500/20 text-red-400 text-xs">
                延期
              </Badge>
            )}
            {nearDeadline && !overdue && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-xs">
                即将到期
              </Badge>
            )}
          </div>
        </div>

        {/* 负责人 */}
        <div className="col-span-1 text-muted-foreground text-xs">
          {getMemberName(task.memberId)}
        </div>

        {/* 前置任务 */}
        <div className="col-span-1 text-muted-foreground text-xs truncate">
          {task.predecessor ? getTaskTitle(task.predecessor) : '-'}
        </div>

        {/* 计划开始日期 */}
        <div className="col-span-1 text-center text-muted-foreground text-xs">
          {task.plannedStartDate}
        </div>

        {/* 计划结束日期 */}
        <div className="col-span-1 text-center text-muted-foreground text-xs">
          {task.plannedEndDate}
        </div>

        {/* 计划工期 */}
        <div className="col-span-1 text-center text-muted-foreground text-xs">
          {task.plannedDays}天
        </div>

        {/* 进度 */}
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  task.progress === 100 ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
          </div>
        </div>

        {/* 完成情况 */}
        <div className="col-span-1">
          <Badge 
            variant="secondary" 
            className={cn("text-xs cursor-pointer", status.color)}
            onClick={() => {
              const nextStatus: Record<WbsTask['status'], WbsTask['status']> = {
                'not_started': 'in_progress',
                'in_progress': 'completed',
                'completed': 'not_started',
                'delayed': 'in_progress',
              };
              updateTaskStatus(task.id, nextStatus[task.status]);
            }}
          >
            {status.label}
          </Badge>
        </div>

        {/* 操作 */}
        <div className="col-span-1 flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setEditingTask({ ...task });
              setIsEditDialogOpen(true);
            }}
          >
            <Edit3 className="w-3.5 h-3.5 text-muted-foreground hover:text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => deleteTask(task.id)}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 权限和预警提示 */}
      <div className="space-y-2">
        {/* 权限不足提示 */}
        {permissionError && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">
              {permissionError}
            </span>
          </div>
        )}

        {/* 角色权限提示 */}
        {user && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400">
              当前角色: {ROLE_CONFIG[user.role].label} - {ROLE_CONFIG[user.role].description}
            </span>
          </div>
        )}
      </div>

      {/* 待审批任务 - 技术经理及以上可见 */}
      {canPerformTaskOperation(user, 'approve') && pendingApprovals.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-amber-400 flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              待审批任务
              <Badge className="bg-amber-500 text-white">{pendingApprovals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingApprovals.map((record) => {
                const task = tasks.find(t => t.id === record.taskId);
                if (!task) return null;
                
                return (
                  <div 
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <div>
                        <p className="text-sm font-medium text-white">{record.taskTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          申请人: {record.requesterName} · {new Date(record.requestDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                        onClick={() => {
                          setSelectedApprovalRecord(record);
                          setIsApprovalDialogOpen(true);
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        审批
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WBS任务表格 */}
      <WbsTaskTable
        tasks={filteredTasks}
        members={members.map(m => ({ id: m.id, name: m.name }))}
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
        onTasksChange={handleTasksChange}
        userRole={user?.role}
        isAdmin={isAdmin}
        searchQuery={debouncedSearchQuery}
        setSearchQuery={setSearchQuery}
        filterProject={filterProject}
        setFilterProject={setFilterProject}
        filterMember={filterMember}
        setFilterMember={setFilterMember}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
      />

      {/* 新建任务弹窗 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              新建任务
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">所属项目</Label>
                <Select
                  value={newTask.projectId || ''}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger className="bg-background border-border text-white">
                    <SelectValue placeholder="选择项目..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id} className="text-white">
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">负责人</Label>
                {user?.role === 'engineer' ? (
                  // 工程师只能分配给自己
                  <Input
                    value={user.name}
                    disabled
                    className="bg-background border-border text-white opacity-70"
                  />
                ) : (
                  <MemberSelect
                    members={members}
                    value={newTask.memberId || ''}
                    onChange={(value) => setNewTask(prev => ({ ...prev, memberId: value }))}
                    placeholder="选择负责人..."
                    className="w-full"
                  />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">任务描述</Label>
              <Textarea
                placeholder="输入任务描述..."
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                className="bg-background border-border text-white min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">前置任务（可选）</Label>
              <Select
                  value={newTask.predecessor || ''}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, predecessor: value }))}
                >
                <SelectTrigger className="bg-background border-border text-white">
                  <SelectValue placeholder="选择前置任务..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none" className="text-white">无</SelectItem>
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id} className="text-white">
                      {task.wbsCode} - {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">计划开始日期</Label>
                <Input
                  type="date"
                  value={newTask.plannedStartDate}
                  onChange={(e) => setNewTask(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                  className="bg-background border-border text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">计划结束日期</Label>
                <Input
                  type="date"
                  value={newTask.plannedEndDate}
                  onChange={(e) => setNewTask(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                  className="bg-background border-border text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">优先级</Label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <Button
                    key={p}
                    type="button"
                    variant={newTask.priority === p ? 'default' : 'outline'}
                    className={cn(
                      "flex-1",
                      newTask.priority === p 
                        ? p === 'low' ? 'bg-blue-500 text-white' :
                          p === 'medium' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                        : 'border-border text-muted-foreground hover:text-white'
                    )}
                    onClick={() => setNewTask(prev => ({ ...prev, priority: p }))}
                  >
                    {p === 'low' ? '低' : p === 'medium' ? '中' : '高'}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-border text-muted-foreground hover:text-white"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-secondary text-white"
                onClick={() => addTask()}
                disabled={!newTask.title || !newTask.projectId || !newTask.memberId || !newTask.plannedStartDate || !newTask.plannedEndDate}
              >
                创建任务
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑任务弹窗 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              编辑任务
            </DialogTitle>
          </DialogHeader>
          
          {editingTask && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">任务描述</Label>
                <Textarea
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="bg-background border-border text-white min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">前置任务</Label>
                <Select
                  value={editingTask.predecessor || ''}
                  onValueChange={(value) => setEditingTask(prev => prev ? { ...prev, predecessor: value || undefined } : null)}
                >
                  <SelectTrigger className="bg-background border-border text-white">
                    <SelectValue placeholder="选择前置任务..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none" className="text-white">无</SelectItem>
                    {tasks.filter(t => t.id !== editingTask.id).map(task => (
                      <SelectItem key={task.id} value={task.id} className="text-white">
                        {task.wbsCode} - {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">计划开始日期</Label>
                  <Input
                    type="date"
                    value={editingTask.plannedStartDate}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, plannedStartDate: e.target.value } : null)}
                    className="bg-background border-border text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">计划结束日期</Label>
                  <Input
                    type="date"
                    value={editingTask.plannedEndDate}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, plannedEndDate: e.target.value } : null)}
                    className="bg-background border-border text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">进度 ({editingTask.progress}%)</Label>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={editingTask.progress}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, progress: parseInt(e.target.value) } : null)}
                  className="bg-background border-border text-white"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-muted-foreground hover:text-white"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingTask(null);
                  }}
                >
                  取消
                </Button>
                {canForceRefreshTaskPlan(user) && (
                  <Button
                    variant="outline"
                    className="flex-1 border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                    onClick={() => {
                      setForceRefreshTask({ ...editingTask });
                      setIsEditDialogOpen(false);
                      setIsForceRefreshDialogOpen(true);
                    }}
                  >
                    强行刷新
                  </Button>
                )}
                <Button
                  className="flex-1 bg-primary hover:bg-secondary text-white"
                  onClick={saveEditTask}
                >
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 审批任务弹窗 */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              审批任务
            </DialogTitle>
          </DialogHeader>
          
          {selectedApprovalRecord && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-800">
                <p className="text-sm font-medium text-white">{selectedApprovalRecord.taskTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  申请人: {selectedApprovalRecord.requesterName} ({ROLE_CONFIG[selectedApprovalRecord.requesterRole as keyof typeof ROLE_CONFIG]?.label || selectedApprovalRecord.requesterRole})
                </p>
                <p className="text-xs text-muted-foreground">
                  申请时间: {new Date(selectedApprovalRecord.requestDate).toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">审批意见</Label>
                <Textarea
                  placeholder="请输入审批意见（可选）..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="bg-background border-border text-white min-h-[80px]"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                  onClick={() => rejectTask(selectedApprovalRecord.id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  拒绝
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => approveTask(selectedApprovalRecord.id)}
                >
                  <Check className="w-4 h-4 mr-2" />
                  通过
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 强行刷新弹窗 */}
      <Dialog open={isForceRefreshDialogOpen} onOpenChange={setIsForceRefreshDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              强行刷新任务计划
            </DialogTitle>
          </DialogHeader>
          
          {forceRefreshTask && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-800">
                <p className="text-sm font-medium text-white">{forceRefreshTask.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  计划: {forceRefreshTask.plannedStartDate} ~ {forceRefreshTask.plannedEndDate}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">变更说明 <span className="text-red-400">*</span></Label>
                <Textarea
                  placeholder="请输入变更说明（必填）..."
                  value={forceRefreshDescription}
                  onChange={(e) => setForceRefreshDescription(e.target.value)}
                  className="bg-background border-border text-white min-h-[80px]"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-muted-foreground hover:text-white"
                  onClick={() => {
                    setIsForceRefreshDialogOpen(false);
                    setForceRefreshTask(null);
                    setForceRefreshDescription('');
                  }}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleForceRefresh}
                  disabled={!forceRefreshDescription.trim()}
                >
                  确认刷新
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 使用 React.memo 优化组件渲染
export default React.memo(TaskManagement, (prevProps, nextProps) => {
  return (
    prevProps.members === nextProps.members &&
    prevProps.projects === nextProps.projects &&
    prevProps.tasks === nextProps.tasks
  );
});
