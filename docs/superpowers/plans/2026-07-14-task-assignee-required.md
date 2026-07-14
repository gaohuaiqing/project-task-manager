# 新建任务责任人必填 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建任务时责任人必填——前端拦截 + 后端拒绝，否则创建不成功。

**Architecture:** 前端 `TaskForm.validateForm` 加 `assigneeId` 校验（仅新建模式，编辑不强制以保留存量未分配），移除"未指定"选项、Label 加 `*`；后端 `createTask` 加 `assignee_id` 非空校验。Excel 导入路径（`createTaskWithConnection`）与存量未分配任务不动。

**Tech Stack:** React + react-hook-form + shadcn/ui（前端）；Express + TypeScript + mysql2（后端）

**验证节奏说明：** 本项目以手动/tm-test 实例验证为主，无前端单测框架、后端 service 层无独立单测基础设施。故采用「实现 → 类型检查 → 手动验证 → commit」节奏，不引入新测试框架（YAGNI）。设计依据见 `docs/superpowers/specs/2026-07-14-task-assignee-required-design.md`。

---

### Task 1: 后端 createTask 加责任人必填校验

**Files:**
- Modify: `app/server/src/modules/task/service.ts:650-652`（`description` 校验之后插入）

- [ ] **Step 1: 在 description 校验后插入 assignee_id 校验**

定位 `createTask` 方法的必填校验块（约 650-652）：

```ts
    if (!data.description) {
      throw new ValidationError('任务描述不能为空');
    }
```

紧接其后插入：

```ts
    if (!data.description) {
      throw new ValidationError('任务描述不能为空');
    }

    // 责任人必填（仅手动新建路径；Excel 导入 createTaskWithConnection 不受此约束）
    if (!data.assignee_id) {
      throw new ValidationError('请选择责任人');
    }
```

- [ ] **Step 2: 类型检查（确认无新增类型错误）**

Run: `cd "G:\Project\Web\Project_Task_Manager_5.0" && node_modules/.bin/tsc --noEmit -p app/server/tsconfig.json 2>&1 | grep "task/service.ts" || echo "✅ service.ts 无新增错误"`
Expected: 输出 `✅ service.ts 无新增错误`（历史类型债在 migrations/connection.ts，与本改动无关）

- [ ] **Step 3: 手动验证（API 兜底，环境允许时）**

若本机或 tm-test 可起后端：
```bash
curl -i -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=<有效登录态>" \
  -d '{"project_id":"<有效项目>","description":"测试无责任人","version":1}'
```
Expected: `HTTP/1.1 400`，响应含 `"请选择责任人"`

> 若环境无法起服务，依赖 Step 2 类型检查 + 代码审查，运行验证留待 tm-test/部署后。

- [ ] **Step 4: Commit**

```bash
git add app/server/src/modules/task/service.ts
git commit -m "feat(task): 新建任务责任人必填-后端校验"
```

---

### Task 2: 前端 TaskForm 责任人必填校验与 UI

**Files:**
- Modify: `app/src/features/tasks/components/TaskForm.tsx:158-171`（`validateForm`）
- Modify: `app/src/features/tasks/components/TaskForm.tsx:454-459`（负责人 Label）
- Modify: `app/src/features/tasks/components/TaskForm.tsx:481-491`（负责人 Select）

- [ ] **Step 1: validateForm 增加责任人必填校验（仅新建模式）**

原代码（158-171）：

```tsx
  const validateForm = (data: TaskFormData): boolean => {
    // 新建任务时，项目是必填项
    if (needSelectProject) {
      if (!data.projectId) {
        setError('请选择所属项目');
        return false;
      }
      if (!hasProjects) {
        setError('暂无可用项目，请先创建项目');
        return false;
      }
    }
    return true;
  };
```

改为（在 `needSelectProject` 块之后、`return true` 之前插入责任人校验）：

```tsx
  const validateForm = (data: TaskFormData): boolean => {
    // 新建任务时，项目是必填项
    if (needSelectProject) {
      if (!data.projectId) {
        setError('请选择所属项目');
        return false;
      }
      if (!hasProjects) {
        setError('暂无可用项目，请先创建项目');
        return false;
      }
    }
    // 新建任务时，责任人是必填项（编辑模式不强制，允许保留存量未分配任务）
    if (!isEdit && !data.assigneeId) {
      setError('请选择责任人');
      return false;
    }
    return true;
  };
```

> `isEdit` 已是组件作用域内变量（见 `handleFormSubmit` 第 248 行 `if (isEdit && task && ...)` 用法），直接复用。

