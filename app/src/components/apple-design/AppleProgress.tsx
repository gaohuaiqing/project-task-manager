/**
 * 苹果风格进度条组件
 * Apple Style Progress Component
 *
 * 符合苹果设计规范的进度指示器
 */

import React from 'react';
import cn from 'classnames';

export interface AppleProgressProps {
  /**
   * 进度百分比 (0-100)
   */
  percent?: number;

  /**
   * 进度条类型
   */
  type?: 'linear' | 'circular';

  /**
   * 进度条尺寸
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * 进度条状态
   */
  status?: 'normal' | 'success' | 'exception' | 'active';

  /**
   * 是否显示进度文字
   */
  showInfo?: boolean;

  /**
   * 自定义进度格式化函数
   */
  format?: (percent?: number) => string;

  /**
   * 是否为不确定进度
   */
  indeterminate?: boolean;

  /**
   * 描边宽度（仅 circular）
   */
  strokeWidth?: number;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 进度条轨道颜色
   */
  trailColor?: string;

  /**
   * 进度条颜色
   */
  strokeColor?: string | string[];
}

/**
 * 苹果风格进度条组件
 *
 * @example
 * ```tsx
 * <AppleProgress percent={75} />
 * <AppleProgress percent={50} type="circular" size="large" />
 * <AppleProgress percent={30} status="exception" />
 * ```
 */
export const AppleProgress: React.FC<AppleProgressProps> = ({
  percent = 0,
  type = 'linear',
  size = 'medium',
  status = 'normal',
  showInfo = true,
  format,
  indeterminate = false,
  strokeWidth,
  className = '',
  trailColor,
  strokeColor,
}) => {
  // 尺寸配置
  const sizeConfig: Record<
    string,
    { width: string; height: string; strokeWidth: number }
  > = {
    small: { width: '100px', height: '4px', strokeWidth: 4 },
    medium: { width: '200px', height: '6px', strokeWidth: 6 },
    large: { width: '300px', height: '8px', strokeWidth: 8 },
  };

  const circularSizeConfig: Record<
    string,
    { diameter: number; strokeWidth: number }
  > = {
    small: { diameter: 32, strokeWidth: 3 },
    medium: { diameter: 48, strokeWidth: 4 },
    large: { diameter: 64, strokeWidth: 5 },
  };

  // 状态颜色
  const getStatusColor = (): string => {
    if (strokeColor) return typeof strokeColor === 'string' ? strokeColor : strokeColor[0];

    const colors: Record<string, string> = {
      normal: 'hsl(var(--system-blue))',
      success: 'hsl(var(--system-green))',
      exception: 'hsl(var(--system-red))',
      active: 'hsl(var(--system-blue))',
    };
    return colors[status];
  };

  // 格式化进度文字
  const formatPercent = (): string => {
    if (format) return format(percent);
    return `${Math.round(percent)}%`;
  };

  // 线性进度条
  if (type === 'linear') {
    const { height, strokeWidth: defaultStrokeWidth } = sizeConfig[size];
    const finalStrokeWidth = strokeWidth || defaultStrokeWidth;

    // 渐变色处理
    const getStrokeStyle = (): React.CSSProperties => {
      if (Array.isArray(strokeColor)) {
        return {
          background: `linear-gradient(to right, ${strokeColor.join(', ')})`,
        };
      }
      return {
        backgroundColor: getStatusColor(),
      };
    };

    return (
      <div
        className={cn(
          'flex',
          'items-center',
          'gap-3',
          className
        )}
      >
        {/* 进度条 */}
        <div
          className="flex-1 overflow-hidden rounded-full"
          style={{
            height: finalStrokeWidth,
            backgroundColor: trailColor || 'hsl(var(--muted))',
          }}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-slow timing-apple-out',
              status === 'active' && 'relative overflow-hidden'
            )}
            style={{
              width: indeterminate ? '100%' : `${Math.min(100, Math.max(0, percent))}%`,
              ...getStrokeStyle(),
            }}
          >
            {status === 'active' && (
              <div className="absolute inset-0 animate-shimmer">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full" />
              </div>
            )}
            {indeterminate && (
              <div className="absolute inset-0">
                <div className="h-full w-1/3 animate-indeterminate" style={{ backgroundColor: getStatusColor() }} />
              </div>
            )}
          </div>
        </div>

        {/* 进度文字 */}
        {showInfo && (
          <span
            className={cn(
              'text-sm font-medium',
              'tabular-nums',
              status === 'exception' && 'text-system-red',
              status === 'success' && 'text-system-green'
            )}
          >
            {formatPercent()}
          </span>
        )}
      </div>
    );
  }

  // 圆形进度条
  const { diameter, strokeWidth: defaultCircularStrokeWidth } =
    circularSizeConfig[size];
  const finalStrokeWidth = strokeWidth || defaultCircularStrokeWidth;
  const radius = (diameter - finalStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={cn(
        'inline-flex',
        'flex-col',
        'items-center',
        'gap-2',
        className
      )}
    >
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg width={diameter} height={diameter} className="transform -rotate-90">
          {/* 轨道 */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={trailColor || 'hsl(var(--muted))'}
            strokeWidth={finalStrokeWidth}
          />
          {/* 进度 */}
          {!indeterminate && (
            <circle
              cx={diameter / 2}
              cy={diameter / 2}
              r={radius}
              fill="none"
              stroke={getStatusColor()}
              strokeWidth={finalStrokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-slow timing-apple-out"
            />
          )}
          {indeterminate && (
            <circle
              cx={diameter / 2}
              cy={diameter / 2}
              r={radius}
              fill="none"
              stroke={getStatusColor()}
              strokeWidth={finalStrokeWidth}
              strokeDasharray={circumference * 0.5}
              className="animate-spin"
              style={{ transformOrigin: 'center' }}
            />
          )}
        </svg>

        {/* 中心文字 */}
        {showInfo && (
          <div
            className={cn(
              'absolute',
              'inset-0',
              'flex',
              'items-center',
              'justify-center',
              'text-sm',
              'font-semibold',
              'tabular-nums',
              status === 'exception' && 'text-system-red',
              status === 'success' && 'text-system-green'
            )}
          >
            {indeterminate ? (
              <svg
                className="animate-spin"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />
                <path
                  d="M8 2A6 6 0 0 1 14 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              formatPercent()
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppleProgress;
