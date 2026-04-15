# data-testid 映射表

> **版本**: 1.0
> **日期**: 2026-04-11
> **命名规范**: `{页面}-{类型}-{名称}`，如 `login-input-username`

---

## 一、命名规范

### 1.1 前缀规范

| 前缀 | 说明 | 示例 |
|------|------|------|
| 页面标识 | 功能模块简写 | login, project, task, dashboard, report, assignment, org, setting |
| 元素类型 | UI 元素类型 | btn, input, select, table, tab, dialog, card, row, nav, menu, alert, checkbox, badge, popover |
| 元素名称 | 具体名称 | submit, username, create, filter, search |

### 1.2 完整格式

```
{页面}-{类型}-{名称}
```

示例：
- `login-input-username` -- 登录页用户名输入框
- `project-btn-create` -- 项目页创建按钮
- `task-table-row` -- 任务表格行

### 1.3 元素类型缩写对照

| 缩写 | HTML 元素 / 组件 | 说明 |
|------|------------------|------|
| btn | button | 按钮 |
| input | input | 文本/密码输入框 |
| select | select / MultiSelect | 下拉选择 |
| checkbox | Checkbox | 复选框 |
| table | Table | 数据表格 |
| row | TableRow | 表格行 |
| tab | TabsTrigger | 标签页切换 |
| dialog | Dialog | 对话框/弹窗 |
| card | Card | 卡片容器 |
| alert | Alert | 提示信息 |
| nav | NavLink | 导航链接 |
| menu | DropdownMenu | 下拉菜单 |
| badge | Badge | 标签/徽章 |
| popover | Popover | 气泡卡片 |
| form | form | 表单容器 |
| textarea | Textarea | 多行文本框 |
| separator | Separator | 分隔线 |

---

## 二、页面映射

### 2.1 登录页 (/login)

> 源码: `app/src/features/auth/components/LoginForm.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `login-input-username` | input | 用户名输入框 |
| `login-input-password` | input | 密码输入框 |
| `login-btn-toggle-password` | button | 密码显示/隐藏切换 |
| `login-checkbox-remember` | Checkbox | 记住我复选框 |
| `login-btn-submit` | button[type=submit] | 登录按钮 |
| `login-alert-error` | Alert | 错误提示信息 |

### 2.2 全局布局

> 源码: `app/src/shared/layout/Sidebar.tsx`, `Header.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `nav-sidebar` | aside | 侧边栏容器 |
| `nav-btn-toggle-sidebar` | Button | 折叠/展开侧边栏按钮 |
| `nav-link-dashboard` | NavLink | 仪表板导航链接 |
| `nav-link-projects` | NavLink | 项目管理导航链接 |
| `nav-link-tasks` | NavLink | 任务管理导航链接 |
| `nav-link-assignment` | NavLink | 智能分配导航链接 |
| `nav-link-reports` | NavLink | 报表分析导航链接 |
| `nav-link-settings` | NavLink | 设置导航链接 |
| `header-btn-notification` | Button | 通知铃铛按钮 |
| `header-popover-notification` | Popover | 通知面板 |
| `header-btn-mark-all-read` | Button | 全部已读按钮 |
| `header-menu-user` | DropdownMenu | 用户头像下拉菜单 |
| `header-menuitem-profile` | DropdownMenuItem | 个人资料菜单项 |
| `header-menuitem-logout` | DropdownMenuItem | 退出登录菜单项 |
| `header-btn-theme-toggle` | Button | 主题切换（暗/亮） |

### 2.3 仪表板 (/dashboard)

