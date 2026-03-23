# 模块需求：认证权限模块（更新版）

> **创建时间**: 2026-03-22
> **基于文档**: REQ_01_auth_permission.md
> **更新原因**: 修正权限矩阵逻辑问题
> **状态**: ✅ 完成

---

## 更新说明

本文档是对 `REQ_01_auth_permission.md` 的修订，修正了以下问题：

1. **dept_manager 权限不完整** - 原文档中 dept_manager 不能创建/删除项目和任务，与角色定位矛盾
2. **tech_manager 权限过多** - tech_manager 不应有组织架构和系统设置权限
3. **缺少组织架构权限定义** - 新增 DEPT_* 权限
4. **缺少系统配置权限定义** - 新增 CAPABILITY_CONFIG、TASK_TYPE_CONFIG、HOLIDAY_CONFIG
5. **缺少授权管理权限定义** - 新增 TEAM_AUTHORIZATION

---

## 1. 角色定义（保持不变）

| 角色代码 | 中文名称 | 描述 | 可编辑WBS | 数据访问范围 |
|---------|----------|------|----------|------------|
| admin | 系统管理员 | 系统最高权限 | ✅ | 所有项目数据 |
| tech_manager | 技术经理 | 技术部门管理者 | ✅ | 本技术组项目数据 |
| dept_manager | 部门经理 | 业务部门管理者 | ✅ | 本部门项目数据 |
| engineer | 工程师 | 普通开发人员 | ✅* | 参与的项目数据 |

*注：工程师编辑计划相关字段（开始日期、结束日期、工期、前置任务、提前/落后天数）需要审批

**组织架构关系：**
```
部门
├── 部门经理（dept_manager）
│   ├── 技术组1
│   │   ├── 技术经理（tech_manager）
│   │   ├── 工程师A
│   │   └── 工程师B
│   ├── 技术组2
│   │   ├── 技术经理（tech_manager）
│   │   ├── 工程师C
│   │   └── 工程师D
│   └── ...
```

---

## 2. 权限类别与细粒度权限（更新）

### 2.1 组织架构权限（4种）

| 权限代码 | 说明 |
|----------|------|
| DEPT_VIEW | 查看部门架构 |
| DEPT_CREATE | 创建部门 |
| DEPT_EDIT | 编辑部门 |
| DEPT_DELETE | 删除部门 |

### 2.2 项目权限（4种）

| 权限代码 | 说明 |
|----------|------|
| PROJECT_VIEW | 查看项目 |
| PROJECT_CREATE | 创建项目 |
| PROJECT_EDIT | 编辑项目 |
| PROJECT_DELETE | 删除项目 |

### 2.3 任务权限（5种）

| 权限代码 | 说明 |
|----------|------|
| TASK_VIEW | 查看任务 |
| TASK_CREATE | 创建任务 |
| TASK_EDIT | 编辑任务 |
| TASK_DELETE | 删除任务 |
| TASK_ASSIGN | 分配任务 |

### 2.4 系统设置权限（7种）

| 权限代码 | 说明 |
|----------|------|
| USER_MANAGE | 用户管理（仅 admin） |
| SYSTEM_CONFIG | 系统配置（仅 admin） |
| AUDIT_LOG_VIEW | 审计日志查看 |
| CAPABILITY_CONFIG | 能力模型配置 |
| TASK_TYPE_CONFIG | 任务类型配置 |
| HOLIDAY_CONFIG | 节假日配置 |
| TEAM_AUTHORIZATION | 技术组授权管理 |

---

## 3. 权限矩阵（更新）

| 权限类别 | 权限 | admin | dept_manager | tech_manager | engineer |
|----------|------|:-----:|:------------:|:-----------:|:--------:|
| **组织架构** | DEPT_VIEW | ✅ | ✅ | ❌ | ❌ |
| | DEPT_CREATE | ✅ | ✅ | ❌ | ❌ |
| | DEPT_EDIT | ✅ | ✅ | ❌ | ❌ |
| | DEPT_DELETE | ✅ | ✅ | ❌ | ❌ |
| **项目权限** | PROJECT_VIEW | ✅ | ✅ | ✅ | ✅ |
| | PROJECT_CREATE | ✅ | ✅ | ✅ | ❌ |
| | PROJECT_EDIT | ✅ | ✅ | ✅ | ❌ |
| | PROJECT_DELETE | ✅ | ✅ | ✅ | ❌ |
| **任务权限** | TASK_VIEW | ✅ | ✅ | ✅ | ✅ |
| | TASK_CREATE | ✅ | ✅ | ✅ | ❌ |
| | TASK_EDIT | ✅ | ✅ | ✅ | ✅* |
| | TASK_DELETE | ✅ | ✅ | ✅ | ❌ |
| | TASK_ASSIGN | ✅ | ✅ | ✅ | ❌ |
| **系统设置** | USER_MANAGE | ✅ | ❌ | ❌ | ❌ |
| | SYSTEM_CONFIG | ✅ | ❌ | ❌ | ❌ |
| | AUDIT_LOG_VIEW | ✅ | ✅ | ❌ | ❌ |
| | CAPABILITY_CONFIG | ✅ | ✅ | ❌ | ❌ |
| | TASK_TYPE_CONFIG | ✅ | ✅ | ❌ | ❌ |
| | HOLIDAY_CONFIG | ✅ | ✅ | ❌ | ❌ |
| | TEAM_AUTHORIZATION | ✅ | ✅ | ❌ | ❌ |

