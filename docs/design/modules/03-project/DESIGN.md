# 模块设计：项目管理模块 (03-project)

> **文档版本**: 1.0
> **创建时间**: 2026-03-17
> **状态**: ✅ 完成
> **模块组**: 03-project
> **开发顺序**: 3（依赖01-auth-permission, 02-organization）
> **依赖**: 01-auth-permission, 02-organization

---

## 1. 快速参考（AI摘要）

### 1.1 模块概述

项目管理模块是系统的核心业务模块，负责项目CRUD、里程碑管理、项目成员管理、时间线管理和节假日配置。它是任务管理（04-task）的上层容器。

### 1.2 核心功能列表

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 项目CRUD | P0 | 创建/编辑/删除/查看项目 |
| 项目成员管理 | P0 | 添加/移除项目成员 |
| 里程碑管理 | P1 | 项目关键节点管理 |
| 时间线管理 | P0 | 多时间轴视图和任务节点 |
| 节假日管理 | P2 | 工作日计算基础配置 |
| 标签系统 | P2 | 项目/任务标签（暂缓） |

### 1.3 关键技术点

- **版本控制**: 乐观锁（version字段），冲突返回409
- **数据隔离**: 项目级隔离，只有项目成员可访问
- **进度计算**: 自动统计task_count和completed_task_count
- **时间线拖拽**: 支持拖拽调整任务时间，ESC取消
- **节假日判断**: 周末+自定义节假日配置

---

## 2. 数据模型

### 2.1 相关表结构

本模块涉及6个核心表：

| 表名 | 说明 | 记录来源 |
|------|------|---------|
| projects | 项目表 | FINAL L2442-2462 |
| project_members | 项目成员关联表 | FINAL L2464-2474 |
| milestones | 里程碑表 | FINAL L215-227 |
| timelines | 时间轴表 | FINAL L2388 |
| timeline_tasks | 时间轴任务表 | FINAL L2389 |
| holidays | 节假日配置 | UI L2842-2917 |

### 2.2 projects表（项目）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| code | String(50) | ✅ | - | 项目代号（全局唯一） |
| name | String(100) | ✅ | - | 项目名称 |
| description | Text | ❌ | NULL | 项目描述 |
| status | Enum | ✅ | 'planning' | 状态 |
| project_type | Enum | ✅ | - | 项目类型 |
| planned_start_date | Date | ✅ | - | 计划开始日期 |
| planned_end_date | Date | ✅ | - | 计划结束日期 |
| actual_start_date | Date | ❌ | NULL | 实际开始日期 |
| actual_end_date | Date | ❌ | NULL | 实际结束日期 |
| progress | Integer | ✅ | 0 | 进度百分比（0-100） |
| task_count | Integer | ✅ | 0 | 任务总数（自动统计） |
| completed_task_count | Integer | ✅ | 0 | 已完成任务数（自动统计） |
| member_ids | Text | ❌ | NULL | 成员ID列表（逗号分隔） |
| version | Integer | ✅ | 1 | 版本号（乐观锁） |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**索引**:
```sql
CREATE UNIQUE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(project_type);
CREATE INDEX idx_projects_dates ON projects(planned_start_date, planned_end_date);
```

**项目状态枚举**:
```typescript
// 按业务逻辑顺序：待处理 → 进行中 → 已完成
type ProjectStatus =
  | 'planning'    // 规划中（待处理）
  | 'active'      // 进行中
  | 'completed';  // 已完成
```

**项目类型枚举**:
```typescript
type ProjectType =
  | 'product_dev'    // 产品开发
  | 'func_mgmt'      // 职能管理
  | 'material_sub'   // 物料改代
  | 'quality_handle'; // 质量处理
```

### 2.3 project_members表（项目成员）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键（自增） |
| project_id | String(36) | ✅ | - | 项目ID |
| user_id | Integer | ✅ | - | 用户ID |
| role | String(50) | ❌ | NULL | 项目角色 |
| joined_at | Timestamp | ✅ | NOW() | 加入时间 |

**索引**:
```sql
CREATE INDEX idx_pm_project ON project_members(project_id);
CREATE INDEX idx_pm_user ON project_members(user_id);
CREATE UNIQUE INDEX idx_pm_unique ON project_members(project_id, user_id);
```

