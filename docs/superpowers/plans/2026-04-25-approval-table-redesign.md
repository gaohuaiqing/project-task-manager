# 审批管理表格化重设计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将审批管理页面从卡片式重构为表格化，支持多变更合并显示、列宽可调节、新增申请人筛选。

**Architecture:** 后端新增 `submission_id` 字段将同一次提交的多个变更分组，新增 `/approval-items` 分组查询接口和整体审批接口。前端使用表格组件替换卡片式布局，新增详情弹窗和列宽拖拽功能。

**Tech Stack:** React, TypeScript, shadcn/ui, React Query, Express, MySQL

---

## 文件结构

```
app/server/src/
├── migrations/
│   └── 049-add-submission-id-to-plan-changes.ts   # 新增
├── modules/workflow/
│   ├── types.ts                    # 修改：新增 ApprovalItem 类型
│   ├── repository.ts               # 修改：新增分组查询方法
│   ├── service.ts                  # 修改：新增分组查询和整体审批方法
│   └── routes.ts                   # 修改：新增 approval-items 路由

app/src/
├── lib/api/
│   └── workflow.api.ts             # 修改：新增 ApprovalItem 类型和 API
├── features/settings/
│   ├── pages/Approvals.tsx         # 重构：表格化布局
│   ├── hooks/useApprovals.ts       # 修改：新增分组查询 hooks
│   └── components/
│       ├── ApprovalsTable.tsx      # 新增：表格组件
│       ├── ApprovalTableRow.tsx    # 新增：表格行组件
│       ├── ApprovalDetailDialog.tsx # 新增：详情弹窗
│       └── RejectionReasonDialog.tsx # 复用：驳回弹窗
```

---

### Task 1: 数据库迁移 - 新增 submission_id 字段

**Files:**
- Create: `app/server/src/migrations/049-add-submission-id-to-plan-changes.ts`

- [ ] **Step 1: 创建迁移文件**

```typescript
// app/server/src/migrations/049-add-submission-id-to-plan-changes.ts
import type { Migration } from './migration-utils';

export const migration: Migration = {
  id: '049-add-submission-id-to-plan-changes',
  description: '为 plan_changes 表新增 submission_id 字段用于分组同一次提交的变更',
  
  async up(pool) {
    // 1. 新增 submission_id 字段，默认值使用 UUID()
    await pool.execute(`
      ALTER TABLE plan_changes 
      ADD COLUMN submission_id CHAR(36) NOT NULL DEFAULT(UUID())
    `);
    
    // 2. 新增索引
    await pool.execute(`
      CREATE INDEX idx_plan_changes_submission_id ON plan_changes(submission_id)
    `);
    
    // 3. 历史数据：将每条记录的 submission_id 设为其 id（单独成组）
    await pool.execute(`
      UPDATE plan_changes SET submission_id = id WHERE submission_id = UUID()
    `);
  },
  
  async down(pool) {
    await pool.execute(`DROP INDEX idx_plan_changes_submission_id ON plan_changes`);
    await pool.execute(`ALTER TABLE plan_changes DROP COLUMN submission_id`);
  },
};
```

- [ ] **Step 2: 注册迁移文件**

Modify: `app/server/src/migrations/run-migration.ts`（在导入区域添加）

```typescript
// 在其他迁移导入后添加
import { migration as migration049 } from './049-add-submission-id-to-plan-changes';

// 在 migrations 数组末尾添加
migration049,
```

- [ ] **Step 3: 运行迁移测试**

```bash
cd app/server && npm run migrate
```

Expected: 迁移成功，无错误

- [ ] **Step 4: 验证数据库结构**

```bash
mysql -u root -p -e "DESCRIBE plan_changes;"
```

Expected: 看到 `submission_id` 列，类型 `CHAR(36)`，有索引

- [ ] **Step 5: 提交**

```bash
git add app/server/src/migrations/049-add-submission-id-to-plan-changes.ts app/server/src/migrations/run-migration.ts
git commit -m "feat(workflow): add submission_id to plan_changes for grouping changes"
```

---

### Task 2: 后端类型定义 - ApprovalItem

**Files:**
- Modify: `app/server/src/modules/workflow/types.ts`

- [ ] **Step 1: 新增 ApprovalItem 类型和变更接口**

Modify: `app/server/src/modules/workflow/types.ts`（在文件末尾添加）

```typescript
// ============ 审批项分组类型 ============

export interface ApprovalChange {
  id: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
}

export interface ApprovalItem {
  submissionId: string;
  taskId: string;
  taskDescription: string;
  projectName: string;
  userId: number;
  userName: string;
  reason: string;
  status: ApprovalStatus;
  approverId: number | null;
  approverName: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  changes: ApprovalChange[];
}

export interface ApprovalItemsQueryOptions {
  status?: ApprovalStatus;
  projectId?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}

export interface ApprovalItemsResponse {
  items: ApprovalItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

- [ ] **Step 2: 验证类型编译**

```bash
cd app/server && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add app/server/src/modules/workflow/types.ts
git commit -m "feat(workflow): add ApprovalItem types for grouped approval queries"
```

---

### Task 3: 后端 Repository - 分组查询方法

**Files:**
- Modify: `app/server/src/modules/workflow/repository.ts`

- [ ] **Step 1: 新增 getApprovalItems 方法**

Modify: `app/server/src/modules/workflow/repository.ts`（在 `getPlanChanges` 方法后添加）

```typescript
// 在 imports 区域添加
import type { ApprovalItem, ApprovalChange, ApprovalItemsQueryOptions } from './types';

// 在 WorkflowRepository 类中添加方法
/**
 * 获取分组后的审批项列表
 * 将同一次提交（相同 submission_id）的多个变更合并为一项
 */
