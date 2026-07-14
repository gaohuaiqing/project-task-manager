# 新建任务责任人必填 - 设计文档

> 日期：2026-07-14
> 状态：已确认，待实现
> 关联：fixed2（未分配任务筛选）、服务器 Bug 修复闭环

## 背景

当前系统新建任务时，责任人（assignee）为可选项：

- 前端 `TaskForm`（`app/src/features/tasks/components/TaskForm.tsx`）责任人 Select 提供「未指定」选项（`value="none"` → `null`，`TaskForm.tsx:491`），**无任何必填校验**（`validateForm` 仅校验 `projectId`，`TaskForm.tsx:158-171`）
- 后端 `createTask`（`app/server/src/modules/task/service.ts:622`）仅校验 `project_id`、`description`（`service.ts:646-652`），INSERT 用 `data.assignee_id || null`（`service.ts:768`）允许空
- 系统存在一批 `assignee_id IS NULL` 的历史任务，并已实现「未分配任务」筛选逻辑（fixed2，`repository.ts:92-109`）

用户需求：**新建任务时责任人必填，否则创建不成功**，避免人为遗漏指派。

## 目标

- 手动新建任务（所有入口）必须指定责任人，否则前端拦截 + 后端拒绝
- 不影响 Excel 批量导入路径（导入允许空，保持现状）
- 不改动存量未分配任务（查询/筛选/显示逻辑保留）

## 范围边界

| 项 | 处理 |
|----|------|
| 手动新建（TaskForm） | ✅ 必填校验 |
| Excel 导入（`createTaskWithConnection`） | ❌ 不动，保持可空 |
| 存量 `assignee=NULL` 任务 | ❌ 不动 |
| 根任务 / 子任务 | ✅ 均必填（同一 TaskForm） |
| 未分配任务筛选（fixed2） | ❌ 保留 |

> 已与用户确认：仅手动新建必填，导入与存量不动。

## 方案：前端校验 + 后端兜底

纯前端校验可被 API 直接调用绕过，无法满足「创建不成功」。故采用**前端体验校验 + 后端兜底拒绝**的双重保障。

### 前端 `TaskForm.tsx`

1. **`validateForm`（158-171）**：在现有 `projectId` 校验后增加 `assigneeId` 必填分支，复用 `description` 的 errors 渲染模式（392-394）
2. **责任人 Select（481-507）**：
   - 移除 `value="none"` 的「未指定」选项（491）
   - Select 默认空值，placeholder 显示「请选择责任人」
   - Label（454-459）加红色 `*`
3. **智能推荐面板（513-588）**：保留不动（点击推荐即填入 `assigneeId`，有助满足必填）

### 后端 `service.ts` createTask（622）

在校验块（646-652，`project_id`/`description` 校验）后增加：

```ts
if (!data.assignee_id) {
  throw new ValidationError('请选择责任人');
}
```

- `createTaskWithConnection`（导入，1931）**不改动**

### 校验文案

前后端统一为「请选择责任人」。

## 改动点清单

| 文件 | 位置 | 改动 |
|------|------|------|
| `TaskForm.tsx` | `validateForm` 158-171 | 加 `assigneeId` 必填校验 |
| `TaskForm.tsx` | 责任人 Select 481-507 | 移除「未指定」选项、placeholder、Label 加 `*` |
| `TaskForm.tsx` | errors 渲染 392-394 | 复用模式显示 assignee 错误 |
| `service.ts` | `createTask` 646-652 | 加 `assignee_id` 非空校验 |

> 行号为调研时快照，实现时以当前代码为准。

## 测试要点

- **前端**：不选责任人 → 提交被拦截，显示「请选择责任人」；选了 → 正常创建
- **前端入口一致性**：顶部按钮、空状态、行内 `+`、Insert 快捷键行为一致
- **后端**：API 直接 POST 不带 `assignee_id` → 400 +「请选择责任人」
- **回归**：Excel 导入无责任人任务仍成功；存量未分配任务筛选/显示正常；智能推荐仍可填入

## 不改动项（明确排除）

- Excel 导入路径（`createTaskWithConnection`）
- 存量未分配任务及其筛选/显示
- 责任人数据源（组织架构全量在职成员 `useMembers`，保持现状）
- `CreateTaskRequest.assignee_id` 类型保持可选（`?: number`），因导入路径需要可选语义
