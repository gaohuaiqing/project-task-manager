# overdue_start 遗留增强设计

> 日期：2026-10-09
> 状态：已确认
> 前置：逾期未开始（overdue_start）第 9 状态功能（2026-09-21 完成，已随 fixed27 回传生产）

## 背景

overdue_start 功能收尾审查时记录 5 项遗留增强。本次核实后实际待做 3 项（另 2 项已在 Task 12 中修复，记忆过时）：

| # | 遗留项 | 核实结果 |
|---|---|---|
| 1 | 成员榜下钻无 overdue_start 通道 | **待做**：4 专项柱图无此维度 |
| 2 | WBS 徽章与 delay_warning 同色 | ✅ 已修复（`orange-200/800` 深一档 vs `orange-100/700`） |
| 3 | /tasks?status= 深链缺失 | **待做**：Tasks 页 filters 不读 URL 参数；engineer 仪表板 overdue_start 卡跳 `/tasks` 不带参 |
| 4 | 僵尸类型副本 x2 | **待做**：`types/api/analytics.ts` 的 `OverdueStartMemberStat`/`OverdueStartOverview` 零消费者 |
| 5 | 组对比表列头「未开始占比」缩写 | ✅ 已修复（全称「逾期未开始占比」） |

## 1. 成员榜第 5 专项「逾期未开始排行」

### 数据源决策

复用现有 `overdue_start_overview.member_ranking`（实时口径），**不动** P1 member_ranking。

理由：柱图数值必须与点击下钻的列表条数一致——下钻 API（`DelayDetailQuery.overdue_start: true`）是纯实时口径（忽略时间段）；若在 P1（时间段口径）加列，会出现「柱图 3 条、弹窗 5 条」数字对不上。且改 P1 的 `HAVING` 会让现有 4 专项柱图冒出 0 值柱（副作用）。

### 改动清单

| 层 | 文件 | 改动 |
|---|---|---|
| 后端 | `app/server/src/modules/analytics/repository.ts` | overdueStartRows SQL：SELECT 补 `u.department_id AS dept_id`，GROUP BY 补 `u.department_id` |
| 后端 | `app/server/src/modules/analytics/types.ts` | `OverdueStartMemberStat` 补 `dept_id: number`（未分配=0，同 P1 兜底） |
| 前端 | `app/src/features/analytics/reports/types/index.ts` | `OverdueStartMemberRankingItem` 补 `deptId` |
| 前端 | `app/src/features/analytics/reports/data/transformers.ts` | overdueStartOverview.memberRanking map 补 `deptId: m.deptId ?? 0` |
| 前端 | `app/src/features/analytics/reports/tabs/DelayAnalysisTab.tsx` | 把 `overdueStartOverview.memberRanking` 经新 prop `overdueStartRanking` 传给 MemberRankingSection |
| 前端 | `app/src/features/analytics/reports/components/delay/MemberRankingSection.tsx` | 新 prop `overdueStartRanking: OverdueStartMemberRankingItem[]` + 第 5 专项柱图 |

### 第 5 专项柱图规格

- 标题：「逾期未开始排行」；数值标签 = count（当前逾期未开始任务数）
- 颜色：`#EA580C`（与图表层 overdue_start 系列色一致，区别于 delay_warning 的 `#D97706`）
- 排序：后端已按 count DESC, max_overdue_days DESC
- 部门下钻：`selectedDeptId` 非空时按 `deptId` 过滤（同 4 专项逻辑）
- 点击下钻：`assigneeId` 非空时 `onDrillDown({ assignee_id, overdue_start: true }, 'XX 的逾期未开始任务')`；「未分配」聚合行（assigneeId=null）不可下钻
- 位置：紧跟「延期次数排行」之后（两个可下钻图并排）
- LIMIT：与其他专项同为 10（QUERY_LIMITS.DELAY_MEMBERS = TOP_DELAY_MEMBERS = 10），无截断差异

## 2. /tasks?status= 深链

### Tasks 页读参初始化

文件：`app/src/features/tasks/index.tsx`

- 加 `useSearchParams`（react-router-dom），挂载时读 `?status=`，支持逗号分隔多值
- 校验：值 ∈ `TASK_STATUS_OPTIONS` 9 个合法值，非法值忽略
- `filters` 初始值改为惰性初始化：`useState<TaskQueryParams>(() => ({ projectId, pageSize: 100, ...(validStatuses.length ? { status: validStatuses } : {}) }))`
- 一次性读入，不做 URL→filters 的持续联动，也不做 filters→URL 回写（KISS/YAGNI）
- 与现有 `?taskId=` 详情深链共存；应用后不 replace 清参（刷新重复应用同筛选无害）

### engineer 仪表板 4 卡补参

文件：`app/src/features/analytics/dashboard/hooks/useDashboardData.ts`（transformEngineerData）

| 卡片 | actionPath 改为 |
|---|---|
| overdue（逾期任务） | `/tasks?status=delayed` |
| overdue_start（逾期未开始） | `/tasks?status=overdue_start` |
| delay_warning（即将到期） | `/tasks?status=delay_warning` |
| week_due（本周到期） | 保持 `/tasks`（日期维度无状态映射） |

### 旧 dashboard 断链不修

`app/src/features/dashboard/`（旧版）目录零外部引用（路由 `/dashboard` 实际挂载 `features/analytics/Dashboard` → 新版 DashboardPage），其 4 处 `navigate('/tasks?status=...')` 断链与非法值 `'warning'` 均在死代码中，修复无意义。整目录清理超出本次范围，不动。

## 3. 僵尸类型清理

**核实修正**：记忆中的「OverdueStart 相关副本 x2」判定有误——`types/api/analytics.ts` 的 `OverdueStartMemberStat`/`OverdueStartOverview` 被 `DelayAnalysisReport`（活根类型）链式引用，是**活类型不可删**。经可达性分析（从 api/index.ts + transformers.ts 实际导入的根类型做 BFS 闭包）+ 全项目交叉验证，真僵尸为 5 个，全部在 `app/src/types/api/analytics.ts`：

| 僵尸类型 | 说明 |
|---|---|
| `TrendIndicator`（接口） | 与 `shared/components/TrendIndicator.tsx` 组件同名但无关，类型零引用 |
| `StatsWithTrend` | 引用僵尸 TrendIndicator，自身零引用 |
| `MemberAnalysisReport` | 成员分析旧报告类型，被 `MemberAnalysisExtendedResponse` 取代 |
| `EstimationAccuracyStats` | fixed27 删「预估准确性死筛选器」的遗留 |
| `CapabilityDisplay` | 成员能力展示旧类型，零引用 |

- 后端 `app/server/src/modules/analytics/types.ts` 的类型是活类型（`overdue_start_overview` 构造在用），不动
- 验证：前端 tsc 编译零错误

## 验证计划

1. 本机 dev 起服务（后端 3001 / 前端 5173，admin/admin123）
2. admin 端到端（Chrome DevTools UI 验证）：
   - 报表「延期分析」Tab 第 5 专项柱图渲染正常（橙色、数值、排序）
   - 柱图合计与组对比表「逾期未开始」列合计同口径（组和=全局）
   - 点击柱子弹窗任务条数 = 柱值；未分配行不可点击
   - dept_manager 点组下钻后第 5 专项只显示该组成员
3. engineer 登录：4 张预警卡点击跳转，overdue_start 卡落到已筛选「逾期未开始」的任务列表（TaskFilterBar 状态筛选器显示已选中）
4. `npx tsc --noEmit` 零错误（前后端）
5. 回归：现有 4 专项柱图、下钻弹窗、`?taskId=` 详情深链不受影响