async getApprovalItems(options?: ApprovalItemsQueryOptions): Promise<{ items: ApprovalItem[]; total: number }> {
  const pool = getPool();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.status) {
    conditions.push('pc.status = ?');
    params.push(options.status);
  }
  if (options?.projectId) {
    conditions.push('t.project_id = ?');
    params.push(options.projectId);
  }
  if (options?.userId) {
    conditions.push('pc.user_id = ?');
    params.push(options.userId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1. 获取分组统计（用于分页）
  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT pc.submission_id) as total 
     FROM plan_changes pc
     LEFT JOIN wbs_tasks t ON pc.task_id = t.id
     ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // 2. 获取分组列表（每个 submission 的第一条记录作为基础信息）
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // 先获取 submission_id 列表，带分页
  const [submissionRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT pc.submission_id,
            (SELECT MIN(created_at) FROM plan_changes WHERE submission_id = pc.submission_id) as earliest_created_at
     FROM plan_changes pc
     LEFT JOIN wbs_tasks t ON pc.task_id = t.id
     ${whereClause}
     ORDER BY earliest_created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  if (submissionRows.length === 0) {
    return { items: [], total };
  }

  const submissionIds = submissionRows.map(r => r.submission_id);

  // 3. 获取这些 submission 的所有详细信息
  const placeholders = submissionIds.map(() => '?').join(',');
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT pc.*,
            t.description as task_description,
            p.name as project_name,
            u.real_name as user_name,
            a.real_name as approver_name
     FROM plan_changes pc
     LEFT JOIN wbs_tasks t ON pc.task_id = t.id
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u ON pc.user_id = u.id
     LEFT JOIN users a ON pc.approver_id = a.id
     WHERE pc.submission_id IN (${placeholders})
     ORDER BY pc.created_at ASC`,
    submissionIds
  );

  // 4. 按 submission_id 分组
  const grouped = new Map<string, ApprovalItem>();
  for (const row of rows) {
    const submissionId = row.submission_id;
    
    if (!grouped.has(submissionId)) {
      // 取第一条记录作为基础信息
      grouped.set(submissionId, {
        submissionId,
        taskId: row.task_id,
        taskDescription: row.task_description || '',
        projectName: row.project_name || '',
        userId: row.user_id,
        userName: row.user_name || '',
        reason: row.reason,
        status: row.status,
        approverId: row.approver_id,
        approverName: row.approver_name,
        approvedAt: row.approved_at,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        changes: [],
      });
    }

    // 添加变更项
    const item = grouped.get(submissionId)!;
    item.changes.push({
      id: row.id,
      change_type: row.change_type,
      old_value: row.old_value,
      new_value: row.new_value,
    });

    // 更新状态为最严格的状态（pending > timeout > rejected > approved）
    const statusPriority: Record<string, number> = {
      pending: 4,
      timeout: 3,
      rejected: 2,
      approved: 1,
    };
    if (statusPriority[row.status] > statusPriority[item.status]) {
      item.status = row.status;
    }
  }

  // 5. 按原始顺序返回
  const items = submissionIds
    .filter(id => grouped.has(id))
    .map(id => grouped.get(id)!);

  return { items, total };
}

/**
 * 批量更新整个 submission 的审批状态
 */
async approveSubmission(
  submissionId: string,
  approverId: number,
  approved: boolean,
  rejectionReason?: string
): Promise<{ taskId: string; changes: Array<{ changeType: string; newValue: string | null }> }> {
  const pool = getPool();
  
  // 获取该 submission 的所有变更
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM plan_changes WHERE submission_id = ?`,
    [submissionId]
  );

  if (rows.length === 0) {
    throw new Error('submission not found');
  }

  const status: ApprovalStatus = approved ? 'approved' : 'rejected';
  const now = new Date();

  // 批量更新状态
  await pool.execute(
    `UPDATE plan_changes 
     SET status = ?, approver_id = ?, approved_at = ?, rejection_reason = ?
     WHERE submission_id = ?`,
    [status, approverId, now, rejectionReason || null, submissionId]
  );

  return {
    taskId: rows[0].task_id,
    changes: rows.map(r => ({
      changeType: r.change_type,
      newValue: r.new_value,
    })),
  };
}

/**
 * 按 submission_id 获取审批项详情
 */
