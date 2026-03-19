/**
 * 通用选择器定义
 */
export const commonSelectors = {
  // 加载状态
  loadingSpinner: '[data-testid="loading-spinner"]',
  loadingOverlay: '[data-testid="loading-overlay"]',

  // 提示消息
  toastMessage: '[data-testid="toast-message"]',
  toastSuccess: '[data-testid="toast-success"]',
  toastError: '[data-testid="toast-error"]',

  // 对话框
  confirmDialog: '[data-testid="confirm-dialog"]',
  confirmButton: '[data-testid="confirm-button"]',
  cancelButton: '[data-testid="cancel-button"]',
  closeButton: '[data-testid="close-button"]',

  // 导航
  sidebar: '[data-testid="sidebar"]',
  dashboardLink: '[data-testid="nav-dashboard"]',
  projectsLink: '[data-testid="nav-projects"]',
  tasksLink: '[data-testid="nav-tasks"]',
  assignmentLink: '[data-testid="nav-assignment"]',
  settingsLink: '[data-testid="nav-settings"]',

  // 用户菜单
  userMenu: '[data-testid="user-menu"]',
  userAvatar: '[data-testid="user-avatar"]',
  logoutButton: '[data-testid="logout-button"]',
  profileLink: '[data-testid="profile-link"]',

  // 表单通用
  submitButton: '[data-testid="submit-button"]',
  saveButton: '[data-testid="save-button"]',
  formError: '[data-testid="form-error"]',
  inputError: '.error-message',

  // 空状态
  emptyState: '[data-testid="empty-state"]',
};