### 2.4 milestones表（里程碑）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| project_id | String(36) | ✅ | - | 关联项目 |
| name | String(100) | ✅ | - | 里程碑名称 |
| target_date | Date | ✅ | - | 目标日期 |
| description | Text | ❌ | NULL | 描述 |
| status | Enum | ✅ | 'pending' | 状态 |
| completion_percentage | Integer | ✅ | 0 | 完成百分比（0-100） |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**里程碑状态枚举**:
```typescript
type MilestoneStatus = 'pending' | 'achieved' | 'overdue';
```

**状态判断逻辑**:
```typescript
function getMilestoneStatus(milestone: Milestone): MilestoneStatus {
  if (milestone.completion_percentage === 100) return 'achieved';
  if (milestone.target_date < new Date()) return 'overdue';
  return 'pending';
}
```

### 2.5 timelines表（时间轴）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| project_id | String(36) | ✅ | - | 关联项目 |
| name | String(100) | ✅ | - | 时间轴名称 |
| start_date | Date | ✅ | - | 开始日期 |
| end_date | Date | ✅ | - | 结束日期 |
| type | Enum | ❌ | 'custom' | 类型 |
| visible | Boolean | ✅ | TRUE | 是否可见 |
| sort_order | Integer | ✅ | 0 | 排序顺序 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**时间轴类型枚举**:
```typescript
type TimelineType =
  | 'tech_stack'  // 技术栈
  | 'team'        // 团队
  | 'phase'       // 阶段
  | 'custom';     // 自定义
```

### 2.6 timeline_tasks表（时间轴任务）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| timeline_id | String(36) | ✅ | - | 关联时间轴 |
| title | String(200) | ✅ | - | 任务标题 |
| description | Text | ❌ | NULL | 任务描述 |
| start_date | Date | ✅ | - | 开始日期 |
| end_date | Date | ✅ | - | 结束日期 |
| status | Enum | ✅ | 'not_started' | 状态（5种简化） |
| priority | Enum | ✅ | 'medium' | 优先级 |
| progress | Integer | ✅ | 0 | 进度（0-100） |
| assignee_id | Integer | ❌ | NULL | 负责人ID |
| source_type | Enum | ❌ | NULL | 来源类型 |
| source_id | String(36) | ❌ | NULL | 来源ID（关联WBS任务） |
| sort_order | Integer | ✅ | 0 | 排序顺序 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**时间线任务状态（5种简化）**:
```typescript
// 按业务逻辑顺序：待处理 → 进行中 → 延期 → 已完成 → 已取消
type TimelineTaskStatus =
  | 'not_started'  // 未开始（待处理）
  | 'in_progress'  // 进行中
  | 'delayed'      // 已延期
  | 'completed'    // 已完成
  | 'cancelled';   // 已取消
```

**WBS状态到时间线状态映射**:
| WBS状态 | 时间线状态 |
|---------|-----------|
| 待审批、已驳回、未开始 | not_started |
| 进行中 | in_progress |
| 提前完成、按时完成、超期完成 | completed |
| 延期预警、已延迟 | delayed |

### 2.7 holidays配置（节假日）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| date | Date | ✅ | - | 日期 |
| name | String(50) | ✅ | - | 节假日名称 |
| type | Enum | ✅ | - | 类型 |

**节假日类型**:
```typescript
type HolidayType =
  | 'legal'      // 法定假日
  | 'company'    // 公司假日
  | 'workday';   // 调休工作日
```

---

## 3. API定义

### 3.1 项目管理API

**来源**: API_SPECIFICATION L218-226

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects | 获取项目列表 | PROJECT_VIEW |
| GET | /api/projects/:id | 获取项目详情 | PROJECT_VIEW |
| GET | /api/projects/:id/detail | 获取项目完整信息 | PROJECT_VIEW |
| POST | /api/projects | 创建项目 | PROJECT_CREATE |
| PUT | /api/projects/v2/:id | 更新项目（带版本控制） | PROJECT_EDIT |
| DELETE | /api/projects/v2/:id | 删除项目 | PROJECT_DELETE |

#### 3.1.1 GET /api/projects

**查询参数**:
```typescript
interface ProjectListQuery {
  page?: number;
  pageSize?: number;
  status?: ProjectStatus;
  project_type?: ProjectType;
  keyword?: string;
}
```

