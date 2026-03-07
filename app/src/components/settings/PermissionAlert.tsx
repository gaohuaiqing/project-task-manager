/**
 * 权限不足提示组件
 *
 * 功能：
 * 1. 统一的权限不足提示
 * 2. 可配置提示消息
 *
 * @module components/settings/PermissionAlert
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export interface PermissionAlertProps {
  /** 提示消息 */
  message?: string;
  /** 卡片样式 */
  className?: string;
}

/**
 * 权限不足提示组件
 *
 * @example
 * ```tsx
 * <PermissionAlert message="权限不足，只有管理员可以访问" />
 * ```
 */
export function PermissionAlert({
  message = '权限不足，无法访问该模块',
  className = '',
}: PermissionAlertProps) {
  return (
    <Card className={`bg-card border-border h-full ${className}`}>
      <CardContent className="flex items-center justify-center h-[500px]">
        <Alert variant="destructive" className="bg-red-900/30 border-red-700 max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default PermissionAlert;