- [ ] **Step 2: 负责人 Label 加红色 `*`（仅新建模式）**

原代码（454-459）：

```tsx
              <Label className="flex items-center gap-2">
                负责人
                {!permissions.canEditAssignee && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Label>
```

改为：

```tsx
              <Label className="flex items-center gap-2">
                负责人 {!isEdit && <span className="text-destructive">*</span>}
                {!permissions.canEditAssignee && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Label>
```

- [ ] **Step 3: Select 移除「未指定」选项，value 改空串兜底，placeholder 更新**

原代码（481-491）：

```tsx
            <Select
              data-testid="task-select-assignee"
              value={watch('assigneeId')?.toString() || 'none'}
              onValueChange={(value) => setValue('assigneeId', value === 'none' ? null : parseInt(value))}
              disabled={!permissions.canEditAssignee}
            >
              <SelectTrigger className={!permissions.canEditAssignee ? 'opacity-60' : ''}>
                <SelectValue placeholder="选择负责人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未指定</SelectItem>
```

改为（移除 `value="none"` 兜底与 `<SelectItem value="none">` 行，`onValueChange` 不再判断 none，placeholder 改文案）：

```tsx
            <Select
              data-testid="task-select-assignee"
              value={watch('assigneeId')?.toString() || ''}
              onValueChange={(value) => setValue('assigneeId', parseInt(value))}
              disabled={!permissions.canEditAssignee}
            >
              <SelectTrigger className={!permissions.canEditAssignee ? 'opacity-60' : ''}>
                <SelectValue placeholder="请选择责任人" />
              </SelectTrigger>
              <SelectContent>
```

> 移除 `<SelectItem value="none">未指定</SelectItem>` 后，未选时 `value` 为空串，shadcn Select 自动显示 placeholder「请选择责任人」。`allMembers.map(...)` 部分（492-505）保持不动。编辑存量未分配任务时 `assigneeId` 为 `null`，同样显示 placeholder，保存仍提交 `null`（后端 update 不强制），可正常指派。

- [ ] **Step 4: 前端构建验证**

Run: `cd "G:\Project\Web\Project_Task_Manager_5.0/app" && npm run build`
Expected: 构建成功（vite build 无 TS 错误）

- [ ] **Step 5: 手动验证（UI）**

启动前端 dev 或构建产物，打开「新建任务」对话框：
- 不选责任人 + 填其他必填项 → 点保存 → Expected: 不提交，显示「请选择责任人」
- 选了责任人 → 点保存 → Expected: 正常创建
- 智能推荐面板点一个推荐 → 责任人被填入 → 保存成功

- [ ] **Step 6: Commit**

```bash
git add app/src/features/tasks/components/TaskForm.tsx
git commit -m "feat(task): 新建任务责任人必填-前端校验与UI"
```

---

### Task 3: 端到端回归验证

**Files:** 无（仅验证）

- [ ] **Step 1: 各创建入口一致性**

在 WBS 表验证四个入口行为一致（都必填）：顶部「新建任务」按钮、空状态「添加根任务」、任务行内「+」、`Insert` 快捷键。每个入口打开表单，不选责任人 → 均被拦截。

- [ ] **Step 2: 导入回归（关键边界）**

用 Excel 导入一批**无负责人**的任务 → Expected: 仍导入成功（`createTaskWithConnection` 未加校验，保持可空）。

- [ ] **Step 3: 存量未分配任务回归**

- WBS 表筛选「未分配」→ 存量 `assignee=NULL` 任务仍正常显示、筛选生效（fixed2 逻辑未动）
- 编辑某个存量未分配任务、不改负责人、保存 → Expected: 保存成功（编辑模式不强制 assignee）

- [ ] **Step 4: 工程师子任务路径**

工程师登录 → 在自己负责的任务下创建子任务、不选责任人 → Expected: 被拦截「请选择责任人」（后端 createTask 对工程师路径同样生效）

> 全部通过后，功能完成。无需额外 commit（本任务仅验证）。

---

## 自审记录

- **Spec 覆盖**：spec 的 4 个改动点 → Task 1（后端校验）、Task 2 Step 1-3（前端 validateForm/Label/Select）；测试要点 → Task 2 Step 5 + Task 3；不改动项（导入/存量/类型层）→ Task 3 Step 2-3 + 各处注释。✅ 无遗漏
- **占位符**：所有 step 含完整代码或确切命令，无 TBD/TODO。✅
- **类型一致**：`assigneeId`（前端 camelCase）/ `assignee_id`（后端 snake_case）与现有代码一致；`isEdit`、`setError`、`permissions.canEditAssignee` 均为组件现有符号。✅
