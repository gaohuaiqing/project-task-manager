# 模块设计：分析模块 (07-analytics)

> **文档版本**: 1.0
> **创建时间**: 2026-03-17
> **状态**: ✅ 完成
> **模块组**: 07-analytics
> **开发顺序**: 7（依赖所有数据层模块）
> **依赖**: 01-06模块

---

## 1. 快速参考（AI摘要）

### 1.1 模块概述

分析模块提供数据看板、报表分析、搜索筛选、系统配置和导入导出功能。是系统的分析展示层，为管理者提供决策支持。

### 1.2 核心功能列表

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 首页数据看板 | P0 | 4个统计卡片 + 图表区域 |
| 项目进度报表 | P1 | 进度趋势 + 状态分布 |
| 任务统计报表 | P1 | 优先级分布 + 负责人分布 |
| 延期分析报表 | P1 | 延期原因 + 趋势分析 |
| 成员任务分析 | P1 | 负载分布 + 完成趋势 |
| 系统配置管理 | P1 | 4项配置CRUD |
| 导入导出 | P2 | 4个领域Excel/CSV/JSON |

### 1.3 关键技术点

- **报表组件**: ECharts/Recharts图表库
- **数据聚合**: SQL聚合查询优化
- **导出格式**: ExcelJS + CSV + JSON
- **配置存储**: 数据库JSON字段

---

## 2. 数据看板

### 2.1 首页概览组件

**来源**: UI_Requirement L2988-3009

#### 统计卡片（4个）

| 卡片 | 数据源 | 计算逻辑 |
|------|--------|----------|
| 项目总数 | projects表 | COUNT(*) |
| 进行中任务数 | wbs_tasks表 | COUNT WHERE status='in_progress' |
| 已完成任务数 | wbs_tasks表 | COUNT WHERE status IN ('early_completed', 'on_time_completed', 'overdue_completed') |
| 延期预警数 | wbs_tasks表 | COUNT WHERE status='delay_warning' OR status='delayed' |

#### 图表区域

| 图表 | 类型 | 数据源 |
|------|------|--------|
| 任务趋势 | 折线图 | 按日期统计任务完成数 |
| 项目进度分布 | 饼图 | 按状态统计项目数 |

#### 紧急任务提醒

```tsx
// UrgentTasksCard.tsx
const UrgentTasksCard: React.FC = () => {
  const { data: urgentTasks } = useUrgentTasks();

  return (
    <Card className="border-red-300 bg-red-50">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangleIcon className="h-5 w-5" />
          <span className="font-semibold">紧急任务</span>
          <Badge variant="destructive">{urgentTasks?.length || 0}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {urgentTasks?.slice(0, 3).map(task => (
          <div key={task.id} className="flex items-center justify-between py-1">
            <span className="text-sm truncate">{task.description}</span>
            <Link to={`/tasks/${task.id}`}>
              <ExternalLinkIcon className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
```

---

## 3. 报表分析

### 3.1 报表通用布局

**来源**: UI_Requirement L3012-3101

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  筛选区域                                                               │
│  [项目筛选▼] [时间范围▼] [负责人▼]              [刷新] [📤 导出Excel]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  统计卡片区域（4个）                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ 统计项1  │ │ 统计项2  │ │ 统计项3  │ │ 统计项4  │                     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  图表区域                                                               │
│  ┌────────────────────────────────┐ ┌────────────────────────────────┐    │
│  │ 图表1（左）                    │ │ 图表2（右）                    │    │
│  └────────────────────────────────┘ └────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│  数据表格区域                                                           │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐                │
│  │ 列1    │ 列2    │ 列3    │ 列4    │ 列5    │ 列6   │                │
│  └────────┴────────┴────────┴────────┴────────┴────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 图表库选型

**推荐**: Apache ECharts

| 对比项 | ECharts | Recharts |
|--------|---------|----------|
| 图表类型 | 30+ | 15+ |
| 按需引入 | ✅ 支持 | ✅ 支持 |
| 中文支持 | ✅ 内置 | ⚠️ 需配置 |
| 雷达图 | ✅ 完整 | ⚠️ 基础 |
| 甘特图 | ✅ 插件支持 | ❌ 不支持 |
| 性能 | 优秀 | 良好 |
| 包体积 | ~300KB(按需) | ~200KB(按需) |

**安装**:
```bash
npm install echarts echarts-for-react
```

**按需引入配置**:
```typescript
// echarts-config.ts
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, LineChart, PieChart,
  GridComponent, TooltipComponent, LegendComponent,
  CanvasRenderer
]);

export default echarts;
```

