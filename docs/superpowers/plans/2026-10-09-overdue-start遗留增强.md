# overdue_start 遗留增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 overdue_start 三项遗留——成员榜第 5 专项「逾期未开始排行」柱图（复用实时口径查询）、/tasks?status= 深链、删除 5 个前端僵尸类型。

**Architecture:** 第 5 专项复用现有 `overdue_start_overview.member_ranking`（实时口径，与下钻 API `overdue_start: true` 同口径保证柱值=弹窗条数），后端 SQL 仅补 `dept_id` 列支撑部门下钻过滤；深链采用挂载时一次性读参初始化 filters（不做双向同步）；僵尸类型经可达性分析确认为 5 个（OverdueStart* 两类型是活类型不可删）。

**Tech Stack:** React 18 + TypeScript + react-router-dom v6（useSearchParams）、Node/Express + mysql2、TanStack Query。

**规格：** `docs/superpowers/specs/2026-10-09-overdue-start遗留增强-design.md`

## Global Constraints

- 用户规则：**不主动执行 git commit/push**；每任务完成即报告，提交由用户指示
- 代码注释一律中文（与现有代码库一致）
- 不可变模式：排序/过滤用展开拷贝，禁止原地 mutate 入参
- 测试基建现状：Test/frontend 目录为空（vitest 配置断链），无单测可跑——每任务验证 = 前端 `cd app && npm run typecheck` / 后端 `cd app/server && npx tsc --noEmit` + 本机 dev 端到端（后端 3001 / 前端 5173，admin/admin123）
- bash 在本机偶发 `add_item` 崩溃（教训 40）：命令失败先原样重试，仍失败换绝对路径连写形式

---

### Task 1: 后端 overdueStartRows 补 dept_id

**Files:**
- Modify: `app/server/src/modules/analytics/repository.ts`（overdueStartRows SQL，约 L1724-1736 + map 约 L1745）
- Modify: `app/server/src/modules/analytics/types.ts:392-399`（OverdueStartMemberStat）

**Interfaces:**
- Produces: `OverdueStartMemberStat` 新增 `dept_id: number` 字段（API 响应 snake_case），供 Task 2 前端 transformer 消费

- [ ] **Step 1: types.ts 补字段**

`app/server/src/modules/analytics/types.ts` L392-399，在 `max_overdue_days` 字段后补：

```typescript
/** 逾期未开始成员排行项（含"未分配"聚合行） */
export interface OverdueStartMemberStat {
  name: string;
  /** 责任人 ID（"未分配"聚合行为 null，前端不可下钻） */
  assignee_id: number | null;
  count: number;
  /** 最长逾期未开始天数（CURDATE - start_date） */
  max_overdue_days: number;
  /** 责任人部门 id（未分配=0；前端成员榜部门下钻过滤用） */
  dept_id: number;
}
```

- [ ] **Step 2: repository.ts SQL 补列**

`app/server/src/modules/analytics/repository.ts` 找到 overdueStartRows 查询（注释 `const [overdueStartRows] = await pool.execute`），SELECT 补 `u.department_id AS dept_id`，GROUP BY 补 `u.department_id`：

```typescript
    const [overdueStartRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.assignee_id,
              IF(t.assignee_id IS NULL, '未分配', COALESCE(u.real_name, u.username, '未知')) AS name,
              COUNT(*) AS count,
              MAX(DATEDIFF(CURDATE(), t.start_date)) AS max_overdue_days,
              u.department_id AS dept_id
       FROM wbs_tasks t JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE ${overdueStartConds.join(' AND ')}
       GROUP BY t.assignee_id, u.real_name, u.username, u.department_id
       ORDER BY count DESC, max_overdue_days DESC
       LIMIT ${QUERY_LIMITS.TOP_DELAY_MEMBERS}`,
      overdueStartParams
    );
```

- [ ] **Step 3: repository.ts map 补字段**

同文件约 L1745 `member_ranking` map，补 `dept_id`：

```typescript
      member_ranking: (overdueStartRows as RowDataPacket[]).map((r): OverdueStartMemberStat => ({
        name: String(r.name),
        // 责任人 ID（"未分配"聚合行为 null，前端据此判断是否可下钻明细）
        assignee_id: r.assignee_id != null ? Number(r.assignee_id) : null,
        count: Number(r.count) || 0,
        max_overdue_days: Number(r.max_overdue_days) || 0,
        // 未分配成员 u.department_id 为 NULL，||0 兜底（与 P1 member_ranking 同规则）
        dept_id: Number(r.dept_id) || 0,
      })),