> 源码: `app/src/features/analytics/dashboard/`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `dashboard-container` | div | 仪表板页面容器 |
| `dashboard-card-alert-delay-warning` | AlertCard | 延期预警卡片 |
| `dashboard-card-alert-overdue` | AlertCard | 已延期卡片 |
| `dashboard-card-alert-pending-approval` | AlertCard | 待审批卡片 |
| `dashboard-card-alert-high-risk` | AlertCard | 高风险卡片 |
| `dashboard-card-alert-today-due` | AlertCard | 今日到期卡片 |
| `dashboard-card-alert-week-due` | AlertCard | 本周到期卡片 |
| `dashboard-card-todo-tasks` | Card | 待办任务列表卡片 |
| `dashboard-list-todo-tasks` | div | 待办任务列表容器 |
| `dashboard-btn-update-task` | Button | 更新任务按钮（待办列表行内） |
| `dashboard-card-project-progress` | Card | 项目进度列表卡片 |
| `dashboard-list-project-progress` | div | 项目进度列表容器 |
| `dashboard-card-member-status` | Card | 成员状态表格卡片 |
| `dashboard-table-member-status` | Table | 成员状态表格 |
| `dashboard-card-group-efficiency` | Card | 组效能表格卡片 |
| `dashboard-table-group-efficiency` | Table | 组效能表格 |
| `dashboard-card-allocation-suggestion` | Card | 分配建议卡片 |

### 2.4 项目列表 (/projects)

> 源码: `app/src/features/projects/components/ProjectList.tsx`, `ProjectCard.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `project-input-search` | Input | 项目搜索输入框 |
| `project-select-status` | Select | 状态筛选下拉 |
| `project-select-type` | Select | 类型筛选下拉 |
| `project-btn-create` | Button | 新建项目按钮 |
| `project-card` | ProjectCard | 项目卡片 |
| `project-card-title` | div | 项目卡片标题 |
| `project-card-status-badge` | Badge | 项目状态标签 |
| `project-card-type-badge` | Badge | 项目类型标签 |
| `project-card-progress` | div | 项目进度条 |
| `project-card-btn-edit` | Button | 编辑项目按钮 |
| `project-card-btn-delete` | Button | 删除项目按钮 |
| `project-card-btn-menu` | Button | 卡片右上角 MoreVertical 按钮 |
| `project-menu-import-export` | DropdownMenuTrigger | 导入导出下拉菜单触发器 |
| `project-menuitem-export` | DropdownMenuItem | 导出项目列表 |
| `project-menuitem-download-template` | DropdownMenuItem | 下载导入模板 |
| `project-menuitem-import` | DropdownMenuItem | 导入项目数据 |

### 2.5 项目表单 (/projects - 新建/编辑弹窗)

> 源码: `app/src/features/projects/components/ProjectForm.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `project-dialog-form` | Dialog | 项目表单对话框 |
| `project-input-code` | Input | 项目编码输入框 |
| `project-input-name` | Input | 项目名称输入框 |
| `project-input-description` | Textarea | 项目描述文本框 |
| `project-select-type` | Select | 项目类型下拉选择 |
| `project-input-start-date` | DatePickerField | 开始日期选择 |
| `project-input-deadline` | DatePickerField | 截止日期选择 |
| `project-selector-members` | MemberTreeSelector | 成员选择器 |
| `project-input-milestone-name` | Input | 里程碑名称输入框 |
| `project-input-milestone-date` | Input | 里程碑目标日期输入框 |
| `project-input-milestone-desc` | Input | 里程碑描述输入框 |
| `project-btn-add-milestone` | Button | 添加里程碑按钮 |
| `project-btn-remove-milestone` | Button | 删除里程碑按钮 |
| `project-btn-submit` | Button[type=submit] | 提交表单按钮 |
| `project-btn-cancel` | Button | 取消按钮 |

### 2.6 项目详情 (/projects/:id)

