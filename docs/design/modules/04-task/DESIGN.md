# 模块设计：任务管理模块 (04-task)

> **文档版本**: 1.0
> **创建时间**: 2026-03-17
> **状态**: ✅ 完成
> **模块组**: 04-task
> **开发顺序**: 4（依赖01-03模块）
> **依赖**: 01-auth-permission, 02-organization, 03-project

---

## 1. 快速参考（AI摘要）

### 1.1 模块概述

任务管理模块是系统的核心业务模块，实现WBS（工作分解结构）任务管理。包含24列复杂表格、9种任务状态、12种任务类型、4种依赖关系。支持层级嵌套（最多10级）、日期自动计算、状态自动判断等功能。

### 1.2 核心功能列表

| 功能 | 优先级 | 说明 |
|------|--------|------|
| WBS任务CRUD | P0 | 24列复杂表格操作 |
| 任务层级管理 | P0 | 支持10级嵌套 |
| 日期自动计算 | P0 | 基于工期和节假日 |
| 状态自动判断 | P0 | 9种状态自动转换 |
| 前置任务依赖 | P0 | 4种依赖类型 |
| 批量操作 | P1 | 批量获取/更新 |
| 智能推荐 | P1 | 基于能力模型推荐负责人 |

### 1.3 关键技术点

- **WBS编码**: 自动生成，格式`父编号.当前序号`
- **日期计算**: 跳过周末和节假日，支持单休日
- **状态判断**: 9种状态自动判断，按优先级匹配
- **依赖管理**: 循环依赖检测，级联更新
- **版本控制**: 乐观锁，冲突返回409

---

## 2. 数据模型

### 2.1 wbs_tasks表（WBS任务）

**来源**: FINAL L2464-2499

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| project_id | String(36) | ✅ | - | 关联项目 |
| parent_id | String(36) | ❌ | NULL | 父任务ID |
| wbs_code | String(20) | ✅ | - | WBS编码 |
| wbs_level | Integer | ✅ | 1 | WBS等级（1-10） |
| description | Text | ✅ | - | 任务描述 |
| status | Enum | ✅ | 'not_started' | 任务状态（9种） |
| task_type | Enum | ✅ | 'other' | 任务类型（12种） |
| priority | Enum | ✅ | 'medium' | 优先级 |
| assignee_id | Integer | ❌ | NULL | 负责人ID |
| start_date | Date | ❌ | NULL | 开始日期 |
| end_date | Date | ❌ | NULL | 结束日期 |
| duration | Integer | ❌ | NULL | 工期（天） |
| is_six_day_week | Boolean | ✅ | FALSE | 是否单休 |
| planned_duration | Integer | ❌ | NULL | 计划周期 |
| warning_days | Integer | ✅ | 3 | 预警天数阈值 |
| actual_start_date | Date | ❌ | NULL | 实际开始日期 |
| actual_end_date | Date | ❌ | NULL | 实际结束日期 |
| actual_duration | Integer | ❌ | NULL | 实际工期 |
| full_time_ratio | Integer | ✅ | 100 | 全职比（0-100） |
| actual_cycle | Integer | ❌ | NULL | 实际周期 |
| predecessor_id | String(36) | ❌ | NULL | 前置任务ID |
| lag_days | Integer | ❌ | 0 | 提前/落后天数 |
| redmine_link | String(255) | ❌ | NULL | Redmine链接 |
| delay_count | Integer | ✅ | 0 | 延期次数 |
| plan_change_count | Integer | ✅ | 0 | 计划调整次数 |
| progress_record_count | Integer | ✅ | 0 | 进展记录次数 |
| tags | Text | ❌ | NULL | 标签 |
| version | Integer | ✅ | 1 | 版本号（乐观锁） |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**索引**:
```sql
CREATE INDEX idx_tasks_project ON wbs_tasks(project_id);
CREATE INDEX idx_tasks_parent ON wbs_tasks(parent_id);
CREATE INDEX idx_tasks_assignee ON wbs_tasks(assignee_id);
CREATE INDEX idx_tasks_status ON wbs_tasks(status);
CREATE INDEX idx_tasks_dates ON wbs_tasks(start_date, end_date);
CREATE INDEX idx_tasks_wbs ON wbs_tasks(project_id, wbs_code);
CREATE INDEX idx_tasks_predecessor ON wbs_tasks(predecessor_id);
```

