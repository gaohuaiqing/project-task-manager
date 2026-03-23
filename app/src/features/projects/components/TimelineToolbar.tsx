/**
 * 时间线工具栏组件
 *
 * @module features/projects/components/TimelineToolbar
 * @description 底部工具栏，提供缩放、添加任务、自动排列等功能
 */

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import {
  ZoomIn,
  ZoomOut,
  Plus,
  AlignJustify,
  Download,
  Upload,
} from 'lucide-react';
import type { TimelineZoomLevel } from '@/types/timeline';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface TimelineToolbarProps {
  /** 当前缩放级别 */
  zoomLevel: TimelineZoomLevel;
  /** 缩放级别标签 */
  zoomLabel: string;
  /** 放大回调 */
  onZoomIn: () => void;
  /** 缩小回调 */
  onZoomOut: () => void;
  /** 设置缩放级别回调 */
  onSetZoom: (level: TimelineZoomLevel) => void;
  /** 添加任务回调 */
  onAddTask: () => void;
  /** 自动排列回调 */
  onAutoArrange?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 导入回调 */
  onImport?: () => void;
  /** 是否只读 */
  readOnly?: boolean;
}

// ============ 组件实现 ============

export function TimelineToolbar({
  zoomLevel,
  zoomLabel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onAddTask,
  onAutoArrange,
  onExport,
  onImport,
  readOnly = false,
}: TimelineToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2',
        'bg-white border-t',
        'text-sm'
      )}
    >
      {/* 缩放控制 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          title="缩小 (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Select
          value={zoomLevel}
          onValueChange={(value) => onSetZoom(value as TimelineZoomLevel)}
        >
          <SelectTrigger className="w-24 h-8">
            <SelectValue>{zoomLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">日视图</SelectItem>
            <SelectItem value="week">周视图</SelectItem>
            <SelectItem value="month">月视图</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          title="放大 (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 任务操作 */}
      {!readOnly && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddTask}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            添加任务
          </Button>

          {onAutoArrange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAutoArrange}
              title="自动排列任务"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          )}

          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* 导入导出 */}
      <div className="flex items-center gap-1">
        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            title="导出"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}

        {onImport && !readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onImport}
            title="导入"
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 快捷键提示 */}
      <div className="ml-auto text-xs text-muted-foreground">
        <span className="hidden md:inline">
          快捷键: +/- 缩放 | Delete 删除 | Escape 取消
 | T 今天
        </span>
      </div>
    </div>
  );
}