> 源码: `app/src/features/projects/components/ProjectDetail.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `detail-header` | ProjectHeader | 项目头部信息区域 |
| `detail-header-title` | div | 项目名称 |
| `detail-header-status-badge` | Badge | 项目状态标签 |
| `detail-header-btn-edit` | Button | 编辑按钮 |
| `detail-header-btn-delete` | Button | 删除按钮 |
| `detail-tab-timelines` | TabsTrigger | 时间线标签页 |
| `detail-tab-milestones` | TabsTrigger | 里程碑标签页 |
| `detail-tab-members` | TabsTrigger | 成员标签页 |
| `detail-timeline-view` | EnhancedTimelineView | 增强时间线视图 |
| `detail-timeline-ruler` | TimelineRuler | 时间线标尺 |
| `detail-timeline-track-row` | TimelineTrackRow | 时间线轨道行 |
| `detail-milestone-row` | MilestoneRow | 里程碑行 |
| `detail-today-indicator` | TodayIndicator | 今天标记指示器 |
| `detail-btn-add-timeline` | Button | 添加时间线按钮 |
| `detail-dialog-add-timeline` | Dialog | 添加时间线对话框 |
| `detail-dialog-add-milestone` | Dialog | 添加里程碑对话框 |
| `detail-dialog-edit-milestone` | Dialog | 编辑里程碑对话框 |
| `detail-dialog-delete-confirm` | ConfirmDialog | 删除确认对话框 |
| `timeline-btn-go-today` | Button | 定位到今天按钮 |
| `timeline-btn-add-timeline` | Button | 添加时间轴按钮 |
| `timeline-btn-add-milestone` | Button | 添加里程碑按钮 |
| `timeline-toggle-zoom-day` | ToggleGroupItem | 日视图切换 |
| `timeline-toggle-zoom-week` | ToggleGroupItem | 周视图切换 |
| `timeline-toggle-zoom-month` | ToggleGroupItem | 月视图切换 |
| `timeline-slider-zoom` | Slider | 缩放滑块 |

### 2.7 任务管理 (/tasks)

> 源码: `app/src/features/tasks/index.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `task-page-container` | div | 任务管理页面容器 |
| `task-filter-bar` | TaskFilterBar | 筛选栏容器 |
| `task-filter-input-search` | Input | 搜索输入框 |
| `task-filter-select-project` | MultiSelect | 项目多选筛选 |
| `task-filter-select-assignee` | MultiSelect | 负责人多选筛选 |
| `task-filter-select-status` | MultiSelect | 状态多选筛选 |
| `task-filter-select-priority` | MultiSelect | 优先级多选筛选 |
| `task-filter-select-type` | MultiSelect | 任务类型多选筛选 |
| `task-filter-btn-clear` | Button | 清除筛选按钮 |

### 2.8 WBS 表格 (/tasks - 表格区域)

