/**
 * 苹果风格设计系统 - 视觉效果令牌
 * Apple Human Interface Guidelines 视觉效果规范
 *
 * 包括阴影、圆角、模糊效果等
 */

/**
 * 圆角半径（Border Radius）
 * 苹果风格的圆角系统
 */
export const borderRadius = {
  // 基础圆角
  none: '0',
  xs: '4px',       // 极小圆角 - 小元素、标签
  sm: '8px',       // 小圆角 - 按钮、输入框
  md: '12px',      // 中圆角 - 卡片、面板（苹果标准）
  lg: '16px',      // 大圆角 - 大卡片
  xl: '20px',      // 超大圆角 - 模态框
  '2xl': '24px',   // 特大圆角 - 特殊容器
  '3xl': '32px',   // 巨大圆角 - 特殊场景

  // 完全圆角
  full: '9999px',  // 圆形 - 头像、徽章

  // 苹果特殊圆角
  apple: {
    button: '10px',      // 苹果按钮圆角
    card: '12px',        // 苹果卡片圆角
    modal: '14px',       // 苹果模态框圆角
    sheet: '16px',       // 苹果底部表单圆角
    alert: '12px',       // 苹果警告框圆角
  },
} as const;

/**
 * 阴影系统（Shadow System）
 * 多层次阴影系统，营造深度感
 */
