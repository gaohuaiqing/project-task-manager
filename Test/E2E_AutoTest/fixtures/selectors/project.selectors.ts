/**
 * 项目管理模块选择器
 */
export const projectSelectors = {
  // 项目列表
  listContainer: '[data-testid="project-list"]',
  projectCard: '[data-testid="project-card"]',
  projectGrid: '[data-testid="project-grid"]',

  // 项目详情
  projectDetail: '[data-testid="project-detail"]',
  projectHeader: '[data-testid="project-header"]',
  projectInfo: '[data-testid="project-info"]',

  // 操作按钮
  createButton: '[data-testid="create-project-btn"]',
  editButton: '[data-testid="edit-project-btn"]',
  deleteButton: '[data-testid="delete-project-btn"]',

  // 表单字段
  nameInput: '[data-testid="project-name-input"]',
  codeInput: '[data-testid="project-code-input"]',
  typeSelect: '[data-testid="project-type-select"]',
  statusSelect: '[data-testid="project-status-select"]',
  descriptionInput: '[data-testid="project-description-input"]',
  startDateInput: '[data-testid="project-start-date-input"]',
  deadlineInput: '[data-testid="project-deadline-input"]',
  saveButton: '[data-testid="save-project-btn"]',

  // 详情页标签
  overviewTab: '[data-testid="overview-tab"]',
  milestonesTab: '[data-testid="milestones-tab"]',
  timelinesTab: '[data-testid="timelines-tab"]',
  membersTab: '[data-testid="members-tab"]',

  // 里程碑
  milestoneList: '[data-testid="milestone-list"]',
  addMilestoneButton: '[data-testid="add-milestone-btn"]',

  // 时间线
  timelineList: '[data-testid="timeline-list"]',
  addTimelineButton: '[data-testid="add-timeline-btn"]',

  // 成员
  memberList: '[data-testid="member-list"]',
  addMemberButton: '[data-testid="add-member-btn"]',
};
