/**
 * 密码强度验证工具
 * 提供密码复杂度检查和强度评估
 */

export interface PasswordValidationResult {
  valid: boolean;
  message: string;
  strength: 'weak' | 'medium' | 'strong';
}

// 常见弱密码列表
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
  'baseball', '111111', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
  '654321', 'superman', 'qazwsx', 'michael', 'football'
];

/**
 * 检查密码是否在常见弱密码列表中
 */
const isCommonPassword = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();
  return COMMON_PASSWORDS.some(common =>
    lowerPassword.includes(common) || common.includes(lowerPassword)
  );
};

/**
 * 评估密码强度
 */
const evaluatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0;

  // 长度评分
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // 包含小写字母
  if (/[a-z]/.test(password)) score++;

  // 包含大写字母
  if (/[A-Z]/.test(password)) score++;

  // 包含数字
  if (/[0-9]/.test(password)) score++;

  // 包含特殊字符
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // 根据评分确定强度
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
};

/**
 * 验证密码强度
 * @param password 要验证的密码
 * @param checkCommon 是否检查常见弱密码（默认true）
 * @returns 验证结果
 */
export const validatePasswordStrength = (
  password: string,
  checkCommon: boolean = true
): PasswordValidationResult => {
  // 基本长度检查
  if (password.length < 6) {
    return {
      valid: false,
      message: '密码至少需要6个字符',
      strength: 'weak'
    };
  }

  // 推荐长度检查
  if (password.length < 8) {
    return {
      valid: true,
      message: '密码强度较弱，建议使用至少8个字符',
      strength: 'weak'
    };
  }

  // 检查常见弱密码
  if (checkCommon && isCommonPassword(password)) {
    return {
      valid: false,
      message: '密码过于常见，请使用更复杂的密码',
      strength: 'weak'
    };
  }

  // 评估密码强度
  const strength = evaluatePasswordStrength(password);

  // 根据强度返回不同的消息
  switch (strength) {
    case 'weak':
      return {
        valid: true,
        message: '密码强度较弱，建议混合使用大小写字母、数字和特殊字符',
        strength
      };
    case 'medium':
      return {
        valid: true,
        message: '密码强度中等，可以添加特殊字符来增强安全性',
        strength
      };
    case 'strong':
      return {
        valid: true,
        message: '密码强度良好',
        strength
      };
  }
};

/**
 * 验证密码是否符合强密码策略
 * 用于管理员账户或关键操作
 */
export const validateStrongPassword = (password: string): PasswordValidationResult => {
  // 基本验证
  const basicResult = validatePasswordStrength(password);
  if (!basicResult.valid) {
    return basicResult;
  }

  // 强密码策略：至少8位，包含大小写字母、数字
  if (password.length < 8) {
    return {
      valid: false,
      message: '密码至少需要8个字符',
      strength: 'weak'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: '密码必须包含至少一个小写字母',
      strength: 'weak'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: '密码必须包含至少一个大写字母',
      strength: 'weak'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: '密码必须包含至少一个数字',
      strength: 'weak'
    };
  }

  const strength = evaluatePasswordStrength(password);
  return {
    valid: true,
    message: strength === 'strong' ? '密码符合强密码策略' : '密码可用，但建议添加特殊字符',
    strength
  };
};

/**
 * 检查两个密码是否匹配
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): { valid: boolean; message: string } => {
  if (password !== confirmPassword) {
    return {
      valid: false,
      message: '两次输入的密码不一致'
    };
  }

  return {
    valid: true,
    message: ''
  };
};