### 2.2 任务状态枚举（9种）

**来源**: FINAL L448-461, L736-750

```typescript
// 按业务逻辑顺序：待处理 → 进行中 → 延期 → 已完成
type TaskStatus =
  // 1-2. 待处理阶段
  | 'pending_approval'  // 待审批 - 紫色
  | 'rejected'          // 已驳回 - 红色
  // 3-4. 执行阶段
  | 'not_started'       // 未开始 - 灰色
  | 'in_progress'       // 进行中 - 蓝色
  // 5-6. 延期阶段
  | 'delay_warning'     // 延期预警 - 橙色
  | 'delayed'           // 已延迟 - 红色
  // 7-9. 完成阶段
  | 'early_completed'   // 提前完成 - 绿色
  | 'on_time_completed' // 按时完成 - 青色
  | 'overdue_completed';// 超期完成 - 橙色
```

### 2.3 任务类型枚举（12种）

**来源**: FINAL L473-489

```typescript
type TaskType =
  | 'firmware'        // 固件
  | 'board'           // 板卡
  | 'driver'          // 驱动
  | 'interface'       // 接口类
  | 'hw_recovery'     // 硬件恢复包
  | 'material_import' // 物料导入
  | 'material_sub'    // 物料改代
  | 'sys_design'      // 系统设计
  | 'core_risk'       // 核心风险
  | 'contact'         // 接口人
  | 'func_task'       // 职能任务
  | 'other';          // 其它
```

### 2.4 优先级枚举

```typescript
type Priority = 'urgent' | 'high' | 'medium' | 'low';
```

### 2.5 依赖类型枚举（4种）

**来源**: FINAL L1334-1345

```typescript
type DependencyType =
  | 'FS' // Finish-to-Start - 前置任务完成后开始（默认）
  | 'SS' // Start-to-Start - 前置任务开始时开始
  | 'FF' // Finish-to-Finish - 前置任务完成时完成
  | 'SF'; // Start-to-Finish - 前置任务开始时完成
```

---

## 3. 24列规格定义

**来源**: FINAL L350-434

### 3.1 列定义表

| 列号 | 名称 | 编辑性 | 字段名 | 说明 |
|------|------|--------|--------|------|
| 0 | 操作按钮 | - | - | 快捷操作列 |
| 1 | WBS等级 | 可编辑 | wbs_level | 1-10级 |
| 2 | WBS编码 | 只读 | wbs_code | 系统自动生成 |
| 3 | 任务描述 | 可编辑 | description | 必填 |
| 4 | 任务状态 | 只读 | status | 9种状态自动判断 |
| 5 | Redmine链接 | 可编辑 | redmine_link | 仅根任务可填 |
| 6 | 负责人 | 可编辑 | assignee_id | 下拉选择 |
| 7 | 任务类型 | 可编辑 | task_type | 子任务继承父任务 |
| 8 | 优先级 | 可编辑 | priority | 下拉选择 |
| 9 | 前置任务 | 可编辑 | predecessor_id | WBS编号 |
| 10 | 提前/落后 | 可编辑 | lag_days | 天数，可正可负 |
| 11 | 开始日期 | 条件编辑 | start_date | 无前置时可编辑 |
| 12 | 工期 | 可编辑 | duration | 天数 |
| 13 | 结束日期 | 只读 | end_date | 根据工期计算 |
| 14 | 计划周期 | 只读 | planned_duration | 不可编辑 |
| 15 | 预警天数 | 可编辑 | warning_days | 默认3天 |
| 16 | 实际开始 | 可编辑 | actual_start_date | 日期选择 |
| 17 | 实际结束 | 可编辑 | actual_end_date | 日期选择 |
| 18 | 实际工期 | 只读 | actual_duration | 不可编辑 |
| 19 | 全职比 | 可编辑 | full_time_ratio | 0-100% |
| 20 | 实际周期 | 只读 | actual_cycle | 不可编辑 |
| 21 | 项目 | 可编辑 | project_id | 必选 |
| 22 | 延期次数 | 只读 | delay_count | 点击查看详情 |
| 23 | 计划调整 | 只读 | plan_change_count | 点击查看详情 |
| 24 | 进展记录 | 只读 | progress_record_count | 点击查看详情 |