> 源码: `app/src/features/tasks/components/WbsTable.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `task-table-container` | div | WBS 表格容器 |
| `task-table` | Table | WBS 数据表格 |
| `task-table-header` | TableHeader | 表头区域 |
| `task-table-row` | TableRow | 任务行 |
| `task-table-row-toggle` | Button | 行展开/折叠按钮 |
| `task-table-badge-status` | Badge | 任务状态标签 |
| `task-table-badge-type` | Badge | 任务类型标签 |
| `task-table-badge-priority` | Badge | 任务优先级标签 |
| `task-btn-create-task` | Button | 新建任务按钮 |
| `task-btn-create-subtask` | Button | 新建子任务按钮 |
| `task-btn-edit-task` | Button | 编辑任务按钮 |
| `task-btn-delete-task` | Button | 删除任务按钮 |
| `task-btn-view-progress` | Button | 查看进展记录按钮 |
| `task-btn-view-delay` | Button | 查看延期历史按钮 |
| `task-btn-view-changes` | Button | 查看计划变更按钮 |
| `task-popover-column-settings` | Popover | 列显示/隐藏设置 |
| `task-menu-export` | ExportDropdown | 导出下拉菜单 |
| `task-menuitem-export-filtered` | DropdownMenuItem | 导出筛选结果 |
| `task-menuitem-export-project` | DropdownMenuItem | 导出项目范围 |
| `task-menuitem-export-all` | DropdownMenuItem | 导出全部任务 |
| `task-checkbox-export-history` | Checkbox | 导出时包含延期历史 |
| `task-dialog-delete-confirm` | ConfirmDialog | 删除确认对话框 |
| `task-import-btn-upload` | Button | 导入上传按钮 |
| `confirm-btn-ok` | Button | 确认对话框确认按钮 |

### 2.9 任务表单 (/tasks - 新建/编辑弹窗)

> 源码: `app/src/features/tasks/components/TaskForm.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `task-dialog-form` | Dialog | 任务表单对话框 |
| `task-input-description` | Textarea | 任务描述输入框 |
| `task-select-project` | Select | 所属项目下拉选择 |
| `task-select-type` | Select | 任务类型下拉选择 |
| `task-select-priority` | Select | 优先级下拉选择 |
| `task-input-start-date` | Input[type=date] | 计划开始日期 |
| `task-input-estimated-days` | Input | 预估工期（天） |
| `task-input-fulltime-ratio` | Input | 全职比（%） |
| `task-input-actual-start-date` | Input[type=date] | 实际开始日期 |
| `task-input-actual-end-date` | Input[type=date] | 实际结束日期 |
| `task-select-assignee` | Select | 负责人下拉选择 |
| `task-selector-predecessors` | PredecessorSelector | 前置任务选择器 |
| `task-select-dependency-type` | DependencyTypeSelector | 依赖类型选择器 |
| `task-input-lag-days` | Input | 提前/落后天数 |
| `task-btn-submit` | Button[type=submit] | 提交表单按钮 |
| `task-btn-cancel` | Button | 取消按钮 |

### 2.10 任务详情弹窗 (/tasks - 详情)

> 源码: `app/src/features/tasks/components/TaskDetailDialog.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `task-dialog-detail` | Dialog | 任务详情弹窗 |
| `task-detail-tab-progress` | TabsTrigger | 进展记录标签页 |
| `task-detail-tab-delays` | TabsTrigger | 延期历史标签页 |
| `task-detail-tab-changes` | TabsTrigger | 计划变更标签页 |
| `task-detail-panel-progress` | ProgressRecordsPanel | 进展记录面板 |
| `task-detail-panel-delays` | DelayHistoryPanel | 延期历史面板 |
| `task-detail-panel-changes` | PlanChangesPanel | 计划变更面板 |
| `progress-input-content` | Textarea | 进展记录内容输入框 |
| `progress-btn-submit` | Button | 提交进展记录按钮 |

### 2.11 任务导入弹窗

> 源码: `app/src/features/tasks/components/ImportPreviewDialog.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `task-dialog-import` | Dialog | 导入预览弹窗 |
| `task-import-btn-upload` | Button | 上传文件按钮 |
| `task-import-table-preview` | Table | 导入预览表格 |
| `task-import-btn-confirm` | Button | 确认导入按钮 |

### 2.12 报表分析 (/reports)

