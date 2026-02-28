import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  User
} from 'lucide-react';
import type { DelayRecord, PlanAdjustmentRecord } from '@/types/wbs';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog, InputDialog, CustomAlertDialog } from '@/components/common/DialogProvider';

interface TaskHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  historyType: 'delay' | 'adjustment';
  userRole?: string;
  isAdmin?: boolean;
  user?: any;
}

export function TaskHistoryPanel({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  historyType,
  userRole,
  isAdmin,
  user
}: TaskHistoryPanelProps) {
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<(DelayRecord | PlanAdjustmentRecord)[]>([]);

  // 数据版本控制
  const DATA_VERSION = 1;
  const STORAGE_VERSION_KEY = 'taskHistoryDataVersion';

  // 数据迁移函数
  const migrateData = (data: any, fromVersion: number, toVersion: number): any => {
    if (fromVersion === toVersion) return data;

    // 从版本0迁移到版本1（添加数据版本控制）
    if (fromVersion === 0 && toVersion === 1) {
      // 确保数据是数组
      if (!Array.isArray(data)) {
        console.warn('[TaskHistoryPanel] 历史记录数据格式错误，重置为空数组');
        return [];
      }
      // 验证每个记录的必需字段
      return data.filter((record: any) => {
        const isValid = record.id && record.taskId && record.createdAt;
        if (!isValid) {
          console.warn('[TaskHistoryPanel] 过滤无效的历史记录:', record);
        }
        return isValid;
      });
    }

    return data;
  };

  const loadHistoryRecords = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const storageKey = historyType === 'delay' ? 'delayRecords' : 'planAdjustmentRecords';
      const stored = localStorage.getItem(storageKey);

      // 检查数据版本
      const currentVersion = parseInt(localStorage.getItem(STORAGE_VERSION_KEY) || '0');

      let allRecords;
      if (stored) {
        try {
          const parsedData = JSON.parse(stored);
          // 执行数据迁移
          allRecords = migrateData(parsedData, currentVersion, DATA_VERSION);
        } catch (parseError) {
          console.error('[TaskHistoryPanel] 解析历史记录数据失败:', parseError);
          allRecords = [];
        }
      } else {
        allRecords = [];
      }

      // 更新数据版本
      if (currentVersion !== DATA_VERSION) {
        localStorage.setItem(STORAGE_VERSION_KEY, String(DATA_VERSION));
        // 保存迁移后的数据
        localStorage.setItem(storageKey, JSON.stringify(allRecords));
      }

      const taskRecords = allRecords.filter((r: DelayRecord | PlanAdjustmentRecord) => r.taskId === taskId);
      // 按时间倒序排序，最新的记录在最前面
      taskRecords.sort((a: DelayRecord | PlanAdjustmentRecord, b: DelayRecord | PlanAdjustmentRecord) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setRecords(taskRecords);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, [historyType, taskId]);

  useEffect(() => {
    if (open && taskId) {
      loadHistoryRecords();
    }
  }, [open, taskId, loadHistoryRecords]);

  const renderDelayRecord = (record: DelayRecord) => (
    <div key={record.id} className="p-4 bg-accent/5 rounded-lg border border-border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-white">延期记录</span>
        </div>
        <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 text-xs">
          {record.delayDays} 天
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>延期日期: {record.delayDate}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
            <div className="text-xs text-red-400 mb-1">原计划结束</div>
            <div className="text-sm text-white">{record.originalEndDate}</div>
          </div>
          <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
            <div className="text-xs text-blue-400 mb-1">新计划结束</div>
            <div className="text-sm text-white">{record.newEndDate}</div>
          </div>
        </div>
        
        {record.reason && (
          <div className="mt-3 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
            <div className="text-xs text-yellow-400 mb-1">延期原因</div>
            <div className="text-sm text-white">{record.reason}</div>
          </div>
        )}
      </div>
    </div>
  );

  const handleApprove = async (record: PlanAdjustmentRecord) => {
    const comment = await dialog.prompt('请输入审批意见:', {
      title: '审批通过',
      placeholder: '请输入审批意见...',
      multiline: false
    });
    if (comment === null) return; // 用户取消
    if (!comment.trim()) {
      await dialog.alert('审批意见不能为空', { variant: 'warning' });
      return;
    }

    // 更新审批状态
    const updatedRecord = {
      ...record,
      approvalStatus: 'approved',
      approver: user?.name || '未知审批人',
      approvalDate: new Date().toISOString(),
      approvalComment: comment.trim()
    };

    // 保存到 localStorage
    const storageKey = 'planAdjustmentRecords';
    const existingRecords = JSON.parse(localStorage.getItem(storageKey) || '[]') as PlanAdjustmentRecord[];
    const updatedRecords = existingRecords.map(r => r.id === record.id ? updatedRecord : r);
    localStorage.setItem(storageKey, JSON.stringify(updatedRecords));

    // 刷新记录
    loadHistoryRecords();
    await dialog.alert('审批通过', { variant: 'success' });
  };

  const handleReject = async (record: PlanAdjustmentRecord) => {
    const comment = await dialog.prompt('请输入拒绝原因:', {
      title: '审批拒绝',
      placeholder: '请输入拒绝原因...',
      multiline: false
    });
    if (comment === null) return; // 用户取消
    if (!comment.trim()) {
      await dialog.alert('拒绝原因不能为空', { variant: 'warning' });
      return;
    }

    // 更新审批状态
    const updatedRecord = {
      ...record,
      approvalStatus: 'rejected',
      approver: user?.name || '未知审批人',
      approvalDate: new Date().toISOString(),
      approvalComment: comment.trim()
    };

    // 保存到 localStorage
    const storageKey = 'planAdjustmentRecords';
    const existingRecords = JSON.parse(localStorage.getItem(storageKey) || '[]') as PlanAdjustmentRecord[];
    const updatedRecords = existingRecords.map(r => r.id === record.id ? updatedRecord : r);
    localStorage.setItem(storageKey, JSON.stringify(updatedRecords));

    // 刷新记录
    loadHistoryRecords();
    await dialog.alert('审批拒绝', { variant: 'info' });
  };

  const renderAdjustmentRecord = (record: PlanAdjustmentRecord) => {
    const typeLabels: Record<PlanAdjustmentRecord['adjustmentType'], string> = {
      'start_date': '开始日期',
      'end_date': '结束日期',
      'duration': '工期',
      'all': '全部调整'
    };

    const statusLabels: Record<string, string> = {
      'pending': '待审批',
      'approved': '已通过',
      'rejected': '已拒绝'
    };

    const statusColors: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'approved': 'bg-green-500/20 text-green-400',
      'rejected': 'bg-red-500/20 text-red-400'
    };

    // 检查是否是技术经理（可以审批）
    const canApprove = (userRole === 'tech_manager' || userRole === '技术经理' || isAdmin) && record.approvalStatus === 'pending';

    return (
      <div key={record.id} className="p-4 bg-accent/5 rounded-lg border border-border">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">计划调整</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs">
              {typeLabels[record.adjustmentType]}
            </Badge>
            {record.approvalStatus && (
              <Badge variant="secondary" className={cn("text-xs", statusColors[record.approvalStatus])}>
                {statusLabels[record.approvalStatus]}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>调整时间: {new Date(record.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          
          {record.requester && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>申请人: {record.requester} ({record.requesterRole || '未知角色'})</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="p-2 bg-slate-500/10 rounded border border-slate-500/20">
              <div className="text-xs text-slate-400 mb-1">调整前</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>开始: {record.before.startDate}</div>
                <div>结束: {record.before.endDate}</div>
                <div>工期: {record.before.days}天</div>
              </div>
            </div>
            <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
              <div className="text-xs text-green-400 mb-1">调整后</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>开始: {record.after.startDate}</div>
                <div>结束: {record.after.endDate}</div>
                <div>工期: {record.after.days}天</div>
              </div>
            </div>
          </div>
          
          {record.reason && (
            <div className="mt-3 p-2 bg-blue-500/10 rounded border border-blue-500/20">
              <div className="text-xs text-blue-400 mb-1">调整原因</div>
              <div className="text-sm text-white">{record.reason}</div>
            </div>
          )}
          
          {record.approvalStatus && record.approvalComment && (
            <div className="mt-3 p-2 bg-purple-500/10 rounded border border-purple-500/20">
              <div className="text-xs text-purple-400 mb-1">审批意见</div>
              <div className="text-sm text-white">{record.approvalComment}</div>
              {record.approver && record.approvalDate && (
                <div className="text-xs text-muted-foreground mt-1">
                  审批人: {record.approver} | 审批时间: {new Date(record.approvalDate).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          )}
          
          {/* 审批按钮 */}
          {canApprove && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/20"
                onClick={() => handleApprove(record)}
              >
                批准
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
                onClick={() => handleReject(record)}
              >
                拒绝
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] flex flex-col" showCloseButton={false}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2">
              {historyType === 'delay' ? (
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              ) : (
                <Clock className="w-5 h-5 text-blue-400" />
              )}
              {historyType === 'delay' ? '延期历史记录' : '计划调整历史'}
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
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4 pr-4 max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">加载中...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {historyType === 'delay' ? (
                <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mb-3" />
              ) : (
                <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" />
              )}
              <div className="text-muted-foreground">
                {historyType === 'delay' ? '暂无延期记录' : '暂无计划调整记录'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map(record =>
                historyType === 'delay'
                  ? renderDelayRecord(record as DelayRecord)
                  : renderAdjustmentRecord(record as PlanAdjustmentRecord)
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
    <InputDialog
      isOpen={dialog.inputDialog.isOpen}
      options={dialog.inputDialog.options}
      value={dialog.inputDialog.inputValue}
      onValueChange={dialog.inputDialog.handleInputChange}
      onConfirm={dialog.inputDialog.handleConfirm}
      onCancel={dialog.inputDialog.handleCancel}
    />
    <CustomAlertDialog
      isOpen={dialog.alertDialog.isOpen}
      options={dialog.alertDialog.options}
      onClose={dialog.alertDialog.handleClose}
    />
  </>
  );
}