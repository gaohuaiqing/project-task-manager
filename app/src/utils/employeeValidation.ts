/**
 * 员工ID验证工具
 */

/**
 * 验证员工ID格式
 * @param employeeId 员工ID
 * @param excludeCurrentId 排除当前ID（用于更新时检查）
 * @returns 验证结果
 */
export function validateEmployeeId(
  employeeId: string,
  excludeCurrentId?: string
): { valid: boolean; message: string } {
  if (!employeeId) {
    return { valid: false, message: '员工ID不能为空' };
  }

  // 检查格式：8位数字
  if (!/^\d{8}$/.test(employeeId)) {
    return { valid: false, message: '员工ID必须是8位数字' };
  }

  return { valid: true, message: '' };
}

/**
 * 检查员工ID是否已存在
 * @param employeeId 员工ID
 * @returns 是否存在
 */
export function isEmployeeIdExists(employeeId: string): boolean {
  // 简单实现，实际应检查数据库
  return false;
}
