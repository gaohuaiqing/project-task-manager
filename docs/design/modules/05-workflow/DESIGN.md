# 模块设计：工作流模块 (05-workflow)

> **文档版本**: 1.0
> **创建时间**: 2026-03-17
> **状态**: ✅ 完成
> **模块组**: 05-workflow
> **开发顺序**: 5（依赖01-04模块）
> **依赖**: 01-auth-permission, 02-organization, 03-project, 04-task

---

## 1. 快速参考（AI摘要）

### 1.1 模块概述

工作流模块管理任务计划变更的审批流程、延期记录和通知推送。确保任务计划变更得到适当授权，延期情况得到记录和跟踪。

### 1.2 核心功能列表

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 计划变更管理 | P0 | 变更记录、审批触发 |
| 审批流程 | P0 | 提交、审核、通过/驳回 |
| 延期自动判断 | P0 | 每日凌晨自动检测 |
| 延期次数累计 | P0 | 智能累计规则 |
| 延期原因记录 | P1 | 延期原因只能增加 |
| 通知推送 | P1 | WebSocket实时推送 |
| 审批超时处理 | P2 | 7天超时标记 |

### 1.3 关键技术点

- **审批触发**: 工程师修改计划字段触发审批
- **审批人确定**: 从组织架构读取直属主管
- **延期检测**: 每日01:00自动执行
- **智能累计**: 刷新计划后再次超期才+1
- **通知推送**: WebSocket实时推送

---

## 2. 数据模型

### 2.1 相关表结构

本模块涉及2个核心表：

| 表名 | 说明 | 记录来源 |
|------|------|---------|
| plan_changes | 计划变更记录表 | FINAL L1436-1470 |
| delay_records | 延期记录表 | FINAL L1564-1577 |

### 2.2 plan_changes表（计划变更）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| task_id | String(36) | ✅ | - | 关联任务 |
| user_id | Integer | ✅ | - | 申请人ID |
| change_type | String(50) | ✅ | - | 变更类型 |
| old_value | Text | ❌ | NULL | 变更前值（JSON） |
| new_value | Text | ❌ | NULL | 变更后值（JSON） |
| reason | Text | ✅ | - | 变更原因 |
| status | Enum | ✅ | 'pending' | 状态 |
| approver_id | Integer | ❌ | NULL | 审批人ID |
| approved_at | Timestamp | ❌ | NULL | 审批时间 |
| rejection_reason | Text | ❌ | NULL | 驳回原因 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |

**索引**:
```sql
CREATE INDEX idx_changes_task ON plan_changes(task_id);
CREATE INDEX idx_changes_user ON plan_changes(user_id);
CREATE INDEX idx_changes_status ON plan_changes(status);
CREATE INDEX idx_changes_created ON plan_changes(created_at);
```

**变更状态枚举**:
```typescript
type ChangeStatus =
  | 'pending'   // 待审批
  | 'approved'  // 已通过
  | 'rejected'; // 已驳回
```

**变更类型枚举**:
```typescript
type ChangeType =
  | 'start_date'    // 开始日期
  | 'end_date'      // 结束日期
  | 'duration'      // 工期
  | 'predecessor'   // 前置任务
  | 'lag_days';     // 提前/落后天数
```

### 2.3 delay_records表（延期记录）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| task_id | String(36) | ✅ | - | 关联任务 |
| delay_days | Integer | ✅ | - | 延期天数 |
| reason | Text | ✅ | - | 延期原因 |
| recorded_by | Integer | ✅ | - | 记录人ID |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |

**索引**:
```sql
CREATE INDEX idx_delays_task ON delay_records(task_id);
CREATE INDEX idx_delays_created ON delay_records(created_at);
```

---

## 3. 核心业务规则

### 3.1 审批触发规则

**来源**: FINAL L1146-1158