*注：工程师编辑任务计划字段需要审批

---

## 4. 数据访问规则（保持不变）

### 规则1：项目数据隔离

- 只能看到自己参与的项目的数据
- 项目成员关系由系统角色控制（admin/dept_manager/tech_manager）
- 系统管理员可以查看所有数据

### 规则2：审批权限

- 工程师修改计划 → 需要审批
- 技术经理修改 → 直接生效
- 部门经理修改 → 直接生效
- 系统管理员修改 → 直接生效

### 规则3：数据访问范围明细

| 角色 | 数据访问范围 | 人员管理范围 |
|------|-------------|-------------|
| admin | 所有项目、任务 | 所有人员 |
| dept_manager | 本部门所有人员涉及的项目、任务 | 本部门所有人员 |
| tech_manager | 本技术组所有人员涉及的项目、任务 | 本技术组人员 |
| tech_manager（授权） | 部门经理授权的其他技术组的项目、任务 | 授权范围内的其他技术组人员 |
| engineer | 参与的项目、任务 | 无 |

---

## 5. 变更汇总

| 权限 | 原需求 | 修正后 |
|------|--------|--------|
| dept_manager PROJECT_CREATE | ❌ | ✅ |
| dept_manager PROJECT_DELETE | ❌ | ✅ |
| dept_manager TASK_CREATE | ❌ | ✅ |
| dept_manager TASK_DELETE | ❌ | ✅ |
| tech_manager DEPT_* | ✅（隐含） | ❌ |
| tech_manager AUDIT_LOG_VIEW | ✅ | ❌ |
| 新增 DEPT_* | - | admin ✅, dept_manager ✅ |
| 新增 CAPABILITY_CONFIG | - | admin ✅, dept_manager ✅ |
| 新增 TASK_TYPE_CONFIG | - | admin ✅, dept_manager ✅ |
| 新增 HOLIDAY_CONFIG | - | admin ✅, dept_manager ✅ |
| 新增 TEAM_AUTHORIZATION | - | admin ✅, dept_manager ✅ |

---

## 6. 权限说明

### 6.1 tech_manager 权限边界

技术经理的职责是**管理技术组内的项目和任务**，不包括：
- 组织架构管理（部门、成员的增删）
- 系统设置管理（能力模型、任务类型、节假日配置）
- 审计日志查看
- 技术组授权管理

### 6.2 dept_manager 权限边界

部门经理的职责是**管理部门整体的人、事、设置**，包括：
- 组织架构管理（部门、成员的增删改查）
- 项目和任务管理
- 系统设置管理（能力模型、任务类型、节假日配置）
- 审计日志查看
- 技术组授权管理

### 6.3 设置模块可见性

| 设置项 | admin | dept_manager | tech_manager | engineer |
|--------|:-----:|:------------:|:-----------:|:--------:|
| 用户管理 | ✅ | ❌ | ❌ | ❌ |
| 组织架构 | ✅ | ✅ | ❌ | ❌ |
| 能力模型 | ✅ | ✅ | ❌ | ❌ |
| 任务类型 | ✅ | ✅ | ❌ | ❌ |
| 节假日 | ✅ | ✅ | ❌ | ❌ |
| 审计日志 | ✅ | ✅ | ❌ | ❌ |
| 系统配置 | ✅ | ❌ | ❌ | ❌ |

---

## 完整性验证

- [x] 修正了 dept_manager 权限不完整问题
- [x] 修正了 tech_manager 权限过多问题
- [x] 新增组织架构权限定义
- [x] 新增系统配置权限定义
- [x] 新增授权管理权限定义
- [x] 明确了设置模块的可见性

---

**文档结束**
