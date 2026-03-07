/**
 * 苹果风格设计系统 - 统一入口
 * Apple Design System - Unified Entry Point
 *
 * 集中导出所有设计令牌，方便组件引用
 */

// 导入所有令牌模块
import * as colors from './colors';
import * as spacing from './spacing';
import * as typography from './typography';
import * as animation from './animation';
import * as effects from './effects';

// 重新导出所有模块
export * from './colors';
export * from './spacing';
export * from './typography';
export * from './animation';
export * from './effects';

/**
 * 设计系统版本信息
 */
export const designSystemVersion = {
  name: 'Apple Design System',
  version: '1.0.0',
  lastUpdated: '2025-01-07',
  description: '基于苹果人机界面指南的设计系统',
} as const;

/**
 * 设计令牌集合（Tokens Collection）
 * 统一访问所有设计令牌
 */
export const tokens = {
  colors: {
    system: colors.systemColors,
    semantic: colors.semanticColors,
    functional: colors.functionalColors,
    dark: colors.darkColors,
    gradients: colors.gradients,
  },

  spacing: {
    base: spacing.spacing,
    semantic: spacing.semanticSpacing,
    responsive: spacing.responsiveSpacing,
    safeAreas: spacing.safeAreas,
    negative: spacing.negativeSpacing,
  },

  typography: {
    fontFamilies: typography.fontFamilies,
    fontSizes: typography.fontSizes,
    fontWeights: typography.fontWeights,
    lineHeights: typography.lineHeights,
    letterSpacings: typography.letterSpacings,
    textStyles: typography.textStyles,
  },

  animation: {
    durations: animation.animationDurations,
    easings: animation.easingFunctions,
    presets: animation.animationPresets,
    keyframes: animation.keyframes,
  },

  effects: {
    borderRadius: effects.borderRadius,
    shadows: effects.shadows,
    blur: effects.blur,
    opacity: effects.opacity,
    glassmorphism: effects.glassmorphism,
    zIndex: effects.zIndex,
  },
} as const;

/**
 * 设计系统工具函数集合
 */
export const designUtils = {
  colors: colors.colorUtils,
  spacing: spacing.spacingUtils,
  typography: typography.typographyUtils,
  animation: animation.animationUtils,
  effects: effects.effectUtils,
} as const;

/**
 * 常用设计组合（Common Design Combinations）
 * 预定义的设计组合，便于快速应用
 */
export const designCombinations = {
  // 按钮样式
  button: {
    primary: {
      backgroundColor: colors.systemColors.blue.DEFAULT,
      color: '#ffffff',
      borderRadius: effects.borderRadius.apple.button,
      padding: spacing.semanticSpacing.component.sm,
      fontWeight: typography.fontWeights.semibold,
      transition: animation.animationUtils.transition(
        ['background-color', 'transform', 'box-shadow'],
        animation.animationDurations.fast,
        animation.easingFunctions.appleOut
      ),
      boxShadow: effects.shadows.none,
    } as const,
    secondary: {
      backgroundColor: 'transparent',
      color: colors.systemColors.blue.DEFAULT,
      border: '1px solid',
      borderColor: colors.semanticColors.border.default,
      borderRadius: effects.borderRadius.apple.button,
      padding: spacing.semanticSpacing.component.sm,
      fontWeight: typography.fontWeights.semibold,
      transition: animation.animationUtils.transition(
        ['color', 'border-color', 'transform', 'box-shadow'],
        animation.animationDurations.fast,
        animation.easingFunctions.appleOut
      ),
      boxShadow: effects.shadows.none,
    } as const,
  },

  // 卡片样式
  card: {
    standard: {
      backgroundColor: colors.semanticColors.background.primary,
      borderRadius: effects.borderRadius.apple.card,
      padding: spacing.semanticSpacing.component.md,
      boxShadow: effects.shadows.apple.subtle,
      transition: animation.animationUtils.transition(
        ['transform', 'box-shadow'],
        animation.animationDurations.fast,
        animation.easingFunctions.appleOut
      ),
    } as const,
    elevated: {
      backgroundColor: colors.semanticColors.background.primary,
      borderRadius: effects.borderRadius.apple.card,
      padding: spacing.semanticSpacing.component.md,
      boxShadow: effects.shadows.apple.floating,
      transition: animation.animationUtils.transition(
        ['transform', 'box-shadow'],
        animation.animationDurations.fast,
        animation.easingFunctions.appleOut
      ),
    } as const,
  },

  // 输入框样式
  input: {
    standard: {
      backgroundColor: colors.semanticColors.background.primary,
      border: '1px solid',
      borderColor: colors.semanticColors.border.default,
      borderRadius: effects.borderRadius.sm,
      padding: spacing.semanticSpacing.component.sm,
      fontSize: typography.fontSizes.body.default.fontSize,
      lineHeight: typography.fontSizes.body.default.lineHeight,
      transition: animation.animationUtils.transition(
        ['border-color', 'box-shadow'],
        animation.animationDurations.fast,
        animation.easingFunctions.appleOut
      ),
    } as const,
  },

  // 模态框样式
  modal: {
    container: {
      backgroundColor: colors.semanticColors.background.primary,
      borderRadius: effects.borderRadius.apple.modal,
      padding: spacing.semanticSpacing.component.lg,
      boxShadow: effects.shadows.apple.modal,
      animation: animation.animationUtils.animation(
        'scaleFadeIn',
        animation.animationDurations.medium,
        animation.easingFunctions.spring
      ),
    } as const,
    backdrop: {
      backgroundColor: colors.semanticColors.overlay.medium,
      backdropFilter: `blur(${effects.blur.md})`,
      transition: animation.animationUtils.transition(
        'opacity',
        animation.animationDurations.medium,
        animation.easingFunctions.apple
      ),
    } as const,
  },
} as const;

