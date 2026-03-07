/**
 * 苹果风格设计系统 - 颜色令牌
 * Apple Human Interface Guidelines 颜色规范
 */

/**
 * 系统颜色（System Colors）
 * 苹果官方系统颜色，用于强调交互元素和传达状态
 */
export const systemColors = {
  // 主色调
  blue: {
    light: 'hsl(211, 98%, 56%)',   // iOS 系统蓝
    DEFAULT: 'hsl(211, 98%, 52%)',
    dark: 'hsl(211, 100%, 50%)',
  },
  green: {
    light: 'hsl(142, 71%, 63%)',    // iOS 系统绿
    DEFAULT: 'hsl(142, 69%, 58%)',
    dark: 'hsl(142, 76%, 48%)',
  },
  // 警告色
  orange: {
    light: 'hsl(28, 92%, 68%)',     // iOS 系统橙
    DEFAULT: 'hsl(28, 93%, 62%)',
    dark: 'hsl(28, 93%, 53%)',
  },
  red: {
    light: 'hsl(0, 88%, 65%)',      // iOS 系统红
    DEFAULT: 'hsl(0, 84%, 60%)',
    dark: 'hsl(0, 89%, 48%)',
  },
  // 中性色
  yellow: {
    light: 'hsl(48, 96%, 67%)',     // iOS 系统黄
    DEFAULT: 'hsl(48, 98%, 60%)',
    dark: 'hsl(48, 100%, 50%)',
  },
  pink: {
    light: 'hsl(340, 82%, 72%)',    // iOS 系统粉
    DEFAULT: 'hsl(340, 82%, 66%)',
    dark: 'hsl(340, 83%, 56%)',
  },
  purple: {
    light: 'hsl(266, 86%, 70%)',    // iOS 系统紫
    DEFAULT: 'hsl(266, 88%, 62%)',
    dark: 'hsl(266, 88%, 52%)',
  },
  indigo: {
    light: 'hsl(239, 84%, 67%)',    // iOS 系统靛蓝
    DEFAULT: 'hsl(239, 84%, 62%)',
    dark: 'hsl(239, 86%, 52%)',
  },
} as const;

/**
 * 语义化颜色（Semantic Colors）
 * 用于特定UI元素的预定义颜色
 */
export const semanticColors = {
  // 背景色
  background: {
    primary: 'hsl(0, 0%, 100%)',           // 主背景
    secondary: 'hsl(0, 0%, 97%)',          // 次要背景
    tertiary: 'hsl(0, 0%, 94%)',           // 第三背景
    elevated: 'hsl(0, 0%, 100%)',          // 浮起元素背景
  },
  // 文本色
  text: {
    primary: 'hsl(0, 0%, 13%)',            // 主要文本
    secondary: 'hsl(0, 0%, 40%)',          // 次要文本
    tertiary: 'hsl(0, 0%, 60%)',           // 辅助文本
    inverse: 'hsl(0, 0%, 100%)',           // 反色文本
  },
  // 边框色
  border: {
    default: 'hsl(0, 0%, 88%)',            // 默认边框
    subtle: 'hsl(0, 0%, 92%)',             // 微妙边框
    strong: 'hsl(0, 0%, 80%)',             // 强边框
  },
  // 分隔线
  divider: {
    DEFAULT: 'hsl(0, 0%, 88%)',
    subtle: 'hsl(0, 0%, 94%)',
  },
  // 覆盖层
  overlay: {
    subtle: 'hsl(0, 0%, 0%, 0.2)',         // 微妙覆盖
    medium: 'hsl(0, 0%, 0%, 0.4)',         // 中等覆盖
    strong: 'hsl(0, 0%, 0%, 0.6)',         // 强覆盖
  },
} as const;

/**
 * 功能性颜色（Functional Colors）
 * 用于表达状态和反馈
 */
export const functionalColors = {
  success: systemColors.green.DEFAULT,
  warning: systemColors.orange.DEFAULT,
  error: systemColors.red.DEFAULT,
  info: systemColors.blue.DEFAULT,
} as const;

/**
 * 深色模式颜色（Dark Mode Colors）
 * 深色主题专用颜色
 */