export const shadows = {
  // 基础阴影
  none: 'none',

  // 小阴影 - 微妙的浮起效果
  sm: [
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  ].join(', '),

  // 默认阴影 - 标准浮起效果
  md: [
    '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  ].join(', '),

  // 大阴影 - 明显的浮起效果
  lg: [
    '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  ].join(', '),

  // 超大阴影 - 强烈的浮起效果
  xl: [
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  ].join(', '),

  // 内阴影
  inner: [
    'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  ].join(', '),

  // 苹果风格阴影
  apple: {
    // 微妙浮起
    subtle: [
      '0 1px 3px rgba(0, 0, 0, 0.08)',
      '0 1px 2px rgba(0, 0, 0, 0.04)',
    ].join(', '),

    // 标准浮起
    floating: [
      '0 4px 8px rgba(0, 0, 0, 0.08)',
      '0 2px 4px rgba(0, 0, 0, 0.04)',
    ].join(', '),

    // 明显浮起
    elevated: [
      '0 8px 16px rgba(0, 0, 0, 0.1)',
      '0 4px 8px rgba(0, 0, 0, 0.06)',
    ].join(', '),

    // 强烈浮起
    prominent: [
      '0 12px 24px rgba(0, 0, 0, 0.12)',
      '0 6px 12px rgba(0, 0, 0, 0.08)',
    ].join(', '),

    // 模态框
    modal: [
      '0 20px 40px rgba(0, 0, 0, 0.15)',
      '0 8px 16px rgba(0, 0, 0, 0.1)',
    ].join(', '),

    // 下拉菜单
    dropdown: [
      '0 10px 20px rgba(0, 0, 0, 0.12)',
      '0 4px 8px rgba(0, 0, 0, 0.08)',
    ].join(', '),
  },

  // 彩色阴影（用于强调元素）
  colored: {
    blue: [
      '0 4px 12px rgba(0, 122, 255, 0.25)',
    ].join(', '),
    green: [
      '0 4px 12px rgba(52, 199, 89, 0.25)',
    ].join(', '),
    red: [
      '0 4px 12px rgba(255, 59, 48, 0.25)',
    ].join(', '),
  },
} as const;

/**
 * 模糊效果（Blur Effects）
 * 用于玻璃态效果和背景模糊
 */
export const blur = {
  none: '0',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '40px',

  // 苹果标准模糊
  apple: {
    subtle: '10px',      // 微妙模糊
    standard: '20px',    // 标准模糊
    strong: '30px',      // 强模糊
  },
} as const;

/**
 * 透明度（Opacity）
 */
export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',

  // 语义化透明度
  disabled: '0.5',      // 禁用状态
  hover: '0.8',         // 悬停状态
  pressed: '0.6',       // 按下状态
  focus: '0.9',         // 焦点状态
} as const;

/**
 * 玻璃态效果（Glassmorphism）
 * 苹果风格的玻璃态效果
 */
export const glassmorphism = {
  // 轻微玻璃态
  subtle: {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: `blur(${blur.md})`,
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },

  // 标准玻璃态
  standard: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: `blur(${blur.lg})`,
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },

  // 强烈玻璃态
  strong: {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: `blur(${blur.xl})`,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  // 深色模式玻璃态
  dark: {
    background: 'rgba(28, 28, 30, 0.8)',
    backdropFilter: `blur(${blur.lg})`,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
} as const;

/**
 * 渐变叠加（Gradient Overlays）
 * 用于创建深度和层次感
 */
export const gradients = {
  // 顶部渐变遮罩
  topGradient: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 100%)',

  // 底部渐变遮罩
  bottomGradient: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 100%)',

  // 中心高光
  centerHighlight: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',

  // 边缘暗角
  vignette: 'radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.3) 100%)',
} as const;

/**
 * 过渡效果（Transition Effects）
 */
export const transitions = {
  // 属性过渡
  properties: {
    common: 'color, background-color, border-color, text-decoration-color, fill, stroke',
    transform: 'transform, opacity, filter',
    layout: 'width, height, padding, margin',
  },

  // 组合过渡
  all: 'all',
  none: 'none',
} as const;

/**
 * Z-index 层级（Z-Index Scale）
 * 统一的z-index层级管理
 */
export const zIndex = {
  // 基础层级
  base: 0,
  above: 1,

  // 交互元素
  dropdown: 100,
  sticky: 200,
  fixed: 300,

  // 浮层
  overlay: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,

  // 顶部层级
  notification: 800,
  toast: 900,
  max: 9999,
} as const;

/**
 * 视觉效果工具函数
 */
export const effectUtils = {
  /**
   * 创建自定义阴影
   */
  createShadow: (
    offsetX: number,
    offsetY: number,
    blur: number,
    spread: number,
    color: string
  ): string => {
    return `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`;
  },

  /**
   * 创建多层阴影
   */
  createMultiShadow: (...shadows: string[]): string => {
    return shadows.join(', ');
  },

  /**
   * 获取苹果风格阴影
   */
  getAppleShadow: (variant: keyof typeof shadows.apple): string => {
    return shadows.apple[variant];
  },

  /**
   * 创建玻璃态样式
   */
  createGlassEffect: (
    variant: keyof typeof glassmorphism,
    customBlur?: string
  ): string => {
    const effect = glassmorphism[variant];
    return `
      background: ${effect.background};
      backdrop-filter: blur(${customBlur || blur.lg});
      border: ${effect.border};
    `;
  },

  /**
   * 获取z-index
   */
  getZIndex: (layer: keyof typeof zIndex): number => {
    return zIndex[layer];
  },
} as const;

/**
 * 常用视觉效果组合
 */
export const commonEffects = {
  // 浮起卡片
  elevatedCard: {
    borderRadius: borderRadius.md,
    boxShadow: shadows.apple.floating,
    transition: 'box-shadow 200ms ease-out',
  },

  // 悬停状态
  hoverState: {
    boxShadow: shadows.apple.elevated,
    transform: 'translateY(-2px)',
    transition: 'all 200ms ease-out',
  },

  // 按下状态
  pressState: {
    boxShadow: shadows.apple.subtle,
    transform: 'translateY(0) scale(0.98)',
    transition: 'all 100ms ease-in',
  },

  // 玻璃态导航栏
  glassNavigation: {
    background: glassmorphism.standard.background,
    backdropFilter: glassmorphism.standard.backdropFilter,
    borderBottom: glassmorphism.standard.border,
  },

  // 模态框背景
  modalBackdrop: {
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: `blur(${blur.md})`,
  },
} as const;

/**
 * 导出所有效果令牌
 */
export const effectTokens = {
  borderRadius,
  shadows,
  blur,
  opacity,
  glassmorphism,
  gradients,
  transitions,
  zIndex,
  utils: effectUtils,
  common: commonEffects,
} as const;

/**
 * 类型导出
 */
export type BorderRadius = keyof typeof borderRadius;
export type ShadowVariant = keyof typeof shadows;
export type BlurSize = keyof typeof blur;
export type OpacityValue = keyof typeof opacity;
export type GlassmorphismVariant = keyof typeof glassmorphism;
export type ZIndexLayer = keyof typeof zIndex;