### 3.2 列视觉区分

**来源**: UI_Requirement L2302-2380

```css
/* 可编辑列样式 */
.editable-column {
  border-left: 3px solid hsl(210 15% 55%);
  background: hsl(210 10% 98%);
}

/* 只读列样式 */
.readonly-column {
  border-left: 3px solid hsl(0 0% 75%);
}
```

**可编辑列**: 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 19, 21

**只读列**: 2, 4, 13, 14, 18, 20, 22, 23, 24

---

## 4. 核心计算规则

### 4.1 日期计算规则

**来源**: FINAL L436-471

#### 4.1.1 开始日期计算

```typescript
function calculateStartDate(task: Task, predecessor: Task | null): Date | null {
  // 无前置任务时，开始日期由用户手动设置
  if (!predecessor) {
    return task.start_date; // 用户设置的值
  }

  // 有前置任务时，自动计算
  // 开始日期 = 前置任务结束日期 + 提前/落后天数
  const baseDate = predecessor.end_date;
  if (!baseDate) return null;

  return addWorkingDays(baseDate, task.lag_days || 0, task.is_six_day_week);
}
```

#### 4.1.2 结束日期计算

```typescript
function calculateEndDate(task: Task): Date | null {
  // 无开始日期或工期时返回null
  if (!task.start_date || !task.duration) {
    return null;
  }

  // 结束日期 = 开始日期 + 工期 - 1（跳过周末和节假日）
  return addWorkingDays(task.start_date, task.duration - 1, task.is_six_day_week);
}
```

#### 4.1.3 工作日计算工具

```typescript
/**
 * 添加工作日（跳过周末和节假日）
 * @param startDate 开始日期
 * @param days 要添加的天数
 * @param isSixDayWeek 是否单休日（周六工作）
 */
function addWorkingDays(
  startDate: Date,
  days: number,
  isSixDayWeek: boolean
): Date {
  const holidays = getHolidays(); // 从配置获取节假日
  let currentDate = new Date(startDate);
  let remainingDays = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;

  while (remainingDays > 0) {
    currentDate.setDate(currentDate.getDate() + direction);

    // 检查是否为工作日
    const dayOfWeek = currentDate.getDay();
    const isWeekend = isSixDayWeek
      ? dayOfWeek === 0  // 单休：只有周日休息
      : (dayOfWeek === 0 || dayOfWeek === 6); // 双休：周六周日休息

    const isHoliday = holidays.some(h =>
      isSameDay(new Date(h.date), currentDate) && h.type !== 'workday'
    );

    if (!isWeekend && !isHoliday) {
      remainingDays--;
    }
  }

  return currentDate;
}
```

### 4.2 状态判断规则

**来源**: FINAL L665-750

