/**
 * 延期历史面板组件
 * 显示任务的延期记录
 */
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import type { DelayRecord } from '@/lib/api/workflow.api';

interface DelayHistoryPanelProps {
  records: DelayRecord[];
}

export function DelayHistoryPanel({ records }: DelayHistoryPanelProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p>暂无延期记录</p>
        <p className="text-xs mt-1">任务未发生过延期</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record, index) => (
        <div
          key={record.id}
          className="border rounded-lg p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">
                第 {records.length - index} 次延期
              </Badge>
              <Badge variant="outline">
                +{record.delayDays} 天
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm')}
            </div>
          </div>

          <p className="text-sm">{record.reason}</p>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            记录人：{record.recorderName || '未知'}
          </div>
        </div>
      ))}

      {/* 统计摘要 */}
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">累计延期次数</span>
          <Badge variant="secondary">{records.length} 次</Badge>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">累计延期天数</span>
          <Badge variant="secondary">
            {records.reduce((sum, r) => sum + r.delayDays, 0)} 天
          </Badge>
        </div>
      </div>
    </div>
  );
}
