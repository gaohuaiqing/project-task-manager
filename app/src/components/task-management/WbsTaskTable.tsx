/**
 * WBS 任务分解表组件
 * 包含展开/折叠、行内编辑、日期计算等功能
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { broadcastService } from '@/services/BroadcastChannelService';
import { parseISO, format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Clock,
  GitBranch,
  Columns,
  Eye,
  EyeOff,
  Search,
  Activity,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WbsTask, WbsTaskStatus, DelayRecord, PlanAdjustmentRecord, TaskProgressRecord } from '@/types/wbs';
import {
  buildWbsTree,
  isNearDeadline,
  validateTaskData,
  generateWbsCode,
  calculatePlannedDates,
  calculateActualDays,
  calculateTaskStatus,
  calculateEndDate,
} from '@/utils/wbsCalculator';
import { getTaskTypes } from '@/utils/taskTypeManager';
import { getAllHolidayDates } from '@/utils/holidayManager';
import { TaskHistoryPanel } from './TaskHistoryPanel';
import { TaskProgressPanel } from './TaskProgressPanel';
import { ExportProgressDialog } from './ExportProgressDialog';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog, InputDialog, CustomAlertDialog } from '@/components/common/DialogProvider';

// 任务类型接口
interface TaskType {
  value: string;
  label: string;
  color: string;
}

interface WbsTaskTableProps {
  tasks: WbsTask[];
  members: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  onTasksChange: (tasks: WbsTask[]) => void;
  userRole?: string;
  isAdmin?: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  filterProject?: string[];
  setFilterProject?: (projectIds: string[]) => void;
  filterMember?: string[];
  setFilterMember?: (memberIds: string[]) => void;
  filterStatus?: string[];
  setFilterStatus?: (statuses: string[]) => void;
  filterPriority?: string[];
  setFilterPriority?: (priorities: string[]) => void;
}

export function WbsTaskTable({ tasks, members, projects, onTasksChange, userRole, isAdmin, searchQuery = '', setSearchQuery, filterProject = ['all'], setFilterProject, filterMember = ['all'], setFilterMember, filterStatus = ['all'], setFilterStatus, filterPriority = ['all'], setFilterPriority }: WbsTaskTableProps) {
  const { user } = useAuth();
  const dialog = useDialog();
  // 展开状态管理
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  // 编辑状态
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WbsTask> & { predecessorWbs?: string; isSingleRestDay?: boolean }>({});
  // 选中的任务
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  // 任务类型列表
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  // 节假日数据缓存
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  // 历史记录面板状态
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyTaskId, setHistoryTaskId] = useState('');
  const [historyTaskTitle, setHistoryTaskTitle] = useState('');
  const [historyType, setHistoryType] = useState<'delay' | 'adjustment'>('delay');
  // 进展维护面板状态
  const [progressPanelOpen, setProgressPanelOpen] = useState(false);
  const [progressTaskId, setProgressTaskId] = useState('');
  const [progressTaskTitle, setProgressTaskTitle] = useState('');
  const [progressPanelReadOnly, setProgressPanelReadOnly] = useState(false);
  
  // 导出状态
  const [isExporting, setIsExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // 加载任务类型列表和节假日数据
  useEffect(() => {
    const loadTaskTypes = async () => {
      try {
        const types = await getTaskTypes();
        setTaskTypes(types);
      } catch (error) {
        console.error('Failed to load task types:', error);
      }
    };

    const loadHolidayDates = async () => {
      try {
        const dates = await getAllHolidayDates();
        setHolidayDates(dates);
      } catch (error) {
        console.error('Failed to load holiday dates:', error);
        setHolidayDates([]);
      }
    };

    // 初始加载
    loadTaskTypes();
    loadHolidayDates();
    // 每 1000 毫秒检查一次任务类型更新
    const interval = setInterval(loadTaskTypes, 1000);
    // 每 60000 毫秒检查一次节假日数据更新
    const holidayInterval = setInterval(loadHolidayDates, 60000);
    // 初始化BroadcastChannel
    broadcastService.init();
    return () => {
      clearInterval(interval);
      clearInterval(holidayInterval);
    };
  }, []);

  // 监听其他浏览器的状态更新
  useEffect(() => {
    const unsubscribe = broadcastService.onDataUpdate((data, dataType) => {
      if (dataType === 'wbsTableExpandedTasks' && data.expandedTasks) {
        setExpandedTasks(new Set(data.expandedTasks));
      } else if (dataType === 'wbsTableCollapsedColumns' && data.collapsedColumns) {
        setCollapsedColumns(new Set(data.collapsedColumns));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 列折叠状态 - 从 localStorage 读取初始值
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wbsTableCollapsedColumns');
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  // 可折叠的列定义 - 包含所有列
  const collapsibleColumns = [
    { key: 'wbsLevel', label: 'WBS等级', index: 1 },
    { key: 'wbsCode', label: 'WBS', index: 2 },
    { key: 'taskDesc', label: '任务描述', index: 3 },
    { key: 'taskStatus', label: '任务状态', index: 4 },
    { key: 'redmine', label: 'Redmine', index: 5 },
    { key: 'assignee', label: '负责人', index: 6 },
    { key: 'taskType', label: '任务类型', index: 7 },
    { key: 'priority', label: '优先级', index: 8 },
    { key: 'predecessor', label: '前置任务', index: 9 },
    { key: 'leadLag', label: '提前/落后', index: 10 },
    { key: 'startDate', label: '开始日期', index: 11 },
    { key: 'duration', label: '工期', index: 12 },
    { key: 'endDate', label: '结束日期', index: 13 },
    { key: 'plannedStartDate', label: '计划开始', index: 14 },
    { key: 'plannedEndDate', label: '计划结束', index: 15 },
    { key: 'plannedDays', label: '计划工期', index: 16 },
    { key: 'warningDays', label: '预警天数', index: 17 },
    { key: 'actualStartDate', label: '实际开始', index: 18 },
    { key: 'actualEndDate', label: '实际结束', index: 19 },
    { key: 'actualDays', label: '实际工期', index: 20 },
    { key: 'fullTimeRatio', label: '全职比(%)', index: 21 },
    { key: 'actualCycle', label: '实际周期', index: 22 },
    { key: 'project', label: '项目', index: 23 },
    { key: 'delayCount', label: '延期次数', index: 24 },
    { key: 'adjustmentCount', label: '计划调整', index: 25 },
    { key: 'progressRecord', label: '进展记录', index: 26 },
  ];

  // 检查用户是否有任务编辑权限
  const canEditTask = (): boolean => {
    if (isAdmin) return true;
    if (!userRole) return false;
    
    // 根据规范：
    // - 管理员：可以编辑所有任务
    // - 技术经理：具备任务创建权限，可以编辑任务
    // - 部门经理：没有任务编辑权限
    // - 工程师：无任务创建、修改或审批权限
    
    switch (userRole) {
      case 'admin':
        return true;
      case 'tech_manager':
        return true;
      case 'dept_manager':
        return false;
      case 'engineer':
        return false;
      default:
        return false;
    }
  };

  // 构建树形结构
  const taskTree = useMemo(() => buildWbsTree(tasks), [tasks]);

  // 扁平化任务树用于分页显示 - 使用 tasks 数组查找子任务
  const flattenTasks = useCallback((tree: WbsTask[], allTasks: WbsTask[], depth = 0): Array<{ task: WbsTask; depth: number }> => {
    const result: Array<{ task: WbsTask; depth: number }> = [];
    tree.forEach(task => {
      result.push({ task, depth });
      if (expandedTasks.has(task.id) && task.subtasks && task.subtasks.length > 0) {
        const subTasks = allTasks.filter(t => task.subtasks?.includes(t.id));
        result.push(...flattenTasks(subTasks, allTasks, depth + 1));
      }
    });
    return result;
  }, [expandedTasks]);

  // 获取所有扁平化的任务（用于计算总页数等）
  const allFlatTasks = useMemo(() => {
    return flattenTasks(taskTree, tasks);
  }, [flattenTasks, taskTree, tasks]);

  // 计算WBS编号映射 - 基于前一行和当前行的等级值
  const wbsNumberMap = useMemo(() => {
    const map = new Map<string, string>();
    const hierarchy: number[] = [];
    
    allFlatTasks.forEach(({ task }, index) => {
      const currentLevel = task.level;
      
      if (index === 0) {
        // 第一行，初始化层次
        hierarchy.length = 0;
        hierarchy.push(1);
      } else {
        const prevTask = allFlatTasks[index - 1].task;
        const prevLevel = prevTask.level;
        
        if (currentLevel > prevLevel) {
          // 深入一层，添加新的层级
          hierarchy.push(1);
        } else if (currentLevel === prevLevel) {
          // 同一层级，递增最后一个数字
          hierarchy[hierarchy.length - 1] += 1;
        } else {
          // 回退多层，截断并递增
          hierarchy.length = currentLevel;
          hierarchy[hierarchy.length - 1] += 1;
        }
      }
      
      // 生成WBS编号字符串
      const wbsNumber = hierarchy.join('.');
      map.set(task.id, wbsNumber);
    });
    
    return map;
  }, [allFlatTasks]);

  // 获取分页后的任务列表
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return allFlatTasks.slice(startIndex, startIndex + pageSize);
  }, [allFlatTasks, currentPage]);

  // 计算可见列数（用于 colSpan）
  const visibleColumnCount = useMemo(() => {
    const baseColumns = 1; // 操作列
    const collapsibleCount = collapsibleColumns.length;
    const collapsedCount = collapsedColumns.size;
    return baseColumns + (collapsibleCount - collapsedCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsedColumns]);

  // 计算延期任务和即将到期任务数量
  const taskStatusCounts = useMemo(() => {
    let delayedCount = 0;
    let nearDeadlineCount = 0;

    tasks.forEach(task => {
      const taskStatus = calculateTaskStatus(task);
      if (taskStatus.statusCode === 'delayed' || taskStatus.statusCode === 'overdue_completed') {
        delayedCount++;
      } else if (isNearDeadline(task)) {
        nearDeadlineCount++;
      }
    });

    return {
      delayedCount,
      nearDeadlineCount
    };
  }, [tasks]);

  // 切换列折叠状态
  const toggleColumnCollapse = (columnKey: string) => {
    const newCollapsed = new Set(collapsedColumns);
    if (newCollapsed.has(columnKey)) {
      newCollapsed.delete(columnKey);
    } else {
      newCollapsed.add(columnKey);
    }
    setCollapsedColumns(newCollapsed);
    // 保存到 localStorage
    localStorage.setItem('wbsTableCollapsedColumns', JSON.stringify(Array.from(newCollapsed)));
    // 广播状态更新
    broadcastService.broadcastDataUpdate('wbsTableCollapsedColumns', {
      collapsedColumns: Array.from(newCollapsed)
    });
  };

  // 展开/折叠所有可折叠列
  const expandAllColumns = () => {
    setCollapsedColumns(new Set());
    localStorage.setItem('wbsTableCollapsedColumns', JSON.stringify([]));
    // 广播状态更新
    broadcastService.broadcastDataUpdate('wbsTableCollapsedColumns', {
      collapsedColumns: []
    });
  };

  const collapseAllColumns = () => {
    const allKeys = new Set(collapsibleColumns.map(col => col.key));
    setCollapsedColumns(allKeys);
    localStorage.setItem('wbsTableCollapsedColumns', JSON.stringify(Array.from(allKeys)));
    // 广播状态更新
    broadcastService.broadcastDataUpdate('wbsTableCollapsedColumns', {
      collapsedColumns: Array.from(allKeys)
    });
  };

  // 检查列是否被折叠
  const isColumnCollapsed = (columnKey: string) => collapsedColumns.has(columnKey);

  // 切换展开/折叠
  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
    // 广播状态更新
    broadcastService.broadcastDataUpdate('wbsTableExpandedTasks', {
      expandedTasks: Array.from(newExpanded)
    });
  };

  // 新增任务
  const addNewTask = async () => {
    // 检查是否有有效的项目
    if (!projects || projects.length === 0) {
      await dialog.alert('请先创建项目', { variant: 'error' });
      return;
    }

    const projectId = projects[0].id;
    if (!projectId) {
      await dialog.alert('项目ID无效，请检查项目配置', { variant: 'error' });
      return;
    }

    const newTask: WbsTask = {
      id: `task-${Date.now()}`,
      projectId: projectId,
      memberId: '',
      title: '新任务',
      description: '',
      status: 'not_started',
      priority: 'medium',
      plannedStartDate: '',
      plannedEndDate: '',
      plannedDays: 0,
      progress: 0,
      wbsCode: `TEMP-${Date.now()}`, // 临时编码，保存时后端会重新生成
      level: 1,
      subtasks: [],
      order: tasks.length,
      isExpanded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedTasks = [...tasks, newTask];
    onTasksChange(updatedTasks);
    // 自动跳转到最后一页显示新任务
    const newTree = buildWbsTree(updatedTasks);
    const newFlatList = flattenTasks(newTree, updatedTasks);
    const newTotalPages = Math.ceil(newFlatList.length / pageSize);
    setCurrentPage(newTotalPages);
    // 自动进入编辑模式
    setEditingTask(newTask.id);
    setEditForm({ ...newTask });
  };

  // 在指定任务之后添加新任务
  const addTaskAfter = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      // 如果找不到任务，就添加到末尾
      await addNewTask();
      return;
    }

    const referenceTask = tasks[taskIndex];

    // 使用参考任务的项目ID
    const projectId = referenceTask.projectId;
    if (!projectId) {
      await dialog.alert('参考任务的项目ID无效，请检查任务配置', { variant: 'error' });
      return;
    }

    // 确定新任务的等级
    const newTaskLevel = referenceTask.level;
    // 确定新任务的任务类型：如果是二级及以下子任务，继承一级父任务的任务类型
    let newTaskType: string | undefined = undefined;
    if (newTaskLevel > 1) {
      // 查找一级父任务
      let parentTask = referenceTask;
      while (parentTask.level > 1 && parentTask.parentId) {
        const foundParent = tasks.find(t => t.id === parentTask.parentId);
        if (!foundParent) break;
        parentTask = foundParent;
      }
      // 如果找到一级父任务，继承其任务类型
      if (parentTask.level === 1) {
        newTaskType = parentTask.taskType;
      }
    }

    const newTask: WbsTask = {
      id: `task-${Date.now()}`,
      projectId: projectId,
      memberId: '',
      title: '新任务',
      description: '',
      status: 'not_started',
      priority: 'medium',
      taskType: newTaskType,
      plannedStartDate: '',
      plannedEndDate: '',
      plannedDays: 0,
      progress: 0,
      wbsCode: `TEMP-${Date.now()}`, // 临时编码，保存时后端会重新生成
      level: newTaskLevel,
      subtasks: [],
      order: taskIndex + 1,
      isExpanded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 在指定任务之后插入新任务
    const updatedTasks = [
      ...tasks.slice(0, taskIndex + 1),
      newTask,
      ...tasks.slice(taskIndex + 1)
    ];

    // 更新后续任务的order值
    const finalTasks = updatedTasks.map((task, index) => ({
      ...task,
      order: index
    }));

    onTasksChange(finalTasks);

    // 计算新任务的位置并滚动到视图
    const newTree = buildWbsTree(finalTasks);
    const newFlatList = flattenTasks(newTree, finalTasks);
    const newTaskFlatIndex = newFlatList.findIndex(item => item.task.id === newTask.id);

    if (newTaskFlatIndex !== -1) {
      // 计算新任务所在的页码
      const newPage = Math.floor(newTaskFlatIndex / pageSize) + 1;
      setCurrentPage(newPage);
    }

    // 自动进入编辑模式
    setEditingTask(newTask.id);
    setEditForm({ ...newTask });
  };

  // 开始编辑
  const startEdit = (task: WbsTask) => {
    setEditingTask(task.id);
    // 查找前置任务的WBS编码
    const predecessorTask = tasks.find(t => t.id === task.predecessor);
    // 使用wbsNumberMap获取正确的WBS编号
    const predecessorWbs = task.predecessor ? (wbsNumberMap.get(task.predecessor) || predecessorTask?.wbsCode || '') : '';
    
    // 如果是二级及以下子任务，不包含taskType字段，确保编辑时不会显示任务类型编辑界面
    const editFormData: Partial<WbsTask> & { predecessorWbs?: string; isSingleRestDay?: boolean } = {
      ...task,
      predecessorWbs: predecessorWbs,
      isSingleRestDay: task.isSingleRestDay
    };
    
    // 二级及以下子任务不允许编辑任务类型
    if (task.level > 1) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { taskType: _, ...rest } = editFormData;
      setEditForm(rest);
    } else {
      setEditForm(editFormData);
    }
  };

  // 导出WBS任务分解表到Excel
  const handleExportWbs = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    const startTime = performance.now();
    
    try {
      const holidays = holidayDates;
      
      // 预先读取所有localStorage数据，避免重复读取
      let adjustmentRecords: PlanAdjustmentRecord[] = [];
      let progressRecords: TaskProgressRecord[] = [];
      let delayRecords: DelayRecord[] = [];
      
      try {
        adjustmentRecords = JSON.parse(localStorage.getItem('planAdjustmentRecords') || '[]') as PlanAdjustmentRecord[];
      } catch (e) {}
      
      try {
        progressRecords = JSON.parse(localStorage.getItem('taskProgressRecords') || '[]') as TaskProgressRecord[];
      } catch (e) {}
      
      try {
        delayRecords = JSON.parse(localStorage.getItem('delayRecords') || '[]') as DelayRecord[];
      } catch (e) {}
      
      // 创建任务ID到延期次数和调整次数的映射
      const taskDelayCountMap = new Map<string, number>();
      const taskAdjustmentCountMap = new Map<string, number>();
      
      // 预计算延期次数
      adjustmentRecords.forEach(record => {
        const count = taskAdjustmentCountMap.get(record.taskId) || 0;
        taskAdjustmentCountMap.set(record.taskId, count + 1);
        
        if (record.adjustmentType === 'end_date' || record.adjustmentType === 'all') {
          const beforeEnd = record.before.endDate;
          const afterEnd = record.after.endDate;
          if (beforeEnd && afterEnd && new Date(afterEnd) > new Date(beforeEnd)) {
            const delayCount = taskDelayCountMap.get(record.taskId) || 0;
            taskDelayCountMap.set(record.taskId, delayCount + 1);
          }
        }
      });
      
      // 创建成员ID到名称的映射
      const memberNameMap = new Map<string, string>();
      members.forEach(m => memberNameMap.set(m.id, m.name));
      
      // 创建项目ID到名称的映射
      const projectNameMap = new Map<string, string>();
      projects.forEach(p => projectNameMap.set(p.id, p.name));
      
      // 预计算今天的日期
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();
      
      // 使用当前界面显示的任务列表（allFlatTasks已经考虑了展开状态和排序）
      const exportData = allFlatTasks.map(({ task, depth }) => {
        // 获取计算后的计划日期
        const plannedDates = calculatePlannedDates(task, tasks, holidays);
        
        // 获取任务状态
        const taskStatusResult = calculateTaskStatus(task);
        const taskStatusText = taskStatusResult.status;
        
        // 获取WBS编号
        const wbsNumber = wbsNumberMap.get(task.id) || task.wbsCode;
        
        // 从预计算的映射中获取延期次数和调整次数
        const delayCount = taskDelayCountMap.get(task.id) || 0;
        const adjustmentCount = taskAdjustmentCountMap.get(task.id) || 0;
        
        // 计算日历天数
        let calendarDays: string | number = '-';
        if (plannedDates.plannedStartDate && plannedDates.plannedEndDate) {
          const start = new Date(plannedDates.plannedStartDate).getTime();
          const end = new Date(plannedDates.plannedEndDate).getTime();
          calendarDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        // 计算预警天数
        let warningDays: string | number = '-';
        if (task.plannedEndDate && task.status !== 'completed' && plannedDates.plannedEndDate) {
          const end = new Date(plannedDates.plannedEndDate).getTime();
          warningDays = Math.ceil((end - todayTime) / (1000 * 60 * 60 * 24));
        }

        // 计算实际周期
        let actualCycle: string | number = '-';
        if (task.actualStartDate && task.actualEndDate) {
          const start = new Date(task.actualStartDate).getTime();
          const end = new Date(task.actualEndDate).getTime();
          actualCycle = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }
        
        // 准备行数据
        const rowData: Record<string, any> = {
          'WBS编号': wbsNumber,
          'WBS等级': task.level,
          '任务名称': task.title,
          '任务描述': task.description || '-',
          '任务状态': taskStatusText,
          '负责人': memberNameMap.get(task.memberId) || '-',
          '任务类型': task.taskType || '-',
          '优先级': task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低',
          '前置任务': task.predecessor || '-',
          '提前/落后': task.leadLag || '-',
          '开始日期': task.plannedStartDate || '-',
          '工期': task.plannedDays || '-',
          '结束日期': task.plannedEndDate || '-',
          '计划开始日期': plannedDates.plannedStartDate || '-',
          '计划结束日期': plannedDates.plannedEndDate || '-',
          '日历天数': calendarDays,
          '预警天数': warningDays,
          '实际开始日期': task.actualStartDate || '-',
          '实际结束日期': task.actualEndDate || '-',
          '实际工期': task.actualDays || '-',
          '全职比(%)': task.fullTimeRatio !== undefined && task.fullTimeRatio >= 0 ? `${task.fullTimeRatio}%` : '-',
          '实际周期': actualCycle,
          '进度': task.progress + '%',
          '项目': projectNameMap.get(task.projectId) || '-',
          '延期次数': delayCount > 0 ? delayCount : '-',
          '计划调整次数': adjustmentCount > 0 ? adjustmentCount : '-'
        };
        
        return rowData;
      });
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 创建主工作表
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'WBS任务分解表');
      
      // 创建任务ID到任务的映射
      const taskMap = new Map<string, WbsTask>();
      tasks.forEach(t => taskMap.set(t.id, t));
      
      // 创建计划调整记录工作表（使用预先读取的数据）
      const adjustmentData: Record<string, any>[] = [];
      const statusLabels: Record<string, string> = {
        'pending': '待审批',
        'approved': '已通过',
        'rejected': '已拒绝'
      };
      
      adjustmentRecords.forEach(record => {
        const task = taskMap.get(record.taskId);
        
        adjustmentData.push({
          'WBS编码': task?.wbsCode || '-',
          '任务名称': task?.title || '-',
          '调整时间': new Date(record.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          '调整类型': record.adjustmentType === 'start_date' ? '开始日期' : record.adjustmentType === 'end_date' ? '结束日期' : record.adjustmentType === 'duration' ? '工期' : '全部调整',
          '调整前开始日期': record.before.startDate || '-',
          '调整前结束日期': record.before.endDate || '-',
          '调整前工期': record.before.days || '-',
          '调整后开始日期': record.after.startDate || '-',
          '调整后结束日期': record.after.endDate || '-',
          '调整后工期': record.after.days || '-',
          '调整原因': record.reason || '-',
          '申请人': record.requester || '-',
          '申请人角色': record.requesterRole || '-',
          '审批状态': record.approvalStatus ? statusLabels[record.approvalStatus] : '-',
          '审批人': record.approver || '-',
          '审批时间': record.approvalDate ? new Date(record.approvalDate).toLocaleString('zh-CN') : '-',
          '审批意见': record.approvalComment || '-'
        });
      });
      
      adjustmentData.sort((a, b) => {
        const timeA = new Date(a['调整时间']).getTime();
        const timeB = new Date(b['调整时间']).getTime();
        return timeB - timeA;
      });
      
      if (adjustmentData.length > 0) {
        const adjustmentWorksheet = XLSX.utils.json_to_sheet(adjustmentData);
        XLSX.utils.book_append_sheet(workbook, adjustmentWorksheet, '计划调整记录');
      }
      
      // 创建进展记录工作表（使用预先读取的数据）
      const progressData: Record<string, any>[] = [];
      
      progressRecords.forEach(record => {
        const task = taskMap.get(record.taskId);
        
        progressData.push({
          'WBS编码': task?.wbsCode || '-',
          '任务名称': task?.title || '-',
          '进展日期': record.progressDate || '-',
          '进度百分比': record.progressPercent ? `${record.progressPercent}%` : '-',
          '进展描述': record.description || '-',
          '报告人': record.reporter || '-',
          '记录时间': new Date(record.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      });
      
      progressData.sort((a, b) => {
        const timeA = new Date(a['记录时间']).getTime();
        const timeB = new Date(b['记录时间']).getTime();
        return timeB - timeA;
      });
      
      // 始终创建进展记录工作表，即使没有数据也显示表头
      if (progressData.length === 0) {
        progressData.push({
          'WBS编码': '-',
          '任务名称': '-',
          '进展日期': '-',
          '进度百分比': '-',
          '进展描述': '暂无进展记录',
          '报告人': '-',
          '记录时间': '-'
        });
      }
      const progressWorksheet = XLSX.utils.json_to_sheet(progressData);
      XLSX.utils.book_append_sheet(workbook, progressWorksheet, '进展记录');
      
      // 创建延期记录工作表（使用预先读取的数据）
      const delayData: Record<string, any>[] = [];
      
      delayRecords.forEach(record => {
        const task = taskMap.get(record.taskId);
        
        delayData.push({
          'WBS编码': task?.wbsCode || '-',
          '任务名称': task?.title || '-',
          '延期时间': new Date(record.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          '原结束日期': record.originalEndDate || '-',
          '新结束日期': record.newEndDate || '-',
          '延期天数': record.delayDays || '-',
          '延期原因': record.reason || '-'
        });
      });
      
      delayData.sort((a, b) => {
        const timeA = new Date(a['延期时间']).getTime();
        const timeB = new Date(b['延期时间']).getTime();
        return timeB - timeA;
      });
      
      if (delayData.length > 0) {
        const delayWorksheet = XLSX.utils.json_to_sheet(delayData);
        XLSX.utils.book_append_sheet(workbook, delayWorksheet, '延期记录');
      }
      
      // 生成默认文件名
      const defaultFileName = `WBS任务分解表_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // 导出Excel数据
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const endTime = performance.now();
      console.log(`导出处理耗时: ${(endTime - startTime).toFixed(2)}ms`);
      
      // 检查浏览器是否支持 File System Access API
      if ('showSaveFilePicker' in window) {
        // 使用 File System Access API - 允许用户选择保存路径
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [{
              description: 'Excel 文件',
              accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
            }]
          });
          
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // 用户取消保存，不视为错误
            return;
          }
          throw err;
        }
      } else {
        // 回退到传统下载方式
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = defaultFileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error('导出WBS任务分解表失败:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingTask(null);
    setEditForm({});
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingTask || !editForm) return;

    const validation = validateTaskData(editForm);
    if (!validation.valid) {
      await dialog.alert(validation.errors.join('\n'), { variant: 'error' });
      return;
    }

    // 获取当前编辑的任务
    const currentTask = tasks.find(t => t.id === editingTask);
    if (!currentTask) return;

    // 计算新的 WBS 编码
    let newWbsCode = currentTask.wbsCode;
    const newLevel = editForm.level || currentTask.level;
    
    // 如果等级发生变化，重新计算 WBS 编码
    if (newLevel !== currentTask.level) {
      // 根据等级生成新的编码
      const siblingTasks = tasks.filter(t => 
        t.id !== editingTask && 
        t.level === newLevel && 
        !t.parentId // 简化处理，只考虑顶级任务
      );
      const siblingIndex = siblingTasks.length;
      newWbsCode = generateWbsCode(undefined, siblingIndex);
      
      // 如果有父任务，需要根据父任务编码生成
      if (currentTask.parentId) {
        const parentTask = tasks.find(t => t.id === currentTask.parentId);
        if (parentTask) {
          const parentChildren = tasks.filter(t => 
            t.id !== editingTask && 
            t.parentId === currentTask.parentId
          );
          newWbsCode = generateWbsCode(parentTask.wbsCode, parentChildren.length);
        }
      }
    }

    // 检查是否是一级任务的任务类型变更
    const isTaskTypeChanged = currentTask.level === 1 && editForm.taskType && editForm.taskType !== currentTask.taskType;

    // 检查计划是否发生变更
    const hasPlanChanged = 
      editForm.plannedStartDate !== undefined && editForm.plannedStartDate !== currentTask.plannedStartDate ||
      editForm.plannedEndDate !== undefined && editForm.plannedEndDate !== currentTask.plannedEndDate ||
      editForm.plannedDays !== undefined && editForm.plannedDays !== currentTask.plannedDays;

    // 如果计划发生变更，创建计划调整记录
    if (hasPlanChanged) {
      // 提示用户输入调整原因
      const reason = await dialog.prompt('请输入计划调整原因:', {
        title: '计划调整原因',
        placeholder: '请输入调整原因...',
        multiline: false
      });
      if (reason === null) return; // 用户取消
      if (!reason.trim()) {
        await dialog.alert('调整原因不能为空', { variant: 'warning' });
        return;
      }

      // 计算新的结束日期（如果需要）
      let endDate = editForm.plannedEndDate || currentTask.plannedEndDate;
      if (editForm.plannedStartDate && editForm.plannedDays) {
        const holidays = holidayDates;
        endDate = calculateEndDate(editForm.plannedStartDate, editForm.plannedDays, holidays, editForm.isSingleRestDay);
      }

      // 确定调整类型
      let adjustmentType: PlanAdjustmentRecord['adjustmentType'] = 'all';
      if (editForm.plannedStartDate !== undefined && editForm.plannedStartDate !== currentTask.plannedStartDate) {
        adjustmentType = 'start_date';
      } else if (editForm.plannedEndDate !== undefined && editForm.plannedEndDate !== currentTask.plannedEndDate) {
        adjustmentType = 'end_date';
      } else if (editForm.plannedDays !== undefined && editForm.plannedDays !== currentTask.plannedDays) {
        adjustmentType = 'duration';
      }

      // 创建计划调整记录
      const adjustmentRecord: PlanAdjustmentRecord = {
        id: Date.now().toString(),
        taskId: currentTask.id,
        adjustmentDate: new Date().toISOString().split('T')[0],
        adjustmentType,
        before: {
          startDate: currentTask.plannedStartDate,
          endDate: currentTask.plannedEndDate,
          days: currentTask.plannedDays
        },
        after: {
          startDate: editForm.plannedStartDate || currentTask.plannedStartDate,
          endDate: endDate,
          days: editForm.plannedDays || currentTask.plannedDays
        },
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
        requester: user?.name || '未知用户',
        requesterRole: userRole || '未知角色'
      };

      // 根据用户角色决定是否需要审批
      const isEngineer = userRole === 'engineer' || userRole === '工程师';
      if (isEngineer) {
        // 工程师发起的调整需要审批
        adjustmentRecord.approvalStatus = 'pending';
        await dialog.alert('计划调整申请已提交，等待技术经理审批', { variant: 'info' });
      } else {
        // 其他角色（技术经理、部门经理、管理员）直接审批通过
        adjustmentRecord.approvalStatus = 'approved';
        adjustmentRecord.approver = user?.name || '系统';
        adjustmentRecord.approvalDate = new Date().toISOString();
        adjustmentRecord.approvalComment = '自动审批通过';
      }

      // 保存到 localStorage
      const existingRecords = JSON.parse(localStorage.getItem('planAdjustmentRecords') || '[]') as PlanAdjustmentRecord[];
      existingRecords.push(adjustmentRecord);
      localStorage.setItem('planAdjustmentRecords', JSON.stringify(existingRecords));
    }

    const updatedTasks = tasks.map(task => {
      if (task.id === editingTask) {
        // 如果开始日期或工期变化，自动计算结束日期
        let endDate = editForm.plannedEndDate || task.plannedEndDate;
        if (editForm.plannedStartDate && editForm.plannedDays) {
          const holidays = holidayDates;
          endDate = calculateEndDate(editForm.plannedStartDate, editForm.plannedDays, holidays, editForm.isSingleRestDay);
        }

        return {
          ...task,
          ...editForm,
          wbsCode: newWbsCode,
          level: newLevel,
          plannedEndDate: endDate,
          updatedAt: new Date().toISOString()
        };
      } else if (isTaskTypeChanged && (task.parentId === editingTask || task.subtasks?.includes(editingTask))) {
        // 如果是一级任务的任务类型变更，更新其所有子任务的任务类型
        return {
          ...task,
          taskType: editForm.taskType,
          updatedAt: new Date().toISOString()
        };
      }
      return task;
    });

    onTasksChange(updatedTasks);
    setEditingTask(null);
    setEditForm({});
  };

  // 删除任务
  const deleteTask = async (taskId: string) => {
    const confirmed = await dialog.confirm('确定要删除这个任务吗？', {
      variant: 'danger'
    });
    if (!confirmed) return;

    // 递归删除子任务
    const deleteRecursive = (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (task?.subtasks) {
        task.subtasks.forEach(subId => deleteRecursive(subId));
      }
    };
    deleteRecursive(taskId);

    const updatedTasks = tasks.filter(t => t.id !== taskId && !isChildOf(t, taskId));
    onTasksChange(updatedTasks);
  };

  // 检查是否是子任务
  const isChildOf = (task: WbsTask, parentId: string): boolean => {
    if (task.parentId === parentId) return true;
    if (!task.parentId) return false;
    const parent = tasks.find(t => t.id === task.parentId);
    return parent ? isChildOf(parent, parentId) : false;
  };

  // 渲染任务行
  const renderTaskRow = (task: WbsTask, depth: number = 0) => {
    const hasChildren = task.subtasks && task.subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const isEditing = editingTask === task.id;
    const isSelected = selectedTask === task.id;

    const nearDeadline = isNearDeadline(task);
    // 使用计算的任务状态来确定延期状态，而不是日期比较
    const taskStatus = calculateTaskStatus(task);
    const { status, statusCode } = taskStatus;
    const isDelayed = statusCode === 'delayed' || statusCode === 'overdue_completed';

    const member = members.find(m => m.id === task.memberId);
    const predecessor = tasks.find(t => t.id === task.predecessor);

    return (
      <tr
        key={task.id}
        className={cn(
          "border-b border-slate-600 transition-all duration-200 relative",
          "hover:bg-slate-700/30",
          isSelected && "bg-blue-500/10 border-blue-500/30",
          nearDeadline && "bg-yellow-500/5 border-l-2 border-l-yellow-500",
          task.isOnCriticalPath && "border-l-2 border-l-purple-500"
        )}
        onClick={() => setSelectedTask(task.id)}
      >
        {/* 操作 - 根据任务状态动态显示左边框颜色，右边框保持原始颜色 */}
        <td className={cn(
          "px-2 py-2 border-r border-slate-600",
          (status === '提前完成' || status === '按期完成') ? "border-l-4 border-l-green-500" :
          (status === '延期' || status === '超期完成') ? "border-l-4 border-l-red-500" :
          nearDeadline ? "border-l-4 border-l-yellow-500" :
          "border-l-4 border-l-gray-300"
        )}>
          <div className="flex items-center justify-center gap-0">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    saveEdit();
                  }}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelEdit();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(task);
                  }}
                  title="编辑任务"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    addTaskAfter(task.id);
                  }}
                  title="添加子任务"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id);
                  }}
                  title="删除任务"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProgressTaskId(task.id);
                    setProgressTaskTitle(task.title);
                    setProgressPanelReadOnly(false);
                    setProgressPanelOpen(true);
                  }}
                  title="维护进展"
                >
                  <Activity className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </td>

        {/* WBS等级 - 用户可编辑，浅蓝色背景 */}
        {!isColumnCollapsed('wbsLevel') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-blue-500/10 transition-all duration-300">
            {isEditing ? (
              <Select
                value={editForm.level?.toString() || '1'}
                onValueChange={(v) => setEditForm({ ...editForm, level: parseInt(v) })}
              >
                <SelectTrigger className="h-8 text-[10px] bg-blue-500/20 border-blue-500/50 text-blue-100 text-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()} className="text-slate-300">
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[10px] font-medium text-blue-300">{task.level}</span>
            )}
          </td>
        )}

        {/* WBS编码 - 系统计算，浅绿色背景，只读 */}
        {!isColumnCollapsed('wbsCode') && (
          <td className="px-2 py-2 border-r border-slate-600 bg-green-500/10 transition-all duration-300">
            <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 24}px` }}>
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(task.id);
                  }}
                  className="p-0.5 hover:bg-slate-600 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              )}
              <span 
                className="text-[10px] font-mono text-green-300 select-none cursor-not-allowed"
                title="系统自动计算，不可编辑"
              >
                {wbsNumberMap.get(task.id) || task.wbsCode}
              </span>
            </div>
          </td>
        )}

        {/* 任务描述 */}
        {!isColumnCollapsed('taskDesc') && (
          <td className="px-2 py-2 border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              <Input
                value={editForm.title || ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans"
                style={{ fontSize: '10px', fontWeight: '500' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex flex-col" style={{ paddingLeft: `${(task.level - 1) * 16}px` }}>
                <span className={cn(
                  "text-[10px] font-medium",
                  isDelayed ? "text-red-300" : task.level === 1 ? "font-bold text-yellow-300" : "text-white"
                )}>
                  {task.title}
                </span>
                {task.description && (
                  <span className="text-[10px] text-slate-500 truncate">{task.description}</span>
                )}
              </div>
            )}
          </td>
        )}

        {/* 任务状态列 - 自动计算，浅绿色背景 */}
        {!isColumnCollapsed('taskStatus') && (
          <td className="px-2 py-2 border-r border-slate-600 bg-[#E8F5E9]/10 transition-all duration-300">
            {isEditing ? (
              <Select
                value={editForm.status || ''}
                onValueChange={(v) => setEditForm({ ...editForm, status: v as WbsTaskStatus })}
              >
                <SelectTrigger className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="not_started" className="text-white">未开始</SelectItem>
                  <SelectItem value="in_progress" className="text-white">进行中</SelectItem>
                  <SelectItem value="completed" className="text-white">已完成</SelectItem>
                  <SelectItem value="delayed" className="text-white">已延期</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              (() => {
                const { status, color, bgColor } = calculateTaskStatus(task);
                return (
                  <Badge 
                    className={cn(
                      "text-[10px]",
                      bgColor,
                      color
                    )}
                  >
                    {status}
                  </Badge>
                );
              })()
            )}
          </td>
        )}

        {/* Redmine - 仅根任务显示超链接 */}
        {!isColumnCollapsed('redmine') && (
          <td className="px-2 py-2 border-r border-slate-600 transition-all duration-300">
            {isEditing && !task.parentId ? (
              <Input
                type="url"
                value={editForm.redmineUrl || ''}
                onChange={(e) => setEditForm({ ...editForm, redmineUrl: e.target.value })}
                placeholder="https://redmine.example.com/issues/123"
                className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans"
                style={{ fontSize: '10px' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : !task.parentId && task.redmineUrl ? (
              <a
                href={task.redmineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:text-blue-300 underline"
              >
                查看
              </a>
            ) : (
              <span className="text-[10px] text-slate-500">-</span>
            )}
          </td>
        )}

        {/* 负责人 */}
        {!isColumnCollapsed('assignee') && (
          <td className="px-2 py-2 border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              <Select
                value={editForm.memberId || ''}
                onValueChange={(v) => setEditForm({ ...editForm, memberId: v })}
              >
                <SelectTrigger className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-white">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[10px] text-slate-300">{member?.name || '-'}</span>
            )}
          </td>
        )}

        {/* 任务类型 */}
        {!isColumnCollapsed('taskType') && (
          <td className="px-2 py-2 border-r border-slate-600 transition-all duration-300">
            {task.level === 1 ? (
              // 一级任务：允许编辑
              isEditing ? (
                <Select
                  value={editForm.taskType || ''}
                  onValueChange={(v) => setEditForm({ ...editForm, taskType: v })}
                >
                  <SelectTrigger className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {/* 任务类型选项从系统设置模块动态获取 */}
                    {taskTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-white">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-[10px] text-slate-300">
                  {(() => {
                    // 任务类型显示逻辑
                    const taskType = taskTypes.find((type) => type.value === task.taskType);
                    return taskType ? taskType.label : '-';
                  })()}
                </span>
              )
            ) : (
              // 二级及以下任务：显示"-"，禁止编辑
              <span className="text-[10px] text-slate-300">-</span>
            )}
          </td>
        )}

        {/* 优先级 */}
        {!isColumnCollapsed('priority') && (
          <td className="px-2 py-2 border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              <Select
                  value={editForm.priority || ''}
                  onValueChange={(v) => setEditForm({ ...editForm, priority: v as 'low' | 'medium' | 'high' })}
                >
                <SelectTrigger className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="low" className="text-white">低</SelectItem>
                  <SelectItem value="medium" className="text-white">中</SelectItem>
                  <SelectItem value="high" className="text-white">高</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge 
                className={cn(
                  "text-[10px]",
                  task.priority === "high" ? "bg-red-500/20 text-red-300" :
                  task.priority === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                  "bg-green-500/20 text-green-300"
                )}
              >
                {task.priority === "high" ? "高" :
                 task.priority === "medium" ? "中" : "低"}
              </Badge>
            )}
          </td>
        )}

        {/* 可折叠列 - 前置任务 */}
        {!isColumnCollapsed('predecessor') && (
          <td className="px-2 py-2 border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              <Input
                type="text"
                value={editForm.predecessorWbs || ''}
                onChange={(e) => {
                  const inputValue = e.target.value.trim();
                  // 查找对应的任务ID
                  const matchedTask = tasks.find(t => {
                    const wbsNumber = wbsNumberMap.get(t.id) || t.wbsCode;
                    return wbsNumber === inputValue;
                  });
                  
                  // 只更新前置任务字段，保留开始日期数据
                  setEditForm({ 
                    ...editForm, 
                    predecessorWbs: inputValue, 
                    predecessor: matchedTask?.id || ''
                  });
                }}
                className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans w-full"
                style={{ fontSize: '10px', fontWeight: 'normal', lineHeight: '1.2' }}
                placeholder="输入WBS编号"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            ) : (
              predecessor ? (
                <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                  <GitBranch className="w-3 h-3 mr-1" />
                  {wbsNumberMap.get(predecessor.id) || predecessor.wbsCode}
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500">-</span>
              )
            )}
          </td>
        )}

        {/* 可折叠列 - 提前/落后 */}
        {!isColumnCollapsed('leadLag') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              <Input
                type="text"
                value={editForm.leadLag === undefined ? '' : editForm.leadLag.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setEditForm({ ...editForm, leadLag: undefined });
                  } else {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      setEditForm({ ...editForm, leadLag: numValue });
                    }
                  }
                }}
                placeholder="正数=落后，负数=提前"
                className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans"
                style={{ fontSize: '10px' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-[10px] text-slate-300">
                {task.leadLag !== undefined ? task.leadLag : '-'}
              </span>
            )}
          </td>
        )}

        {/* 可折叠列 - 开始日期 */}
        {!isColumnCollapsed('startDate') && (
              <td className="px-2 py-2 text-center border-r border-slate-600 transition-all duration-300">
                {isEditing ? (
                  // 规则1：有前置任务编号时显示"-"且不可编辑
                  editForm.predecessorWbs && editForm.predecessorWbs.length > 0 ? (
                    <span className="text-[10px] text-slate-400">-</span>
                  ) : (
                    // 无前置任务编号时允许编辑
                    <Input
                      type="date"
                      value={editForm.plannedStartDate || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditForm({ ...editForm, plannedStartDate: value || undefined });
                      }}
                      className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans"
                      style={{ fontSize: '10px' }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.preventDefault()}
                    />
                  )
                ) : (
                  // 非编辑模式：有前置任务显示"-"，空值显示"-"，否则显示日期
                  task.predecessor || !task.plannedStartDate ? (
                    <span className="text-[10px] text-slate-500">-</span>
                  ) : (
                    <span className="text-[10px] text-slate-300">
                      {format(parseISO(task.plannedStartDate), 'yyyy-MM-dd')}
                    </span>
                  )
                )}
              </td>
            )}

        {/* 可折叠列 - 工期 */}
        {!isColumnCollapsed('duration') && (
          <td className="px-2 py-2 border-r border-slate-600 transition-all duration-300">
            <div className="flex items-center gap-2 justify-center">
              {isEditing ? (
                // 编辑模式下始终可编辑，禁用自动计算
                <Input
                  type="text"
                  value={editForm.plannedDays ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 允许空值，不设置默认值
                    if (value === '') {
                      setEditForm({ ...editForm, plannedDays: undefined });
                    } else {
                      const numValue = parseInt(value);
                      // 只接受有效数字，不强制设置默认值
                      setEditForm({ ...editForm, plannedDays: isNaN(numValue) ? undefined : numValue });
                    }
                  }}
                  className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans w-12 text-center"
                  style={{ fontSize: '10px' }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                // 非编辑模式下只显示手动输入的值，禁用自动计算
                task.plannedDays === undefined || task.plannedDays === null ? (
                  <span className="text-[10px] text-slate-500">-</span>
                ) : (
                  <span className="text-[10px] text-slate-300">{task.plannedDays}</span>
                )
              )}
              {/* 单休日/双休日计算方式选择 */}
              <div className="relative group">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={task.isSingleRestDay || false}
                    onChange={(e) => {
                      const isSingleRestDay = e.target.checked;
                      // 更新任务的单休日设置
                      const updatedTasks = tasks.map(t => 
                        t.id === task.id ? { ...t, isSingleRestDay } : t
                      );
                      onTasksChange(updatedTasks);
                    }}
                    className="w-3 h-3 text-purple-500 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 cursor-help"
                    onClick={(e) => e.stopPropagation()}
                    title="单休日计算：每周工作6天，周日休息"
                  />
                </label>
                <div className="absolute -top-10 -right-10 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-40 z-10 pointer-events-none">
                  单休日计算：每周工作6天，周日休息
                </div>
              </div>
            </div>
          </td>
        )}

        {/* 可折叠列 - 结束日期 */}
        {!isColumnCollapsed('endDate') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              // 规则2：工期大于0时显示"-"且不可编辑
              editForm.plannedDays && editForm.plannedDays > 0 ? (
                <span className="text-[10px] text-slate-400">-</span>
              ) : (
                // 工期为空或0时允许编辑
                <Input
                  type="date"
                  value={editForm.plannedEndDate || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditForm({ ...editForm, plannedEndDate: value || undefined });
                  }}
                  className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans"
                  style={{ fontSize: '10px' }}
                  onClick={(e) => e.stopPropagation()}
                />
              )
            ) : (
              // 非编辑模式：工期大于0显示"-"，空值显示"-"，否则显示日期
              (task.plannedDays && task.plannedDays > 0) || !task.plannedEndDate ? (
                <span className="text-[10px] text-slate-500">-</span>
              ) : (
                <span className="text-[10px] text-slate-300">
                  {format(parseISO(task.plannedEndDate), 'yyyy-MM-dd')}
                </span>
              )
            )}
          </td>
        )}

        {/* 计划开始列 - 自动计算，浅绿色背景 */}
        {!isColumnCollapsed('plannedStartDate') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-[#E8F5E9]/10 transition-all duration-300">
            <span className="text-[10px] text-slate-300">
              {(() => {
                const holidays = holidayDates;
                const { plannedStartDate } = calculatePlannedDates(task, tasks, holidays);
                return plannedStartDate ? format(parseISO(plannedStartDate), 'yyyy-MM-dd') : '-';
              })()}
            </span>
          </td>
        )}

        {/* 计划结束列 - 自动计算，浅绿色背景 */}
        {!isColumnCollapsed('plannedEndDate') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-[#E8F5E9]/10 transition-all duration-300">
            <span className="text-[10px] text-slate-300">
              {(() => {
                const holidays = holidayDates;
                const { plannedEndDate } = calculatePlannedDates(task, tasks, holidays);
                return plannedEndDate ? format(parseISO(plannedEndDate), 'yyyy-MM-dd') : '-';
              })()}
            </span>
          </td>
        )}

        {/* 日历天数列 - 计算计划结束日期与计划开始日期的差值 */}
        {!isColumnCollapsed('plannedDays') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-[#E8F5E9]/10 transition-all duration-300">
            <span className="text-[10px] text-slate-300">
              {(() => {
                const holidays = holidayDates;
                const { plannedStartDate, plannedEndDate } = calculatePlannedDates(task, tasks, holidays);
                if (!plannedStartDate || !plannedEndDate) {
                  return '-';
                }
                // 计算日历天数差值（包括开始日期）
                const start = parseISO(plannedStartDate);
                const end = parseISO(plannedEndDate);
                const days = differenceInDays(end, start) + 1;
                return days;
              })()}
            </span>
          </td>
        )}

        {/* 预警天数 */}
        {!isColumnCollapsed('warningDays') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-yellow-500/5 transition-all duration-300">
            <span className={cn(
              "text-[10px] font-medium",
              nearDeadline && !isDelayed ? "text-yellow-400" : "text-slate-400"
            )}>
              {(() => {
                if (!task.plannedEndDate || task.status === 'completed') return '-';
                const holidays = holidayDates;
                const { plannedEndDate } = calculatePlannedDates(task, tasks, holidays);
                if (!plannedEndDate) return '-';
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endDate = new Date(plannedEndDate);
                endDate.setHours(0, 0, 0, 0);
                
                const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) return '已延期';
                if (diffDays === 0) return '今天';
                if (diffDays <= 3) return `${diffDays}天`;
                return '-';
              })()}
            </span>
          </td>
        )}

        {/* 实际日期列 */}
        {!isColumnCollapsed('actualStartDate') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              <Input
                type="date"
                value={editForm.actualStartDate || ''}
                onChange={(e) => setEditForm({ ...editForm, actualStartDate: e.target.value })}
                className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans"
                style={{ fontSize: '10px' }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.preventDefault()}
              />
            ) : (
              <span className="text-[10px] text-slate-300">
                {task.actualStartDate ? format(parseISO(task.actualStartDate), 'yyyy-MM-dd') : '-'}
              </span>
            )}
          </td>
        )}
        {!isColumnCollapsed('actualEndDate') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              <Input
                type="date"
                value={editForm.actualEndDate || ''}
                onChange={(e) => setEditForm({ ...editForm, actualEndDate: e.target.value })}
                className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans"
                style={{ fontSize: '10px' }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.preventDefault()}
              />
            ) : (
              <span className="text-[10px] text-slate-300">
                {task.actualEndDate ? format(parseISO(task.actualEndDate), 'yyyy-MM-dd') : '-'}
              </span>
            )}
          </td>
        )}
        {/* 实际工期列 - 自动计算，浅绿色背景 */}
        {!isColumnCollapsed('actualDays') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-[#E8F5E9]/10 transition-all duration-300">
            <span className="text-[10px] text-slate-300">
              {(() => {
                const holidays = holidayDates;
                const actualDays = calculateActualDays(task, holidays);
                return actualDays !== undefined ? actualDays : '-';
              })()}
            </span>
          </td>
        )}

        {/* 全职比列 - 工程师填写，浅绿色背景 */}
        {!isColumnCollapsed('fullTimeRatio') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-[#E8F5E9]/10 transition-all duration-300">
            {isEditing ? (
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={editForm.fullTimeRatio ?? ''}
                onChange={(e) => setEditForm({ ...editForm, fullTimeRatio: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="h-7 text-[10px] bg-slate-700 border-slate-600 text-white text-center font-sans"
                placeholder="0-100"
              />
            ) : (
              <span className={cn(
                "text-[10px]",
                task.fullTimeRatio !== undefined && task.fullTimeRatio >= 0 ? "text-slate-300" : "text-slate-500"
              )}>
                {task.fullTimeRatio !== undefined && task.fullTimeRatio >= 0 ? `${task.fullTimeRatio}%` : '-'}
              </span>
            )}
          </td>
        )}

        {/* 实际周期 - 实际结束日期与实际开始日期的差值 */}
        {!isColumnCollapsed('actualCycle') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-[#E8F5E9]/10 transition-all duration-300">
            <span className="text-[10px] text-slate-300">
              {(() => {
                if (task.actualStartDate && task.actualEndDate) {
                  const start = new Date(task.actualStartDate);
                  const end = new Date(task.actualEndDate);
                  const diffTime = end.getTime() - start.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  return diffDays;
                }
                return '-';
              })()}
            </span>
          </td>
        )}

        {/* 项目 */}
        {!isColumnCollapsed('project') && (
          <td className="px-2 py-2 border-r border-slate-600 transition-all duration-300">
            {isEditing ? (
              <Select
                value={editForm.projectId || ''}
                onValueChange={(v) => setEditForm({ ...editForm, projectId: v })}
              >
                <SelectTrigger className="h-8 text-[10px] bg-slate-700 border-slate-600 font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[10px] text-slate-300">
                {projects.find(p => p.id === task.projectId)?.name || '-'}
              </span>
            )}
          </td>
        )}

        {/* 延期次数 */}
        {!isColumnCollapsed('delayCount') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-orange-500/5 transition-all duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHistoryTaskId(task.id);
                setHistoryTaskTitle(task.title);
                setHistoryType('delay');
                setHistoryPanelOpen(true);
              }}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded transition-all",
                "hover:bg-orange-500/20 hover:text-orange-300",
                "active:scale-95"
              )}
            >
              {(() => {
                try {
                  // 获取所有计划调整记录
                  const adjustmentRecords = JSON.parse(localStorage.getItem('planAdjustmentRecords') || '[]') as PlanAdjustmentRecord[];
                  
                  // 筛选出该任务的计划调整记录
                  const taskAdjustments = adjustmentRecords.filter((r) => r.taskId === task.id);
                  
                  // 计算延期次数：只有当计划结束日期向后推迟时才计数
                  let delayCount = 0;
                  let previousEndDate = task.plannedEndDate;
                  
                  // 按时间顺序排序记录
                  const sortedAdjustments = [...taskAdjustments].sort((a, b) => {
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  });
                  
                  // 遍历记录，计算延期次数
                  sortedAdjustments.forEach(record => {
                    // 检查是否是结束日期调整
                    if (record.adjustmentType === 'end_date' || record.adjustmentType === 'all') {
                      const beforeEnd = record.before.endDate;
                      const afterEnd = record.after.endDate;
                      
                      // 只有当结束日期确实向后推迟时才计数
                      if (beforeEnd && afterEnd && new Date(afterEnd) > new Date(beforeEnd)) {
                        delayCount++;
                      }
                    }
                  });
                  
                  return delayCount > 0 ? delayCount : '-';
                } catch (error) {
                  console.error('计算延期次数失败:', error);
                  return '-';
                }
              })()}
            </button>
          </td>
        )}

        {/* 计划调整次数 */}
        {!isColumnCollapsed('adjustmentCount') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-blue-500/5 transition-all duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHistoryTaskId(task.id);
                setHistoryTaskTitle(task.title);
                setHistoryType('adjustment');
                setHistoryPanelOpen(true);
              }}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded transition-all",
                "hover:bg-blue-500/20 hover:text-blue-300",
                "active:scale-95"
              )}
            >
              {(() => {
                try {
                  const adjustmentRecords = JSON.parse(localStorage.getItem('planAdjustmentRecords') || '[]') as PlanAdjustmentRecord[];
                  const taskAdjustments = adjustmentRecords.filter((r) => r.taskId === task.id);
                  return taskAdjustments.length > 0 ? taskAdjustments.length : '-';
                } catch (error) {
                  console.error('读取计划调整记录失败:', error);
                  return '-';
                }
              })()}
            </button>
          </td>
        )}

        {/* 进展记录 */}
        {!isColumnCollapsed('progressRecord') && (
          <td className="px-2 py-2 text-center border-r border-slate-600 bg-purple-500/5 transition-all duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProgressTaskId(task.id);
                setProgressTaskTitle(task.title);
                setProgressPanelReadOnly(true);
                setProgressPanelOpen(true);
              }}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded transition-all",
                "hover:bg-purple-500/20 hover:text-purple-300",
                "active:scale-95"
              )}
            >
              {(() => {
                const progressRecords = JSON.parse(localStorage.getItem('taskProgressRecords') || '[]') as TaskProgressRecord[];
                const taskProgress = progressRecords.filter((r) => r.taskId === task.id);
                return taskProgress.length > 0 ? `${taskProgress.length}条` : '-';
              })()}
            </button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <>
    <Card className="bg-card border-border w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* 左侧：表格标题、任务数统计和任务状态信息框 */}
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-lg font-semibold text-white">WBS任务分解表</CardTitle>
            <Badge variant="secondary" className="bg-slate-700 text-slate-300">
              {tasks.length} 个任务
            </Badge>
            {/* 任务状态信息框 */}
            {taskStatusCounts.delayedCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">有{taskStatusCounts.delayedCount}个任务已延期</span>
              </div>
            )}
            {taskStatusCounts.nearDeadlineCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-300">有{taskStatusCounts.nearDeadlineCount}个任务即将到期</span>
              </div>
            )}
          </div>

          {/* 右侧：列折叠控制按钮 */}
          <div className="flex items-center gap-3 flex-wrap">

            {/* 添加新任务按钮 */}
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-300 hover:text-white hover:bg-green-600/20"
              onClick={() => addNewTask()}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加任务
            </Button>

            {/* 导出WBS任务分解表按钮 */}
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white"
              onClick={() => setExportDialogOpen(true)}
              disabled={isExporting}
            >
              <Download className="w-4 h-4 mr-1" />
              导出WBS
            </Button>
            
            {/* 列折叠控制按钮 */}
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:text-white"
              >
                <Columns className="w-4 h-4 mr-1" />
                列显示
                {collapsedColumns.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500/30 text-blue-300 rounded-full">
                    {collapsedColumns.size}
                  </span>
                )}
              </Button>
              {/* 下拉菜单 */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-700 mb-1">
                    <span className="text-xs text-slate-400">显示/隐藏列</span>
                    <div className="flex gap-1">
                      <button
                        onClick={expandAllColumns}
                        className="text-xs text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-500/10 transition-colors"
                      >
                        全部显示
                      </button>
                      <button
                        onClick={collapseAllColumns}
                        className="text-xs text-slate-400 hover:text-slate-300 px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors"
                      >
                        全部隐藏
                      </button>
                    </div>
                  </div>
                  {collapsibleColumns.map(col => (
                    <button
                      key={col.key}
                      onClick={() => toggleColumnCollapse(col.key)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
                    >
                      <span>{col.label}</span>
                      {isColumnCollapsed(col.key) ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 筛选区域 */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          
          {/* 筛选框 */}
          <Select value={filterStatus[0] || 'all'} onValueChange={(v) => setFilterStatus?.([v])}>
            <SelectTrigger className="w-40 bg-card border-border text-white">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-white">全部任务状态</SelectItem>
              <SelectItem value="not_started" className="text-white">未开始</SelectItem>
              <SelectItem value="in_progress" className="text-white">进行中</SelectItem>
              <SelectItem value="delayed" className="text-white">延期</SelectItem>
              <SelectItem value="early_completed" className="text-white">提前完成</SelectItem>
              <SelectItem value="overdue_completed" className="text-white">超期完成</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority[0] || 'all'} onValueChange={(v) => setFilterPriority?.([v])}>
            <SelectTrigger className="w-40 bg-card border-border text-white">
              <SelectValue placeholder="筛选优先级" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-white">全部优先级</SelectItem>
              <SelectItem value="high" className="text-white">高</SelectItem>
              <SelectItem value="medium" className="text-white">中</SelectItem>
              <SelectItem value="low" className="text-white">低</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterProject[0] || 'all'} onValueChange={(v) => setFilterProject?.([v])}>
            <SelectTrigger className="w-40 bg-card border-border text-white">
              <SelectValue placeholder="筛选项目" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-white">全部项目</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id} className="text-white">
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterMember[0] || 'all'} onValueChange={(v) => setFilterMember?.([v])}>
            <SelectTrigger className="w-40 bg-card border-border text-white">
              <SelectValue placeholder="筛选负责人" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-white">全部人员</SelectItem>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id} className="text-white">
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* 表格容器 - 优化滚动结构 */}
        <div className="max-h-[550px] overflow-x-scroll overflow-y-auto scrollbar-dark w-full">
          <table className="w-full min-w-max border border-slate-600">
            {/* 固定表头 */}
            <thead className="bg-slate-800 text-[10px] text-white font-medium border-b border-slate-600 whitespace-nowrap sticky top-0 z-10">
              <tr className="h-8">
                <th className="px-2 py-1 w-[25px] border-r border-slate-600">操作</th>
                {!isColumnCollapsed('wbsLevel') && (
                  <th className="px-2 py-1 text-center border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>WBS等级</span>
                      <button
                        onClick={() => toggleColumnCollapse('wbsLevel')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('wbsCode') && (
                  <th className="px-2 py-1 text-center border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>WBS</span>
                      <button
                        onClick={() => toggleColumnCollapse('wbsCode')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('taskDesc') && (
                  <th className="px-2 py-1 border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>任务描述</span>
                      <button
                        onClick={() => toggleColumnCollapse('taskDesc')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('taskStatus') && (
                  <th className="px-2 py-1 border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>任务状态</span>
                      <button
                        onClick={() => toggleColumnCollapse('taskStatus')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('redmine') && (
                  <th className="px-2 py-1 w-[80px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>Redmine</span>
                      <button
                        onClick={() => toggleColumnCollapse('redmine')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('assignee') && (
                  <th className="px-2 py-1 w-[80px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>负责人</span>
                      <button
                        onClick={() => toggleColumnCollapse('assignee')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('taskType') && (
                  <th className="px-2 py-1 w-[80px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>任务类型</span>
                      <button
                        onClick={() => toggleColumnCollapse('taskType')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('priority') && (
                  <th className="px-2 py-1 w-[80px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>优先级</span>
                      <button
                        onClick={() => toggleColumnCollapse('priority')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('predecessor') && (
                  <th className="px-2 py-1 w-[80px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>前置任务</span>
                      <button
                        onClick={() => toggleColumnCollapse('predecessor')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('leadLag') && (
                  <th className="px-2 py-1 text-center w-[80px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>提前/落后</span>
                      <button
                        onClick={() => toggleColumnCollapse('leadLag')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('startDate') && (
                  <th className="px-2 py-1 text-center w-[100px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>开始日期</span>
                      <button
                        onClick={() => toggleColumnCollapse('startDate')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('duration') && (
                  <th className="px-2 py-1 text-center w-[60px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>工期</span>
                      <button
                        onClick={() => toggleColumnCollapse('duration')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('endDate') && (
                  <th className="px-2 py-1 text-center w-[100px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>结束日期</span>
                      <button
                        onClick={() => toggleColumnCollapse('endDate')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('plannedStartDate') && (
                  <th className="px-2 py-1 text-center w-[100px] border-r border-slate-600 bg-[#E8F5E9]/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>计划开始</span>
                      <button
                        onClick={() => toggleColumnCollapse('plannedStartDate')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('plannedEndDate') && (
                  <th className="px-2 py-1 text-center w-[100px] border-r border-slate-600 bg-[#E8F5E9]/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>计划结束</span>
                      <button
                        onClick={() => toggleColumnCollapse('plannedEndDate')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('plannedDays') && (
                  <th className="px-2 py-1 text-center w-[80px] border-r border-slate-600 bg-[#E8F5E9]/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>日历天数</span>
                      <button
                        onClick={() => toggleColumnCollapse('plannedDays')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('warningDays') && (
                  <th className="px-2 py-1 text-center w-[80px] border-r border-slate-600 bg-yellow-500/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>预警天数</span>
                      <button
                        onClick={() => toggleColumnCollapse('warningDays')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('actualStartDate') && (
                  <th className="px-2 py-1 text-center w-[100px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>实际开始</span>
                      <button
                        onClick={() => toggleColumnCollapse('actualStartDate')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('actualEndDate') && (
                  <th className="px-2 py-1 text-center w-[100px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>实际结束</span>
                      <button
                        onClick={() => toggleColumnCollapse('actualEndDate')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('actualDays') && (
                  <th className="px-2 py-1 text-center w-[80px] border-r border-slate-600 bg-[#E8F5E9]/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>实际工期</span>
                      <button
                        onClick={() => toggleColumnCollapse('actualDays')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('fullTimeRatio') && (
                  <th className="px-2 py-1 text-center w-[90px] border-r border-slate-600 bg-[#E8F5E9]/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>全职比(%)</span>
                      <button
                        onClick={() => toggleColumnCollapse('fullTimeRatio')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('actualCycle') && (
                  <th className="px-2 py-1 text-center w-[80px] border-r border-slate-600 bg-[#E8F5E9]/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>实际周期</span>
                      <button
                        onClick={() => toggleColumnCollapse('actualCycle')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('project') && (
                  <th className="px-2 py-1 w-[100px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>项目</span>
                      <button
                        onClick={() => toggleColumnCollapse('project')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('delayCount') && (
                  <th className="px-2 py-1 text-center w-[80px] border-r border-slate-600 bg-orange-500/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>延期次数</span>
                      <button
                        onClick={() => toggleColumnCollapse('delayCount')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('adjustmentCount') && (
                  <th className="px-2 py-1 text-center w-[80px] border-r border-slate-600 bg-blue-500/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>计划调整</span>
                      <button
                        onClick={() => toggleColumnCollapse('adjustmentCount')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {!isColumnCollapsed('progressRecord') && (
                  <th className="px-2 py-1 text-center w-[80px] border-r border-slate-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span>进展记录</span>
                      <button
                        onClick={() => toggleColumnCollapse('progressRecord')}
                        className="p-0.5 hover:bg-slate-700 rounded opacity-50 hover:opacity-100 transition-opacity"
                        title="隐藏此列"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            {/* 任务列表 */}
            <tbody>
              {taskTree.length === 0 ? (
                <tr className="border-b border-slate-600">
                  <td colSpan={visibleColumnCount} className="text-center py-12 text-slate-400 border-r border-slate-600">
                    <button
                      onClick={addNewTask}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-full hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-12 h-12 mx-auto mb-3 text-slate-500 hover:text-white" />
                      <p className="text-slate-400 hover:text-white">点击添加新任务</p>
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map(({ task, depth }) => renderTaskRow(task, depth))
              )}
            </tbody>
          </table>
        </div>
        {/* 分页控件 */}
        {taskTree.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-400">
                显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, allFlatTasks.length)} 条，共 {allFlatTasks.length} 条
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* 历史记录面板 */}
    <TaskHistoryPanel
      open={historyPanelOpen}
      onOpenChange={setHistoryPanelOpen}
      taskId={historyTaskId}
      taskTitle={historyTaskTitle}
      historyType={historyType}
      userRole={userRole}
      isAdmin={isAdmin}
      user={user}
    />

    {/* 进展维护面板 */}
    <TaskProgressPanel
      open={progressPanelOpen}
      onOpenChange={setProgressPanelOpen}
      taskId={progressTaskId}
      taskTitle={progressTaskTitle}
      userRole={userRole}
      isAdmin={isAdmin}
      readOnly={progressPanelReadOnly}
    />

    {/* 导出进度对话框 */}
    <ExportProgressDialog
      open={exportDialogOpen}
      onOpenChange={setExportDialogOpen}
      onConfirm={handleExportWbs}
    />

    {/* 自定义对话框 */}
    <ConfirmDialog
      isOpen={dialog.confirmDialog.isOpen}
      options={dialog.confirmDialog.options}
      onConfirm={dialog.confirmDialog.handleConfirm}
      onCancel={dialog.confirmDialog.handleCancel}
    />
    <InputDialog
      isOpen={dialog.inputDialog.isOpen}
      options={dialog.inputDialog.options}
      value={dialog.inputDialog.inputValue}
      onValueChange={dialog.inputDialog.handleInputChange}
      onConfirm={dialog.inputDialog.handleConfirm}
      onCancel={dialog.inputDialog.handleCancel}
    />
    <CustomAlertDialog
      isOpen={dialog.alertDialog.isOpen}
      options={dialog.alertDialog.options}
      onClose={dialog.alertDialog.handleClose}
    />
  </>
  );
}