```typescript
function calculateTaskStatus(task: Task): TaskStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. 待审批 - 上级主管未处理
  if (task.has_pending_approval) {
    return 'pending_approval';
  }

  // 2. 已驳回 - 上级主管审批未通过
  if (task.last_approval_rejected) {
    return 'rejected';
  }

  // 3. 未开始 - 没有完整计划日期或无实际开始
  if (!task.start_date || !task.end_date || !task.actual_start_date) {
    return 'not_started';
  }

  // 4. 进行中 - 有计划日期、实际开始，无实际完成且未超期
  if (!task.actual_end_date && task.end_date >= today) {
    return 'in_progress';
  }

  // 5-6. 已完成情况
  if (task.actual_end_date) {
    const endDate = new Date(task.end_date);
    endDate.setHours(0, 0, 0, 0);
    const actualEnd = new Date(task.actual_end_date);
    actualEnd.setHours(0, 0, 0, 0);

    // 5. 提前完成
    if (actualEnd < endDate) {
      return 'early_completed';
    }
    // 6. 按时完成
    if (actualEnd.getTime() === endDate.getTime()) {
      return 'on_time_completed';
    }
    // 9. 超期完成
    return 'overdue_completed';
  }

  // 7. 延期预警 - 无实际完成且距离计划完成 <= 预警天数
  const daysRemaining = differenceInDays(task.end_date, today);
  if (daysRemaining > 0 && daysRemaining <= task.warning_days) {
    return 'delay_warning';
  }

  // 8. 已延迟 - 无实际完成且已超过计划完成日期
  return 'delayed';
}
```

### 4.3 WBS编码生成规则

**来源**: FINAL L665-690

```typescript
/**
 * 生成WBS编码
 * @param project_id 项目ID
 * @param parent_id 父任务ID（null表示根任务）
 */
async function generateWBSCode(
  project_id: string,
  parent_id: string | null
): Promise<string> {
  if (!parent_id) {
    // 根任务：获取项目下最大序号+1
    const maxCode = await db.query(`
      SELECT MAX(CAST(SUBSTRING_INDEX(wbs_code, '.', 1) AS UNSIGNED)) as max_code
      FROM wbs_tasks
      WHERE project_id = ? AND parent_id IS NULL
    `, [project_id]);

    return String((maxCode[0]?.max_code || 0) + 1);
  }

  // 子任务：获取父任务下最大序号+1
  const parent = await db.query(`
    SELECT wbs_code FROM wbs_tasks WHERE id = ?
  `, [parent_id]);

  const maxCode = await db.query(`
    SELECT MAX(CAST(SUBSTRING_INDEX(wbs_code, '.', -1) AS UNSIGNED)) as max_code
    FROM wbs_tasks
    WHERE parent_id = ?
  `, [parent_id]);

  return `${parent[0].wbs_code}.${(maxCode[0]?.max_code || 0) + 1}`;
}
```

---

## 5. API定义

### 5.1 任务管理API

**来源**: API_SPECIFICATION L259-270

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/wbs-tasks | 获取任务列表 | TASK_VIEW |
| GET | /api/wbs-tasks/:id | 获取任务详情 | TASK_VIEW |
| POST | /api/wbs-tasks | 创建任务 | TASK_CREATE |
| PUT | /api/wbs-tasks/v2/:id | 更新任务（带版本控制） | TASK_EDIT |
| DELETE | /api/wbs-tasks/:id | 删除任务 | TASK_DELETE |
| GET | /api/wbs-tasks/:id/changes | 获取任务变更历史 | TASK_VIEW |
| POST | /api/wbs-tasks/:id/changes | 提交计划变更 | TASK_EDIT |
| GET | /api/wbs-tasks/:id/delays | 获取任务延期记录 | TASK_VIEW |
| POST | /api/wbs-tasks/:id/delays | 添加延期原因 | TASK_EDIT |

### 5.2 GET /api/wbs-tasks

**查询参数**:
```typescript
interface TaskListQuery {
  page?: number;
  pageSize?: number;
  project_id?: string;    // 项目筛选
  assignee_id?: number;   // 负责人筛选
  status?: TaskStatus[];  // 状态筛选（多选）
  task_type?: TaskType[]; // 类型筛选（多选）
  priority?: Priority[];  // 优先级筛选（多选）
  keyword?: string;       // 关键词搜索
  parent_id?: string;     // 父任务ID（获取子任务）
}
```