```typescript
// 需要审批的字段
const APPROVAL_FIELDS = [
  'start_date',
  'end_date',
  'duration',
  'predecessor_id',
  'lag_days'
];

// 审批触发判断
function shouldTriggerApproval(
  userRole: UserRole,
  changes: Partial<Task>
): boolean {
  // 技术经理和管理员直接生效
  if (userRole === 'admin' || userRole === 'tech_manager') {
    return false;
  }

  // 工程师修改计划字段需要审批
  return APPROVAL_FIELDS.some(field => field in changes);
}
```

### 3.2 审批人确定规则

**来源**: FINAL L1159-1168

```typescript
async function getApprover(userId: number, taskId: string): Promise<number> {
  // 1. 获取用户的直属主管
  const user = await db.users.findById(userId);
  const department = await db.departments.findById(user.department_id);

  if (department.manager_id) {
    return department.manager_id;
  }

  // 2. 如果没有设置主管，默认为技术经理
  const techManager = await db.users.findOne({
    where: { role: 'tech_manager', department_id: user.department_id }
  });

  if (techManager) {
    return techManager.id;
  }

  // 3. 最后回退到系统管理员
  const admin = await db.users.findOne({ where: { role: 'admin' } });
  return admin.id;
}
```

### 3.3 延期自动判断规则

**来源**: FINAL L1522-1562

```typescript
// 每日凌晨1点执行
async function checkDelayedTasks(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 查找所有超期未完成的任务
  const delayedTasks = await db.wbs_tasks.find({
    where: {
      end_date: { $lt: today },
      actual_end_date: null,
      status: { $notIn: ['early_completed', 'on_time_completed', 'overdue_completed'] }
    }
  });

  for (const task of delayedTasks) {
    // 更新状态为"已延迟"
    await db.wbs_tasks.update(task.id, {
      status: 'delayed'
    });

    // 检查是否需要累计延期次数
    await updateDelayCount(task);
  }
}

// 智能累计延期次数
async function updateDelayCount(task: Task): Promise<void> {
  const lastChange = await db.plan_changes.findOne({
    where: { task_id: task.id, status: 'approved' },
    order: { created_at: 'DESC' }
  });

  // 如果自上次刷新计划后首次超期，计数+1
  if (lastChange && task.delay_count === 0) {
    await db.wbs_tasks.update(task.id, {
      delay_count: task.delay_count + 1
    });
  }
}
```

### 3.4 审批有效期规则

**来源**: FINAL L1169-1179

```typescript
const APPROVAL_TIMEOUT_DAYS = 7;

async function checkApprovalTimeout(): Promise<void> {
  const timeoutDate = new Date();
  timeoutDate.setDate(timeoutDate.getDate() - APPROVAL_TIMEOUT_DAYS);

  // 查找超时的待审批记录
  const timeoutApprovals = await db.plan_changes.find({
    where: {
      status: 'pending',
      created_at: { $lt: timeoutDate }
    }
  });

  for (const approval of timeoutApprovals) {
    // 标记超时（状态不变，但前端高亮显示）
    await db.plan_changes.update(approval.id, {
      is_timeout: true
    });
  }
}
```

---

## 4. API定义

### 4.1 审批流程API

**来源**: API_SPECIFICATION L273-279

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/approvals | 获取审批列表 | TASK_VIEW |
| GET | /api/approvals/pending | 获取待审批列表 | TASK_VIEW |
| POST | /api/approvals/:id/approve | 通过审批 | TASK_EDIT |
| POST | /api/approvals/:id/reject | 驳回审批 | TASK_EDIT |

#### 4.1.1 GET /api/approvals

**查询参数**:
```typescript
interface ApprovalListQuery {
  page?: number;
  pageSize?: number;
  status?: ChangeStatus;      // 状态筛选
  type?: 'my_pending' | 'my_submitted'; // 我的待审批/我发起的
  project_id?: string;
  keyword?: string;
}
```

