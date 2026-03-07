/**
 * 苹果风格设计系统 - 动画令牌
 * Apple Human Interface Guidelines 动画规范
 *
 * 动画时长和缓动函数严格遵循苹果设计标准
 */

/**
 * 动画时长（Animation Durations）
 * 苹果标准动画时长（毫秒）
 */
export const animationDurations = {
  // 即时反馈
  instant: 100,           // 0.1s - 即时状态变化

  // 快速动画
  fast: 200,              // 0.2s - 微交互（悬停、焦点）

  // 标准动画
  base: 300,              // 0.3s - 标准过渡（菜单展开、标签切换）

  // 中速动画
  medium: 400,            // 0.4s - 模态框出现/消失

  // 慢速动画
  slow: 500,              // 0.5s - 页面切换、复杂动画

  // 超慢动画
  slower: 600,            // 0.6s - 特殊效果

  // 极慢动画
  slowest: 1000,          // 1.0s - 复杂入场动画
} as const;

/**
 * 缓动函数（Easing Functions）
 * 苹果风格的缓动曲线
 */
export const easingFunctions = {
  // 线性
  linear: 'cubic-bezier(0, 0, 1, 1)',

  // 基础缓动
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',           // 标准缓动
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',             // 缓入
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',            // 缓出
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',       // 缓入缓出

  // 苹果风格缓动
  apple: 'cubic-bezier(0.25, 0.1, 0.25, 1)',         // 苹果标准
  appleIn: 'cubic-bezier(0.32, 0, 0.67, 0)',         // 苹果缓入
  appleOut: 'cubic-bezier(0.33, 1, 0.68, 1)',        // 苹果缓出

  // Spring 动画（弹性效果）
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',       // 弹性效果
  springSoft: 'cubic-bezier(0.25, 1.25, 0.5, 1)',    // 轻弹性
  springBouncy: 'cubic-bezier(0.34, 1.8, 0.64, 1)',  // 强弹性

  // 特殊效果
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',          // 减速
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',          // 加速
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',             // 锐利
} as const;

/**
 * 动画预设（Animation Presets）
 * 预定义的动画组合
 */
export const animationPresets = {
  // 淡入淡出
  fade: {
    in: {
      duration: animationDurations.base,
      easing: easingFunctions.appleOut,
    },
    out: {
      duration: animationDurations.base,
      easing: easingFunctions.appleIn,
    },
  },

  // 缩放
  scale: {
    in: {
      duration: animationDurations.base,
      easing: easingFunctions.spring,
      from: 0.95,
      to: 1,
    },
    out: {
      duration: animationDurations.fast,
      easing: easingFunctions.easeIn,
      from: 1,
      to: 0.95,
    },
  },

  // 滑动
  slide: {
    up: {
      duration: animationDurations.base,
      easing: easingFunctions.appleOut,
      distance: '10px',
    },
    down: {
      duration: animationDurations.base,
      easing: easingFunctions.appleOut,
      distance: '-10px',
    },
    left: {
      duration: animationDurations.base,
      easing: easingFunctions.appleOut,
      distance: '10px',
    },
    right: {
      duration: animationDurations.base,
      easing: easingFunctions.appleOut,
      distance: '-10px',
    },
  },

  // 组合动画
  combo: {
    scaleFade: {
      duration: animationDurations.base,
      easing: easingFunctions.appleOut,
    },
    slideFade: {
      duration: animationDurations.medium,
      easing: easingFunctions.appleOut,
    },
  },

  // 微交互
  micro: {
    hover: {
      duration: animationDurations.fast,
      easing: easingFunctions.easeOut,
    },
    press: {
      duration: animationDurations.instant,
      easing: easingFunctions.easeIn,
    },
    focus: {
      duration: animationDurations.fast,
      easing: easingFunctions.appleOut,
    },
  },

  // 模态框
  modal: {
    in: {
      duration: animationDurations.medium,
      easing: easingFunctions.spring,
    },
    out: {
      duration: animationDurations.fast,
      easing: easingFunctions.easeIn,
    },
  },

  // 页面切换
  page: {
    enter: {
      duration: animationDurations.medium,
      easing: easingFunctions.appleOut,
    },
    exit: {
      duration: animationDurations.fast,
      easing: easingFunctions.appleIn,
    },
  },
} as const;

/**
 * 关键帧动画（Keyframe Animations）
 * CSS 关键帧动画定义
 */
