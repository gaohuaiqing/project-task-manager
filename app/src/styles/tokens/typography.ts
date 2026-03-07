/**
 * 苹果风格设计系统 - 排版令牌
 * Apple Human Interface Guidelines 排版规范
 *
 * 字体系统基于 SF Pro (San Francisco) 的设计理念
 */

/**
 * 字体族（Font Families）
 * 优先使用苹果系统字体，回退到通用字体栈
 */
export const fontFamilies = {
  // 系统字体（苹果风格）
  system: [
    '-apple-system',
    'BlinkMacSystemFont',
    'SF Pro Display',
    'SF Pro Text',
    'system-ui',
    'sans-serif',
  ].join(', '),

  // 等宽字体
  mono: [
    'SF Mono',
    'ui-monospace',
    'Monaco',
    'Cascadia Code',
    'Roboto Mono',
    'Courier New',
    'monospace',
  ].join(', '),

  // 自定义字体（可配置）
  custom: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'sans-serif',
  ].join(', '),
} as const;

/**
 * 字体大小（Font Sizes）
 * 响应式字体大小，符合苹果排版规范
 */
export const fontSizes = {
  // 标题字体
  heading: {
    h1: {
      fontSize: '32px',      // 2rem
      lineHeight: '40px',    // 1.25
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '28px',      // 1.75rem
      lineHeight: '36px',    // 1.285
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontSize: '24px',      // 1.5rem
      lineHeight: '32px',    // 1.333
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '20px',      // 1.25rem
      lineHeight: '28px',    // 1.4
      fontWeight: 600,
      letterSpacing: '-0.005em',
    },
    h5: {
      fontSize: '18px',      // 1.125rem
      lineHeight: '24px',    // 1.333
      fontWeight: 600,
      letterSpacing: '0',
    },
    h6: {
      fontSize: '16px',      // 1rem
      lineHeight: '24px',    // 1.5
      fontWeight: 600,
      letterSpacing: '0',
    },
  },

  // 正文字体
  body: {
    large: {
      fontSize: '18px',      // 1.125rem
      lineHeight: '28px',    // 1.555
      fontWeight: 400,
      letterSpacing: '0',
    },
    default: {
      fontSize: '16px',      // 1rem
      lineHeight: '24px',    // 1.5
      fontWeight: 400,
      letterSpacing: '0',
    },
    small: {
      fontSize: '14px',      // 0.875rem
      lineHeight: '20px',    // 1.428
      fontWeight: 400,
      letterSpacing: '0',
    },
  },

  // 辅助文字
  caption: {
    fontSize: '12px',        // 0.75rem
    lineHeight: '16px',      // 1.333
    fontWeight: 400,
    letterSpacing: '0.02em',
  },

  // 超小文字
  overline: {
    fontSize: '11px',        // 0.6875rem
    lineHeight: '16px',      // 1.454
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
} as const;

/**
 * 字重（Font Weights）
 */
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

/**
 * 行高（Line Heights）
 */
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

/**
 * 字间距（Letter Spacing）
 */
export const letterSpacings = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

/**
 * 文本样式（Text Styles）
 * 预定义的文本样式组合
 */
export const textStyles = {
  // 大标题
  display: {
    large: {
      ...fontSizes.heading.h1,
      fontFamily: fontFamilies.system,
    },
    medium: {
      ...fontSizes.heading.h2,
      fontFamily: fontFamilies.system,
    },
    small: {
      ...fontSizes.heading.h3,
      fontFamily: fontFamilies.system,
    },
  },

  // 标题
  title: {
    large: {
      ...fontSizes.heading.h3,
      fontFamily: fontFamilies.system,
    },
    medium: {
      ...fontSizes.heading.h4,
      fontFamily: fontFamilies.system,
    },
    small: {
      ...fontSizes.heading.h5,
      fontFamily: fontFamilies.system,
    },
  },

  // 正文
  body: {
    large: {
      ...fontSizes.body.large,
      fontFamily: fontFamilies.system,
    },
    default: {
      ...fontSizes.body.default,
      fontFamily: fontFamilies.system,
    },
    small: {
      ...fontSizes.body.small,
      fontFamily: fontFamilies.system,
    },
  },

  // 辅助文本
  caption: {
    default: {
      ...fontSizes.caption,
      fontFamily: fontFamilies.system,
    },
  },

  // 代码
  code: {
    fontSize: '14px',
    lineHeight: '20px',
    fontFamily: fontFamilies.mono,
    fontWeight: 400,
  },

  // 按钮
  button: {
    large: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 600,
      fontFamily: fontFamilies.system,
    },
    medium: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 600,
      fontFamily: fontFamilies.system,
    },
    small: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 600,
      fontFamily: fontFamilies.system,
    },
  },
} as const;

/**
 * 响应式排版（Responsive Typography）
 * 针对不同屏幕尺寸的字体大小调整
 */
export const responsiveTypography = {
  mobile: {
    heading: {
      h1: { fontSize: '28px', lineHeight: '36px' },
      h2: { fontSize: '24px', lineHeight: '32px' },
      h3: { fontSize: '20px', lineHeight: '28px' },
    },
  },

  tablet: {
    heading: {
      h1: { fontSize: '32px', lineHeight: '40px' },
      h2: { fontSize: '28px', lineHeight: '36px' },
      h3: { fontSize: '24px', lineHeight: '32px' },
    },
  },

  desktop: {
    heading: {
      h1: { fontSize: '40px', lineHeight: '48px' },
      h2: { fontSize: '32px', lineHeight: '40px' },
      h3: { fontSize: '28px', lineHeight: '36px' },
    },
  },
} as const;

/**
 * 排版工具函数
 */
export const typographyUtils = {
  /**
   * 获取字体族
   */
  getFontFamily: (type: keyof typeof fontFamilies): string => {
    return fontFamilies[type];
  },

  /**
   * 获取文本样式
   */
  getTextStyle: (category: keyof typeof textStyles, size: keyof typeof textStyles.display): string => {
    const style = textStyles[category][size as keyof typeof textStyles[typeof category]];
    return Object.entries(style)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  },

  /**
   * 创建自定义文本样式
   */
  createTextStyle: (options: {
    fontSize?: string;
    fontWeight?: number;
    lineHeight?: string;
    letterSpacing?: string;
  }): string => {
    return Object.entries(options)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  },
} as const;

/**
 * 导出所有排版令牌
 */
export const typographyTokens = {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  textStyles,
  responsive: responsiveTypography,
  utils: typographyUtils,
} as const;

/**
 * 类型导出
 */
export type FontFamilyType = keyof typeof fontFamilies;
export type TextStyleCategory = keyof typeof textStyles;
export type FontWeight = keyof typeof fontWeights;
