# 数据模型设计

> **文档版本**: 1.0
> **最后更新**: 2026-03-17
> **状态**: ✅ 完成

---

## 1. 实体关系图

### 1.1 核心实体关系

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  departments │       │   projects   │
│   (用户)      │       │   (部门)      │       │   (项目)     │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │ belongs_to           │ has_many             │ has_many
       │                      │                      │
       │               ┌──────┴───────┐              │
       │               │              │              │
       ▼               ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   sessions   │ │    users     │ │project_members│ │  milestones  │
│   (会话)      │ │   (成员)      │ │  (项目成员)   │ │  (里程碑)    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
                                             │
                                             │
       ┌─────────────────────────────────────┤
       │                                     │
       ▼                                     ▼
┌──────────────┐                    ┌──────────────┐
│  wbs_tasks   │                    │  timelines   │
│  (WBS任务)    │                    │  (时间线)     │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ has_many                          │ has_many
       │                                   │
       ▼                                   ▼
┌──────────────┐                    ┌──────────────┐
│plan_changes  │                    │timeline_tasks│
│ (计划变更)    │                    │ (时间线任务)  │
└──────────────┘                    └──────────────┘
```

### 1.2 能力模型关系

```
┌──────────────────┐
│ capability_models │  (能力模型)
│     (模型)        │
└────────┬─────────┘
         │
         │ has_many
         │
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌──────────────────┐     ┌─────────────────────────┐
│member_capabilities│     │task_type_model_mapping │
│  (成员能力评定)    │     │ (任务类型-模型映射)     │
└────────┬─────────┘     └─────────────────────────┘
         │                          │
         │ belongs_to               │ maps_to
         │                          │
         ▼                          ▼
