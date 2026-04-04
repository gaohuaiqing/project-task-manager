/**
 * 任务详情弹窗组件
 * 包含进展记录、延期历史、计划变更三个标签页
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import type { WBSTask } from '../types';
import { getProgressRecords, addProgressRecord } from '@/lib/api/task.api';
import { getDelayRecords, getPlanChangesByTask } from '@/lib/api/workflow.api';
import { ProgressRecordsPanel } from './ProgressRecordsPanel';
import { DelayHistoryPanel } from './DelayHistoryPanel';
import { PlanChangesPanel } from './PlanChangesPanel';
import type { ProgressRecord } from '../types';
import type { DelayRecord, PlanChange } from '@/lib/api/workflow.api';

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: WBSTask | null;
  defaultTab?: 'progress' | 'delays' | 'changes';
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  defaultTab = 'progress',
}: TaskDetailDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [delayRecords, setDelayRecords] = useState<DelayRecord[]>([]);
  const [planChanges, setPlanChanges] = useState<PlanChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当对话框打开或 defaultTab 变化时，更新 activeTab
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // 加载数据
  useEffect(() => {
    if (!open || !task) {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 并行加载所有数据
        const [progress, delays, changes] = await Promise.all([
          getProgressRecords(task.id),
          getDelayRecords(task.id),
          getPlanChangesByTask(task.id),
        ]);

        setProgressRecords(progress);
        setDelayRecords(delays);
        setPlanChanges(changes);
      } catch (err) {
        console.error('加载任务详情失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [open, task]);

  // 添加进展记录
  const handleAddProgress = async (content: string) => {
    if (!task) return;

    const result = await addProgressRecord(task.id, content);
    // 重新加载进展记录
    const records = await getProgressRecords(task.id);
    setProgressRecords(records);
    return result;
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {task.wbsCode}
            </Badge>
            <span className="truncate">{task.description}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center text-destructive py-12">{error}</div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="progress" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                进展记录
                {progressRecords.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {progressRecords.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="delays" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                延期历史
                {delayRecords.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {delayRecords.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="changes" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                计划变更
                {planChanges.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {planChanges.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="progress" className="m-0">
                <ProgressRecordsPanel
                  records={progressRecords}
                  onAddProgress={handleAddProgress}
                />
              </TabsContent>

              <TabsContent value="delays" className="m-0">
                <DelayHistoryPanel records={delayRecords} />
              </TabsContent>

              <TabsContent value="changes" className="m-0">
                <PlanChangesPanel changes={planChanges} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