**响应**:
```typescript
interface ProjectListResponse {
  data: ProjectSummary[];
  pagination: PaginationInfo;
}

interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  project_type: ProjectType;
  progress: number;
  planned_start_date: string;
  planned_end_date: string;
  member_count: number;
  task_count: number;
}
```

#### 3.1.2 POST /api/projects

**请求**:
```typescript
interface CreateProjectRequest {
  code: string;           // 必填，全局唯一
  name: string;           // 必填
  description?: string;
  project_type: ProjectType; // 必填
  planned_start_date: string; // 必填
  planned_end_date: string;   // 必填
  member_ids?: number[];  // 初始成员
}
```

**响应**:
```typescript
interface CreateProjectResponse {
  data: Project;
  message: string;
}
```

**业务逻辑**:
1. 验证项目代号唯一性
2. 验证日期逻辑（结束 >= 开始）
3. 创建项目
4. 添加创建者为项目成员
5. 记录审计日志

#### 3.1.3 PUT /api/projects/v2/:id

**请求**:
```typescript
interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  planned_start_date?: string;
  planned_end_date?: string;
  version: number; // 必填，乐观锁
}
```

**响应（冲突）**:
```typescript
interface ConflictResponse {
  error: {
    code: 'VERSION_CONFLICT';
    message: string;
    details: {
      current_version: number;
      provided_version: number;
    };
  };
}
```

### 3.2 项目成员API

**来源**: API_SPECIFICATION L228-234

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects/:id/members | 获取项目成员列表 | PROJECT_VIEW |
| POST | /api/projects/:id/members | 添加项目成员 | PROJECT_EDIT |
| DELETE | /api/projects/:id/members/:memberId | 移除项目成员 | PROJECT_EDIT |

#### 3.2.1 POST /api/projects/:id/members

**请求**:
```typescript
interface AddProjectMemberRequest {
  user_ids: number[];
  role?: string;
}
```

### 3.3 里程碑API

**来源**: API_SPECIFICATION L236-243

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects/:id/milestones | 获取里程碑列表 | PROJECT_VIEW |
| POST | /api/projects/:id/milestones | 创建里程碑 | PROJECT_EDIT |
| PUT | /api/milestones/:id | 更新里程碑 | PROJECT_EDIT |
| DELETE | /api/milestones/:id | 删除里程碑 | PROJECT_EDIT |

### 3.4 时间线API

**来源**: API_SPECIFICATION L245-256

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects/:id/timelines | 获取时间轴列表 | PROJECT_VIEW |
| POST | /api/projects/:id/timelines | 创建时间轴 | PROJECT_EDIT |
| PUT | /api/timelines/:id | 更新时间轴 | PROJECT_EDIT |
| DELETE | /api/timelines/:id | 删除时间轴 | PROJECT_EDIT |
| GET | /api/timelines/:id/tasks | 获取时间轴任务 | PROJECT_VIEW |
| POST | /api/timelines/:id/tasks | 创建时间轴任务 | PROJECT_EDIT |
| PUT | /api/timeline-tasks/:id | 更新时间轴任务 | PROJECT_EDIT |
| DELETE | /api/timeline-tasks/:id | 删除时间轴任务 | PROJECT_EDIT |

### 3.5 节假日配置API

**来源**: API_SPECIFICATION L329-330

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/config/holidays | 获取节假日配置 | MEMBER_VIEW |
| POST | /api/config/holidays | 添加节假日 | SYSTEM_CONFIG |
| PUT | /api/config/holidays/:date | 更新节假日 | SYSTEM_CONFIG |
| DELETE | /api/config/holidays/:date | 删除节假日 | SYSTEM_CONFIG |

---

## 4. 组件设计

### 4.1 前端组件结构

```
src/components/projects/
├── ProjectList.tsx             # 项目列表（卡片网格）
├── ProjectCard.tsx             # 项目卡片
├── ProjectFormDialog.tsx       # 项目表单对话框
├── ProjectDetailPage.tsx       # 项目详情页
├── ProjectMemberTab.tsx        # 项目成员Tab
├── MilestoneTab.tsx            # 里程碑Tab
├── MilestoneTable.tsx          # 里程碑表格
├── MilestoneDialog.tsx         # 里程碑对话框
├── MultiTimelineView.tsx       # 时间线主视图
├── TimelineList.tsx            # 时间轴列表
├── TimelineTrack.tsx           # 时间轴轨道
├── TimelineRuler.tsx           # 时间刻度尺
├── TimelineTaskBar.tsx         # 任务条（可拖拽）
├── TimelineToolbar.tsx         # 工具栏
├── TimelineContextMenu.tsx     # 右键菜单
└── hooks/
    ├── useProjects.ts          # 项目管理Hook
    ├── useProjectMembers.ts    # 项目成员Hook
    ├── useMilestones.ts        # 里程碑Hook
    └── useTimeline.ts          # 时间线Hook
```

