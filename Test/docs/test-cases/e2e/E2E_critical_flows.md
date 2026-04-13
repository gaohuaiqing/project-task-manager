# E2E 关键业务流测试用例

> **模块**: 端到端业务流
> **用例数**: 7
> **优先级**: P0
> **说明**: 验证跨模块完整业务链路，每个用例覆盖从起点到终点的完整流程

---

## E2E-FLOW-01: 项目全生命周期（管理员）

- id: E2E-FLOW-01
- module: e2e
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin

**业务流**: 创建项目 → 添加成员 → 创建里程碑 → 创建任务 → 分配任务 → 完成任务 → 验证仪表板 → 删除项目

**操作步骤**:
1. navigate: /projects
2. click: [data-testid=project-btn-create]
3. fill: [data-testid=project-form-input-name] → "E2E生命周期测试项目"
4. fill: [data-testid=project-form-input-code] → "E2E-LIFE-001"
5. fill: [data-testid=project-form-select-department] → "研发部"
6. click: [data-testid=project-form-btn-submit]
7. 验证项目创建成功

8. 进入项目详情，click: [data-testid=project-btn-add-member]
9. select: [data-testid=member-form-select-user] → "e2e_engineer"
10. click: [data-testid=member-form-btn-submit]
11. 验证成员添加成功

12. click: [data-testid=project-tab-milestones]
13. click: [data-testid=milestone-btn-create]
14. fill: [data-testid=milestone-form-input-name] → "E2E里程碑1"
15. fill: [data-testid=milestone-form-input-date] → "2026-05-01"
16. click: [data-testid=milestone-form-btn-submit]

17. navigate: /tasks
18. select: [data-testid=task-filter-project] → "E2E生命周期测试项目"
19. click: [data-testid=task-btn-add-root]
20. fill: [data-testid=task-form-input-name] → "E2E根任务"
21. select: [data-testid=task-form-select-type] → "开发"
22. fill: [data-testid=task-form-input-duration] → "5"
23. click: [data-testid=task-form-btn-submit]

24. 编辑任务，select: [data-testid=task-form-select-assignee] → "e2e_engineer"
25. click: [data-testid=task-form-btn-submit]

26. fill: [data-testid=task-form-input-actual-start] → "2026-04-11"
27. fill: [data-testid=task-form-input-actual-end] → "2026-04-15"
28. fill: [data-testid=task-form-input-progress] → "100"
29. click: [data-testid=task-form-btn-submit]

30. navigate: /dashboard
31. 验证项目数 +1，统计数据更新

32. navigate: /projects
33. 删除"E2E生命周期测试项目"
34. 验证项目删除成功，仪表板数据恢复

**验证**:
- 每一步操作均成功
- 项目/任务/成员数据完整
- 仪表板统计数据随操作实时变化
- api: 各步骤的API返回正确

**清理**: 删除测试项目和关联数据

---

## E2E-FLOW-02: 工程师日常工作流

- id: E2E-FLOW-02
- module: e2e
- priority: P0
- role: engineer

**前置条件**: 已登录为 e2e_engineer，有已分配的进行中任务

**业务流**: 查看仪表板 → 查看紧急任务 → 更新进度 → 提交工期变更 → 收到审批通知 → 查看通知

**操作步骤**:
1. navigate: /dashboard
2. 检查个人统计数据
3. 查看 [data-testid=dash-urgent-section] 中的紧急任务
4. 点击紧急任务跳转到任务详情

5. fill: [data-testid=progress-input-content] → "E2E日常工作进展"
6. fill: [data-testid=progress-input-percent] → "60"
7. click: [data-testid=progress-btn-submit]
8. 验证进度更新

9. 编辑任务，fill: [data-testid=task-form-input-duration] → "15"（原为10）
10. fill: [data-testid=task-form-input-change-reason] → "E2E测试：需求变更导致工期延长"
11. click: [data-testid=task-form-btn-submit]
12. 验证状态变为"待审批"

