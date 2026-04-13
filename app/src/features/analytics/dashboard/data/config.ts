/**
 * 仪表板数据源配置
 *
 * @module analytics/dashboard/data/config
 * @description 控制仪表板数据来源（Mock 或 API）
 */

/**
 * 仪表板配置
 */
export const DASHBOARD_CONFIG = {
  /**
   * 全局开关：是否使用模拟数据
   * - true: 使用 Mock 数据（开发阶段）
   * - false: 使用真实 API（对接后端时）
   */
  USE_MOCK_DATA: true,

  /**
   * 按角色单独配置（可选，优先级高于全局开关）
   * undefined 表示使用全局配置
   */
  ROLE_MOCK_OVERRIDE: {
    admin: undefined,
    dept_manager: undefined,
    tech_manager: undefined,
    engineer: undefined,
  } as Record<string, boolean | undefined>,

  /**
   * 缓存配置
   */
  CACHE: {
    /** 数据过期时间（毫秒） */
    staleTime: 5 * 60 * 1000, // 5 分钟
    /** 后台刷新间隔（毫秒） */
    refetchInterval: 10 * 60 * 1000, // 10 分钟
  },
} as const;

/**
 * 检查指定角色是否使用模拟数据
 * @param role 用户角色
 * @returns 是否使用模拟数据
 */
export function shouldUseMockData(role?: string): boolean {
  if (role && DASHBOARD_CONFIG.ROLE_MOCK_OVERRIDE[role] !== undefined) {
    return DASHBOARD_CONFIG.ROLE_MOCK_OVERRIDE[role]!;
  }
  return DASHBOARD_CONFIG.USE_MOCK_DATA;
}