**响应**:
```typescript
interface TaskListResponse {
  data: Task[];
  pagination: PaginationInfo;
}

interface Task {
  id: string;
  project_id: string;
  project_name: string;
  parent_id: string | null;
  wbs_code: string;
  wbs_level: number;
  description: string;
  status: TaskStatus;
  task_type: TaskType;
  priority: Priority;
  assignee_id: number | null;
  assignee_name: string | null;
  start_date: string | null;
  end_date: string | null;
  duration: number | null;
  is_six_day_week: boolean;
  planned_duration: number | null;
  warning_days: number;
  actual_start_date: string | null;
  actual_end_date: string | null;
  actual_duration: number | null;
  full_time_ratio: number;
  actual_cycle: number | null;
  predecessor_id: string | null;
  predecessor_code: string | null;
  lag_days: number;
  redmine_link: string | null;
  delay_count: number;
  plan_change_count: number;
  progress_record_count: number;
  tags: string | null;
  version: number;
  children?: Task[];  // 子任务（可选）
}
```

### 5.3 POST /api/wbs-tasks

**请求**:
```typescript
interface CreateTaskRequest {
  project_id: string;      // 必填
  parent_id?: string;      // 父任务ID
  description: string;     // 必填
  task_type?: TaskType;    // 默认继承父任务或'other'
  priority?: Priority;     // 默认'medium'
  assignee_id?: number;
  start_date?: string;
  duration?: number;
  is_six_day_week?: boolean;
  warning_days?: number;   // 默认3
  full_time_ratio?: number;// 默认100
  predecessor_id?: string;
  lag_days?: number;
  redmine_link?: string;
  tags?: string;
}
```

**业务逻辑**:
1. 验证必填字段
2. 自动生成WBS编码
3. 计算WBS等级（父任务等级+1）
4. 继承父任务的task_type
5. 如果有前置任务，计算开始日期
6. 如果有工期，计算结束日期
7. 计算计划周期
8. 设置初始状态为'not_started'
9. 记录审计日志

### 5.4 PUT /api/wbs-tasks/v2/:id

**请求**:
```typescript
interface UpdateTaskRequest {
  description?: string;
  task_type?: TaskType;
  priority?: Priority;
  assignee_id?: number | null;
  start_date?: string | null;
  duration?: number | null;
  is_six_day_week?: boolean;
  warning_days?: number;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  full_time_ratio?: number;
  predecessor_id?: string | null;
  lag_days?: number;
  redmine_link?: string | null;
  tags?: string | null;
  version: number; // 必填，乐观锁
}
```

**响应（冲突）**:
```typescript
interface ConflictResponse {
  error: {
    code: 'VERSION_CONFLICT';
    message: '数据已被其他用户修改，请刷新后重试';
    details: {
      current_version: number;
      provided_version: number;
    };
  };
}
```

---

## 6. 组件设计

### 6.1 前端组件结构

```
src/components/task-management/
├── WbsTaskTable.tsx           # WBS任务表格主组件
├── WbsTaskRow.tsx             # 任务行组件
├── WbsTaskCell.tsx            # 单元格组件（可编辑/只读）
├── WbsTaskFormDialog.tsx      # 任务表单对话框
├── WbsTaskFilter.tsx          # 任务筛选器
├── WbsColumnSelector.tsx      # 列显示/隐藏选择器
├── TaskStatusBadge.tsx        # 状态徽章组件
├── TaskHistoryDrawer.tsx      # 任务历史抽屉
├── DelayHistoryDialog.tsx     # 延期历史对话框
├── PlanChangeDialog.tsx       # 计划变更对话框
└── hooks/
    ├── useWbsTasks.ts         # 任务管理Hook
    ├── useTaskStatus.ts       # 状态计算Hook
    ├── useTaskDateCalc.ts     # 日期计算Hook
    └── useWbsCode.ts          # WBS编码Hook
```

### 6.2 WBS任务表格主组件