13. 以 e2e_tech_mgr 登录，审批通过
14. 切回 e2e_engineer
15. click: [data-testid=nav-btn-notifications]
16. 验证收到审批通过通知

**验证**:
- 仪表板显示个人数据正确
- 进度更新成功
- 变更申请提交成功并进入审批流程
- 审批通过后通知到达
- api: 各步骤的API返回正确

**清理**: 无

---

## E2E-FLOW-03: 审批流程完整链路

- id: E2E-FLOW-03
- module: e2e
- priority: P0
- role: multi_role

**前置条件**: e2e_engineer 和 e2e_tech_mgr 账户可用

**业务流**: 工程师提交变更 → 技术经理驳回 → 工程师重新提交 → 技术经理通过 → 验证数据一致性

**操作步骤**:
1. 以 e2e_engineer 登录
2. 编辑已分配任务，修改工期为 20 天
3. fill: [data-testid=task-form-input-change-reason] → "E2E审批流测试-首次"
4. click: [data-testid=task-form-btn-submit]
5. 验证状态为"待审批"

6. 以 e2e_tech_mgr 登录
7. 进入审批列表，找到上述变更
8. click: [data-testid=approval-btn-reject]
9. fill: [data-testid=approval-input-rejection-reason] → "工期过长，请缩减"
10. click: [data-testid=approval-btn-confirm]
11. 验证状态为"已驳回"

12. 切回 e2e_engineer
13. 收到驳回通知
14. 重新编辑任务，修改工期为 15 天
15. fill: [data-testid=task-form-input-change-reason] → "E2E审批流测试-重新申请"
16. click: [data-testid=task-form-btn-submit]
17. 验证新的"待审批"状态

18. 切回 e2e_tech_mgr
19. 审批通过新申请
20. 验证任务工期更新为 15 天

**验证**:
- 驳回后任务保持原值
- 重新提交成功
- 审批通过后任务值更新
- api: GET /api/workflow/plan-changes → 存在两条记录（一条rejected，一条approved）
- api: GET /api/tasks/:id → duration === 15

**清理**: 无

---

## E2E-FLOW-04: 报表数据一致性验证

- id: E2E-FLOW-04
- module: e2e
- priority: P0
- role: admin

**前置条件**: 已登录为 e2e_admin，seed数据完整

**业务流**: 记录仪表板数据 → 查看报表 → 创建新数据 → 验证数据联动

**操作步骤**:
1. navigate: /dashboard
2. 记录当前统计数据（项目数、任务数、进行中数等）

3. navigate: /reports
4. click: [data-testid=report-tab-project-progress]
5. 记录当前报表数据

6. 创建新项目和任务（使用API或UI）
7. 完成一个任务（状态改为已完成）

8. navigate: /dashboard
9. 验证统计卡片数值变化
10. navigate: /reports
11. 验证报表数据变化

**验证**:
- 创建后：项目总数 +1，任务总数 +N
- 完成后：已完成数 +1，进行中数 -1
- 报表数据与仪表板一致
- api: GET /api/analytics/dashboard/stats → 数据更新
- api: GET /api/analytics/reports/project-progress → 数据更新

**清理**: 删除测试数据

---

## E2E-FLOW-05: 新成员入职全流程

- id: E2E-FLOW-05
- module: e2e
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**业务流**: 创建成员 → 用新账户登录 → 查看仪表板（无数据）→ 分配任务 → 再次查看仪表板

**操作步骤**:
1. navigate: /settings/organization
2. 选择 "E2E研发部-前端组"
3. click: [data-testid=org-btn-add-member]
4. fill: [data-testid=member-form-input-name] → "E2E新人"
5. fill: [data-testid=member-form-input-employee-id] → "E2E90099"
6. select: [data-testid=member-form-select-role] → "engineer"
7. click: [data-testid=member-form-btn-submit]
8. 记录初始密码

