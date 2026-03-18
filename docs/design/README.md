# 系统设计文档导航

> **最后更新**: 2026-03-17
> **状态**: ✅ 模块设计完成

---

## 📁 文档结构

```
docs/design/
├── README.md                    # 本文件 - 设计文档导航
├── SYSTEM_OVERVIEW.md           # 系统架构总览
├── DATA_MODEL.md                # 数据模型设计
├── API_SPECIFICATION.md         # API设计规范
│
├── modules/                     # 模块组设计
│   ├── 01-auth-permission/      # 认证权限模块组
│   │   └── DESIGN.md
│   ├── 02-organization/         # 组织架构模块组
│   │   └── DESIGN.md
│   ├── 03-project/              # 项目管理模块组
│   │   └── DESIGN.md
│   ├── 04-task/                 # 任务管理模块组
│   │   └── DESIGN.md
│   ├── 05-workflow/             # 工作流模块组
│   │   └── DESIGN.md
│   ├── 06-collaboration/        # 协作模块组
│   │   └── DESIGN.md
│   └── 07-analytics/            # 分析模块组
│       └── DESIGN.md
│
└── shared/                      # 共享设计
    ├── ERROR_HANDLING.md        # 错误处理规范
    └── LOGGING.md               # 日志规范
```

---

## 🗺️ 模块组划分

| 模块组 | 包含模块 | 依赖 | 开发顺序 | 需求文档 |
|--------|---------|------|---------|----------|
| 01-auth-permission | 认证、用户管理、权限、会话、审计日志 | 无 | 1 | [REQ_01](../requirements/modules/REQ_01_auth_permission.md) |
| 02-organization | 组织架构、成员管理、能力模型 | 01 | 2 | [REQ_02](../requirements/modules/REQ_02_organization.md) |
| 03-project | 项目管理、里程碑、时间线管理、时间设置、标签 | 02 | 3 | [REQ_03](../requirements/modules/REQ_03_project.md) |
| 04-task | WBS任务、任务依赖 | 03 | 4 | [REQ_04](../requirements/modules/REQ_04_task.md) |
| 05-workflow | 计划变更、审批流程、自动化规则、通知 | 04 | 5 | [REQ_05](../requirements/modules/REQ_05_workflow.md) |
| 06-collaboration | 实时协作、版本控制、批量操作、缓存、附件 | 01-04 | 6（并行） | [REQ_06](../requirements/modules/REQ_06_collaboration.md) |
| 07-analytics | 数据看板、报表分析、搜索筛选、系统配置、导入导出 | 所有数据层 | 7 | [REQ_07](../requirements/modules/REQ_07_analytics.md) |

---

## 📋 设计文档状态

### 架构设计文档

| 文档 | 状态 | 说明 |
|------|------|------|
| [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) | ✅ 完成 | 系统架构总览 |
| [DATA_MODEL.md](./DATA_MODEL.md) | ✅ 完成 | 数据模型设计 |
| [API_SPECIFICATION.md](./API_SPECIFICATION.md) | ✅ 完成 | API设计规范 |

### 模块设计文档

| 模块组 | 状态 | 说明 |
|--------|------|------|
| [01-auth-permission](./modules/01-auth-permission/DESIGN.md) | ✅ 完成 | 认证权限设计（登录/会话/权限/审计） |
| [02-organization](./modules/02-organization/DESIGN.md) | ✅ 完成 | 组织架构设计（部门/成员/能力模型） |
| [03-project](./modules/03-project/DESIGN.md) | ✅ 完成 | 项目管理设计（项目/里程碑/时间线/节假日） |
| [04-task](./modules/04-task/DESIGN.md) | ✅ 完成 | 任务管理设计（WBS任务/24列规格/9种状态/依赖关系） |
| [05-workflow](./modules/05-workflow/DESIGN.md) | ✅ 完成 | 工作流设计（审批/计划变更/延期管理/通知） |
| [06-collaboration](./modules/06-collaboration/DESIGN.md) | ✅ 完成 | 协作模块设计（实时同步/版本控制/批量操作/缓存） |
| [07-analytics](./modules/07-analytics/DESIGN.md) | ✅ 完成 | 分析模块设计（数据看板/报表/配置/导入导出） |

### 共享设计文档

| 文档 | 状态 | 说明 |
|------|------|------|
| [CONFIGURATION.md](./shared/CONFIGURATION.md) | ✅ 完成 | 环境配置指南 |
| [ERROR_HANDLING.md](./shared/ERROR_HANDLING.md) | ✅ 完成 | 错误处理规范 |
| [LOGGING.md](./shared/LOGGING.md) | ✅ 完成 | 日志规范 |
| [API_RATE_LIMITING.md](./shared/API_RATE_LIMITING.md) | ✅ 完成 | API限流配置规范 |

---

## 🔗 相关文档

### 原始需求文档（只读）
- [需求文档 v6.0](../requirements/FINAL_REQUIREMENTS_0316-2023.md)
- [UI规格书 v3.0](../requirements/UI_Requirement_0316-2023.md)

### 模块需求文档
- [REQ_01 认证权限模块](../requirements/modules/REQ_01_auth_permission.md)
- [REQ_02 组织架构模块](../requirements/modules/REQ_02_organization.md)
- [REQ_03 项目管理模块](../requirements/modules/REQ_03_project.md)
- [REQ_04 任务管理模块](../requirements/modules/REQ_04_task.md)
- [REQ_05 工作流模块](../requirements/modules/REQ_05_workflow.md)
- [REQ_06 协作模块](../requirements/modules/REQ_06_collaboration.md)
- [REQ_07 分析模块](../requirements/modules/REQ_07_analytics.md)

---

## 🚀 快速开始

### 设计文档使用指南

1. **了解系统架构**: 先阅读 [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)
2. **理解数据结构**: 再阅读 [DATA_MODEL.md](./DATA_MODEL.md)
3. **熟悉API规范**: 参考 [API_SPECIFICATION.md](./API_SPECIFICATION.md)
4. **开发具体模块**: 查看对应模块的 DESIGN.md

### 开发顺序建议

```
01-auth-permission (基础设施)
    ↓
02-organization (组织架构)
    ↓
03-project (项目管理)
    ↓
04-task (任务核心)
    ↓
05-workflow (流程层)
    ↓
06-collaboration (协作层) + 07-analytics (分析层)
```

---

## 📝 设计原则

### SOLID原则
- **S**: 单一职责 - 每个模块只负责一个功能领域
- **O**: 开闭原则 - 对扩展开放，对修改关闭
- **L**: 里氏替换 - 子类型可以替换父类型
- **I**: 接口隔离 - 接口专一，避免"胖接口"
- **D**: 依赖倒置 - 依赖抽象而非具体实现

### 架构原则
- **KISS**: 保持简单，避免过度设计
- **DRY**: 不重复，统一相似功能
- **YAGNI**: 只实现当前需要的功能

---

## 📊 技术栈

| 层次 | 技术选型 |
|------|---------|
| 前端 | React + TypeScript + Vite + shadcn/ui |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | MySQL 8.0+ |
| 缓存 | Redis + LRU 内存缓存降级 |
| 实时通信 | WebSocket |
| 日志 | Pino |

---

**维护者**: AI 开发团队