```tsx
// WbsTaskTable.tsx
interface WbsTaskTableProps {
  projectId: string;
}

const WbsTaskTable: React.FC<WbsTaskTableProps> = ({ projectId }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useLocalStorage('wbs-columns', DEFAULT_COLUMNS);

  const { data: tasks, isLoading } = useWbsTasks({ project_id: projectId });

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;

      switch (e.key) {
        case 'Insert':
          handleAddSibling(selectedId);
          break;
        case 'Enter' && (e.ctrlKey || e.metaKey):
          handleAddChild(selectedId);
          break;
        case 'F2':
          handleEdit(selectedId);
          break;
        case 'Delete' && (e.ctrlKey || e.metaKey):
          handleDelete(selectedId);
          break;
        case 'ArrowLeft':
          handleCollapse(selectedId);
          break;
        case 'ArrowRight':
          handleExpand(selectedId);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  return (
    <div className="wbs-task-table">
      {/* 筛选器 */}
      <WbsTaskFilter onFilterChange={handleFilterChange} />

      {/* 列选择器 */}
      <WbsColumnSelector
        columns={ALL_COLUMNS}
        selected={visibleColumns}
        onChange={setVisibleColumns}
      />

      {/* 表格 */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {visibleColumns.map(col => (
              <th
                key={col.id}
                className={cn(
                  "px-3 py-2 text-left font-medium border-b",
                  col.editable ? "border-l-[3px] border-l-blue-200" : "border-l-[3px] border-l-gray-300"
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks?.map(task => (
            <WbsTaskRow
              key={task.id}
              task={task}
              columns={visibleColumns}
              level={0}
              expanded={expandedIds.has(task.id)}
              selected={selectedId === task.id}
              onToggleExpand={() => handleToggleExpand(task.id)}
              onSelect={() => setSelectedId(task.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 6.3 任务状态徽章

```tsx
// TaskStatusBadge.tsx
const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  pending_approval: {
    label: '待审批',
    className: 'bg-purple-100 text-purple-700'
  },
  rejected: {
    label: '已驳回',
    className: 'bg-red-100 text-red-700'
  },
  not_started: {
    label: '未开始',
    className: 'bg-gray-100 text-gray-600'
  },
  in_progress: {
    label: '进行中',
    className: 'bg-blue-100 text-blue-700'
  },
  early_completed: {
    label: '提前完成',
    className: 'bg-green-100 text-green-700'
  },
  on_time_completed: {
    label: '按时完成',
    className: 'bg-cyan-100 text-cyan-700'
  },
  delay_warning: {
    label: '延期预警',
    className: 'bg-orange-100 text-orange-700'
  },
  delayed: {
    label: '已延迟',
    className: 'bg-red-100 text-red-700'
  },
  overdue_completed: {
    label: '超期完成',
    className: 'bg-orange-100 text-orange-700'
  }
};