### 3.3 项目进度报表

**来源**: FINAL L1963-1976

| 元素 | 内容 |
|------|------|
| 筛选条件 | 项目选择、时间范围 |
| 统计卡片 | 总体进度%、已完成任务数、进行中任务数、里程碑完成数 |
| 图表1 | 进度趋势折线图（按周/月） |
| 图表2 | 任务状态分布饼图 |
| 数据表格 | 里程碑列表 |

**API**: `GET /api/reports/project-progress`

**响应**:
```typescript
interface ProjectProgressReport {
  stats: {
    overall_progress: number;
    completed_tasks: number;
    in_progress_tasks: number;
    completed_milestones: number;
  };
  charts: {
    progress_trend: TrendDataPoint[];
    status_distribution: PieDataPoint[];
  };
  table: MilestoneRow[];
}
```

### 3.3 任务统计报表

**来源**: FINAL L1977-1982

| 元素 | 内容 |
|------|------|
| 筛选条件 | 项目、时间范围、负责人 |
| 统计卡片 | 任务总数、平均完成率、延期率、紧急任务数 |
| 图表1 | 优先级分布柱状图 |
| 图表2 | 负责人任务分布饼图 |
| 数据表格 | 任务统计明细 |

**API**: `GET /api/reports/task-statistics`

### 3.4 延期分析报表

**来源**: FINAL L1983-1988

| 元素 | 内容 |
|------|------|
| 筛选条件 | 项目、时间范围、延期类型 |
| 统计卡片 | 延期任务总数、延期预警数、已延迟数、超期完成数 |
| 图表1 | 延期原因分类统计柱状图 |
| 图表2 | 延期趋势折线图 |
| 数据表格 | 延期任务列表 |

**API**: `GET /api/reports/delay-analysis`

### 3.5 成员任务分析报表

**来源**: FINAL L1989-1994

| 元素 | 内容 |
|------|------|
| 筛选条件 | 成员选择、时间范围 |
| 统计卡片 | 当前任务数、全职比总和、平均完成率、能力匹配度 |
| 图表1 | 成员任务负载柱状图 |
| 图表2 | 任务完成趋势折线图 |
| 数据表格 | 成员任务明细 |
| 能力展示 | 能力模型得分 |

**API**: `GET /api/reports/member-analysis`

---

## 4. 系统配置

### 4.1 配置模块

**来源**: FINAL L2002-2036

| 配置项 | 功能描述 | 默认值数量 |
|-------|---------|-----------|
| 项目类型配置 | 管理项目类型列表 | 4种 |
| 任务类型配置 | 管理任务类型列表 | 12种 |
| 节假日管理 | 管理节假日和工作日历 | 中国法定节假日 |
| 组织架构树 | 可视化管理组织架构 | - |

### 4.2 项目类型默认值

| 序号 | 项目类型 | 编码 |
|------|---------|------|
| 1 | 产品开发 | product_dev |
| 2 | 职能管理 | func_mgmt |
| 3 | 物料改代 | material_sub |
| 4 | 质量处理 | quality_handle |

### 4.3 任务类型默认值

| 序号 | 任务类型 | 编码 |
|------|---------|------|
| 1 | 固件 | firmware |
| 2 | 板卡 | board |
| 3 | 驱动 | driver |
| 4 | 接口类 | interface |
| 5 | 硬件恢复包 | hw_recovery |
| 6 | 物料导入 | material_import |
| 7 | 物料改代 | material_sub |
| 8 | 系统设计 | sys_design |
| 9 | 核心风险 | core_risk |
| 10 | 接口人 | contact |
| 11 | 职能任务 | func_task |
| 12 | 其它 | other |

### 4.4 配置API

**来源**: API_SPECIFICATION L329-331

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/config/project-types | 获取项目类型列表 |
| POST | /api/config/project-types | 更新项目类型列表 |
| GET | /api/config/task-types | 获取任务类型列表 |
| POST | /api/config/task-types | 更新任务类型列表 |
| GET | /api/config/holidays | 获取节假日列表 |
| POST | /api/config/holidays | 更新节假日配置 |
| GET | /api/config/organization | 获取组织架构树 |
| POST | /api/config/organization | 更新组织架构 |

---

## 5. 导入导出

### 5.1 UI决策汇总

**来源**: UI_Requirement L3432-3593