**响应**:
```typescript
interface ApprovalListResponse {
  data: ApprovalItem[];
  pagination: PaginationInfo;
  stats: {
    total: number;
    pending: number;
    timeout: number;
  };
}

interface ApprovalItem {
  id: string;
  task_id: string;
  task_description: string;
  task_wbs_code: string;
  project_name: string;
  user_id: number;
  user_name: string;
  change_type: ChangeType;
  old_value: any;
  new_value: any;
  reason: string;
  status: ChangeStatus;
  approver_id: number | null;
  approver_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  is_timeout: boolean;
  days_pending: number;
}
```

#### 4.1.2 POST /api/approvals/:id/approve

**请求**:
```typescript
interface ApproveRequest {
  // 无需额外参数
}
```

**响应**:
```typescript
interface ApproveResponse {
  data: {
    approval_id: string;
    task_id: string;
    new_status: TaskStatus;
  };
  message: string;
}
```

**业务逻辑**:
1. 验证当前用户是审批人
2. 验证审批状态为pending
3. 更新任务计划字段
4. 更新plan_changes状态
5. 任务状态改为not_started或in_progress
6. 计划调整次数+1
7. 发送通知给申请人
8. 记录审计日志

#### 4.1.3 POST /api/approvals/:id/reject

**请求**:
```typescript
interface RejectRequest {
  rejection_reason: string; // 必填
}
```

**响应**:
```typescript
interface RejectResponse {
  data: {
    approval_id: string;
    task_id: string;
  };
  message: string;
}
```

### 4.2 计划变更API

**来源**: API_SPECIFICATION L267-269

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/wbs-tasks/:id/changes | 获取任务变更历史 | TASK_VIEW |
| POST | /api/wbs-tasks/:id/changes | 提交计划变更 | TASK_EDIT |

#### 4.2.1 GET /api/wbs-tasks/:id/changes

**响应**:
```typescript
interface TaskChangesResponse {
  data: TaskChange[];
}

interface TaskChange {
  id: string;
  change_type: ChangeType;
  old_value: any;
  new_value: any;
  reason: string;
  status: ChangeStatus;
  user_id: number;
  user_name: string;
  approver_id: number | null;
  approver_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}
```

### 4.3 延期记录API

**来源**: API_SPECIFICATION L269-270

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/wbs-tasks/:id/delays | 获取任务延期记录 | TASK_VIEW |
| POST | /api/wbs-tasks/:id/delays | 添加延期原因 | TASK_EDIT |

#### 4.3.1 POST /api/wbs-tasks/:id/delays

**请求**:
```typescript
interface AddDelayRequest {
  reason: string; // 必填
}
```

**业务逻辑**:
1. 计算当前延期天数
2. 创建延期记录
3. 记录只能增加，不能删除

---

## 5. 组件设计

### 5.1 前端组件结构

```
src/components/workflow/
├── ApprovalList.tsx            # 审批列表页面
├── ApprovalCard.tsx            # 审批卡片
├── ApprovalDetailDialog.tsx    # 审批详情对话框
├── ChangeHistoryDialog.tsx     # 变更历史对话框
├── DelayHistoryDialog.tsx      # 延期历史对话框
├── AddDelayDialog.tsx          # 添加延期原因对话框
├── ApprovalStatsBar.tsx        # 审批统计栏
└── hooks/
    ├── useApprovals.ts         # 审批管理Hook
    └── useDelayRecords.ts      # 延期记录Hook
```

### 5.2 审批列表组件

```tsx
// ApprovalList.tsx
const ApprovalList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'my_pending' | 'my_submitted'>('my_pending');
  const { data: approvals, isLoading } = useApprovals({ type: activeTab });

  return (
    <div className="space-y-4">
      {/* 统计栏 */}
      <ApprovalStatsBar stats={approvals?.stats} />

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my_pending">
            待我审批
            {approvals?.stats.pending > 0 && (
              <Badge className="ml-2">{approvals.stats.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my_submitted">我发起的</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 审批列表 */}
      <div className="space-y-3">
        {approvals?.data.map(approval => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
};
```

### 5.3 审批卡片组件

