import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  TrendingUp,
  X,
  Loader2,
  Plus,
  FileText
} from 'lucide-react';
import type { TaskProgressRecord } from '@/types/wbs';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog, CustomAlertDialog } from '@/components/common/DialogProvider';

interface TaskProgressPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  userRole?: string;
  isAdmin?: boolean;
  readOnly?: boolean;
}

export function TaskProgressPanel({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  userRole,
  isAdmin,
  readOnly = false
}: TaskProgressPanelProps) {
  const { user } = useAuth();
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<TaskProgressRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProgress, setNewProgress] = useState({
    progressPercent: 0,
    description: '',
    attachments: [] as string[]
  });

  const loadProgressRecords = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const stored = localStorage.getItem('taskProgressRecords');
      const allRecords = stored ? JSON.parse(stored) : [];
      
      const taskRecords = allRecords.filter((r: TaskProgressRecord) => r.taskId === taskId);
      // 按时间倒序排列，最新的记录在最上方
      taskRecords.sort((a: TaskProgressRecord, b: TaskProgressRecord) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setRecords(taskRecords);
    } catch (error) {
      console.error('加载进展记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) {
      loadProgressRecords();
    }
  }, [open, taskId, loadProgressRecords]);

  const handleAddProgress = async () => {
    if (!newProgress.description.trim()) {
      await dialog.alert('请填写进展描述', { variant: 'warning' });
      return;
    }

    const progressRecord: TaskProgressRecord = {
      id: `progress-${Date.now()}`,
      taskId,
      progressDate: new Date().toISOString().split('T')[0],
      progressPercent: newProgress.progressPercent,
      description: newProgress.description,
      attachments: newProgress.attachments,
      reporter: user?.name || '未知用户',
      createdAt: new Date().toISOString()
    };

    const stored = localStorage.getItem('taskProgressRecords');
    const allRecords = stored ? JSON.parse(stored) : [];
    allRecords.push(progressRecord);
    localStorage.setItem('taskProgressRecords', JSON.stringify(allRecords));

    // 添加新记录后按时间倒序重新排序
    const updatedRecords = [...records, progressRecord];
    updatedRecords.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setRecords(updatedRecords);
    setNewProgress({ progressPercent: 0, description: '', attachments: [] });
    setShowAddForm(false);
  };

  const handleDeleteProgress = async (recordId: string) => {
    const confirmed = await dialog.confirm('确定要删除这条进展记录吗？', {
      variant: 'danger'
    });
    if (!confirmed) return;

    const stored = localStorage.getItem('taskProgressRecords');
    const allRecords = stored ? JSON.parse(stored) : [];
    const updatedRecords = allRecords.filter((r: TaskProgressRecord) => r.id !== recordId);
    localStorage.setItem('taskProgressRecords', JSON.stringify(updatedRecords));

    setRecords(records.filter(r => r.id !== recordId));
  };

  const renderProgressRecord = (record: TaskProgressRecord) => (
    <div key={record.id} className="p-4 bg-accent/5 rounded-lg border border-border">
      <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">进展记录</span>
          </div>
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
            {record.progressPercent}%
          </Badge>
        </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>更新时间: {new Date(record.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          <span>更新人: {record.reporter}</span>
        </div>
        
        {record.description && (
          <div className="mt-3 p-2 bg-purple-500/10 rounded border border-purple-500/20">
            <div className="text-xs text-purple-400 mb-1">进展描述</div>
            <div className="text-sm text-white">{record.description}</div>
          </div>
        )}

        {record.attachments && record.attachments.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-purple-400 mb-1">附件</div>
            <div className="flex flex-wrap gap-2">
              {record.attachments.map((file, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {file}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] flex flex-col" showCloseButton={false}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              {readOnly ? '任务进展记录' : '任务进展维护'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            任务: {taskTitle}
          </div>
          {!readOnly && (
            <div className="text-xs text-purple-400 mt-1">
              点击下方"添加进展记录"按钮开始维护任务进展
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4 pr-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">加载中...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {!readOnly && (
                showAddForm ? (
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="text-sm font-medium text-white mb-3">添加新进展</div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-purple-400 mb-1 block">进展百分比 (%)</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={newProgress.progressPercent || ''}
                          onChange={(e) => setNewProgress({ ...newProgress, progressPercent: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-purple-400 mb-1 block">进展描述</label>
                        <Textarea
                          value={newProgress.description}
                          onChange={(e) => setNewProgress({ ...newProgress, description: e.target.value })}
                          placeholder="请输入进展描述..."
                          className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddProgress}
                          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                        >
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddForm(false);
                            setNewProgress({ progressPercent: 0, description: '', attachments: [] });
                          }}
                          className="flex-1"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white border border-purple-500/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加进展记录
                  </Button>
                )
              )}

              {records.length > 0 && (
                <div className="space-y-3 mt-4">
                  <div className="text-xs text-purple-400 mb-2">历史记录 ({records.length}条)</div>
                  {records.map(record => renderProgressRecord(record))}
                </div>
              )}

              {!readOnly && records.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <div className="text-muted-foreground">暂无进展记录</div>
                  <div className="text-xs text-slate-500 mt-2">点击上方按钮添加第一条进展</div>
                </div>
              )}

              {readOnly && records.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <div className="text-muted-foreground">暂无进展记录</div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>

    {/* 自定义对话框 */}
    <ConfirmDialog
      isOpen={dialog.confirmDialog.isOpen}
      options={dialog.confirmDialog.options}
      onConfirm={dialog.confirmDialog.handleConfirm}
      onCancel={dialog.confirmDialog.handleCancel}
    />
    <CustomAlertDialog
      isOpen={dialog.alertDialog.isOpen}
      options={dialog.alertDialog.options}
      onClose={dialog.alertDialog.handleClose}
    />
  </>
  );
}