export const keyframes = {
  // 淡入
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },

  // 淡出
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },

  // 缩放淡入
  scaleFadeIn: {
    from: { opacity: 0, transform: 'scale(0.95)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },

  // 缩放淡出
  scaleFadeOut: {
    from: { opacity: 1, transform: 'scale(1)' },
    to: { opacity: 0, transform: 'scale(0.95)' },
  },

  // 上滑淡入
  slideUpFadeIn: {
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },

  // 下滑淡出
  slideDownFadeOut: {
    from: { opacity: 1, transform: 'translateY(0)' },
    to: { opacity: 0, transform: 'translateY(10px)' },
  },

  // 弹性缩放
  springScale: {
    '0%': { transform: 'scale(0.95)' },
    '50%': { transform: 'scale(1.02)' },
    '100%': { transform: 'scale(1)' },
  },

  // 脉冲
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },

  // 旋转
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },

  // 弹跳
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-25%)' },
  },

  // 摇晃
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
  },
} as const;

/**
 * 动画延迟（Animation Delays）
 */
export const animationDelays = {
  none: 0,
  short: 100,
  medium: 200,
  long: 300,
} as const;

/**
 * 动画工具函数
 */
export const animationUtils = {
  /**
   * 创建过渡字符串
   */
  transition: (
    properties: string | string[],
    duration: number = animationDurations.base,
    easing: string = easingFunctions.apple
  ): string => {
    const props = Array.isArray(properties) ? properties.join(', ') : properties;
    return `${props} ${duration}ms ${easing}`;
  },

  /**
   * 创建动画字符串
   */
  animation: (
    name: string,
    duration: number = animationDurations.base,
    easing: string = easingFunctions.apple,
    delay: number = 0,
    iterationCount: number | 'infinite' = 1,
    direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse' = 'normal'
  ): string => {
    return `${name} ${duration}ms ${easing} ${delay}ms ${iterationCount} ${direction}`;
  },

  /**
   * 获取动画预设
   */
  getPreset: (category: keyof typeof animationPresets, name: string): typeof animationPresets[keyof typeof animationPresets] => {
    return animationPresets[category][name as keyof typeof animationPresets[typeof category]];
  },

  /**
   * 创建关键帧样式
   */
  keyframes: (name: keyof typeof keyframes): string => {
    const frames = keyframes[name];
    const frameString = Object.entries(frames)
      .map(([percentage, styles]) => {
        const styleString = Object.entries(styles)
          .map(([prop, value]) => `${prop}: ${value}`)
          .join('; ');
        return `${percentage} { ${styleString} }`;
      })
      .join('\n');
    return `@keyframes ${name} {\n${frameString}\n}`;
  },
} as const;

/**
 * 常用动画组合
 * 适用于常见UI场景
 */
export const commonAnimations = {
  // 按钮悬停
  buttonHover: {
    transition: animationUtils.transition('transform, box-shadow', animationDurations.fast, easingFunctions.appleOut),
    transform: 'scale(1.02)',
  },

  // 按钮按下
  buttonPress: {
    transition: animationUtils.transition('transform', animationDurations.instant, easingFunctions.easeIn),
    transform: 'scale(0.97)',
  },

  // 卡片进入
  cardEnter: {
    animation: animationUtils.animation('scaleFadeIn', animationDurations.base, easingFunctions.spring),
  },

  // 列表项进入（错开）
  listItemEnter: (index: number) => ({
    animation: animationUtils.animation(
      'slideUpFadeIn',
      animationDurations.base,
      easingFunctions.appleOut,
      index * 50 // 错开延迟
    ),
  }),

  // 模态框背景
  modalBackdrop: {
    transition: animationUtils.transition('opacity', animationDurations.medium, easingFunctions.apple),
  },

  // 输入框焦点
  inputFocus: {
    transition: animationUtils.transition('border-color, box-shadow', animationDurations.fast, easingFunctions.appleOut),
  },
} as const;

/**
 * 导出所有动画令牌
 */
export const animationTokens = {
  durations: animationDurations,
  easings: easingFunctions,
  presets: animationPresets,
  keyframes,
  delays: animationDelays,
  utils: animationUtils,
  common: commonAnimations,
} as const;

/**
 * 类型导出
 */
export type AnimationDuration = keyof typeof animationDurations;
export type EasingFunction = keyof typeof easingFunctions;
export type AnimationPresetCategory = keyof typeof animationPresets;
export type KeyframeName = keyof typeof keyframes;
