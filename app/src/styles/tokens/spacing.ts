/**
 * 苹果风格设计系统 - 间距令牌
 * Apple Human Interface Guidelines 间距规范
 *
 * 使用 8pt 基础网格系统，所有间距都是 4 的倍数
 */

/**
 * 基础间距（Base Spacing）
 * 基于 4px 网格系统，符合苹果设计规范
 */
export const spacing = {
  0: '0',
  0.5: '2px',      // 0.5 unit - 极小间距
  1: '4px',        // 1 unit - 最小间距
  1.5: '6px',      // 1.5 units - 微小间距
  2: '8px',        // 2 units - 小间距
  2.5: '10px',     // 2.5 units
  3: '12px',       // 3 units - 中小间距
  3.5: '14px',     // 3.5 units
  4: '16px',       // 4 units - 标准间距
  5: '20px',       // 5 units - 中等间距
  6: '24px',       // 6 units - 中大间距
  7: '28px',       // 7 units
  8: '32px',       // 8 units - 大间距
  9: '36px',       // 9 units
  10: '40px',      // 10 units - 超大间距
  11: '44px',      // 11 units
  12: '48px',      // 12 units - 特大间距
  14: '56px',      // 14 units
  16: '64px',      // 16 units - 巨大间距
  20: '80px',      // 20 units - 超巨大间距
  24: '96px',      // 24 units
  28: '112px',     // 28 units
  32: '128px',     // 32 units
  36: '144px',     // 36 units
  40: '160px',     // 40 units
  44: '176px',     // 44 units
  48: '192px',     // 48 units
  52: '208px',     // 52 units
  56: '224px',     // 56 units
  60: '240px',     // 60 units
  64: '256px',     // 64 units
  72: '288px',     // 72 units
  80: '320px',     // 80 units
  96: '384px',     // 96 units
} as const;

/**
 * 语义化间距（Semantic Spacing）
 * 用于特定场景的预定义间距
 */
export const semanticSpacing = {
  // 组件内间距
  component: {
    xs: spacing[2],        // 8px - 紧凑组件
    sm: spacing[3],        // 12px - 小组件
    md: spacing[4],        // 16px - 标准组件
    lg: spacing[6],        // 24px - 大组件
    xl: spacing[8],        // 32px - 超大组件
  },

  // 元素间距
  element: {
    xs: spacing[1],        // 4px - 相关元素
    sm: spacing[2],        // 8px - 紧密元素
    md: spacing[3],        // 12px - 标准元素
    lg: spacing[4],        // 16px - 疏松元素
    xl: spacing[6],        // 24px - 超松元素
  },

  // 区域间距
  section: {
    sm: spacing[4],        // 16px - 小区域
    md: spacing[6],        // 24px - 标准区域
    lg: spacing[8],        // 32px - 大区域
    xl: spacing[12],       // 48px - 超大区域
  },

  // 页面边距
  page: {
    sm: spacing[4],        // 16px - 小页面边距
    md: spacing[6],        // 24px - 标准页面边距
    lg: spacing[8],        // 32px - 大页面边距
  },

  // 内容容器
  container: {
    sm: '640px',           // 小容器
    md: '768px',           // 中容器
    lg: '1024px',          // 大容器
    xl: '1280px',          // 超大容器
    '2xl': '1536px',       // 2倍超大容器
  },
} as const;

/**
 * 响应式间距（Responsive Spacing）
 * 针对不同屏幕尺寸的间距调整
 */
export const responsiveSpacing = {
  mobile: {
    xs: spacing[2],        // 8px
    sm: spacing[3],        // 12px
    md: spacing[4],        // 16px
    lg: spacing[6],        // 24px
    xl: spacing[8],        // 32px
  },

  tablet: {
    xs: spacing[3],        // 12px
    sm: spacing[4],        // 16px
    md: spacing[6],        // 24px
    lg: spacing[8],        // 32px
    xl: spacing[10],       // 40px
  },

  desktop: {
    xs: spacing[4],        // 16px
    sm: spacing[6],        // 24px
    md: spacing[8],        // 32px
    lg: spacing[10],       // 40px
    xl: spacing[12],       // 48px
  },
} as const;

/**
 * 安全区域（Safe Areas）
 * 用于适配刘海屏和圆角屏幕
 */
export const safeAreas = {
  // iOS 安全区域
  ios: {
    top: 'env(safe-area-inset-top)',
    right: 'env(safe-area-inset-right)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
  },

  // 标准安全区域（回退值）
  fallback: {
    top: spacing[4],        // 16px
    right: spacing[3],      // 12px
    bottom: spacing[4],     // 16px
    left: spacing[3],       // 12px
  },
} as const;

/**
 * 负边距（Negative Margins）
 * 用于特殊布局需求
 */
export const negativeSpacing = {
  xs: `-${spacing[1]}`,     // -4px
  sm: `-${spacing[2]}`,     // -8px
  md: `-${spacing[3]}`,     // -12px
  lg: `-${spacing[4]}`,     // -16px
  xl: `-${spacing[6]}`,     // -24px
  '2xl': `-${spacing[8]}`,  // -32px
  '3xl': `-${spacing[12]}`, // -48px
} as const;

/**
 * 间距工具函数
 */
export const spacingUtils = {
  /**
   * 获取基础间距
   */
  get: (key: keyof typeof spacing): string => {
    return spacing[key];
  },

  /**
   * 获取语义化间距
   */
  getSemantic: (category: keyof typeof semanticSpacing, size: keyof typeof semanticSpacing.component): string => {
    return semanticSpacing[category][size];
  },

  /**
   * 获取响应式间距
   */
  getResponsive: (breakpoint: keyof typeof responsiveSpacing, size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string => {
    return responsiveSpacing[breakpoint][size];
  },

  /**
   * 创建自定义间距
   */
  create: (value: number): string => {
    return `${value * 4}px`;
  },
} as const;

/**
 * 导出所有间距令牌
 */
export const spacingTokens = {
  base: spacing,
  semantic: semanticSpacing,
  responsive: responsiveSpacing,
  safeAreas,
  negative: negativeSpacing,
  utils: spacingUtils,
} as const;

/**
 * 类型导出
 */
export type SpacingKey = keyof typeof spacing;
export type SemanticSpacingCategory = keyof typeof semanticSpacing;
export type ResponsiveBreakpoint = keyof typeof responsiveSpacing;
