/**
 * 任务管理模块选择器
 */
export const taskSelectors = {
  // 任务列表
  listContainer: '[data-testid="task-list"]',
  wbsTable: '[data-testid="wbs-table"]',
  taskRow: '[data-testid="task-row"]',
  taskCell: '[data-testid="task-cell"]',

  // 操作按钮
  createButton: '[data-testid="create-task-btn"]',
  editButton: '[data-testid="edit-task-btn"]',
  deleteButton: '[data-testid="delete-task-btn"]',

  // 表单字段
  nameInput: '[data-testid="task-name-input"]',
  descriptionInput: '[data-testid="task-description-input"]',
  typeSelect: '[data-testid="task-type-select"]',
  prioritySelect: '[data-testid="task-priority-select"]',
  assigneeSelect: '[data-testid="task-assignee-select"]',
  statusSelect: '[data-testid="task-status-select"]',
  progressInput: '[data-testid="task-progress-input"]',
  estimatedHoursInput: '[data-testid="task-estimated-hours-input"]',
  plannedStartDateInput: '[data-testid="task-planned-start-date-input"]',
  plannedEndDateInput: '[data-testid="task-planned-end-date-input"]',
  saveButton: '[data-testid="save-task-btn"]',

  // WBS 树操作
  expandButton: '[data-testid="expand-task-btn"]',
  collapseButton: '[data-testid="collapse-task-btn"]',
  addChildButton: '[data-testid="add-child-task-btn"]',

  // 状态徽章
  statusBadge: '[data-testid="status-badge"]',
  priorityBadge: '[data-testid="priority-badge"]',

  // 进度
  progressBar: '[data-testid="progress-bar"]',
  progressText: '[data-testid="progress-text"]',

  // 筛选
  filterContainer: '[data-testid="task-filter"]',
  statusFilter: '[data-testid="status-filter"]',
  priorityFilter: '[data-testid="priority-filter"]',
  assigneeFilter: '[data-testid="assignee-filter"]',
  searchInput: '[data-testid="task-search-input"]',
};