> 源码: `app/src/features/analytics/reports/ReportsPage.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `report-page-container` | div | 报表页面容器 |
| `report-tab-project-progress` | TabsTrigger | 项目进度标签页 |
| `report-tab-task-statistics` | TabsTrigger | 任务统计标签页 |
| `report-tab-delay-analysis` | TabsTrigger | 延期分析标签页 |
| `report-tab-member-analysis` | TabsTrigger | 成员分析标签页 |
| `report-tab-resource-efficiency` | TabsTrigger | 资源效能标签页 |
| `report-filter-bar` | ReportFilterBar | 筛选栏容器 |
| `report-filter-select-project` | Select | 项目筛选下拉 |
| `report-filter-select-member` | Select | 成员筛选下拉 |
| `report-filter-select-date-range` | Popover | 日期范围选择器 |
| `report-filter-select-time-preset` | Select | 时间预设选择（本周/本月/本季/自定义） |
| `report-filter-select-delay-type` | Select | 延期类型筛选 |
| `report-filter-select-project-type` | Select | 项目类型筛选 |
| `report-filter-select-risk-level` | Select | 风险等级筛选 |
| `report-btn-refresh` | Button | 刷新数据按钮 |
| `report-btn-export` | Button | 导出报表按钮 |
| `report-stats-cards` | div | 统计卡片区域 |
| `report-stats-card-total` | Card | 统计卡片 - 总计 |
| `report-stats-card-completed` | Card | 统计卡片 - 已完成 |
| `report-stats-card-delayed` | Card | 统计卡片 - 已延期 |
| `report-stats-card-in-progress` | Card | 统计卡片 - 进行中 |
| `report-chart-trend` | TrendChart | 趋势图表 |
| `report-chart-pie` | PieChart | 饼图 |
| `report-chart-bar` | BarChart | 柱状图 |
| `report-chart-scatter` | ScatterChart | 散点图 |
| `report-chart-task-type` | TaskTypeChart | 任务类型图表 |
| `report-table-data` | ReportTable | 报表数据表格 |

### 2.13 智能分配 (/assignment)

> 源码: `app/src/features/assignment/index.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `assignment-tab-matrix` | TabsTrigger | 能力矩阵标签页 |
| `assignment-tab-suggest` | TabsTrigger | 分配建议标签页 |
| `assignment-tab-profile` | TabsTrigger | 能力档案标签页 |
| `assignment-matrix-container` | CapabilityMatrix | 能力矩阵组件 |
| `assignment-suggest-container` | AssignmentSuggestion | 分配建议组件 |
| `assignment-profile-container` | MemberCapabilities | 能力档案组件 |

### 2.14 设置页面 (/settings)

> 源码: `app/src/features/settings/index.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `setting-tab-profile` | TabsTrigger | 个人资料标签页 |
| `setting-tab-users` | TabsTrigger | 用户管理标签页 |
| `setting-tab-organization` | TabsTrigger | 组织管理标签页 |
| `setting-tab-permissions` | TabsTrigger | 权限管理标签页 |
| `setting-tab-task-types` | TabsTrigger | 任务类型标签页 |
| `setting-tab-capability-models` | TabsTrigger | 能力模型标签页 |
| `setting-tab-holidays` | TabsTrigger | 节假日标签页 |
| `setting-tab-audit-logs` | TabsTrigger | 系统日志标签页 |

### 2.15 设置 - 个人资料

> 源码: `app/src/features/settings/pages/Profile.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `profile-avatar` | Avatar | 用户头像 |
| `profile-btn-change-avatar` | Button | 更换头像按钮 |
| `profile-input-username` | Input | 用户名（只读） |
| `profile-input-display-name` | Input | 显示名称 |
| `profile-input-email` | Input | 邮箱 |
| `profile-input-phone` | Input | 手机号 |
| `profile-btn-save` | Button | 保存按钮 |

### 2.16 设置 - 用户管理