/**
 * Tailwind CSS 扩展配置
 * 用于在 tailwind.config.js 中引用设计令牌
 */
export const tailwindExtension = {
  extend: {
    // 颜色扩展
    colors: {
      // 系统颜色
      system: colors.systemColors,
      // 语义化颜色
      primary: colors.semanticColors.text.primary,
      secondary: colors.semanticColors.text.secondary,
      // 功能性颜色
      success: colors.functionalColors.success,
      warning: colors.functionalColors.warning,
      error: colors.functionalColors.error,
      info: colors.functionalColors.info,
    },

    // 间距扩展
    spacing: spacing.spacing,

    // 字体扩展
    fontFamily: {
      sans: [typography.fontFamilies.system],
      mono: [typography.fontFamilies.mono],
    },

    // 字体大小扩展
    fontSize: {
      // 标题
      'heading-h1': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
      'heading-h2': ['28px', { lineHeight: '36px', letterSpacing: '-0.015em', fontWeight: '700' }],
      'heading-h3': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
      'heading-h4': ['20px', { lineHeight: '28px', letterSpacing: '-0.005em', fontWeight: '600' }],
      'heading-h5': ['18px', { lineHeight: '24px', letterSpacing: '0', fontWeight: '600' }],
      'heading-h6': ['16px', { lineHeight: '24px', letterSpacing: '0', fontWeight: '600' }],
      // 正文
      'body-large': ['18px', { lineHeight: '28px', fontWeight: '400' }],
      'body-default': ['16px', { lineHeight: '24px', fontWeight: '400' }],
      'body-small': ['14px', { lineHeight: '20px', fontWeight: '400' }],
      // 辅助文本
      'caption': ['12px', { lineHeight: '16px', fontWeight: '400', letterSpacing: '0.02em' }],
      'overline': ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.06em', textTransform: 'uppercase' }],
    },

    // 圆角扩展
    borderRadius: {
      'apple-button': effects.borderRadius.apple.button,
      'apple-card': effects.borderRadius.apple.card,
      'apple-modal': effects.borderRadius.apple.modal,
      'apple-sheet': effects.borderRadius.apple.sheet,
      'apple-alert': effects.borderRadius.apple.alert,
    },

    // 阴影扩展
    boxShadow: {
      'apple-subtle': effects.shadows.apple.subtle,
      'apple-floating': effects.shadows.apple.floating,
      'apple-elevated': effects.shadows.apple.elevated,
      'apple-prominent': effects.shadows.apple.prominent,
      'apple-modal': effects.shadows.apple.modal,
      'apple-dropdown': effects.shadows.apple.dropdown,
    },

    // 动画扩展
    transitionDuration: {
      'instant': '100ms',
      'fast': '200ms',
      'base': '300ms',
      'medium': '400ms',
      'slow': '500ms',
      'slower': '600ms',
      'slowest': '1000ms',
    },
    transitionTimingFunction: {
      'apple': animation.easingFunctions.apple,
      'apple-in': animation.easingFunctions.appleIn,
      'apple-out': animation.easingFunctions.appleOut,
      'spring': animation.easingFunctions.spring,
      'spring-soft': animation.easingFunctions.springSoft,
      'spring-bouncy': animation.easingFunctions.springBouncy,
    },

    // Z-index扩展
    zIndex: effects.zIndex,

    // 模糊效果扩展
    backdropBlur: {
      'apple-subtle': effects.blur.apple.subtle,
      'apple-standard': effects.blur.apple.standard,
      'apple-strong': effects.blur.apple.strong,
    },
  },
} as const;

/**
 * 使用示例（Usage Examples）
 *
 * // 1. 在组件中使用设计令牌
 * import { colors, spacing, typography } from '@/styles/tokens';
 *
 * const MyComponent = () => {
 *   return (
 *     <div style={{
 *       backgroundColor: colors.semantic.background.primary,
 *       padding: spacing.semantic.component.md,
 *       fontFamily: typography.fontFamilies.system,
 *     }}>
 *       内容
 *     </div>
 *   );
 * };
 *
 * // 2. 使用 Tailwind 类名
 * // 在 tailwind.config.js 中配置后，可直接使用：
 * // <div className="bg-primary text-system-blue rounded-apple-card shadow-apple-floating">
 * //   内容
 * // </div>
 *
 * // 3. 使用预定义组合
 * import { designCombinations } from '@/styles/tokens';
 *
 * const MyButton = () => {
 *   return <button style={designCombinations.button.primary}>按钮</button>;
 * };
 */