```tsx
// ApprovalCard.tsx
interface ApprovalCardProps {
  approval: ApprovalItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onApprove,
  onReject
}) => {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  return (
    <Card className={cn(
      "transition-all",
      approval.is_timeout && "border-red-300 bg-red-50"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{approval.task_wbs_code}</Badge>
            <span className="font-medium">{approval.user_name}</span>
            <span className="text-muted-foreground">申请修改</span>
            <Badge>{getChangeTypeLabel(approval.change_type)}</Badge>
          </div>
          {approval.is_timeout && (
            <Badge variant="destructive">超时 {approval.days_pending} 天</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <span className="font-medium">{approval.task_description}</span>
        </div>

        {/* 变更对比 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1 p-2 bg-red-50 rounded">
            <span className="text-muted-foreground">原值：</span>
            <span>{formatValue(approval.old_value)}</span>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 p-2 bg-green-50 rounded">
            <span className="text-muted-foreground">新值：</span>
            <span>{formatValue(approval.new_value)}</span>
          </div>
        </div>

        {/* 变更原因 */}
        <div className="text-sm text-muted-foreground">
          变更原因：{approval.reason}
        </div>

        {/* 操作按钮 */}
        {approval.status === 'pending' && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(true)}>
              驳回
            </Button>
            <Button onClick={() => onApprove(approval.id)}>
              通过
            </Button>
          </div>
        )}

        {/* 已处理状态 */}
        {approval.status !== 'pending' && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <Badge variant={approval.status === 'approved' ? 'success' : 'destructive'}>
              {approval.status === 'approved' ? '已通过' : '已驳回'}
            </Badge>
            <span className="text-muted-foreground">
              {approval.approver_name} · {approval.approved_at}
            </span>
          </div>
        )}
      </CardContent>

      <RejectDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={(reason) => {
          onReject(approval.id);
          setRejectDialogOpen(false);
        }}
      />
    </Card>
  );
};
```

### 5.4 延期历史对话框

```tsx
// DelayHistoryDialog.tsx
interface DelayHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
}

const DelayHistoryDialog: React.FC<DelayHistoryDialogProps> = ({
  open,
  onClose,
  taskId
}) => {
  const { data: delays } = useDelayRecords(taskId);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>延期历史</DialogTitle>
      <DialogContent>
        <div className="space-y-3">
          {delays?.map((delay, index) => (
            <div
              key={delay.id}
              className="flex items-start gap-3 p-3 bg-muted rounded-lg"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-sm font-medium text-orange-600">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{delay.delay_days}天</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">
                    {delay.created_at}
                  </span>
                </div>
                <p className="text-sm mt-1">{delay.reason}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  记录人：{delay.recorder_name}
                </div>
              </div>
            </div>
          ))}

          {delays?.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              暂无延期记录
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="outline" onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

## 6. 定时任务

### 6.1 延期检测任务

```typescript
// scheduled/delayCheck.ts
import { CronJob } from 'cron';

// 每日凌晨1点执行
export const delayCheckJob = new CronJob(
  '0 1 * * *',
  async () => {
    console.log('[定时任务] 开始检查延期任务...');

    try {
      await checkDelayedTasks();
      console.log('[定时任务] 延期任务检查完成');
    } catch (error) {
      console.error('[定时任务] 延期任务检查失败:', error);
    }
  },
  null,
  true,
  'Asia/Shanghai'
);
```

### 6.2 审批超时检查任务

```typescript
// scheduled/approvalTimeout.ts