> 源码: `app/src/features/settings/pages/Users.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `users-input-search` | Input | 搜索用户输入框 |
| `users-btn-create` | Button | 新建用户按钮 |
| `users-table` | Table | 用户列表表格 |
| `users-table-row` | TableRow | 用户表格行 |
| `users-badge-role` | Badge | 角色标签 |
| `users-menu-actions` | DropdownMenu | 行操作菜单 |
| `users-menuitem-edit` | DropdownMenuItem | 编辑用户 |
| `users-menuitem-deactivate` | DropdownMenuItem | 停用用户 |
| `users-menuitem-delete` | DropdownMenuItem | 删除用户 |
| `users-menuitem-reset-password` | DropdownMenuItem | 重置密码 |
| `users-menuitem-view-capability` | DropdownMenuItem | 查看能力档案 |
| `users-dialog-create` | Dialog | 新建用户对话框 |
| `users-dialog-edit` | Dialog | 编辑用户对话框 |
| `users-dialog-delete-confirm` | AlertDialog | 删除确认对话框 |
| `users-input-username` | Input | 用户名输入框（表单） |
| `users-input-display-name` | Input | 显示名称输入框（表单） |
| `users-input-email` | Input | 邮箱输入框（表单） |
| `users-input-phone` | Input | 手机号输入框（表单） |
| `users-select-role` | Select | 角色下拉选择 |
| `users-select-department` | Select | 所属部门下拉选择 |
| `users-select-gender` | Select | 性别下拉选择 |
| `users-input-position` | Input | 职位输入框（表单） |
| `users-btn-submit` | Button | 提交按钮 |
| `users-btn-cancel` | Button | 取消按钮 |

### 2.17 设置 - 组织管理

> 源码: `app/src/features/settings/pages/Organization.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `org-tree-container` | div | 部门树容器 |
| `org-tree-node` | div | 部门树节点 |
| `org-tree-node-toggle` | Button | 节点展开/折叠 |
| `org-btn-add-department` | Button | 添加部门按钮 |
| `org-btn-edit-department` | Button | 编辑部门按钮 |
| `org-btn-delete-department` | Button | 删除部门按钮 |
| `org-detail-panel` | div | 右侧详情面板 |
| `org-table-members` | Table | 部门成员表格 |
| `org-btn-add-member` | Button | 添加成员按钮 |
| `org-dialog-add-department` | Dialog | 添加部门对话框 |
| `org-dialog-edit-department` | Dialog | 编辑部门对话框 |
| `org-dialog-delete-confirm` | Dialog | 删除确认对话框 |
| `org-dialog-add-member` | Dialog | 添加成员对话框 |
| `org-dialog-edit-member` | Dialog | 编辑成员对话框 |
| `org-input-department-name` | Input | 部门名称输入框 |
| `org-input-department-code` | Input | 部门编码输入框 |
| `org-input-member-name` | Input | 成员姓名输入框 |
| `org-input-member-username` | Input | 成员用户名输入框 |
| `org-input-member-email` | Input | 成员邮箱输入框 |
| `org-input-member-phone` | Input | 成员手机号输入框 |
| `org-select-member-role` | Select | 成员角色选择 |
| `org-select-member-gender` | Select | 成员性别选择 |
| `org-btn-import` | Button | 导入组织架构按钮 |
| `org-btn-export` | Button | 导出组织架构按钮 |
| `org-btn-download-template` | Button | 下载导入模板按钮 |

### 2.18 设置 - 权限管理

> 源码: `app/src/features/settings/pages/Permissions.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `permissions-select-role` | Select | 角色选择下拉 |
| `permissions-table-permissions` | Table | 权限矩阵表格 |
| `permissions-checkbox-permission` | Checkbox | 权限勾选框 |
| `permissions-btn-save` | Button | 保存权限设置按钮 |

### 2.19 设置 - 任务类型

> 源码: `app/src/features/settings/pages/TaskTypes.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `tasktype-table` | Table | 任务类型映射表格 |
| `tasktype-table-row` | TableRow | 映射表格行 |
| `tasktype-btn-add` | Button | 添加映射按钮 |
| `tasktype-btn-edit` | Button | 编辑映射按钮 |
| `tasktype-btn-delete` | Button | 删除映射按钮 |
| `tasktype-dialog-form` | Dialog | 映射表单对话框 |
| `tasktype-select-task-type` | Select | 任务类型选择 |
| `tasktype-select-model` | Select | 能力模型选择 |
| `tasktype-input-priority` | Input | 优先级输入框 |
| `tasktype-dialog-delete-confirm` | Dialog | 删除确认对话框 |

### 2.20 设置 - 能力模型