| 决策点 | 最终选择 | 说明 |
|--------|----------|------|
| 文件上传方式 | 拖拽 + 点击双支持 | 灵活性强 |
| 导入进度显示 | 页面内进度条 | 不遮挡内容 |
| 错误处理展示 | 对话框内列表 | 立即反馈 |
| 导出选项布局 | 对话框 | 符合用户习惯 |
| 字段选择方式 | 拖拽排序 | 可调整列顺序 |
| 导出格式选择 | 单选按钮 | 直观明确 |
| 进度对话框 | 可取消 | 用户可控 |
| 四领域入口 | 工具栏下拉菜单 | 节省空间 |

### 5.2 四个导入导出领域

| 领域 | 导出内容 | 导入内容 | 入口位置 |
|------|----------|----------|----------|
| 项目管理 | 项目、里程碑、成员 | 同上 | 项目列表工具栏 |
| 任务管理 | WBS任务、依赖、进度 | 同上 | 任务管理工具栏 |
| 组织权限 | 部门、成员、角色 | 同上 | 成员管理工具栏 |
| 系统管理 | 配置项、节假日 | 同上 | 配置页工具栏 |

### 5.3 导入流程

```
1. 选择文件 → 解析 → 校验 → 发现错误?
   ↓
   暂停提示用户 → 用户选择: 继续/取消
   ↓
2. 智能合并 → 写入数据库 → 完成提示
```

### 5.4 导出流程

```
1. 选择领域 → 选择字段(拖拽排序) → 选择格式(Excel/CSV/JSON)
2. 生成文件 → 下载
```

### 5.5 导入导出API

**来源**: API_SPECIFICATION L358-370

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | /api/import/projects | 导入项目数据 |
| POST | /api/import/tasks | 导入任务数据 |
| POST | /api/import/members | 导入成员数据 |
| POST | /api/import/config | 导入系统配置 |
| GET | /api/export/projects | 导出项目数据 |
| GET | /api/export/tasks | 导出任务数据 |
| GET | /api/export/members | 导出成员数据 |
| GET | /api/export/config | 导出系统配置 |
| GET | /api/templates/:type | 下载导入模板 |

---

## 6. API定义

### 6.1 仪表板API

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/dashboard/stats | 获取首页统计数据 | PROJECT_VIEW |
| GET | /api/dashboard/trends | 获取趋势数据 | PROJECT_VIEW |
| GET | /api/dashboard/urgent-tasks | 获取紧急任务列表 | TASK_VIEW |

### 6.2 报表分析API

**来源**: API_SPECIFICATION L314-322

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/reports/project-progress | 项目进度报表 | PROJECT_VIEW |
| GET | /api/reports/task-statistics | 任务统计报表 | TASK_VIEW |
| GET | /api/reports/delay-analysis | 延期分析报表 | TASK_VIEW |
| GET | /api/reports/member-analysis | 成员任务分析 | MEMBER_VIEW |
| GET | /api/reports/:type/export | 导出Excel | 按报表类型 |

---

## 7. SQL查询优化建议

### 7.1 分页查询优化

```sql
-- 使用覆盖索引避免回表
SELECT t.id, t.name, t.status, t.start_date
FROM wbs_tasks t
WHERE t.project_id = ?
ORDER BY t.created_at DESC
LIMIT 20 OFFSET 0;
```

### 7.2 聚合查询优化

```sql
-- 使用预计算汇总表（推荐）
CREATE TABLE task_summary_daily (
  project_id VARCHAR(36),
  summary_date DATE,
  total_count INT,
  completed_count INT,
  PRIMARY KEY (project_id, summary_date)
);

-- 查询时直接读取汇总表
SELECT * FROM task_summary_daily
WHERE project_id = ? AND summary_date >= ?;
```

### 7.3 索引建议

| 索引 | 用途 |
|------|------|
| `wbs_tasks(project_id, status, created_at)` | 任务状态统计 |
| `wbs_tasks(project_id, assignee_id)` | 成员任务分配 |
| `audit_logs(created_at, user_id)` | 审计日志查询 |
| `projects(status, project_type)` | 项目列表筛选 |

### 7.4 报表查询示例

```sql
-- 项目进度统计（单次查询）
SELECT
  p.id,
  p.name,
  COUNT(t.id) as total_tasks,
  SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_tasks,
  ROUND(
    SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(t.id), 0),
    1
  ) as progress_percent
FROM projects p
LEFT JOIN wbs_tasks t ON t.project_id = p.id
WHERE p.id = ?
GROUP BY p.id, p.name;
```

---

## 8. 组件设计

### 7.1 前端组件结构

