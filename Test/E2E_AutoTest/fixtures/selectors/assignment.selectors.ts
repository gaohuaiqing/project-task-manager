/**
 * 智能分配模块选择器
 */
export const assignmentSelectors = {
  // 页面容器
  pageContainer: '[data-testid="assignment-page"]',
  
  // 成员列表
  memberList: '[data-testid="member-list"]',
  memberCard: '[data-testid="member-card"]',
  memberName: '[data-testid="member-name"]',
  memberDepartment: '[data-testid="member-department"]',
  memberSkills: '[data-testid="member-skills"]',
  
  // 成员详情
  memberDetail: '[data-testid="member-detail"]',
  memberWorkload: '[data-testid="member-workload"]',
  memberCapacity: '[data-testid="member-capacity"]',
  
  // 筛选
  skillFilter: '[data-testid="skill-filter"]',
  departmentFilter: '[data-testid="department-filter"]',
  availabilityFilter: '[data-testid="availability-filter"]',
  
  // 任务选择
  taskSelector: '[data-testid="task-selector"]',
  selectedTask: '[data-testid="selected-task"]',
  
  // 推荐
  recommendationList: '[data-testid="recommendation-list"]',
  recommendationItem: '[data-testid="recommendation-item"]',
  recommendationScore: '[data-testid="recommendation-score"]',
  
  // 分配操作
  assignButton: '[data-testid="assign-button"]',
  confirmAssignButton: '[data-testid="confirm-assign-button"]',
};