async getApprovalItemBySubmissionId(submissionId: string): Promise<ApprovalItem | null> {
  const pool = getPool();
  
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT pc.*,
            t.description as task_description,
            p.name as project_name,
            u.real_name as user_name,
            a.real_name as approver_name
     FROM plan_changes pc
     LEFT JOIN wbs_tasks t ON pc.task_id = t.id
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u ON pc.user_id = u.id
     LEFT JOIN users a ON pc.approver_id = a.id
     WHERE pc.submission_id = ?
     ORDER BY pc.created_at ASC`,
    [submissionId]
  );

  if (rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];
  return {
    submissionId: firstRow.submission_id,
    taskId: firstRow.task_id,
    taskDescription: firstRow.task_description || '',
    projectName: firstRow.project_name || '',
    userId: firstRow.user_id,
    userName: firstRow.user_name || '',
    reason: firstRow.reason,
    status: firstRow.status,
    approverId: firstRow.approver_id,
    approverName: firstRow.approver_name,
    approvedAt: firstRow.approved_at,
    rejectionReason: firstRow.rejection_reason,
    createdAt: rows[0].created_at,
    changes: rows.map(r => ({
      id: r.id,
      change_type: r.change_type,
      old_value: r.old_value,
      new_value: r.new_value,
    })),
  };
}
```

- [ ] **Step 2: 验证编译**

```bash
cd app/server && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add app/server/src/modules/workflow/repository.ts
git commit -m "feat(workflow): add approval items grouping query methods"
```

---

### Task 4: 后端 Service - 分组查询和整体审批

**Files:**
- Modify: `app/server/src/modules/workflow/service.ts`

- [ ] **Step 1: 新增 getApprovalItems 方法**

Modify: `app/server/src/modules/workflow/service.ts`（在 imports 区域添加 ApprovalItem 等类型，在类中添加方法）

```typescript
// 在 imports 区域添加
import type { PlanChange, DelayRecord, Notification, ApprovalStatus, CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest, CreateNotificationRequest, ApprovalItem, ApprovalItemsQueryOptions, ApprovalItemsResponse } from './types';

// 在 WorkflowService 类中添加方法
/**
 * 获取分组后的审批项列表
 */
async getApprovalItems(options?: ApprovalItemsQueryOptions): Promise<ApprovalItemsResponse> {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const { items, total } = await this.repo.getApprovalItems(options);
  const totalPages = Math.ceil(total / pageSize);
  return { items, total, page, pageSize, totalPages };
}

/**
 * 审批整个 submission（通过或驳回）
 */
async approveSubmission(
  submissionId: string,
  data: ApprovalDecisionRequest,
  currentUser: User
): Promise<void> {
  // 获取 submission 详情
  const item = await this.repo.getApprovalItemBySubmissionId(submissionId);
  if (!item) {
    throw new ValidationError('审批请求不存在');
  }

  if (item.status !== 'pending') {
    throw new ValidationError('该审批请求已处理');
  }

  // 验证审批权限（复用现有逻辑）
  const firstChange = await this.repo.getPlanChangeById(item.changes[0].id);
  if (!firstChange || !await this.canApprove(firstChange, currentUser)) {
    throw new ForbiddenError('无权限审批此变更');
  }

  // XSS 防护：消毒驳回原因
  if (data.rejection_reason) {
    data.rejection_reason = sanitizeString(data.rejection_reason, 1000);
  }

  // 批量更新状态
  const result = await this.repo.approveSubmission(
    submissionId,
    currentUser.id,
    data.approved,
    data.rejection_reason
  );

  if (data.approved) {
    // ========== 审批通过 ==========
    // 1. 应用所有变更到任务
    const updates: Record<string, string | number | null> = {};
    for (const change of item.changes) {
      updates[change.change_type] = change.new_value;
    }
    await this.repo.updateTaskFields(item.taskId, updates);

    // 2. 清除待审批数据
    await this.repo.clearPendingChanges(item.taskId);

    // 3. 重新计算任务状态
    const approvedTask = await this.repo.getTaskWithDates(item.taskId);
    if (approvedTask) {
      const newStatus = TaskService.calculateStatus(approvedTask);
      await this.repo.updateTaskStatus(item.taskId, newStatus);
    }

    // 4. 发送通知
    await this.sendNotification(
      item.userId,
      'approval_result',
      '变更审批通过',
      `您的变更请求已通过审批`,
      `/tasks/${item.taskId}`,
      (await this.repo.getTaskById(item.taskId))?.project_id,
      item.taskId
    );

    // 5. 发出事件
    taskEvents.emit(TaskEventType.PLAN_CHANGE_APPROVED, {
      planChangeId: submissionId,
      taskId: item.taskId,
      approverId: currentUser.id,
      changes: item.changes.map(c => ({
        field: c.change_type,
        value: c.new_value,
      })),
      alreadyApplied: true,
    } as TaskPlanChangeApprovedEvent);
  } else {
    // ========== 审批驳回 ==========
    // 1. 清除待审批数据
    await this.repo.clearPendingChanges(item.taskId);

    // 2. 重新计算任务状态
    const rejectedTask = await this.repo.getTaskWithDates(item.taskId);
    if (rejectedTask) {
      const newStatus = TaskService.calculateStatus(rejectedTask);
      await this.repo.updateTaskStatus(item.taskId, newStatus);
    }

    // 3. 发送通知
    await this.sendNotification(
      item.userId,
      'approval_result',
      '变更审批驳回',
      `您的变更请求已被驳回：${data.rejection_reason || '无原因'}`,
      `/tasks/${item.taskId}`,
      (await this.repo.getTaskById(item.taskId))?.project_id,
      item.taskId
    );
  }
}

/**
 * 按 submission_id 获取审批项详情
 */
async getApprovalItemBySubmissionId(submissionId: string): Promise<ApprovalItem | null> {
  return this.repo.getApprovalItemBySubmissionId(submissionId);
}
```

- [ ] **Step 2: 验证编译**

```bash
cd app/server && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add app/server/src/modules/workflow/service.ts
git commit -m "feat(workflow): add approval items service methods"
```

---

### Task 5: 后端 Routes - 新增 approval-items 路由

**Files:**
- Modify: `app/server/src/modules/workflow/routes.ts`

- [ ] **Step 1: 新增 approval-items 路由**

Modify: `app/server/src/modules/workflow/routes.ts`（在 imports 区域添加类型，在路由区域添加新路由）

```typescript
// 在 imports 区域添加
import type { CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest, ApprovalItemsQueryOptions } from './types';

// 在现有路由后添加（在通知管理之前）
// ========== 审批项分组管理 ==========

// 获取分组后的审批项列表
router.get('/approval-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options: ApprovalItemsQueryOptions = {
      status: req.query.status as any,
      projectId: req.query.projectId as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    };
    const result = await workflowService.getApprovalItems(options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 获取审批项详情
router.get('/approval-items/:submissionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await workflowService.getApprovalItemBySubmissionId(req.params.submissionId);
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '审批请求不存在' } });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// 通过审批项
router.post('/approval-items/:submissionId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const data: ApprovalDecisionRequest = {
      approved: true,
      rejection_reason: req.body.rejection_reason,
    };
    await workflowService.approveSubmission(req.params.submissionId, data, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 驳回审批项
router.post('/approval-items/:submissionId/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const rejectionReason = req.body.rejection_reason?.trim();
    if (!rejectionReason || rejectionReason.length < 2) {
      throw new ValidationError('驳回原因不能为空且至少2个字符');
    }
    if (rejectionReason.length > 500) {
      throw new ValidationError('驳回原因不能超过500个字符');
    }
    const data: ApprovalDecisionRequest = {
      approved: false,
      rejection_reason: rejectionReason,
    };
    await workflowService.approveSubmission(req.params.submissionId, data, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: 验证编译并启动服务**

```bash
cd app/server && npx tsc --noEmit && npm run dev
```

Expected: 服务启动成功，路由注册

- [ ] **Step 3: 提交**

```bash
git add app/server/src/modules/workflow/routes.ts
git commit -m "feat(workflow): add approval-items API routes"
```

---

### Task 6: 前端 API - 类型和方法

**Files:**
- Modify: `app/src/lib/api/workflow.api.ts`

- [ ] **Step 1: 新增 ApprovalItem 类型**

Modify: `app/src/lib/api/workflow.api.ts`（在现有类型定义后添加）

```typescript
// ============ 审批项分组类型 ============

export interface ApprovalChange {
  id: string;
  changeType: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface ApprovalItem {
  submissionId: string;
  taskId: string;
  taskDescription: string;
  projectName: string;
  userId: number;
  userName: string;
  reason: string;
  status: ApprovalStatus;
  approverId: number | null;
  approverName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  changes: ApprovalChange[];
}

export interface ApprovalItemsResponse {
  items: ApprovalItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

- [ ] **Step 2: 新增 API 方法**

Modify: `app/src/lib/api/workflow.api.ts`（在现有 API 方法后添加）

```typescript
/**
 * 获取分组后的审批项列表
 */
export async function getApprovalItems(options?: {
  status?: ApprovalStatus;
  projectId?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}): Promise<ApprovalItemsResponse> {
  const response = await apiClient.get<ApiResponse<ApprovalItemsResponse>>(
    `${BASE_PATH}/approval-items`,
    { params: options }
  );
  return response.data;
}

/**
 * 获取审批项详情
 */
export async function getApprovalItemBySubmissionId(submissionId: string): Promise<ApprovalItem | null> {
  const response = await apiClient.get<ApiResponse<ApprovalItem>>(
    `${BASE_PATH}/approval-items/${submissionId}`
  );
  return response.data;
}

/**
 * 通过审批项
 */
export async function approveApprovalItem(submissionId: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/approval-items/${submissionId}/approve`);
}

/**
 * 驳回审批项
 */
export async function rejectApprovalItem(submissionId: string, rejectionReason: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/approval-items/${submissionId}/reject`, {
    rejection_reason: rejectionReason,
  });
}
```

- [ ] **Step 3: 导出新类型和方法**

Modify: `app/src/lib/api/workflow.api.ts`（在 workflowApi 对象中添加新方法）

```typescript
export const workflowApi = {
  getDelayRecords,
  addDelayRecord,
  getPlanChangesByTask,
  getPlanChanges,
  getPlanChangeById,
  approvePlanChange,
  rejectPlanChange,
  getPendingApprovals,
  getMyApprovals,
  submitDelayRequest,
  submitReassignRequest,
  approveRequest,
  rejectRequest,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  // 新增方法
  getApprovalItems,
  getApprovalItemBySubmissionId,
  approveApprovalItem,
  rejectApprovalItem,
};
```

- [ ] **Step 4: 验证编译**

```bash
cd app/src && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 5: 提交**

```bash
git add app/src/lib/api/workflow.api.ts
git commit -m "feat(api): add ApprovalItem types and API methods"
```

---

### Task 7: 前端 Hooks - 分组查询 hooks

**Files:**
- Modify: `app/src/features/settings/hooks/useApprovals.ts`

- [ ] **Step 1: 新增分组查询 hooks**

Modify: `app/src/features/settings/hooks/useApprovals.ts`（在 imports 区域添加新类型，添加新 hooks）

```typescript
// 在 imports 区域添加
import {
  getPendingApprovals,
  getPlanChanges,
  approvePlanChange,
  rejectPlanChange,
  getApprovalItems,
  approveApprovalItem,
  rejectApprovalItem,
  type ApprovalStatus,
  type ApprovalItem,
} from '@/lib/api/workflow.api';

// 新增：获取分组后的审批项列表
export function useApprovalItems(options?: {
  status?: ApprovalStatus;
  projectId?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [...queryKeys.workflow.approvals, 'items', options],
    queryFn: () => getApprovalItems(options),
    staleTime: 30 * 1000,
  });
}

// 新增：通过审批项
export function useApproveApprovalItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submissionId: string) => approveApprovalItem(submissionId),
    onSuccess: () => {
      toast.success('审批通过', { description: '已通过该变更申请' });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.pendingApprovals });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
    onError: (error: Error) => {
      toast.error('操作失败', { description: error.message });
    },
  });
}