```
src/components/analytics/
├── Dashboard/
│   ├── DashboardPage.tsx        # 首页工作台
│   ├── StatsCard.tsx            # 统计卡片
│   ├── TrendChart.tsx           # 趋势图表
│   ├── StatusPieChart.tsx       # 状态分布饼图
│   └── UrgentTasksCard.tsx      # 紧急任务卡片
├── Reports/
│   ├── ReportsPage.tsx          # 报表分析页面
│   ├── ReportTabs.tsx           # 报表Tab导航
│   ├── ProjectProgressReport.tsx
│   ├── TaskStatisticsReport.tsx
│   ├── DelayAnalysisReport.tsx
│   └── MemberAnalysisReport.tsx
├── Config/
│   ├── ConfigPage.tsx           # 配置管理页面
│   ├── ProjectTypesConfig.tsx   # 项目类型配置
│   ├── TaskTypesConfig.tsx      # 任务类型配置
│   └── HolidaysConfig.tsx       # 节假日配置
└── ImportExport/
    ├── ImportDialog.tsx         # 导入对话框
    ├── ExportDialog.tsx         # 导出对话框
    ├── FileUploadZone.tsx       # 文件上传区域
    └── FieldSelector.tsx        # 字段选择器
```

### 7.2 报表页面组件

```tsx
// ReportsPage.tsx
const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportType>('project-progress');

  const renderReport = () => {
    switch (activeTab) {
      case 'project-progress':
        return <ProjectProgressReport />;
      case 'task-statistics':
        return <TaskStatisticsReport />;
      case 'delay-analysis':
        return <DelayAnalysisReport />;
      case 'member-analysis':
        return <MemberAnalysisReport />;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="project-progress">项目进度报表</TabsTrigger>
          <TabsTrigger value="task-statistics">任务统计报表</TabsTrigger>
          <TabsTrigger value="delay-analysis">延期分析报表</TabsTrigger>
          <TabsTrigger value="member-analysis">成员任务分析</TabsTrigger>
        </TabsList>
      </Tabs>

      {renderReport()}
    </div>
  );
};
```

---

## 8. 开发检查清单

### 8.1 后端API实现

- [ ] `GET /api/dashboard/stats` - 首页统计
- [ ] `GET /api/dashboard/trends` - 趋势数据
- [ ] `GET /api/dashboard/urgent-tasks` - 紧急任务
- [ ] `GET /api/reports/project-progress` - 项目进度报表
- [ ] `GET /api/reports/task-statistics` - 任务统计报表
- [ ] `GET /api/reports/delay-analysis` - 延期分析报表
- [ ] `GET /api/reports/member-analysis` - 成员分析报表
- [ ] `GET /api/reports/:type/export` - 报表导出
- [ ] `GET /api/config/project-types` - 项目类型配置
- [ ] `POST /api/config/project-types` - 更新项目类型
- [ ] `GET /api/config/task-types` - 任务类型配置
- [ ] `POST /api/config/task-types` - 更新任务类型
- [ ] 导入导出服务

### 8.2 前端组件

- [ ] DashboardPage
- [ ] StatsCard
- [ ] TrendChart
- [ ] StatusPieChart
- [ ] UrgentTasksCard
- [ ] ReportsPage
- [ ] 4个报表组件
- [ ] ConfigPage
- [ ] ImportDialog
- [ ] ExportDialog
- [ ] FileUploadZone
- [ ] FieldSelector

### 8.3 测试用例

- [ ] 报表数据准确性测试
- [ ] 导入导出功能测试
- [ ] 配置保存测试
- [ ] 图表渲染测试

---

## 9. 完整性验证

### 9.1 FINAL_REQUIREMENTS 对照

| 需求项 | 原文位置 | 覆盖状态 |
|--------|---------|:--------:|
| 数据看板 | L93-94 | ✅ |
| 报表分析（4种） | L1951-2000 | ✅ |
| 系统配置（4项） | L2002-2036 | ✅ |
| 搜索筛选 | L109, L2044 | ✅ |
| 导入导出 | L2057-2111 | ✅ |
| API清单 | L2602-2619 | ✅ |

### 9.2 UI_Requirement 对照

| UI需求项 | 原文位置 | 覆盖状态 |
|----------|---------|:--------:|
| 仪表板模块 | L2988-3009 | ✅ |
| 报表分析模块 | L3012-3110 | ✅ |
| 导入导出模块 | L3432-3593 | ✅ |

---

## 相关文档

- [模块需求文档](../../../requirements/modules/REQ_07_analytics.md)
- [系统架构总览](../SYSTEM_OVERVIEW.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