const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
};
```

---

## 7. 业务规则汇总

### 7.1 验证规则

**来源**: FINAL L623-648

| 规则ID | 规则名称 | 验证条件 | 错误提示 |
|--------|---------|----------|----------|
| VAL-01 | 必填字段 | description, project_id不能为空 | "请输入任务描述" |
| VAL-02 | 日期逻辑 | end_date >= start_date | "结束日期必须晚于开始日期" |
| VAL-03 | 工期验证 | duration > 0 | "工期必须大于0" |
| VAL-04 | 前置任务存在 | predecessor_id对应的任务必须存在 | "WBS编号不存在" |
| VAL-05 | 循环依赖 | 不能形成循环依赖 | "不能创建循环依赖" |
| VAL-06 | 自依赖 | 不能将自己设为前置任务 | "不能将任务自身作为前置任务" |
| VAL-07 | WBS等级 | wbs_level必须在1-10之间 | "WBS等级超出范围" |

### 7.2 级联更新规则

| 触发条件 | 级联更新内容 |
|----------|-------------|
| 修改前置任务结束日期 | 更新后续任务的开始日期 |
| 修改任务工期 | 更新结束日期，检查后续任务 |
| 删除任务 | 删除所有子任务，更新WBS编码 |
| 移动任务层级 | 重新计算WBS编码 |

---

## 8. 开发检查清单

### 8.1 数据库迁移

- [ ] 创建 `020-create-wbs-tasks-table.ts`
- [ ] 创建 `021-add-task-indexes.ts`
- [ ] 创建 `022-seed-task-types.ts`

### 8.2 后端API实现

- [ ] `GET /api/wbs-tasks` - 任务列表
- [ ] `GET /api/wbs-tasks/:id` - 任务详情
- [ ] `POST /api/wbs-tasks` - 创建任务
- [ ] `PUT /api/wbs-tasks/v2/:id` - 更新任务（版本控制）
- [ ] `DELETE /api/wbs-tasks/:id` - 删除任务
- [ ] `GET /api/wbs-tasks/:id/changes` - 变更历史
- [ ] `POST /api/wbs-tasks/:id/changes` - 提交变更
- [ ] `GET /api/wbs-tasks/:id/delays` - 延期记录
- [ ] `POST /api/wbs-tasks/:id/delays` - 添加延期原因
- [ ] 日期计算服务
- [ ] 状态判断服务
- [ ] WBS编码生成服务
- [ ] 循环依赖检测服务

### 8.3 前端组件

- [ ] `WbsTaskTable.tsx` - 主表格
- [ ] `WbsTaskRow.tsx` - 任务行
- [ ] `WbsTaskCell.tsx` - 单元格
- [ ] `WbsTaskFormDialog.tsx` - 表单对话框
- [ ] `WbsTaskFilter.tsx` - 筛选器
- [ ] `WbsColumnSelector.tsx` - 列选择器
- [ ] `TaskStatusBadge.tsx` - 状态徽章
- [ ] `TaskHistoryDrawer.tsx` - 历史抽屉

### 8.4 测试用例

- [ ] 任务CRUD测试
- [ ] WBS编码生成测试
- [ ] 日期计算测试（含节假日）
- [ ] 状态判断测试（9种状态）
- [ ] 前置任务依赖测试
- [ ] 循环依赖检测测试
- [ ] 版本冲突测试
- [ ] 级联更新测试

---

## 9. 完整性验证

### 9.1 FINAL_REQUIREMENTS 对照

| 需求项 | 原文位置 | 覆盖状态 |
|--------|---------|:--------:|
| 24列规格 | L350-434 | ✅ |
| 9种任务状态 | L448-461, L736-750 | ✅ |
| 12种任务类型 | L473-489 | ✅ |
| 日期计算规则 | L436-471 | ✅ |
| 状态判断规则 | L665-750 | ✅ |
| WBS编码规则 | L665-690 | ✅ |
| 前置任务依赖 | L1324-1371 | ✅ |
| 验证规则 | L623-648 | ✅ |
| wbs_tasks表结构 | L2464-2499 | ✅ |

### 9.2 UI_Requirement 对照

| UI需求项 | 原文位置 | 覆盖状态 |
|----------|---------|:--------:|
| WBS表格组件规范 | 4.3 | ✅ |
| 列视觉区分 | L2302-2380 | ✅ |
| 任务筛选器 | 5.2 | ✅ |
| 状态颜色 | L2647-2674 | ✅ |
| 任务表单 | L2676-2686 | ✅ |
| 快捷键规范 | L1208-1218 | ✅ |

### 9.3 数据模型一致性

| 检查项 | 状态 |
|--------|:----:|
| wbs_tasks表与DATA_MODEL.md一致 | ✅ |
| 9种状态枚举完整 | ✅ |
| 12种任务类型枚举完整 | ✅ |
| 4种依赖类型枚举完整 | ✅ |

---

## 相关文档

- [模块需求文档](../../../requirements/modules/REQ_04_task.md)
- [系统架构总览](../SYSTEM_OVERVIEW.md)
- [数据模型设计](../DATA_MODEL.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