export const darkColors = {
  background: {
    primary: 'hsl(0, 0%, 13%)',            // 深色主背景
    secondary: 'hsl(0, 0%, 16%)',          // 深色次要背景
    tertiary: 'hsl(0, 0%, 19%)',           // 深色第三背景
    elevated: 'hsl(0, 0%, 22%)',           // 深色浮起背景
  },
  text: {
    primary: 'hsl(0, 0%, 100%)',           // 深色主要文本
    secondary: 'hsl(0, 0%, 75%)',          // 深色次要文本
    tertiary: 'hsl(0, 0%, 55%)',           // 深色辅助文本
    inverse: 'hsl(0, 0%, 13%)',            // 深色反色文本
  },
  border: {
    default: 'hsl(0, 0%, 25%)',            // 深色默认边框
    subtle: 'hsl(0, 0%, 20%)',             // 深色微妙边框
    strong: 'hsl(0, 0%, 35%)',             // 深色强边框
  },
  divider: {
    DEFAULT: 'hsl(0, 0%, 25%)',
    subtle: 'hsl(0, 0%, 20%)',
  },
  overlay: {
    subtle: 'hsl(0, 0%, 0%, 0.4)',         // 深色微妙覆盖
    medium: 'hsl(0, 0%, 0%, 0.6)',         // 深色中等覆盖
    strong: 'hsl(0, 0%, 0%, 0.8)',         // 深色强覆盖
  },
} as const;

/**
 * 渐变色（Gradients）
 * 苹果风格渐变组合
 */
export const gradients = {
  // 蓝色渐变
  blue: {
    light: 'linear-gradient(135deg, hsl(211, 98%, 60%) 0%, hsl(211, 100%, 50%) 100%)',
    DEFAULT: 'linear-gradient(135deg, hsl(211, 98%, 56%) 0%, hsl(211, 100%, 46%) 100%)',
    dark: 'linear-gradient(135deg, hsl(211, 100%, 56%) 0%, hsl(211, 100%, 44%) 100%)',
  },
  // 绿色渐变
  green: {
    DEFAULT: 'linear-gradient(135deg, hsl(142, 71%, 63%) 0%, hsl(142, 76%, 48%) 100%)',
  },
  // 彩虹渐变（用于特殊效果）
  rainbow: {
    subtle: 'linear-gradient(90deg, hsl(211, 98%, 52%), hsl(142, 69%, 58%), hsl(48, 98%, 60%), hsl(340, 82%, 66%))',
  },
  // 玻璃态渐变
  glass: {
    light: 'linear-gradient(135deg, hsla(0, 0%, 100%, 0.9) 0%, hsla(0, 0%, 100%, 0.6) 100%)',
    dark: 'linear-gradient(135deg, hsla(0, 0%, 20%, 0.9) 0%, hsla(0, 0%, 20%, 0.6) 100%)',
  },
} as const;

/**
 * 颜色工具函数
 */
export const colorUtils = {
  /**
   * 获取颜色透明度变体
   */
  withAlpha: (color: string, alpha: number): string => {
    // 移除现有的 alpha 值并添加新的
    const colorWithoutAlpha = color.replace(/,\s*\d*\.?\d+\)/, '');
    return `${colorWithoutAlpha}, ${alpha})`;
  },

  /**
   * 混合两种颜色
   */
  mix: (color1: string, color2: string, weight: number = 0.5): string => {
    // 简化的颜色混合（实际应用中可使用更复杂的算法）
    return weight < 0.5 ? color1 : color2;
  },

  /**
   * 获取系统颜色
   */
  getSystemColor: (name: keyof typeof systemColors, shade: 'light' | 'DEFAULT' | 'dark' = 'DEFAULT'): string => {
    return systemColors[name][shade];
  },

  /**
   * 获取语义化颜色
   */
  getSemanticColor: (category: keyof typeof semanticColors, name: string): string => {
    return semanticColors[category][name as keyof typeof semanticColors[typeof category]];
  },
} as const;

/**
 * 导出所有颜色令牌
 */
export const colors = {
  system: systemColors,
  semantic: semanticColors,
  functional: functionalColors,
  dark: darkColors,
  gradients,
  utils: colorUtils,
} as const;

/**
 * 类型导出
 */
export type SystemColorName = keyof typeof systemColors;
export type SemanticColorCategory = keyof typeof semanticColors;
export type FunctionalColorName = keyof typeof functionalColors;
export type GradientName = keyof typeof gradients;
