/**
 * 节假日管理页面
 * 使用真实API进行CRUD操作
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getHolidays, createHoliday, deleteHoliday, type Holiday, type HolidayType } from '@/lib/api/project.api';
import { queryKeys } from '@/lib/api/query-keys';
import { useToast } from '@/hooks/use-toast';

// 年份选择范围
const YEARS = [2026, 2027, 2028];

// 节假日类型映射
const HOLIDAY_TYPE_MAP: Record<HolidayType, { label: string; variant: 'destructive' | 'default' | 'secondary' }> = {
  legal: { label: '法定假日', variant: 'destructive' },
  company: { label: '公司假日', variant: 'default' },
  workday: { label: '调休上班', variant: 'secondary' },
};

export function HolidaysSettings() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<{ date: string; name: string; type: HolidayType }>({
    date: '',
    name: '',
    type: 'legal',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 获取节假日列表
  const { data: holidays = [], isLoading, error, refetch } = useQuery({
    queryKey: [...queryKeys.config.holidays, selectedYear],
    queryFn: () => getHolidays(selectedYear),
  });

  // 创建节假日
  const createMutation = useMutation({
    mutationFn: createHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.holidays });
      toast({ title: '成功', description: '节假日添加成功' });
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({
        title: '错误',
        description: err?.message || '添加失败',
        variant: 'destructive',
      });
    },
  });

  // 删除节假日
  const deleteMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.holidays });
      toast({ title: '成功', description: '节假日删除成功' });
      setDeleteDialogOpen(false);
      setSelectedHoliday(null);
    },
    onError: (err: any) => {
      toast({
        title: '错误',
        description: err?.message || '删除失败',
        variant: 'destructive',
      });
    },
  });

  const resetForm = useCallback(() => {
    setFormData({ date: '', name: '', type: 'legal' });
    setFormError(null);
    setSelectedHoliday(null);
  }, []);

  const handleAdd = () => {
    resetForm();
    setEditDialogOpen(true);
  };

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormData({
      date: holiday.date,
      name: holiday.name,
      type: holiday.type,
    });
    setFormError(null);
    setEditDialogOpen(true);
  };

  const handleDelete = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    // 验证
    if (!formData.date) {
      setFormError('请选择日期');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('请输入节日名称');
      return;
    }

    setFormError(null);

    // 编辑模式：先删除旧的，再创建新的
    if (selectedHoliday && selectedHoliday.date !== formData.date) {
      await deleteMutation.mutateAsync(selectedHoliday.date);
    }

    createMutation.mutate(formData);
  };

  const confirmDelete = () => {
    if (selectedHoliday) {
      // 确保日期格式为 YYYY-MM-DD
      const dateStr = selectedHoliday.date.includes('T')
        ? selectedHoliday.date.split('T')[0]
        : selectedHoliday.date;
      deleteMutation.mutate(dateStr);
    }
  };

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={String(selectedYear)}
            onValueChange={(val) => setSelectedYear(Number(val))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          添加节假日
        </Button>
      </div>

      {/* 节假日列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedYear}年节假日配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              加载失败，请重试
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无节假日数据，请点击"添加节假日"按钮添加
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id || holiday.date}>
                    <TableCell className="font-mono">
                      {formatDate(holiday.date)}
                    </TableCell>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>
                      <Badge variant={HOLIDAY_TYPE_MAP[holiday.type]?.variant || 'default'}>
                        {HOLIDAY_TYPE_MAP[holiday.type]?.label || holiday.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(holiday)}
                        title="编辑"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(holiday)}
                        title="删除"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 编辑/添加对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedHoliday ? '编辑节假日' : '添加节假日'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：春节、国庆节、调休上班"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">类型</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val as HolidayType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legal">法定假日</SelectItem>
                  <SelectItem value="company">公司假日</SelectItem>
                  <SelectItem value="workday">调休上班</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除"{selectedHoliday?.name}"（{selectedHoliday?.date}）吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
