# 模块需求：分析模块 (07-analytics)

> **模块编号**: 07
> **模块名称**: 分析模块（索引）

---

## 模块概述

分析模块是系统的数据可视化和配置管理核心，包含以下子模块：

| 子模块 | 文档 | 说明 |
|--------|------|------|
| 📊 仪表板 | [REQ_07a_dashboard.md](./REQ_07a_dashboard.md) | 数据看板、角色差异化仪表板 |
| 📈 报表分析 | [REQ_07b_reports.md](./REQ_07b_reports.md) | 5种报表 + 搜索筛选 |
| ⚙️ 系统管理 | [REQ_07c_system.md](./REQ_07c_system.md) | 系统配置 + 导入导出 |

---

## 模块定位

### 仪表板 — 业务定位

**定位**：用户登录后第一眼看到的页面，目标是**快速发现需要关注的核心问题**。

| 维度 | 说明 |
|------|------|
| 使用频率 | 每天多次，打开系统即进入 |
| 用户心态 | 被动接收，扫视状态 |
| 核心价值 | 让用户不用翻页就知道有没有问题 |
| 信息层次 | 状态概览 → 异常信号 → 快速跳转 |

### 报表分析 — 业务定位

**定位**：数据分析与呈现工具，用户**带着问题来，找到答案走**。

| 维度 | 说明 |
|------|------|
| 使用频率 | 按需，周报/月报/遇到问题时 |
| 用户心态 | 主动查询，有明确目的 |
| 核心价值 | 按自己的条件分析数据，得出结论 |
| 信息层次 | 筛选条件 → 统计摘要 → 明细数据 → 导出 |

**仪表板与报表的关系**：
```
仪表板（发现异常）→ 点击跳转 → 报表（深入分析原因）
```

---

## 角色权限汇总

### 模块可见性

| 角色 | 仪表板 | 报表分析 | 系统配置 | 导入导出 |
|------|:------:|:--------:|:--------:|:--------:|
| admin | ✅ | ✅ | ✅ | ✅ |
| dept_manager | ✅ | ✅ | ❌ | ✅ |
| tech_manager | ✅ | ✅ | ❌ | ✅ |
| engineer | ✅ | ❌ | ❌ | ❌ |

### 数据访问范围

| 角色 | 仪表板数据范围 | 报表数据范围 |
|------|---------------|-------------|
| admin | 全局 | 全部 |
| dept_manager | 本部门 | 本部门 |
| tech_manager | 本技术组 + 被授权技术组 | 本技术组 + 被授权技术组 |
| engineer | 个人 | 不可见 |

---

## API 汇总

### 仪表板 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/dashboard/stats | 获取首页统计数据 |
| GET | /api/dashboard/trends | 获取趋势数据 |
| GET | /api/dashboard/urgent-tasks | 获取紧急任务列表 |

### 报表分析 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/reports/project-progress | 项目进度报表 |
| GET | /api/reports/task-statistics | 任务统计报表 |
| GET | /api/reports/delay-analysis | 延期分析报表 |
| GET | /api/reports/member-analysis | 成员任务分析 |
| GET | /api/reports/resource-efficiency | 资源效能分析报表 |
| GET | /api/reports/:type/export | 导出Excel |

### 系统配置 API

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

### 导入导出 API

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

## 数据需求

### 核心数据表

| 表名 | 说明 | 用途 |
|------|------|------|
| projects | 项目表 | 报表数据源 |
| wbs_tasks | WBS任务表 | 报表数据源 |
| users | 用户表 | 成员分析数据源 |
| milestones | 里程碑表 | 项目进度报表 |
| delay_records | 延期记录表 | 延期分析报表 |
| audit_logs | 审计日志表 | 系统日志查询 |
| permissions_config | 权限配置表 | 系统配置 |

---

## 实现状态汇总

| 功能 | 优先级 | 工作量 | 状态 |
|------|--------|--------|------|
| 数据看板 | P0 | 3人日 | ✅ 已实现 |
| 报表分析 | P1 | 10人日 | ✅ 已实现 |
| 资源效能分析 | P1 | 5人日 | ✅ 已实现 |
| 搜索筛选 | P2 | 2人日 | ✅ 已实现 |
| 系统配置 | P1 | 8人日 | ⚠️ 部分实现（需开发配置界面） |
| 导入导出 | P2 | 8人日 | ⏳ 待开发 |

---

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-03-29 | 初始版本 |
| v1.1 | 2026-04-03 | 增加双重分析维度（静态/动态） |
| v1.2 | 2026-04-04 | 增加任务类型分布、预估准确性、资源效能分析报表 |
| v1.3 | 2026-04-05 | 增加仪表板UI风格要求（专业工具软件风格） |
| v1.4 | 2026-04-06 | 增加角色差异化仪表板设计（风险优先原则） |
| v1.5 | 2026-04-06 | **文档拆分**：拆分为 REQ_07a_dashboard.md、REQ_07b_reports.md、REQ_07c_system.md 三个子文档，本文档保留为索引 |
| v1.6 | 2026-04-06 | **报表分析模块完善**：数据维度规格、UI风格要求、角色差异化设计、数据表格列定义、图表数据规格 |
