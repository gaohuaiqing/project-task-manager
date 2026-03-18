/**
 * 报表共享组件
 *
 * 提取重复的报表 UI 模式
 *
 * @author AI Assistant
 * @since 2026-03-18
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

// ==================== 项目选择器 ====================

interface Project {
  id: number | string;
  name: string;
}

interface ProjectSelectorProps {
  projectId: string;
  projects: Project[];
  onProjectChange: (value: string) => void;
}

export function ProjectSelector({
  projectId,
  projects,
  onProjectChange
}: ProjectSelectorProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">选择项目：</span>
          <Select value={projectId} onValueChange={onProjectChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="请选择项目" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 加载状态 ====================

export function LoadingState(): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="h-8 w-8" />
      <span className="ml-2 text-muted-foreground">加载中...</span>
    </div>
  );
}

// ==================== 错误提示 ====================

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps): React.ReactElement {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="py-4 text-center text-red-500">{error}</CardContent>
    </Card>
  );
}

// ==================== 空状态提示 ====================

interface EmptyStateProps {
  message?: string;
}
export function EmptyState({
  message = '请先选择一个项目查看报表'
}: EmptyStateProps): React.ReactElement {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

// ==================== 统计卡片 ====================

interface StatCardProps {
  value: number;
  label: string;
  variant?: 'default' | 'blue' | 'red' | 'green' | 'orange';
}

const STAT_CARD_COLORS: Record<string, string> = {
  default: 'bg-gray-50 border-gray-200',
  blue: 'bg-blue-50 border-blue-100 text-blue-600',
  red: 'bg-red-50 border-red-100 text-red-600',
  green: 'bg-green-50 border-green-100 text-green-600',
  orange: 'bg-orange-50 border-orange-100 text-orange-600'
};

export function StatCard({ value, label, variant = 'default' }: StatCardProps) {
  return (
    <div className={`p-4 rounded-lg border ${STAT_CARD_COLORS[variant]}`}>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    );
  }
}