```

- [ ] **Step 4: 类型检查**

Run: `cd "G:/Project/Web/Project_Task_Manager_5.0/app/server" && npx tsc --noEmit`
Expected: 零错误

- [ ] **Step 5: curl 验证**

起后端 dev（若未起）：`cd "G:/Project/Web/Project_Task_Manager_5.0/app/server" && npm run dev`（3001）

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -s "http://localhost:3001/api/analytics/reports/delay-analysis" -H "Authorization: Bearer $TOKEN" | grep -o '"overdue_start_overview":{[^}]*"member_ranking":\[.\{0,400\}' | head -c 600
```

Expected: member_ranking 各项含 `"dept_id":<数字>`；未分配聚合行为 `"dept_id":0`

---

### Task 2: 前端第 5 专项「逾期未开始排行」柱图

**Files:**
- Modify: `app/src/features/analytics/reports/types/index.ts:428-435`（OverdueStartMemberRankingItem）
- Modify: `app/src/features/analytics/reports/data/transformers.ts:595-601`（memberRanking map）
- Modify: `app/src/features/analytics/reports/components/delay/MemberRankingSection.tsx`（新 prop + 第 5 柱图）
- Modify: `app/src/features/analytics/reports/tabs/DelayAnalysisTab.tsx:119-125`（传 prop）

**Interfaces:**
- Consumes: Task 1 的 API 响应新字段 `dept_id`（apiService 响应拦截器自动转 camelCase `deptId`，无需手动映射——见 api/index.ts L92 注释）
- Consumes: `openDetail(filters: DelayDetailQuery, title: string)`（DelayAnalysisTab 既有，已内置 overdue_start 不合并时间段的分支）
- Produces: `MemberRankingSection` 新 prop `overdueStartRanking?: OverdueStartMemberRankingItem[]`

- [ ] **Step 1: API 层类型补字段**

`app/src/types/api/analytics.ts` 的 `OverdueStartMemberStat`（L229-236，transformer 输入的 API 响应类型）补可选字段：

```typescript
/** 逾期未开始成员排行项（含"未分配"聚合行） */
export interface OverdueStartMemberStat {
  name: string;
  /** 责任人 ID（"未分配"聚合行为 null，不可下钻；可选兜底防旧缓存） */
  assigneeId?: number | null;
  count: number;
  /** 最长逾期未开始天数 */
  maxOverdueDays: number;
  /** 责任人部门 id（未分配=0；旧后端/缓存缺字段兜底 0） */
  deptId?: number;
}
```

- [ ] **Step 2: 展示层类型补字段**

`app/src/features/analytics/reports/types/index.ts` L428-435：

```typescript
/** 逾期未开始成员排行项（含"未分配"聚合行） */
export interface OverdueStartMemberRankingItem {
  name: string;
  /** 责任人 ID（"未分配"聚合行为 null，不可下钻） */
  assigneeId: number | null;
  count: number;
  /** 最长逾期未开始天数 */
  maxOverdueDays: number;
  /** 责任人部门 id（未分配=0；部门下钻过滤用） */
  deptId: number;
}
```

- [ ] **Step 3: transformer 补字段**

`app/src/features/analytics/reports/data/transformers.ts` L595-601 map 补 `deptId`：

```typescript
    memberRanking: (oso?.memberRanking || []).map((m) => ({
      name: m.name,
      // 责任人 ID（"未分配"聚合行为 null 不可下钻；旧缓存缺字段兜底 null）
      assigneeId: m.assigneeId ?? null,
      count: m.count,
      maxOverdueDays: m.maxOverdueDays,
      // 部门 id（旧后端/缓存缺字段兜底 0）
      deptId: m.deptId ?? 0,
    })),
```

- [ ] **Step 4: MemberRankingSection 加第 5 专项**

`app/src/features/analytics/reports/components/delay/MemberRankingSection.tsx`：

4a. 文件头注释整体替换为：