// 新增：驳回审批项
export function useRejectApprovalItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason: string }) =>
      rejectApprovalItem(submissionId, reason),
    onSuccess: () => {
      toast.success('已驳回', { description: '已驳回该变更申请' });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.pendingApprovals });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflow.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
    onError: (error: Error) => {
      toast.error('操作失败', { description: error.message });
    },
  });
}
```

- [ ] **Step 2: 验证编译**

```bash
cd app/src && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add app/src/features/settings/hooks/useApprovals.ts
git commit -m "feat(hooks): addApprovalItems hooks for grouped approval queries"
```

---

### Task 8: 前端组件 - 详情弹窗

**Files:**
- Create: `app/src/features/settings/components/ApprovalDetailDialog.tsx`

- [ ] **Step 1: 创建详情弹窗组件**

```typescript
// app/src/features/settings/components/ApprovalDetailDialog.tsx
/**
 * 审批项详情弹窗
 * 显示审批项的完整信息，包括所有变更项
 */
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, User, FileText, CheckCircle, XCircle } from 'lucide-react';
import type { ApprovalItem, ApprovalStatus } from '@/lib/api/workflow.api';

const CHANGE_TYPE_LABELS: Record<string, string> = {
  start_date: '开始日期',
  duration: '工期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数',
};

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }
> = {
  pending: { label: '待审批', variant: 'secondary', icon: Clock },
  approved: { label: '已通过', variant: 'default', icon: CheckCircle },
  rejected: { label: '已驳回', variant: 'destructive', icon: XCircle },
  timeout: { label: '已超时', variant: 'outline', icon: Clock },
};

