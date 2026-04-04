/**
 * 密码验证工具
 */

export interface PasswordValidationResult {
  valid: boolean;
  message: string;
  strength?: 'weak' | 'medium' | 'strong';
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 验证结果
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password) {
    return { valid: false, message: '密码不能为空', strength: 'weak' };
  }

  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位', strength: 'weak' };
  }

  if (password.length < 8) {
    return { valid: true, message: '密码强度：中等', strength: 'medium' };
  }

  // 检查是否包含数字和字母
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  if (hasNumber && hasLetter) {
    return { valid: true, message: '密码强度：强', strength: 'strong' };
  }

  return { valid: true, message: '密码强度：中等', strength: 'medium' };
}

/**
 * 验证强密码（必须包含字母和数字，至少8位）
 * @param password 密码
 * @returns 验证结果
 */
export function validateStrongPassword(password: string): PasswordValidationResult {
  if (!password) {
    return { valid: false, message: '密码不能为空' };
  }

  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }

  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  if (!hasNumber || !hasLetter) {
    return { valid: false, message: '密码必须包含字母和数字' };
  }

  return { valid: true, message: '密码符合要求', strength: 'strong' };
}
