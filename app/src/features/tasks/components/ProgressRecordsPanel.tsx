/**
 * 进展记录面板组件
 * 显示任务的进展记录时间线
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Send } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ProgressRecord } from '../types';

interface ProgressRecordsPanelProps {
  records: ProgressRecord[];
  onAddProgress?: (content: string) => Promise<{ id: string }>;
}

export function ProgressRecordsPanel({
  records,
  onAddProgress,
}: ProgressRecordsPanelProps) {
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newContent.trim() || !onAddProgress) return;

    setIsSubmitting(true);
    try {
      await onAddProgress(newContent.trim());
      setNewContent('');
    } catch (error) {
      console.error('添加进展记录失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取姓名首字母
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* 添加新记录 */}
      {onAddProgress && (
        <div className="flex gap-2">
          <Textarea
            data-testid="progress-input-content"
            placeholder="记录新的进展..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="min-h-[60px]"
          />
          <Button
            data-testid="progress-btn-submit"
            size="icon"
            onClick={handleSubmit}
            disabled={!newContent.trim() || isSubmitting}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 记录列表 */}
      {records.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Plus className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>暂无进展记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(record.recorderName || '系统')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {record.recorderName || '系统'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                  </span>
                </div>
                <p className="text-sm">{record.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