> 源码: `app/src/features/settings/pages/CapabilityModels.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `model-table` | Table | 能力模型表格 |
| `model-btn-add` | Button | 添加模型按钮 |
| `model-btn-edit` | Button | 编辑模型按钮 |
| `model-btn-delete` | Button | 删除模型按钮 |
| `model-dialog-form` | Dialog | 模型表单对话框 |
| `model-input-name` | Input | 模型名称输入框 |
| `model-textarea-description` | Textarea | 模型描述文本框 |
| `model-dialog-delete-confirm` | Dialog | 删除确认对话框 |

### 2.21 设置 - 节假日

> 源码: `app/src/features/settings/pages/Holidays.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `holiday-select-year` | Select | 年份选择下拉 |
| `holiday-table` | Table | 节假日列表表格 |
| `holiday-btn-add` | Button | 添加节假日按钮 |
| `holiday-btn-edit` | Button | 编辑节假日按钮 |
| `holiday-btn-delete` | Button | 删除节假日按钮 |
| `holiday-badge-type` | Badge | 节假日类型标签 |
| `holiday-dialog-form` | Dialog | 节假日表单对话框 |
| `holiday-input-name` | Input | 节假日名称输入框 |
| `holiday-input-date` | Input[type=date] | 日期输入框 |
| `holiday-select-type` | Select | 类型选择（法定/公司/调休） |
| `holiday-dialog-delete-confirm` | AlertDialog | 删除确认对话框 |

### 2.22 设置 - 系统日志

> 源码: `app/src/features/settings/pages/AuditLogs.tsx`

| data-testid | 元素 | 说明 |
|-------------|------|------|
| `log-input-search` | Input | 日志搜索输入框 |
| `log-select-category` | Select | 分类筛选下拉 |
| `log-select-action` | Select | 操作类型筛选下拉 |
| `log-select-date-range` | DatePicker | 日期范围选择 |
| `log-btn-export` | Button | 导出日志按钮 |
| `log-table` | Table | 日志列表表格 |
| `log-table-row` | TableRow | 日志表格行 |
| `log-badge-category` | Badge | 分类标签 |
| `log-badge-action` | Badge | 操作类型标签 |

---

## 三、统计汇总

| 页面 | testid 数量 |
|------|------------|
| 登录页 | 6 |
| 全局布局 | 15 |
| 仪表板 | 17 |
| 项目列表 | 16 |
| 项目表单 | 15 |
| 项目详情 | 25 |
| 任务筛选栏 | 9 |
| WBS 表格 | 24 |
| 任务表单 | 20 |
| 任务详情弹窗 | 7 |
| 任务导入 | 4 |
| 报表分析 | 28 |
| 智能分配 | 6 |
| 设置 - 页面导航 | 8 |
| 设置 - 个人资料 | 7 |
| 设置 - 用户管理 | 27 |
| 设置 - 组织管理 | 27 |
| 设置 - 权限管理 | 4 |
| 设置 - 任务类型 | 10 |
| 设置 - 能力模型 | 8 |
| 设置 - 节假日 | 12 |
| 设置 - 系统日志 | 10 |
| **合计** | **296** |

---

## 四、使用指南

### 4.1 在组件中添加 data-testid

```tsx
// 示例：LoginForm.tsx
<Input
  id="username"
  data-testid="login-input-username"
  type="text"
  placeholder="请输入用户名"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
/>
```

### 4.2 在 E2E 测试中使用

```typescript
// Playwright 示例
await page.locator('[data-testid="login-input-username"]').fill('admin');
await page.locator('[data-testid="login-input-password"]').fill('password123');
await page.locator('[data-testid="login-btn-submit"]').click();

// 验证错误提示
await expect(page.locator('[data-testid="login-alert-error"]')).toBeVisible();
```

### 4.3 批量添加脚本参考

```bash
# 查找所有尚未添加 data-testid 的 Input 组件
grep -rn '<Input' app/src/features/ --include="*.tsx" | grep -v 'data-testid'
```

---

## 五、维护说明

1. **新增页面时**：按照命名规范为新页面添加 testid，并更新本文档
2. **新增组件时**：确保关键交互元素（输入、按钮、表格行）都有对应 testid
3. **重命名时**：同步更新组件代码和本文档中的 testid
4. **删除功能时**：从组件和文档中移除对应 testid