```typescript
/**
 * v2 成员排名：5 专项柱图（延期次数 / 逾期未开始 / 计划变更 / 改善之星 / 落后排行）
 * - 延期次数排行：by totalDelayCount DESC（点击柱子下钻该成员延期任务明细）
 * - 逾期未开始排行：by count DESC（实时口径，与下钻 API overdue_start:true 同口径；点击柱子下钻）
 * - 计划变更排行：by planChangeCount DESC
 * - 改善之星排行：by improvementDelta ASC（负值=本期比上期延期更少，置顶）
 * - 落后排行：by improvementDelta DESC（正值=本期比上期延期更多，置顶）
 * - 改善/落后标准：delta = 本期延期任务数 − 上期（需选定时间段；无时间段走近30天vs前30天兜底）
 * - 各柱图独立、showValues 标柱数值
 * - 保留部门下钻：dept_manager 点组后只显示该组成员；提供显眼"返回全部"按钮
 */
```

4b. import 与 props：

```typescript
import type { BarChartData, MemberRankingData, OverdueStartMemberRankingItem, DelayDetailQuery } from '../../types';
```

```typescript
export interface MemberRankingSectionProps {
  data: MemberRankingData[];
  /** 第 5 专项数据源：逾期未开始成员排行（实时口径，来自 overdueStartOverview.memberRanking） */
  overdueStartRanking?: OverdueStartMemberRankingItem[];
  selectedDeptName?: string | null;
  /** 选中的部门 id（来自 TeamSection 点组下钻）；非空时只展示该部门成员 */
  selectedDeptId?: number | null;
  /** v2 交互增强：点击"延期次数排行"柱子下钻该成员延期任务明细 */
  onDrillDown?: (filters: DelayDetailQuery, title: string) => void;
  /** v2 修复：返回全部人员（清除组筛选） */
  onClearDept?: () => void;
}
```

4c. 组件函数签名解构补 `overdueStartRanking`；4 专项整体空态判断保持不变；在 `const worseChart = ...` 之后加第 5 专项数据构造（不可变拷贝 + 部门过滤）：

```typescript
  // 第 5 专项：逾期未开始排行（实时口径；后端已按 count DESC 排序，前端只做部门过滤）
  const osFiltered = overdueStartRanking
    ? (selectedDeptId ? overdueStartRanking.filter((m) => m.deptId === selectedDeptId) : overdueStartRanking)
    : [];
  const osChart: BarChartData = {
    labels: osFiltered.map((m) => m.name),
    datasets: [{ label: '逾期未开始', values: osFiltered.map((m) => m.count), color: '#EA580C' }],
  };
```

4d. JSX：在「延期次数排行」ChartContainer 之后、「计划变更排行」之前插入：

```tsx
        <ChartContainer
          title="逾期未开始排行"
          subtitle={`${subtitle} · 当前逾期未开始任务数（实时口径，由高到低${onDrillDown ? '，点击柱子查看明细' : ''}）`}
        >
          {osFiltered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              {selectedDeptName ? `${selectedDeptName} 暂无逾期未开始任务` : '暂无逾期未开始任务'}
            </div>
          ) : (
            <BarChart
              data={osChart}
              layout="vertical"
              showValues
              showLegend={false}
              height={Math.max(200, osFiltered.length * 32)}
              yAxisLabel="成员"
              onBarClick={onDrillDown ? ({ index }) => {
                const m = osFiltered[index];
                // "未分配"聚合行无 assigneeId，不可下钻
                if (m?.assigneeId) onDrillDown({ assignee_id: m.assigneeId, overdue_start: true }, `${m.name} 的逾期未开始任务`);
              } : undefined}
            />
          )}
        </ChartContainer>
```

- [ ] **Step 5: DelayAnalysisTab 传 prop**

`app/src/features/analytics/reports/tabs/DelayAnalysisTab.tsx` L119-125：

```tsx
      <MemberRankingSection
        data={data.memberRanking}
        overdueStartRanking={data.overdueStartOverview.memberRanking}
        selectedDeptName={selectedDeptName}
        selectedDeptId={selectedDeptId}
        onDrillDown={openDetail}
        onClearDept={() => handleSelectDept(null)}
      />
```

- [ ] **Step 6: 类型检查**