// 每小时执行一次
export const approvalTimeoutJob = new CronJob(
  '0 * * * *',
  async () => {
    console.log('[定时任务] 开始检查审批超时...');

    try {
      await checkApprovalTimeout();
      console.log('[定时任务] 审批超时检查完成');
    } catch (error) {
      console.error('[定时任务] 审批超时检查失败:', error);
    }
  },
  null,
  true,
  'Asia/Shanghai'
);
```

---

## 7. 通知系统

### 7.1 通知类型

| 类型 | 触发条件 | 接收人 | 推送方式 |
|------|----------|--------|----------|
| APPROVAL_REQUEST | 工程师提交变更 | 审批人 | WebSocket |
| APPROVAL_APPROVED | 审批通过 | 申请人 | WebSocket |
| APPROVAL_REJECTED | 审批驳回 | 申请人 | WebSocket |
| TASK_DELAYED | 任务延期 | 负责人、项目经理 | WebSocket |
| DELAY_REMINDER | 延期每7天提醒 | 负责人、项目经理 | WebSocket |

### 7.2 WebSocket消息格式

```typescript
interface NotificationMessage {
  type: NotificationType;
  title: string;
  content: string;
  data: {
    task_id?: string;
    approval_id?: string;
    project_id?: string;
  };
  created_at: string;
}
```

---

## 8. 开发检查清单

### 8.1 数据库迁移

- [ ] 创建 `023-create-plan-changes-table.ts`
- [ ] 创建 `024-create-delay-records-table.ts`

### 8.2 后端API实现

- [ ] `GET /api/approvals` - 审批列表
- [ ] `GET /api/approvals/pending` - 待审批列表
- [ ] `POST /api/approvals/:id/approve` - 通过审批
- [ ] `POST /api/approvals/:id/reject` - 驳回审批
- [ ] `GET /api/wbs-tasks/:id/changes` - 变更历史
- [ ] `POST /api/wbs-tasks/:id/changes` - 提交变更
- [ ] `GET /api/wbs-tasks/:id/delays` - 延期记录
- [ ] `POST /api/wbs-tasks/:id/delays` - 添加延期原因
- [ ] 审批触发中间件
- [ ] 审批人确定服务
- [ ] 延期检测定时任务
- [ ] 审批超时定时任务

### 8.3 前端组件

- [ ] `ApprovalList.tsx` - 审批列表
- [ ] `ApprovalCard.tsx` - 审批卡片
- [ ] `ApprovalDetailDialog.tsx` - 审批详情
- [ ] `ChangeHistoryDialog.tsx` - 变更历史
- [ ] `DelayHistoryDialog.tsx` - 延期历史
- [ ] `AddDelayDialog.tsx` - 添加延期原因
- [ ] `ApprovalStatsBar.tsx` - 统计栏

### 8.4 测试用例

- [ ] 审批触发测试（工程师/技术经理）
- [ ] 审批通过测试
- [ ] 审批驳回测试
- [ ] 审批超时测试
- [ ] 延期检测测试
- [ ] 延期次数累计测试
- [ ] 通知推送测试

---

## 9. 完整性验证

### 9.1 FINAL_REQUIREMENTS 对照

| 需求项 | 原文位置 | 覆盖状态 |
|--------|---------|:--------:|
| 审批触发规则 | L1146-1158 | ✅ |
| 审批人确定 | L1159-1168 | ✅ |
| 审批有效期 | L1169-1179 | ✅ |
| 审批通过生效 | L1180-1191 | ✅ |
| 审批驳回处理 | L1192-1203 | ✅ |
| 变更记录规则 | L1436-1470 | ✅ |
| 延期自动判断 | L1522-1562 | ✅ |
| 延期次数累计 | L1522-1562 | ✅ |
| 延期原因记录 | L1564-1577 | ✅ |
| 延期通知规则 | L1606-1621 | ✅ |

### 9.2 数据模型一致性

| 检查项 | 状态 |
|--------|:----:|
| plan_changes表与DATA_MODEL.md一致 | ✅ |
| delay_records表与DATA_MODEL.md一致 | ✅ |

### 9.3 API一致性

| 检查项 | 状态 |
|--------|:----:|
| 审批API与API_SPECIFICATION.md一致 | ✅ |
| 变更API与API_SPECIFICATION.md一致 | ✅ |

---

## 相关文档

- [模块需求文档](../../../requirements/modules/REQ_05_workflow.md)
- [系统架构总览](../SYSTEM_OVERVIEW.md)
- [数据模型设计](../DATA_MODEL.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
