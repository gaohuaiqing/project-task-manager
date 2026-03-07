/**
 * 苹果风格输入框组件
 * Apple Style Input Component
 *
 * 展示如何使用设计令牌创建符合苹果设计规范的输入框
 */

import React, { useState, forwardRef } from 'react';

export interface AppleInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * 输入框尺寸
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * 是否有错误
   */
  error?: boolean;

  /**
   * 错误提示文本
   */
  errorText?: string;

  /**
   * 前缀图标
   */
  prefixIcon?: React.ReactNode;

  /**
   * 后缀图标
   */
  suffixIcon?: React.ReactNode;

  /**
   * 标签
   */
  label?: string;

  /**
   * 辅助文本
   */
  helperText?: string;

  /**
   * 是否必填
   */
  required?: boolean;

  /**
   * 容器样式类名
   */
  containerClassName?: string;
}

/**
 * 苹果风格输入框组件
 *
 * @example
 * ```tsx
 * <AppleInput
 *   label="用户名"
 *   placeholder="请输入用户名"
 *   error={hasError}
 *   errorText="用户名不能为空"
 *   required
 * />
 * ```
 */
export const AppleInput = forwardRef<HTMLInputElement, AppleInputProps>(
  (
    {
      size = 'medium',
      error = false,
      errorText,
      prefixIcon,
      suffixIcon,
      label,
      helperText,
      required = false,
      containerClassName = '',
      className = '',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    // 检测深色模式
    const isDarkMode = document.documentElement.classList.contains('dark');

    // 容器样式
    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%',
    };

    // 标签样式
    const labelStyle: React.CSSProperties = {
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '20px',
      color: isDarkMode ? 'hsl(0, 0%, 75%)' : 'hsl(0, 0%, 40%)',
    };

    // 输入框包装器样式
    const wrapperStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    };

    // 尺寸样式
    const sizeStyles: Record<string, React.CSSProperties> = {
      small: {
        minHeight: '28px',
        padding: '4px 8px',
        fontSize: '12px',
        lineHeight: '16px',
      },
      medium: {
        minHeight: '32px',
        padding: '6px 12px',
        fontSize: '14px',
        lineHeight: '20px',
      },
      large: {
        minHeight: '36px',
        padding: '8px 16px',
        fontSize: '16px',
        lineHeight: '24px',
      },
    };

    // 基础输入框样式
    const baseInputStyle: React.CSSProperties = {
      width: '100%',
      border: '1px solid',
      borderRadius: '8px',
      backgroundColor: isDarkMode ? 'hsl(0, 0%, 16%)' : 'hsl(0, 0%, 100%)',
      color: isDarkMode ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 13%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
      transition: 'all 200ms cubic-bezier(0.33, 1, 0.68, 1)',
      outline: 'none',
      boxSizing: 'border-box',
      ...sizeStyles[size],
    };

    // 边框颜色
    const getBorderColor = () => {
      if (error) {
        return 'hsl(0, 84%, 60%)';
      }
      if (isFocused) {
        return 'hsl(211, 98%, 52%)';
      }
      return isDarkMode ? 'hsl(0, 0%, 25%)' : 'hsl(0, 0%, 88%)';
    };

    // 阴影效果
    const getBoxShadow = () => {
      if (error && isFocused) {
        return '0 0 0 3px hsl(0, 84%, 60% / 0.1)';
      }
      if (isFocused) {
        return '0 0 0 3px hsl(211, 98%, 52% / 0.1)';
      }
      return 'none';
    };

    const inputStyle: React.CSSProperties = {
      ...baseInputStyle,
      borderColor: getBorderColor(),
      boxShadow: getBoxShadow(),
      paddingLeft: prefixIcon
        ? parseInt(sizeStyles[size].padding) + 24
        : sizeStyles[size].padding,
      paddingRight: suffixIcon
        ? parseInt(sizeStyles[size].padding) + 24
        : sizeStyles[size].padding,
      opacity: disabled ? '0.5' : '1',
      cursor: disabled ? 'not-allowed' : 'text',
    };

    // 图标样式
    const iconStyle: React.CSSProperties = {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isDarkMode ? 'hsl(0, 0%, 60%)' : 'hsl(0, 0%, 40%)',
      pointerEvents: 'none',
      width: '16px',
      height: '16px',
    };

    const prefixIconStyle: React.CSSProperties = {
      ...iconStyle,
      left: parseInt(sizeStyles[size].padding) + 4,
    };

    const suffixIconStyle: React.CSSProperties = {
      ...iconStyle,
      right: parseInt(sizeStyles[size].padding) + 4,
    };

    // 错误文本样式
    const errorTextStyle: React.CSSProperties = {
      fontSize: '12px',
      lineHeight: '16px',
      color: 'hsl(0, 84%, 60%)',
      marginTop: '2px',
    };

    // 辅助文本样式
    const helperTextStyle: React.CSSProperties = {
      fontSize: '12px',
      lineHeight: '16px',
      color: isDarkMode ? 'hsl(0, 0%, 55%)' : 'hsl(0, 0%, 60%)',
      marginTop: '2px',
    };

    return (
      <div style={containerStyle} className={containerClassName}>
        {label && (
          <label style={labelStyle}>
            {label}
            {required && <span style={{ color: 'hsl(0, 84%, 60%)', marginLeft: '2px' }}>*</span>}
          </label>
        )}
        <div style={wrapperStyle}>
          {prefixIcon && <div style={prefixIconStyle}>{prefixIcon}</div>}
          <input
            ref={ref}
            style={inputStyle}
            className={className}
            disabled={disabled}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {suffixIcon && <div style={suffixIconStyle}>{suffixIcon}</div>}
        </div>
        {error && errorText && <div style={errorTextStyle}>{errorText}</div>}
        {!error && helperText && <div style={helperTextStyle}>{helperText}</div>}
      </div>
    );
  }
);