Run: `cd "G:/Project/Web/Project_Task_Manager_5.0/app" && npm run typecheck`
Expected: 零错误

- [ ] **Step 7: UI 端到端验证（Chrome DevTools，admin 登录 5173）**

1. 报表 → 延期分析：5 专项柱图渲染，「逾期未开始排行」在第 2 位、橙色（#EA580C）、数值标签
2. 柱图合计 ≤ overdue_start_overview.total（LIMIT 10 截断）；与组对比表「逾期未开始」列合计同口径核对（组和 vs 全局，若有超 10 人差异记录说明）
3. 点击有值柱子 → 弹窗标题「XX 的逾期未开始任务」，列表条数 = 柱值
4. 「未分配」行（若在 Top10）点击无响应
5. 切 dept_manager 账号点组下钻 → 第 5 专项只剩该组成员；「查看全部人员」恢复

---

### Task 3: /tasks?status= 深链读参初始化

**Files:**
- Modify: `app/src/features/tasks/index.tsx:4-59`（import + filters 初始化）

**Interfaces:**
- Consumes: `TASK_STATUS_OPTIONS`/`TaskStatus`（`@/shared/constants`，9 个合法值）
- Consumes: `TaskQueryParams.status?: TaskStatus | TaskStatus[]`（`./types`）
- Produces: 模块级纯函数 `parseStatusParam(param: string | null): TaskStatus[]`（可独立测试）

- [ ] **Step 1: 加 parseStatusParam 纯函数与 import**

`app/src/features/tasks/index.tsx` 顶部 import 区补：

```typescript
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
```

（替换原 `import { useParams, useNavigate } from 'react-router-dom';`）

```typescript
import { TASK_STATUS_OPTIONS, type TaskStatus } from '@/shared/constants';
```

在 `FIELD_LABELS` 常量之前加模块级纯函数：

```typescript
/**
 * 解析 ?status= 深链参数为合法状态数组
 * - 逗号分隔多值（如 delayed,overdue_start）
 * - 非法值一律忽略（不在 TASK_STATUS_OPTIONS 9 个合法值内）
 */
export function parseStatusParam(param: string | null): TaskStatus[] {
  if (!param) return [];
  const valid = new Set(TASK_STATUS_OPTIONS.map((o) => o.value));
  return param
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is TaskStatus => valid.has(s as TaskStatus));
}
```

- [ ] **Step 2: filters 惰性初始化读参**

组件内（`const navigate = useNavigate();` 之后）取 searchParams，`useState` 改惰性初始化：

```typescript
  const [searchParams] = useSearchParams();
  // ?status= 深链：挂载时一次性读入合法状态初始化筛选（不做 URL→filters 持续联动）
  const initialStatuses = parseStatusParam(searchParams.get('status'));

  // 筛选状态
  const [filters, setFilters] = useState<TaskQueryParams>(() => ({
    projectId,
    pageSize: 100, // 减小默认页面大小，提升性能
    ...(initialStatuses.length > 0 ? { status: initialStatuses } : {}),
  }));
```

- [ ] **Step 3: 类型检查**

Run: `cd "G:/Project/Web/Project_Task_Manager_5.0/app" && npm run typecheck`
Expected: 零错误

- [ ] **Step 4: UI 手动验证（Chrome DevTools，admin 登录 5173）**

1. 地址栏直接输入 `http://localhost:5173/tasks?status=overdue_start` → 列表只显示逾期未开始任务，TaskFilterBar 状态筛选器显示「逾期未开始」已选中
2. `?status=delayed,overdue_start` → 两状态并集，筛选器两项选中
3. `?status=warning`（非法值）→ 忽略，列表不受影响（全量默认视图）
4. `?status=`（空）→ 忽略
5. 进入后手动改筛选 → 正常（一次性读参不干扰后续操作）
6. 旧 `?taskId=xxx` 详情深链仍正常（回归）

---

### Task 4: engineer 仪表板 4 卡补 status 参数

**Files:**
- Modify: `app/src/features/analytics/dashboard/hooks/useDashboardData.ts:376-381`（transformEngineerData alerts）

**Interfaces:**
- Consumes: Task 3 的深链能力（`/tasks?status=` 已生效）

