# 智能分配 - 核心测试用例

> **模块**: 智能分配
> **用例数**: 8
> **优先级**: P1

---

## TC-ASGN-01: 能力矩阵Tab加载

- id: TC-ASGN-01
- module: assignment
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，seed数据完整

**操作步骤**:
1. navigate: /assignment
2. 验证默认Tab为"能力矩阵"
3. 等待矩阵数据加载

**验证**:
- element: [data-testid=assignment-tab-matrix] exists and active
- element: [data-testid=assignment-matrix-container] exists
- 矩阵中显示成员列表（至少包含 e2e_engineer）
- api: GET /api/org/members → 返回成员能力数据

**清理**: 无

---

## TC-ASGN-02: 能力矩阵按部门筛选

- id: TC-ASGN-02
- module: assignment
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，能力矩阵Tab已加载

**操作步骤**:
1. 在能力矩阵页面找到部门筛选器
2. select: 筛选器 → "E2E前端组"
3. 等待矩阵刷新

**验证**:
- 矩阵只显示 E2E前端组 的成员（e2e_tech_mgr, e2e_engineer）
- 不显示其他部门成员
- 切换为"E2E研发部"时显示研发部及其子组全部成员

**清理**: 清除筛选

---

## TC-ASGN-03: 分配建议Tab

- id: TC-ASGN-03
- module: assignment
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /assignment
2. click: [data-testid=assignment-tab-suggest]
3. 等待分配建议数据加载

**验证**:
- element: [data-testid=assignment-suggest-container] exists
- 建议列表显示任务分配建议
- 每条建议包含：任务名称、推荐成员、匹配度/理由
- api: GET /api/analytics/assignment-suggestions → 返回建议数据

**清理**: 无

---

## TC-ASGN-04: 分配建议操作

- id: TC-ASGN-04
- module: assignment
- priority: P1
- role: tech_manager

**前置条件**: 已登录为 e2e_tech_mgr，存在分配建议

**操作步骤**:
1. navigate: /assignment → 分配建议Tab
2. 找到一条建议
3. click: 建议行的"接受"按钮
4. 验证任务分配生效

**验证**:
- 接受后任务负责人更新
- api: GET /api/tasks/:id → assignee_id 更新为建议成员
- 该建议从列表移除或标记为"已接受"

**清理**: 恢复原负责人

---

## TC-ASGN-05: 能力档案Tab查看

- id: TC-ASGN-05
- module: assignment
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin

**操作步骤**:
1. navigate: /assignment
2. click: [data-testid=assignment-tab-profile]
3. 选择成员 "E2E工程师"
4. 查看能力详情

**验证**:
- element: [data-testid=assignment-profile-container] exists
- 显示成员基本信息（姓名、部门、角色）
- 显示能力雷达图或能力评分列表
- 显示当前工作负荷信息
- api: GET /api/org/members/:id/capabilities → 返回能力数据

**清理**: 无

---

## TC-ASGN-06: 能力档案编辑评分

- id: TC-ASGN-06
- module: assignment
- priority: P1
- role: admin

**前置条件**: 已登录为 e2e_admin，能力档案Tab已打开

**操作步骤**:
1. 选择成员 "E2E工程师"
2. click: 编辑能力按钮
3. 修改某项能力评分（如 "系统设计" → 4）
4. click: 保存按钮

**验证**:
- 评分更新成功
- 雷达图/列表显示新评分
- api: PUT /api/org/members/:id/capabilities → 返回更新后的数据
- 刷新页面后评分保持不变

**清理**: 恢复原评分

---

## TC-ASGN-07: 不同角色数据范围

- id: TC-ASGN-07
- module: assignment
- priority: P1
- role: multi_role

**前置条件**: 各角色账户可用

**操作步骤**:
1. 以 e2e_admin 登录，navigate: /assignment，记录可见成员数
2. 以 e2e_dept_mgr 登录，navigate: /assignment，记录可见成员数
3. 以 e2e_engineer 登录，navigate: /assignment，记录可见成员数

**验证**:
- admin: 可见所有成员
- dept_manager: 仅可见本部门（E2E研发部）成员
- engineer: 仅可见自己
- 能力矩阵和档案数据范围与成员范围一致

**清理**: 无

---

## TC-ASGN-08: 工程师只读访问验证

- id: TC-ASGN-08
- module: assignment
- priority: P1
- role: engineer

**前置条件**: 已登录为 e2e_engineer

**操作步骤**:
1. navigate: /assignment
2. 查看能力矩阵Tab
3. 尝试点击"编辑能力"按钮
4. 尝试在分配建议Tab执行"接受"操作

**验证**:
- 能力矩阵显示为只读（无编辑按钮或按钮禁用）
- 分配建议Tab中"接受"按钮不可用
- element: 编辑/接受按钮 disabled or not exists

**清理**: 无