┌──────────────────┐     ┌──────────────────┐
│      users       │     │    task_types    │
│     (成员)        │     │   (任务类型)      │
└──────────────────┘     └──────────────────┘
```

---

## 2. 核心表结构

### 2.1 用户与认证

#### users表（用户）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键（自增） |
| username | String(50) | ✅ | - | 用户名（工号） |
| password | String(255) | ✅ | - | 密码（bcrypt加密） |
| real_name | String(50) | ✅ | - | 真实姓名 |
| role | Enum | ✅ | 'engineer' | 角色 |
| department_id | Integer | ❌ | NULL | 部门ID |
| email | String(100) | ❌ | NULL | 邮箱 |
| phone | String(20) | ❌ | NULL | 电话 |
| is_active | Boolean | ✅ | TRUE | 是否激活 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**索引**:
- `idx_users_username` ON (username) UNIQUE
- `idx_users_department` ON (department_id)
- `idx_users_role` ON (role)

**角色枚举值**:
- `admin` - 系统管理员
- `tech_manager` - 技术经理
- `dept_manager` - 部门经理
- `engineer` - 工程师

#### sessions表（会话）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 会话ID |
| user_id | Integer | ✅ | - | 用户ID |
| ip_address | String(45) | ❌ | NULL | IP地址 |
| user_agent | String(500) | ❌ | NULL | 用户代理 |
| expires_at | Timestamp | ✅ | - | 过期时间 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| terminated_at | Timestamp | ❌ | NULL | 终止时间 |
| termination_reason | String(100) | ❌ | NULL | 终止原因 |

**索引**:
- `idx_sessions_user` ON (user_id)
- `idx_sessions_expires` ON (expires_at)

### 2.2 组织架构

#### departments表（部门）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键（自增） |
| name | String(100) | ✅ | - | 部门名称 |
| parent_id | Integer | ❌ | NULL | 父部门ID |
| manager_id | Integer | ❌ | NULL | 部门负责人ID |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**索引**:
- `idx_departments_parent` ON (parent_id)
- `idx_departments_manager` ON (manager_id)

### 2.3 项目管理

#### projects表（项目）

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
| task_count | Integer | ✅ | 0 | 任务总数 |
| completed_task_count | Integer | ✅ | 0 | 已完成任务数 |
| member_ids | Text | ❌ | NULL | 成员ID列表（逗号分隔） |
| version | Integer | ✅ | 1 | 版本号（乐观锁） |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**索引**:
- `idx_projects_code` ON (code) UNIQUE
- `idx_projects_status` ON (status)
- `idx_projects_type` ON (project_type)
- `idx_projects_dates` ON (planned_start_date, planned_end_date)

#### project_members表（项目成员）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键（自增） |
| project_id | String(36) | ✅ | - | 项目ID |
| user_id | Integer | ✅ | - | 用户ID |
| role | String(50) | ❌ | NULL | 项目角色 |
| joined_at | Timestamp | ✅ | NOW() | 加入时间 |

**索引**:
- `idx_pm_project` ON (project_id)
- `idx_pm_user` ON (user_id)
- `idx_pm_unique` ON (project_id, user_id) UNIQUE

#### milestones表（里程碑）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| project_id | String(36) | ✅ | - | 关联项目 |
| name | String(100) | ✅ | - | 里程碑名称 |
| target_date | Date | ✅ | - | 目标日期 |
| description | Text | ❌ | NULL | 描述 |
| status | Enum | ✅ | 'pending' | 状态 |
| completion_percentage | Integer | ✅ | 0 | 完成百分比 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

### 2.4 任务管理

#### wbs_tasks表（WBS任务）

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
- `idx_tasks_project` ON (project_id)
- `idx_tasks_parent` ON (parent_id)
- `idx_tasks_assignee` ON (assignee_id)
- `idx_tasks_status` ON (status)
- `idx_tasks_dates` ON (start_date, end_date)
- `idx_tasks_wbs` ON (project_id, wbs_code)

**任务状态枚举值（9种）**:
1. `pending_approval` - 待审批
2. `rejected` - 已驳回
3. `not_started` - 未开始
4. `in_progress` - 进行中
5. `early_completed` - 提前完成
6. `on_time_completed` - 按时完成
7. `delay_warning` - 延期预警
8. `delayed` - 已延迟
9. `overdue_completed` - 超期完成

**优先级枚举值**:
- `urgent` - 紧急
- `high` - 高
- `medium` - 中
- `low` - 低

### 2.5 能力模型

#### capability_models表（能力模型）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| name | String(50) | ✅ | - | 模型名称 |
| description | Text | ❌ | NULL | 模型描述 |
| dimensions | JSON | ✅ | - | 评价维度数组 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |
| created_by | Integer | ✅ | - | 创建人ID |

**dimensions字段结构**:
```json
[
  {"id": "dim-001", "name": "固件开发", "weight": 35},
  {"id": "dim-002", "name": "驱动开发", "weight": 30},
  {"id": "dim-003", "name": "系统设计", "weight": 20},
  {"id": "dim-004", "name": "问题分析", "weight": 15}
]
```

#### member_capabilities表（成员能力评定）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| user_id | Integer | ✅ | - | 成员ID |
| model_id | String(36) | ✅ | - | 能力模型ID |
| model_name | String(50) | ✅ | - | 冗余字段 |
| association_label | String(50) | ❌ | NULL | 关联说明 |
| dimension_scores | JSON | ✅ | - | 维度得分数组 |
| overall_score | Integer | ✅ | 0 | 加权平均分（0-100） |
| evaluated_at | Timestamp | ✅ | NOW() | 评定时间 |
| evaluated_by | Integer | ✅ | - | 评定人ID |
| notes | Text | ❌ | NULL | 备注 |

### 2.6 工作流

#### plan_changes表（计划变更）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| task_id | String(36) | ✅ | - | 关联任务 |
| user_id | Integer | ✅ | - | 申请人ID |
| change_type | String(50) | ✅ | - | 变更类型 |
| old_value | Text | ❌ | NULL | 变更前值 |
| new_value | Text | ❌ | NULL | 变更后值 |
| reason | Text | ✅ | - | 变更原因 |
| status | Enum | ✅ | 'pending' | 状态 |
| approver_id | Integer | ❌ | NULL | 审批人ID |
| approved_at | Timestamp | ❌ | NULL | 审批时间 |
| rejection_reason | Text | ❌ | NULL | 驳回原因 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |

**变更状态枚举值**:
- `pending` - 待审批
- `approved` - 已通过
- `rejected` - 已驳回

#### delay_records表（延期记录）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| task_id | String(36) | ✅ | - | 关联任务 |
| delay_days | Integer | ✅ | - | 延期天数 |
| reason | Text | ✅ | - | 延期原因 |
| recorded_by | Integer | ✅ | - | 记录人ID |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |

### 2.7 审计与版本

#### audit_logs表（审计日志）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| user_id | Integer | ❌ | NULL | 操作用户ID |
| action | String(50) | ✅ | - | 操作类型 |
| table_name | String(50) | ✅ | - | 操作表名 |
| record_id | String(36) | ✅ | - | 记录ID |
| old_value | Text | ❌ | NULL | 变更前值 |
| new_value | Text | ❌ | NULL | 变更后值 |
| ip_address | String(45) | ❌ | NULL | 操作IP |
| user_agent | String(500) | ❌ | NULL | 用户代理 |
| created_at | Timestamp | ✅ | NOW() | 操作时间 |
| node_id | String(36) | ❌ | NULL | 节点ID |
| session_id | String(36) | ❌ | NULL | 会话ID |

#### data_versions表（版本历史）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| table_name | String(50) | ✅ | - | 表名 |
| record_id | String(36) | ✅ | - | 记录ID |
| version | Integer | ✅ | - | 版本号 |
| data | Text | ✅ | - | 数据快照（JSON） |
| changed_by | Integer | ✅ | - | 变更人ID |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |

---

## 3. 表统计

### 3.1 核心表清单（17个）

| # | 表名 | 说明 | 模块组 |
|---|------|------|--------|
| 1 | users | 用户表 | 01-auth-permission |
| 2 | sessions | 会话表 | 01-auth-permission |
| 3 | audit_logs | 审计日志表 | 01-auth-permission |
| 4 | permissions_config | 权限配置表 | 01-auth-permission |
| 5 | permission_history | 权限变更历史表 | 01-auth-permission |
| 6 | departments | 部门表 | 02-organization |
| 7 | capability_models | 能力模型表 | 02-organization |
| 8 | member_capabilities | 成员能力评定表 | 02-organization |
| 9 | task_type_model_mapping | 任务类型-模型映射表 | 02-organization |
| 10 | projects | 项目表 | 03-project |
| 11 | project_members | 项目成员关联表 | 03-project |
| 12 | milestones | 里程碑表 | 03-project |
| 13 | timelines | 时间轴表 | 03-project |
| 14 | timeline_tasks | 时间轴任务表 | 03-project |
| 15 | holidays | 节假日表 | 03-project |
| 16 | wbs_tasks | WBS任务表 | 04-task |
| 17 | plan_changes | 计划变更记录表 | 05-workflow |
| 18 | delay_records | 延期记录表 | 05-workflow |
| 19 | data_versions | 版本历史表 | 06-collaboration |

---

## 4. 数据迁移策略

### 4.1 迁移文件命名规范

```
NNN-description.ts

例如：
001-initial-schema.ts
002-add-sessions-table.ts
003-add-audit-logs.ts
```

### 4.2 迁移文件结构

```typescript
import { Migration } from '../types';

export const migration: Migration = {
  version: 1,
  name: 'initial-schema',
  up: async (db) => {
    // 创建表
  },
  down: async (db) => {
    // 回滚
  }
};
```

---

## 相关文档

- [系统架构总览](./SYSTEM_OVERVIEW.md)
- [API规范设计](./API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
