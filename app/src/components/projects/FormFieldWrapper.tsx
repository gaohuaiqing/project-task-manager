/**
 * 表单字段包装组件
 *
 * 功能：
 * 1. 显示字段验证状态（成功/错误/警告）
 * 2. 显示错误和警告提示信息
 * 3. 支持必填字段标记
 * 4. 支持自定义提示信息
 *
 * @module components/projects/FormFieldWrapper
 */

import React, { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

// ==================== 类型定义 ====================

export interface FieldWrapperProps {
  /** 字段标签 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warning?: string;
  /** 帮助文本（显示在字段下方） */
  helpText?: string;
  /** 子元素（表单控件） */
  children: ReactNode;
  /** 字段容器类名 */
  className?: string;
  /** 标签容器类名 */
  labelClassName?: string;
  /** 是否显示验证图标 */
  showIcon?: boolean;
  /** 字段验证状态 */
  status?: 'idle' | 'validating' | 'valid' | 'invalid';
}

// ==================== 组件定义 ====================

/**
 * 表单字段包装组件
 */
export function FormFieldWrapper({
  label,
  required = false,
  error,
  warning,
  helpText,
  children,
  className,
  labelClassName,
  showIcon = true,
  status = 'idle',
}: FieldWrapperProps) {
  const hasError = !!error;
  const hasWarning = !!warning && !hasError;
  const isValid = status === 'valid' && !hasError && !hasWarning;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* 标签行 */}
      {label && (
        <div className={cn("flex items-center gap-1.5", labelClassName)}>
          <Label className={cn(
            "text-sm",
            hasError && "text-red-400",
            hasWarning && "text-amber-400"
          )}>
            {label}
            {required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>

          {/* 验证状态图标 */}
          {showIcon && (
            <span className="flex-shrink-0">
              {hasError && <AlertCircle className="w-4 h-4 text-red-400" />}
              {hasWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {isValid && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {status === 'validating' && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </span>
          )}
        </div>
      )}

      {/* 表单控件（带状态样式包装） */}
      <div className={cn(
        "transition-colors",
        hasError && "children:[input]:border-red-500 children:[input]:focus:border-red-500",
        hasWarning && "children:[input]:border-amber-500 children:[input]:focus:border-amber-500",
        isValid && "children:[input]:border-green-500/50 children:[input]:focus:border-green-500"
      )}>
        {children}
      </div>

      {/* 错误/警告/帮助文本 */}
      {(error || warning || helpText) && (
        <div className="space-y-0.5">
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </p>
          )}
          {warning && !error && (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              {warning}
            </p>
          )}
          {helpText && !error && !warning && (
            <p className="text-xs text-muted-foreground">{helpText}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 表单字段组（用于组合多个相关字段）
 */
export interface FieldGroupProps {
  /** 组标题 */
  title?: string;
  /** 组描述 */
  description?: string;
  /** 子元素 */
  children: ReactNode;
  /** 容器类名 */
  className?: string;
}

/**
 * 表单字段组组件
 */
export function FieldGroup({
  title,
  description,
  children,
  className,
}: FieldGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-sm font-medium text-white">{title}</h3>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * 实时验证输入框包装器
 */
export interface ValidatedInputProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  /** 字段名 */
  name: string;
  /** 当前值 */
  value: string;
  /** 值变更回调 */
  onChange: (value: string) => void;
  /** 验证函数 */
  validate?: (value: string) => { valid: boolean; error?: string; warning?: string };
  /** 是否延迟验证（用户停止输入后） */
  debounceMs?: number;
  /** 字段标签 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 帮助文本 */
  helpText?: string;
  /** 是否显示验证状态 */
  showStatus?: boolean;
}

/**
 * 实时验证输入框组件
 */
export function ValidatedInput({
  name,
  value,
  onChange,
  validate,
  debounceMs = 300,
  label,
  required,
  helpText,
  showStatus = true,
  className,
  ...inputProps
}: ValidatedInputProps) {
  const [error, setError] = React.useState<string | undefined>();
  const [warning, setWarning] = React.useState<string | undefined>();
  const [status, setStatus] = React.useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  // 延迟验证
  React.useEffect(() => {
    if (!validate) return;

    setStatus('validating');

    const timer = setTimeout(() => {
      const result = validate(value);
      setError(result.error);
      setWarning(result.warning);
      setStatus(result.valid ? 'valid' : 'invalid');
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, validate, debounceMs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const inputElement = (
    <input
      name={name}
      value={value}
      onChange={handleChange}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        status === 'invalid' && "border-red-500 focus-visible:ring-red-500",
        status === 'valid' && "border-green-500/50 focus-visible:ring-green-500",
        className
      )}
      {...inputProps}
    />
  );

  if (!showStatus || !label) {
    return inputElement;
  }

  return (
    <FormFieldWrapper
      label={label}
      required={required}
      error={error}
      warning={warning}
      helpText={helpText}
      status={status}
    >
      {inputElement}
    </FormFieldWrapper>
  );
}

export default FormFieldWrapper;