9. 退出登录
10. 用 E2E90099 + 初始密码登录
11. navigate: /dashboard
12. 验证仪表板显示为空（无参与项目）

13. 退出，以 e2e_tech_mgr 登录
14. 将任务分配给 E2E90099
15. 将 E2E90099 加入项目成员

16. 以 E2E90099 重新登录
17. navigate: /dashboard
18. 验证仪表板显示已分配的任务数据
19. navigate: /tasks
20. 验证能看到自己的任务

**验证**:
- 新成员可正常登录
- 初始状态无数据（安全隔离）
- 分配任务后数据正确显示
- 数据范围严格限定为个人
- api: GET /api/auth/me → role === "engineer", employee_id === "E2E90099"

**清理**: 删除测试成员

---

## E2E-FLOW-06: 任务导入导出完整流程

- id: E2E-FLOW-06
- module: e2e
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，项目 E2E-PROJ-002 存在

**业务流**: 下载模板 → 填写数据 → 导入任务 → 验证导入结果 → 修改后导出 → 比对数据

**操作步骤**:
1. navigate: /tasks
2. 导出当前项目 E2E-PROJ-002 的任务（记录为 baseline）
3. click: [data-testid=task-menu-export] → [data-testid=task-menuitem-export-project]
4. 下载文件并记录内容

5. 下载导入模板
6. 填写模板：新增 2 个任务（"E2E导入任务1"、"E2E导入任务2"），类型为"固件"和"驱动"，优先级为"中"
7. click: 导入按钮
8. upload: 上传填写好的文件
9. 预览确认：验证解析正确
10. click: [data-testid=task-import-btn-confirm]

11. 验证任务列表新增 2 个任务
12. 验证 WBS 编码正确分配（递增）
13. 再次导出，比对文件与 baseline：新增 2 行

**验证**:
- 导入成功提示显示：成功 2 条，失败 0 条
- element: [data-testid=task-table] text contains "E2E导入任务1" and "E2E导入任务2"
- api: GET /api/tasks?project_id=xxx → 列表包含新导入的任务
- 导出文件行数 = baseline + 2
- 导入的日期字段正确解析（无时区偏移）

**清理**: 删除导入的任务

---

## E2E-FLOW-07: 系统管理完整流程

- id: E2E-FLOW-07
- module: e2e
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**业务流**: 创建部门 → 添加用户 → 分配部门 → 配置权限 → 验证权限生效 → 清理

**操作步骤**:
1. navigate: /settings → 组织管理Tab
2. 选择 "E2E产品部"
3. click: [data-testid=org-btn-add-department]
4. fill: [data-testid=org-input-department-name] → "E2E测试子部门"
5. click: 提交
6. 验证部门树更新

7. click: [data-testid=org-btn-add-member]
8. fill: [data-testid=org-input-member-name] → "E2E权限测试用户"
9. fill: [data-testid=org-input-member-username] → "e2e_perm_test"
10. fill: [data-testid=org-input-member-email] → "e2e_perm@test.com"
11. select: [data-testid=org-select-member-role] → "engineer"
12. click: 提交
13. 记录初始密码

14. navigate: /settings → 权限管理Tab
15. select: [data-testid=permissions-select-role] → "engineer"
16. 确认 engineer 不可创建项目、不可审批
17. click: [data-testid=permissions-btn-save]

18. 退出登录
19. 以 e2e_perm_test + 初始密码登录
20. navigate: /projects → 验证无"新建项目"按钮
21. navigate: /settings → 验证仅显示个人资料
22. navigate: /tasks → 验证无"新建任务"按钮

**验证**:
- 部门创建成功，树结构正确
- 用户创建成功，可正常登录
- engineer 权限正确生效：无法创建项目/任务，设置页受限
- api: GET /api/auth/me → role === "engineer", department 正确
- api: POST /api/projects → 403（engineer 权限不足）

**清理**: 删除测试用户和部门
