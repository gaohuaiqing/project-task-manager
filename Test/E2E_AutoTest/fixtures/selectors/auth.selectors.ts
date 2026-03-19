/**
 * 认证模块选择器
 */
export const authSelectors = {
  // 登录页
  loginPage: '[data-testid="login-page"]',
  loginForm: '[data-testid="login-form"]',
  usernameInput: '[data-testid="username-input"]',
  passwordInput: '[data-testid="password-input"]',
  submitButton: '[data-testid="login-button"]',
  errorMessage: '[data-testid="error-message"]',
  forgotPasswordLink: '[data-testid="forgot-password-link"]',

  // 表单验证
  usernameError: '[data-testid="username-error"]',
  passwordError: '[data-testid="password-error"]',

  // 登录状态
  loginSuccess: '[data-testid="login-success"]',
  loginFailed: '[data-testid="login-failed"]',
};