AppleInput.displayName = 'AppleInput';

/**
 * 苹果风格文本域组件
 */
export interface AppleTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /**
   * 输入框尺寸
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * 是否有错误
   */
  error?: boolean;

  /**
   * 错误提示文本
   */
  errorText?: string;

  /**
   * 标签
   */
  label?: string;

  /**
   * 辅助文本
   */
  helperText?: string;

  /**
   * 是否必填
   */
  required?: boolean;

  /**
   * 最小行数
   */
  minRows?: number;

  /**
   * 最大行数
   */
  maxRows?: number;

  /**
   * 容器样式类名
   */
  containerClassName?: string;
}

export const AppleTextarea = forwardRef<HTMLTextAreaElement, AppleTextareaProps>(
  (
    {
      size = 'medium',
      error = false,
      errorText,
      label,
      helperText,
      required = false,
      minRows = 3,
      maxRows = 6,
      containerClassName = '',
      className = '',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const isDarkMode = document.documentElement.classList.contains('dark');

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%',
    };

    const labelStyle: React.CSSProperties = {
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '20px',
      color: isDarkMode ? 'hsl(0, 0%, 75%)' : 'hsl(0, 0%, 40%)',
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      small: {
        padding: '6px 12px',
        fontSize: '12px',
        lineHeight: '16px',
        minHeight: `${minRows * 20}px`,
      },
      medium: {
        padding: '8px 12px',
        fontSize: '14px',
        lineHeight: '20px',
        minHeight: `${minRows * 20}px`,
      },
      large: {
        padding: '10px 16px',
        fontSize: '16px',
        lineHeight: '24px',
        minHeight: `${minRows * 24}px`,
      },
    };

    const baseTextareaStyle: React.CSSProperties = {
      width: '100%',
      border: '1px solid',
      borderRadius: '8px',
      backgroundColor: isDarkMode ? 'hsl(0, 0%, 16%)' : 'hsl(0, 0%, 100%)',
      color: isDarkMode ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 13%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
      transition: 'all 200ms cubic-bezier(0.33, 1, 0.68, 1)',
      outline: 'none',
      boxSizing: 'border-box',
      resize: 'vertical',
      ...sizeStyles[size],
    };

    const getBorderColor = () => {
      if (error) return 'hsl(0, 84%, 60%)';
      if (isFocused) return 'hsl(211, 98%, 52%)';
      return isDarkMode ? 'hsl(0, 0%, 25%)' : 'hsl(0, 0%, 88%)';
    };

    const textareaStyle: React.CSSProperties = {
      ...baseTextareaStyle,
      borderColor: getBorderColor(),
      boxShadow: isFocused && !error
        ? '0 0 0 3px hsl(211, 98%, 52% / 0.1)'
        : error && isFocused
        ? '0 0 0 3px hsl(0, 84%, 60% / 0.1)'
        : 'none',
      opacity: disabled ? '0.5' : '1',
      cursor: disabled ? 'not-allowed' : 'text',
    };

    const errorTextStyle: React.CSSProperties = {
      fontSize: '12px',
      lineHeight: '16px',
      color: 'hsl(0, 84%, 60%)',
      marginTop: '2px',
    };

    const helperTextStyle: React.CSSProperties = {
      fontSize: '12px',
      lineHeight: '16px',
      color: isDarkMode ? 'hsl(0, 0%, 55%)' : 'hsl(0, 0%, 60%)',
      marginTop: '2px',
    };

    return (
      <div style={containerStyle} className={containerClassName}>
        {label && (
          <label style={labelStyle}>
            {label}
            {required && <span style={{ color: 'hsl(0, 84%, 60%)', marginLeft: '2px' }}>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          style={textareaStyle}
          className={className}
          disabled={disabled}
          rows={minRows}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && errorText && <div style={errorTextStyle}>{errorText}</div>}
        {!error && helperText && <div style={helperTextStyle}>{helperText}</div>}
      </div>
    );
  }
);

AppleTextarea.displayName = 'AppleTextarea';

export default AppleInput;