- [ ] **Step 1: 改 4 张卡 actionPath**

`transformEngineerData` 的 alerts 数组：

```typescript
    alerts: [
      { type: 'overdue' as const, count: stats.overdueTasks || 0, label: '逾期任务', color: 'danger' as const, actionLabel: '查看详情', actionPath: '/tasks?status=delayed' },
      { type: 'overdue_start' as const, count: stats.overdueStartTasks || 0, label: '逾期未开始', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/tasks?status=overdue_start' },
      { type: 'delay_warning' as const, count: stats.delayWarningTasks || 0, label: '即将到期', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/tasks?status=delay_warning' },
      { type: 'week_due' as const, count: stats.weekDueTasks || 0, label: '本周到期', color: 'info' as const, actionLabel: '查看详情', actionPath: '/tasks' },
    ],
```

（week_due 保持 `/tasks`——日期维度无状态映射）

- [ ] **Step 2: 类型检查**

Run: `cd "G:/Project/Web/Project_Task_Manager_5.0/app" && npm run typecheck`
Expected: 零错误

- [ ] **Step 3: UI 端到端验证（Chrome DevTools，engineer 账号登录 5173）**

1. 仪表板 4 张预警卡渲染正常（数字不变）
2. 点「逾期未开始」卡 → 落 /tasks 且状态筛选「逾期未开始」已选中，列表条数=卡数字
3. 点「逾期任务」卡 → status=delayed 生效
4. 点「即将到期」卡 → status=delay_warning 生效
5. 点「本周到期」卡 → /tasks 无筛选（预期）

---

### Task 5: 删除 5 个前端僵尸类型

**Files:**
- Modify: `app/src/types/api/analytics.ts`（删 5 个 interface 块：L10-17 TrendIndicator、L19-22 StatsWithTrend、L424-434 MemberAnalysisReport、L451-457 EstimationAccuracyStats、L459-463 CapabilityDisplay）

**Interfaces:**
- 注意：`MemberTask`（L436-449）被活类型引用**必须保留**；`OverdueStartMemberStat`/`OverdueStartOverview` 是活类型（DelayAnalysisReport 引用链）**不可删**

- [ ] **Step 1: 删除 5 个块**

依次删除（含各自注释行）：

```typescript
// 删除块 1+2（文件头「趋势指标相关」区，L8-27 中）：
export interface TrendIndicator {
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
  isPositive: boolean;
}

export interface StatsWithTrend {
  current: number;
  trend: TrendIndicator;
}

// 删除块 3（L424-434）：
export interface MemberAnalysisReport {
  memberId: number;
  memberName: string;
  currentTasks: number;
  totalFullTimeRatio: number;
  avgCompletionRate: number;
  capabilityMatch?: number;
  taskList: MemberTask[];
  capabilities?: CapabilityDisplay[];
  estimationAccuracy?: EstimationAccuracyStats;
}

// 删除块 4（L451-457）：
export interface EstimationAccuracyStats {
  accurateCount: number;
  slightDeviationCount: number;
  obviousDeviationCount: number;
  seriousDeviationCount: number;
  avgAccuracy: number;
}

// 删除块 5（L459-463）：
export interface CapabilityDisplay {
  modelName: string;
  dimensionScores: string;
  overallScore: number;
}
```

删除后若 `// ============ 趋势指标相关 ============` 分区头下为空，一并删除该分区头注释。

- [ ] **Step 2: 类型检查（关键回归）**

Run: `cd "G:/Project/Web/Project_Task_Manager_5.0/app" && npm run typecheck`
Expected: 零错误。若报 `TrendIndicator`/`MemberAnalysisReport` 等未定义，说明有隐藏消费者——回退该块删除并报告（可达性分析基于 api/index.ts + transformers.ts 导入闭包，交叉验证过全项目 grep）

- [ ] **Step 3: 全局回归验证**

报表各 Tab（延期分析/活跃度/资源效能等）打开无白屏无 console 报错（僵尸删除影响面为零是本任务的验收标准）

---

## 执行后收尾

1. 全量回归：admin（延期分析 5 专项 + 组对比 + 下钻）+ dept_manager（组下钻）+ engineer（4 卡跳转）
2. 报告用户：改动清单 + 验证结果，等待提交指示