### 4.2 项目列表组件

**来源**: UI_Requirement 5.1

```tsx
// ProjectList.tsx
const ProjectList: React.FC = () => {
  const { data: projects, isLoading } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">项目列表</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          新建项目
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <ProjectFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
```

### 4.3 项目卡片组件

```tsx
// ProjectCard.tsx
interface ProjectCardProps {
  project: ProjectSummary;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{project.code}</Badge>
          <Badge variant={getStatusVariant(project.status)}>
            {getStatusText(project.status)}
          </Badge>
        </div>
        <CardTitle className="mt-2">{project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description}
        </p>
        <Progress value={project.progress} className="mt-4" />
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <AvatarGroup users={project.members} max={3} />
          <span>{project.planned_end_date}</span>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4.4 时间线主视图

**来源**: UI_Requirement 5.8

```tsx
// MultiTimelineView.tsx
interface MultiTimelineViewProps {
  projectId: string;
}

const MultiTimelineView: React.FC<MultiTimelineViewProps> = ({ projectId }) => {
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>('day');
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);

  const { data: timelines } = useTimelines(projectId);

  // 缩放配置
  const zoomConfig = {
    day: { dayWidth: 60, interval: 1, format: 'M/d' },
    week: { dayWidth: 25, interval: 7, format: 'M/d' },
    month: { dayWidth: 8, interval: 30, format: 'yyyy/M' }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 统计信息栏 */}
      <TimelineStatsBar projectId={projectId} />

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 时间轴列表区 */}
        <div className="w-[180px] border-r flex-shrink-0">
          <TimelineList timelines={timelines} />
        </div>

        {/* 时间线主区域 */}
        <div className="flex-1 overflow-auto">
          <TimelineRuler
            startDate={projectStartDate}
            endDate={projectEndDate}
            config={zoomConfig[zoomLevel]}
          />
          <div className="relative">
            {timelines?.map(timeline => (
              <TimelineTrack
                key={timeline.id}
                timeline={timeline}
                dayWidth={zoomConfig[zoomLevel].dayWidth}
                onTaskSelect={setSelectedTask}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <TimelineToolbar
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        projectId={projectId}
      />

      {/* 右键菜单 */}
      <TimelineContextMenu
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
};
```

### 4.5 任务条组件（可拖拽）

```tsx
// TimelineTaskBar.tsx
interface TimelineTaskBarProps {
  task: TimelineTask;
  dayWidth: number;
  startDate: Date;
  onDragStart: (task: TimelineTask) => void;
  onDragEnd: (task: TimelineTask, newStart: Date, newEnd: Date) => void;
}

const TimelineTaskBar: React.FC<TimelineTaskBarProps> = ({
  task,
  dayWidth,
  startDate,
  onDragStart,
  onDragEnd
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);

  // 计算位置
  const left = differenceInDays(task.start_date, startDate) * dayWidth;
  const width = Math.max(
    differenceInDays(task.end_date, task.start_date) * dayWidth,
    40 // 最小宽度
  );

  // 状态颜色
  const statusColors = {
    not_started: 'bg-gray-400',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    delayed: 'bg-red-500',
    cancelled: 'bg-slate-400 opacity-60'
  };

  const handleMouseDown = (e: React.MouseEvent, type: typeof dragType) => {
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);
    onDragStart(task);
  };

  // ESC取消
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragging) {
        setIsDragging(false);
        setDragType(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragging]);

  return (
    <div
      className={cn(
        "absolute h-7 rounded-md cursor-grab",
        statusColors[task.status],
        isDragging && "opacity-70 cursor-grabbing"
      )}
      style={{ left: `${left}px`, width: `${width}px` }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      {/* 左手柄 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize-start'); }}
      />

      {/* 任务标题 */}
      <span className="px-2 text-xs text-white truncate block">
        {task.title}
      </span>

      {/* 右手柄 */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'resize-end'); }}
      />
    </div>
  );
};
```

---

## 5. 业务规则

### 5.1 项目规则

**来源**: FINAL L286-334

| 规则ID | 规则名称 | 描述 |
|--------|---------|------|
| PRJ-RULE-01 | 项目类型关联 | 项目类型关联任务类型 |
| PRJ-RULE-02 | 项目时间约束 | 结束日期不能早于开始日期 |
| PRJ-RULE-03 | 项目成员数据隔离 | 只有项目成员可以查看项目 |
| PRJ-RULE-04 | 项目删除约束 | 有任务的项目不能删除 |
| PRJ-RULE-05 | 项目状态管理 | 状态流转规则 |
| PRJ-RULE-06 | 版本冲突检测 | 更新时检测版本号，冲突返回409 |
| PRJ-RULE-07 | 版本历史记录 | 每次更新记录版本历史 |

### 5.2 时间线规则

**来源**: FINAL L888-911

| 规则ID | 规则名称 | 描述 |
|--------|---------|------|
| TL-RULE-01 | 时间轴独立性 | 每个项目可创建多条独立时间轴 |
| TL-RULE-02 | 任务节点时间约束 | 任务不能超出时间轴范围 |
| TL-RULE-03 | 拖拽边界吸附 | 拖出范围时自动吸附到边界 |

### 5.3 数据隔离规则

```typescript
// 数据访问中间件
const projectAccessMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const projectId = req.params.id || req.params.projectId;
  const userId = req.user.id;

  // 管理员可访问所有项目
  if (req.user.role === 'admin') {
    return next();
  }

  // 检查项目成员关系
  const isMember = await checkProjectMember(projectId, userId);
  if (!isMember) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: '您不是该项目的成员' }
    });
  }

  next();
};
```

---

## 6. 开发检查清单

### 6.1 数据库迁移

- [ ] 创建 `012-create-projects-table.ts`
- [ ] 创建 `013-create-project-members-table.ts`
- [ ] 创建 `014-create-milestones-table.ts`
- [ ] 创建 `015-create-timelines-table.ts`
- [ ] 创建 `016-create-timeline-tasks-table.ts`
- [ ] 创建 `017-create-holidays-table.ts`
- [ ] 创建 `018-seed-project-types.ts`
- [ ] 创建 `019-seed-default-holidays.ts`

### 6.2 后端API实现

- [ ] `GET /api/projects` - 项目列表
- [ ] `POST /api/projects` - 创建项目
- [ ] `GET /api/projects/:id` - 项目详情
- [ ] `PUT /api/projects/v2/:id` - 更新项目（版本控制）
- [ ] `DELETE /api/projects/v2/:id` - 删除项目
- [ ] `GET /api/projects/:id/detail` - 项目完整信息
- [ ] `GET /api/projects/:id/members` - 项目成员列表
- [ ] `POST /api/projects/:id/members` - 添加成员
- [ ] `DELETE /api/projects/:id/members/:memberId` - 移除成员
- [ ] `GET /api/projects/:id/milestones` - 里程碑列表
- [ ] `POST /api/projects/:id/milestones` - 创建里程碑
- [ ] `PUT /api/milestones/:id` - 更新里程碑
- [ ] `DELETE /api/milestones/:id` - 删除里程碑
- [ ] `GET /api/projects/:id/timelines` - 时间轴列表
- [ ] `POST /api/projects/:id/timelines` - 创建时间轴
- [ ] `PUT /api/timelines/:id` - 更新时间轴
- [ ] `DELETE /api/timelines/:id` - 删除时间轴
- [ ] `GET /api/timelines/:id/tasks` - 时间轴任务
- [ ] `POST /api/timelines/:id/tasks` - 创建任务
- [ ] `PUT /api/timeline-tasks/:id` - 更新任务
- [ ] `DELETE /api/timeline-tasks/:id` - 删除任务
- [ ] `GET /api/config/holidays` - 节假日配置
- [ ] `POST /api/config/holidays` - 添加节假日

### 6.3 前端组件

- [ ] `ProjectList.tsx` - 项目列表
- [ ] `ProjectCard.tsx` - 项目卡片
- [ ] `ProjectFormDialog.tsx` - 项目表单
- [ ] `ProjectDetailPage.tsx` - 项目详情页
- [ ] `ProjectMemberTab.tsx` - 项目成员Tab
- [ ] `MilestoneTab.tsx` - 里程碑Tab
- [ ] `MilestoneTable.tsx` - 里程碑表格
- [ ] `MilestoneDialog.tsx` - 里程碑对话框
- [ ] `MultiTimelineView.tsx` - 时间线主视图
- [ ] `TimelineList.tsx` - 时间轴列表
- [ ] `TimelineTrack.tsx` - 时间轴轨道
- [ ] `TimelineRuler.tsx` - 时间刻度尺
- [ ] `TimelineTaskBar.tsx` - 任务条（拖拽）
- [ ] `TimelineToolbar.tsx` - 工具栏
- [ ] `TimelineContextMenu.tsx` - 右键菜单

### 6.4 测试用例

- [ ] 项目CRUD测试
- [ ] 项目代号唯一性测试
- [ ] 版本冲突测试
- [ ] 项目成员管理测试
- [ ] 数据隔离测试
- [ ] 里程碑状态测试
- [ ] 时间线拖拽测试
- [ ] 节假日判断测试

---

## 7. 完整性验证

### 7.1 FINAL_REQUIREMENTS 对照

| 需求项 | 原文位置 | 覆盖状态 |
|--------|---------|:--------:|
| 项目CRUD | L156-165 | ✅ |
| 项目字段规格（17个） | L156-165 | ✅ |
| 项目类型（4种） | L156-165 | ✅ |
| 项目成员管理 | L197-204 | ✅ |
| 业务规则（7条） | L286-334 | ✅ |
| 用户场景 | L229-284 | ✅ |
| 里程碑管理 | L206-227 | ✅ |
| 时间线管理 | L807-911 | ✅ |
| 时间线布局规格 | L817-824 | ✅ |
| 时间线增强功能 | L825-834 | ✅ |
| 节假日管理 | L122 | ✅ |
| projects表结构 | L2442-2462 | ✅ |
| milestones表结构 | L215-227 | ✅ |

### 7.2 UI_Requirement 对照

| UI需求项 | 原文位置 | 覆盖状态 |
|----------|---------|:--------:|
| 项目列表展示方式 | 5.1 | ✅ |
| 项目卡片结构 | 5.1 | ✅ |
| 项目表单布局 | 5.1 | ✅ |
| 里程碑列表表格 | 5.1 | ✅ |
| 时间线整体布局 | 5.8 | ✅ |
| 时间线组件清单 | 5.8 | ✅ |
| 时间轴轨道规格 | 5.8 | ✅ |
| 任务条规格 | 5.8 | ✅ |
| 拖拽交互规范 | 5.8 | ✅ |
| 键盘快捷键 | 5.8 | ✅ |
| 节假日管理界面 | 5.3 | ✅ |

### 7.3 数据模型一致性

| 检查项 | 状态 |
|--------|:----:|
| projects表与DATA_MODEL.md一致 | ✅ |
| project_members表与DATA_MODEL.md一致 | ✅ |
| milestones表与DATA_MODEL.md一致 | ✅ |
| timelines表与DATA_MODEL.md一致 | ✅ |
| timeline_tasks表与DATA_MODEL.md一致 | ✅ |

### 7.4 API一致性

| 检查项 | 状态 |
|--------|:----:|
| 项目API与API_SPECIFICATION.md一致 | ✅ |
| 里程碑API与API_SPECIFICATION.md一致 | ✅ |
| 时间线API与API_SPECIFICATION.md一致 | ✅ |
| 节假日API与API_SPECIFICATION.md一致 | ✅ |

---

## 8. 依赖关系

### 8.1 上游依赖

| 模块 | 依赖内容 |
|------|---------|
| 01-auth-permission | 用户认证、权限检查 |
| 02-organization | 成员信息、部门信息 |

### 8.2 下游依赖

| 模块 | 依赖内容 |
|------|---------|
| 04-task | WBS任务属于项目 |
| 05-workflow | 审批流程关联项目任务 |
| 07-analytics | 项目进度报表 |

---

## 相关文档

- [模块需求文档](../../../requirements/modules/REQ_03_project.md)
- [系统架构总览](../SYSTEM_OVERVIEW.md)
- [数据模型设计](../DATA_MODEL.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