function formatChangeValue(type: string, value: string | null): string {
  if (value === null || value === undefined) return '-';
  if (type === 'start_date' || type === 'end_date') {
    try {
      return format(new Date(value), 'yyyy-MM-dd');
    } catch {
      return value;
    }
  }
  if (type === 'duration') return `${value} 天`;
  return value;
}

interface ApprovalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApprovalItem | null;
}

export function ApprovalDetailDialog({ open, onOpenChange, item }: ApprovalDetailDialogProps) {
  if (!item) return null;

  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            审批详情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">项目：</span>
              <span className="font-medium">{item.projectName}</span>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground shrink-0">任务：</span>
              <span className="break-words">{item.taskDescription}</span>
            </div>
          </div>

          <Separator />

          {/* 变更列表 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">变更内容</h4>
            {item.changes.map((change, index) => (
              <div key={change.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                <Badge variant="outline" className="mb-2">
                  {CHANGE_TYPE_LABELS[change.changeType] || change.changeType}
                </Badge>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <span className="text-muted-foreground">原值：</span>
                    <span>{formatChangeValue(change.changeType, change.oldValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">新值：</span>
                    <span className="font-medium">{formatChangeValue(change.changeType, change.newValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* 变更原因 */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium">变更原因</h4>
            <p className="text-sm text-muted-foreground">{item.reason}</p>
          </div>

          {/* 申请人信息 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              申请人：{item.userName}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              提交时间：{format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
            </div>
          </div>

          {/* 审批信息 */}
          {item.status !== 'pending' && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">审批信息</h4>
                {item.approverName && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    审批人：{item.approverName}
                  </div>
                )}
                {item.approvedAt && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    审批时间：{format(new Date(item.approvedAt), 'yyyy-MM-dd HH:mm')}
                  </div>
                )}
                {item.rejectionReason && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    驳回原因：{item.rejectionReason}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 验证编译**

```bash
cd app/src && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add app/src/features/settings/components/ApprovalDetailDialog.tsx
git commit -m "feat(components): add ApprovalDetailDialog component"
```

---

### Task 9: 前端组件 - 表格行组件

**Files:**
- Create: `app/src/features/settings/components/ApprovalTableRow.tsx`

- [ ] **Step 1: 创建表格行组件**

```typescript
// app/src/features/settings/components/ApprovalTableRow.tsx
/**
 * 审批项表格行组件
 * 渲染单行审批记录，支持多变更合并显示
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { ApprovalItem, ApprovalStatus } from '@/lib/api/workflow.api';

const CHANGE_TYPE_LABELS: Record<string, string> = {
  start_date: '开始日期',
  duration: '工期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数',
};

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: '待审批', variant: 'secondary' },
  approved: { label: '已通过', variant: 'default' },
  rejected: { label: '已驳回', variant: 'destructive' },
  timeout: { label: '已超时', variant: 'outline' },
};

function formatChangeValue(type: string, value: string | null): string {
  if (value === null || value === undefined) return '-';
  if (type === 'start_date' || type === 'end_date') {
    try {
      return format(new Date(value), 'MM-dd');
    } catch {
      return value;
    }
  }
  if (type === 'duration') return `${value}天`;
  return value;
}

interface ApprovalTableRowProps {
  item: ApprovalItem;
  onApprove: (submissionId: string) => void;
  onReject: (item: ApprovalItem) => void;
  onViewDetail: (item: ApprovalItem) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function ApprovalTableRow({
  item,
  onApprove,
  onReject,
  onViewDetail,
  isApproving,
  isRejecting,
}: ApprovalTableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[item.status];
  const isPending = item.status === 'pending';
  const hasMultipleChanges = item.changes.length > 1;

  // 格式化变更内容
  const renderChangeContent = () => {
    if (hasMultipleChanges) {
      if (expanded) {
        return (
          <div className="space-y-1">
            {item.changes.map((change) => (
              <div key={change.id} className="text-sm font-mono">
                {CHANGE_TYPE_LABELS[change.changeType] || change.changeType}: {' '}
                {formatChangeValue(change.changeType, change.oldValue)} → {formatChangeValue(change.changeType, change.newValue)}
              </div>
            ))}
          </div>
        );
      }
      return (
        <span className="text-sm font-mono">
          {item.changes.length} 项变更
        </span>
      );
    }

    const change = item.changes[0];
    return (
      <span className="text-sm font-mono">
        {formatChangeValue(change.changeType, change.oldValue)} → {formatChangeValue(change.changeType, change.newValue)}
      </span>
    );
  };

  return (
    <TableRow className={isPending ? 'bg-amber-50/50 hover:bg-amber-50' : undefined}>
      {/* 提交时间 */}
      <TableCell className="text-sm whitespace-nowrap">
        {format(new Date(item.createdAt), 'MM-dd HH:mm')}
      </TableCell>

      {/* 项目 */}
      <TableCell className="max-w-[120px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-sm">{item.projectName}</span>
            </TooltipTrigger>
            <TooltipContent>{item.projectName}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* 任务 */}
      <TableCell className="max-w-[150px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-sm">{item.taskDescription}</span>
            </TooltipTrigger>
            <TooltipContent>{item.taskDescription}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* 变更类型 */}
      <TableCell>
        {hasMultipleChanges ? (
          <Badge variant="outline">多项变更</Badge>
        ) : (
          <Badge variant="outline">
            {CHANGE_TYPE_LABELS[item.changes[0].changeType] || item.changes[0].changeType}
          </Badge>
        )}
      </TableCell>

      {/* 变更内容 */}
      <TableCell className="max-w-[200px]">
        <div className="flex items-start gap-1">
          <div className="flex-1">{renderChangeContent()}</div>
          {hasMultipleChanges && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </TableCell>

      {/* 变更原因 */}
      <TableCell className="max-w-[100px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-sm">{item.reason}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{item.reason}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* 申请人 */}
      <TableCell className="text-sm whitespace-nowrap">{item.userName}</TableCell>

      {/* 状态 */}
      <TableCell>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </TableCell>

      {/* 审批人 */}
      <TableCell className="text-sm">
        {item.approverName || '-'}
      </TableCell>

      {/* 审批时间 */}
      <TableCell className="text-sm whitespace-nowrap">
        {item.approvedAt ? format(new Date(item.approvedAt), 'MM-dd HH:mm') : '-'}
      </TableCell>

      {/* 操作 */}
      <TableCell>
        {isPending ? (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => onReject(item)}
              disabled={isRejecting}
            >
              <XCircle className="h-3 w-3 mr-1" />
              驳回
            </Button>
            <Button
              size="sm"
              className="h-7"
              onClick={() => onApprove(item.submissionId)}
              disabled={isApproving}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              通过
            </Button>
          </div>
        ) : (
          <Button
            variant="link"
            size="sm"
            className="h-7 p-0"
            onClick={() => onViewDetail(item)}
          >
            详情
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 2: 验证编译**

```bash
cd app/src && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add app/src/features/settings/components/ApprovalTableRow.tsx
git commit -m "feat(components): add ApprovalTableRow component"
```

---

### Task 10: 前端组件 - 表格组件

**Files:**
- Create: `app/src/features/settings/components/ApprovalsTable.tsx`

- [ ] **Step 1: 创建表格组件（含列宽拖拽）**

```typescript
// app/src/features/settings/components/ApprovalsTable.tsx
/**
 * 审批项表格组件
 * 支持列宽拖拽调整，宽度持久化到 localStorage
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { ApprovalTableRow } from './ApprovalTableRow';
import type { ApprovalItem } from '@/lib/api/workflow.api';

const STORAGE_KEY = 'approval-table-column-widths';

// 默认列宽配置
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  createdAt: 90,
  projectName: 120,
  taskDescription: 150,
  changeType: 80,
  changeContent: 200,
  reason: 100,
  userName: 70,
  status: 70,
  approverName: 70,
  approvedAt: 90,
  actions: 100,
};

// 列定义
const COLUMNS = [
  { key: 'createdAt', label: '提交时间', minWidth: 80 },
  { key: 'projectName', label: '项目', minWidth: 80 },
  { key: 'taskDescription', label: '任务', minWidth: 100 },
  { key: 'changeType', label: '变更类型', minWidth: 70 },
  { key: 'changeContent', label: '变更内容', minWidth: 120 },
  { key: 'reason', label: '变更原因', minWidth: 80 },
  { key: 'userName', label: '申请人', minWidth: 60 },
  { key: 'status', label: '状态', minWidth: 60 },
  { key: 'approverName', label: '审批人', minWidth: 60 },
  { key: 'approvedAt', label: '审批时间', minWidth: 80 },
  { key: 'actions', label: '操作', minWidth: 80, resizable: false },
];

interface ApprovalsTableProps {
  items: ApprovalItem[];
  onApprove: (submissionId: string) => void;
  onReject: (item: ApprovalItem) => void;
  onViewDetail: (item: ApprovalItem) => void;
  approvingId?: string;
  rejectingId?: string;
  isLoading?: boolean;
}

export function ApprovalsTable({
  items,
  onApprove,
  onReject,
  onViewDetail,
  approvingId,
  rejectingId,
  isLoading,
}: ApprovalsTableProps) {
  // 从 localStorage 读取列宽
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return DEFAULT_COLUMN_WIDTHS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) } : DEFAULT_COLUMN_WIDTHS;
    } catch {
      return DEFAULT_COLUMN_WIDTHS;
    }
  });

  // 拖拽状态
  const [resizing, setResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // 保存列宽到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  // 开始拖拽
  const handleMouseDown = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(columnKey);
  }, []);

  // 拖拽中
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const column = COLUMNS.find((c) => c.key === resizing);
      if (!column) return;

      const table = tableRef.current;
      if (!table) return;

      const headerCells = table.querySelectorAll('th');
      const columnIndex = COLUMNS.findIndex((c) => c.key === resizing);
      const headerCell = headerCells[columnIndex];
      if (!headerCell) return;

      const rect = table.getBoundingClientRect();
      const newWidth = Math.max(
        column.minWidth,
        Math.min(400, e.clientX - rect.left - headerCell.offsetLeft)
      );

      setColumnWidths((prev) => ({
        ...prev,
        [resizing]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table ref={tableRef}>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                style={{ width: columnWidths[column.key], minWidth: column.minWidth }}
                className="relative select-none"
              >
                {column.label}
                {column.resizable !== false && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => handleMouseDown(column.key, e)}
                  />
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="text-center py-16">
                <div className="flex flex-col items-center text-muted-foreground">
                  <p className="text-sm">暂无审批记录</p>
                  <p className="text-xs mt-1">当工程师提交计划变更时，审批记录将出现在这里</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <ApprovalTableRow
                key={item.submissionId}
                item={item}
                onApprove={onApprove}
                onReject={onReject}
                onViewDetail={onViewDetail}
                isApproving={approvingId === item.submissionId}
                isRejecting={rejectingId === item.submissionId}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

```bash
cd app/src && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add app/src/features/settings/components/ApprovalsTable.tsx
git commit -m "feat(components): add ApprovalsTable with resizable columns"
```

---

### Task 11: 前端页面 - 重构 Approvals.tsx

**Files:**
- Modify: `app/src/features/settings/pages/Approvals.tsx`

- [ ] **Step 1: 重构 ApprovalsSettings 页面**

```typescript
// app/src/features/settings/pages/Approvals.tsx
/**
 * 审批管理页面（表格化版本）
 * 管理角色（admin/dept_manager/tech_manager）查看和操作计划变更审批
 */
import { useState, useCallback } from 'react';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApprovalItems, useApproveApprovalItem, useRejectApprovalItem } from '../hooks/useApprovals';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/settings/hooks/useUsers';
import { ApprovalsTable } from '../components/ApprovalsTable';
import { ApprovalDetailDialog } from '../components/ApprovalDetailDialog';
import { RejectionReasonDialog } from '../components/RejectionReasonDialog';
import type { ApprovalStatus, ApprovalItem } from '@/lib/api/workflow.api';

export function ApprovalsSettings() {
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 弹窗状态
  const [detailItem, setDetailItem] = useState<ApprovalItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // 查询数据
  const { data, isLoading } = useApprovalItems({
    status: statusFilter === 'all' ? undefined : statusFilter,
    projectId: projectFilter === 'all' ? undefined : projectFilter,
    userId: userFilter === 'all' ? undefined : Number(userFilter),
    page,
    pageSize,
  });
  const { data: projectsData } = useProjects({ pageSize: 100 });
  const { data: usersData } = useUsers({ pageSize: 100 });

  // Mutations
  const approveMutation = useApproveApprovalItem();
  const rejectMutation = useRejectApprovalItem();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const projects = projectsData?.items ?? [];
  const users = usersData?.items ?? [];

  // 审批通过
  const handleApprove = useCallback(
    (submissionId: string) => {
      approveMutation.mutate(submissionId);
    },
    [approveMutation],
  );

  // 打开驳回弹窗
  const handleOpenReject = useCallback((item: ApprovalItem) => {
    setRejectTarget(item);
    setRejectDialogOpen(true);
  }, []);

  // 确认驳回
  const handleConfirmReject = useCallback(
    (reason: string) => {
      if (rejectTarget) {
        rejectMutation.mutate(
          { submissionId: rejectTarget.submissionId, reason },
          {
            onSuccess: () => {
              setRejectDialogOpen(false);
              setRejectTarget(null);
            },
          },
        );
      }
    },
    [rejectTarget, rejectMutation],
  );

  // 查看详情
  const handleViewDetail = useCallback((item: ApprovalItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  }, []);

  // 筛选变化时重置页码
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as ApprovalStatus | 'all');
    setPage(1);
  };

  const handleProjectChange = (value: string) => {
    setProjectFilter(value);
    setPage(1);
  };

  const handleUserChange = (value: string) => {
    setUserFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 筛选区域 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">筛选：</span>
        </div>

        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]" data-testid="approval-filter-status">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待审批</SelectItem>
            <SelectItem value="approved">已通过</SelectItem>
            <SelectItem value="rejected">已驳回</SelectItem>
            <SelectItem value="timeout">已超时</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-[180px]" data-testid="approval-filter-project">
            <SelectValue placeholder="全部项目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部项目</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={handleUserChange}>
          <SelectTrigger className="w-[140px]" data-testid="approval-filter-user">
            <SelectValue placeholder="全部申请人" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部申请人</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.realName || u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          共 {total} 条记录
        </div>
      </div>

      {/* 表格区域 */}
      <ApprovalsTable
        items={items}
        onApprove={handleApprove}
        onReject={handleOpenReject}
        onViewDetail={handleViewDetail}
        approvingId={approveMutation.isPending ? 'processing' : undefined}
        rejectingId={rejectMutation.isPending ? 'processing' : undefined}
        isLoading={isLoading}
      />

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {page}/{totalPages} 页，共 {total} 条
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      <ApprovalDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
      />

      {/* 驳回原因弹窗 */}
      <RejectionReasonDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) setRejectTarget(null);
        }}
        onConfirm={handleConfirmReject}
        loading={rejectMutation.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 2: 检查 useUsers hook 是否存在**

```bash
grep -r "useUsers" "G:/Project/Web/Project_Task_Manager_4.0/app/src/features/settings/hooks/"
```

如果不存在，需要创建或使用现有的用户查询方法。

- [ ] **Step 3: 如需创建 useUsers hook**

```typescript
// app/src/features/settings/hooks/useUsers.ts（如不存在）
import { useQuery } from '@tanstack/query';
import { getUsers } from '@/lib/api/user.api';
import { queryKeys } from '@/lib/api/query-keys';

export function useUsers(options?: { pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.users.list(options),
    queryFn: () => getUsers(options),
    staleTime: 60 * 1000,
  });
}
```

- [ ] **Step 4: 验证编译**

```bash
cd app/src && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 5: 提交**

```bash
git add app/src/features/settings/pages/Approvals.tsx
git commit -m "refactor(settings): redesign Approvals page with table layout"
```

---

### Task 12: 修正提交变更时的 submission_id 生成

**Files:**
- Modify: `app/server/src/modules/workflow/service.ts`

- [ ] **Step 1: 修改 handlePlanChangeRequested 方法**

修改 `createPlanChange` 调用，传入共享的 `submission_id`：

```typescript
// 在 handlePlanChangeRequested 方法中，找到循环创建审批记录的部分
// 修改前：
for (const change of event.changes) {
  await this.repo.createPlanChange({
    id: uuidv4(),
    task_id: event.taskId,
    // ...
  });
}

// 修改后：生成一个共享的 submission_id
const submissionId = uuidv4();
for (const change of event.changes) {
  await this.repo.createPlanChange({
    id: uuidv4(),
    submission_id: submissionId,  // 新增
    task_id: event.taskId,
    // ...
  });
}
```

- [ ] **Step 2: 更新 CreatePlanChangeRequest 类型**

Modify: `app/server/src/modules/workflow/types.ts`

```typescript
export interface CreatePlanChangeRequest {
  id?: string;
  submission_id?: string;  // 新增
  task_id: string;
  change_type: string;
  old_value?: string | null;
  new_value?: string | null;
  reason: string;
}
```

- [ ] **Step 3: 更新 repository.createPlanChange 方法**

Modify: `app/server/src/modules/workflow/repository.ts`

```typescript
async createPlanChange(data: CreatePlanChangeRequest & { id: string; user_id: number; submission_id?: string }): Promise<string> {
  const pool = getPool();

  // 去重检查...
  // ...

  // 插入时包含 submission_id
  await pool.execute(
    `INSERT INTO plan_changes (id, submission_id, task_id, user_id, change_type, old_value, new_value, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      data.id,
      data.submission_id || data.id,  // 如果未提供，使用 id 作为 submission_id
      data.task_id,
      data.user_id,
      data.change_type,
      data.old_value || null,
      data.new_value,
      data.reason
    ]
  );
  return data.id;
}
```

- [ ] **Step 4: 验证编译**

```bash
cd app/server && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 5: 提交**

```bash
git add app/server/src/modules/workflow/service.ts app/server/src/modules/workflow/repository.ts app/server/src/modules/workflow/types.ts
git commit -m "fix(workflow): use shared submission_id for batch changes"
```

---

### Task 13: 集成测试

**Files:**
- 无新增文件，进行手动测试

- [ ] **Step 1: 启动服务**

```bash
cd app/server && npm run dev
cd app/src && npm run dev
```

- [ ] **Step 2: 测试场景**

| 场景 | 操作 | 预期结果 |
|---|---|---|
| 1 | 访问审批管理页面 | 页面加载，显示表格 |
| 2 | 拖拽列宽 | 列宽变化，刷新后保持 |
| 3 | 状态筛选 | 表格数据过滤正确 |
| 4 | 项目筛选 | 表格数据过滤正确 |
| 5 | 申请人筛选 | 表格数据过滤正确 |
| 6 | 点击待审批行"通过" | 操作成功，行状态变为"已通过" |
| 7 | 点击待审批行"驳回" | 弹出驳回弹窗，填写原因后提交成功 |
| 8 | 点击已完成行"详情" | 弹出详情弹窗，显示完整信息 |
| 9 | 多变更行展开/收起 | 点击展开图标显示所有变更 |
| 10 | 分页 | 上下翻页正常 |

- [ ] **Step 3: 检查控制台无报错**

- [ ] **Step 4: 最终提交**

```bash
git status
git add -A
git commit -m "feat(approvals): complete table-based approval management redesign"
```

---

## 验收清单

- [ ] 数据库 migration 已执行
- [ ] 后端 API 可访问 `/api/workflow/approval-items`
- [ ] 前端表格正常渲染
- [ ] 列宽可拖拽调整并持久化
- [ ] 三种筛选（状态/项目/申请人）正常工作
- [ ] 多变更行可展开显示
- [ ] 待审批行可执行通过/驳回操作
- [ ] 已完成行可查看详情弹窗
- [ ] 分页正常
- [ ] 无 TypeScript 编译错误
- [ ] 无运行时错误

---

## 附录

### A. 相关文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `app/server/src/migrations/049-add-submission-id-to-plan-changes.ts` | 新增 | 数据库迁移 |
| `app/server/src/migrations/run-migration.ts` | 修改 | 注册迁移 |
| `app/server/src/modules/workflow/types.ts` | 修改 | 新增类型 |
| `app/server/src/modules/workflow/repository.ts` | 修改 | 新增查询方法 |
| `app/server/src/modules/workflow/service.ts` | 修改 | 新增业务逻辑 |
| `app/server/src/modules/workflow/routes.ts` | 修改 | 新增路由 |
| `app/src/lib/api/workflow.api.ts` | 修改 | 新增 API |
| `app/src/features/settings/hooks/useApprovals.ts` | 修改 | 新增 hooks |
| `app/src/features/settings/components/ApprovalsTable.tsx` | 新增 | 表格组件 |
| `app/src/features/settings/components/ApprovalTableRow.tsx` | 新增 | 行组件 |
| `app/src/features/settings/components/ApprovalDetailDialog.tsx` | 新增 | 详情弹窗 |
| `app/src/features/settings/pages/Approvals.tsx` | 重构 | 主页面 |

### B. 接口规范

**GET /api/workflow/approval-items**

查询参数：
- `status`: 审批状态
- `projectId`: 项目 ID
- `userId`: 申请人 ID
- `page`: 页码（默认 1）
- `pageSize`: 每页条数（默认 20）

响应：
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

**POST /api/workflow/approval-items/:submissionId/approve**

响应：
```json
{
  "success": true
}
```

**POST /api/workflow/approval-items/:submissionId/reject**

请求体：
```json
{
  "rejection_reason": "驳回原因"
}
```

响应：
```json
{
  "success": true
}
```
