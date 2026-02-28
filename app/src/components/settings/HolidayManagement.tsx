import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  Check,
  Search,
  X,
  Upload,
  Download,
  FileJson,
  FileSpreadsheet,
  CalendarDays,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Holiday } from '@/types/holiday';
import {
  getAllHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  searchHolidays,
  getHolidayStats,
  exportHolidaysToJSON,
  exportHolidaysToCSV,
  batchImportHolidays,
  parseHolidayCSV,
  clearAllHolidays,
} from '@/utils/holidayManager';

export function HolidayManagement() {
  // 节假日列表
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // 统计信息
  const [stats, setStats] = useState({
    totalCount: 0,
    singleDayCount: 0,
    rangeCount: 0,
    totalDays: 0,
  });

  // 添加/编辑弹窗状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // 删除确认弹窗状态
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteHolidayItem, setDeleteHolidayItem] = useState<Holiday | null>(null);

  // 清空所有节假日弹窗状态
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);

  // 导入弹窗状态
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 消息状态
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 加载节假日列表
  const loadHolidays = async () => {
    const params: { keyword?: string; year?: number } = {};
    if (searchKeyword) params.keyword = searchKeyword;
    if (selectedYear !== 'all') params.year = parseInt(selectedYear);

    const result = await searchHolidays(params);
    setHolidays(result);

    // 更新统计
    const year = selectedYear !== 'all' ? parseInt(selectedYear) : undefined;
    const stats = await getHolidayStats(year);
    setStats(stats);
  };

  useEffect(() => {
    loadHolidays();
  }, [searchKeyword, selectedYear]);

  // 获取年份选项
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 3; i++) {
      years.push(i);
    }
    return years;
  };

  // 打开添加弹窗
  const openAddDialog = () => {
    setEditingHoliday(null);
    setHolidayName('');
    setHolidayDescription('');
    setIsRangeMode(false);
    setStartDate(undefined);
    setEndDate(undefined);
    setError('');
    setSuccess('');
    setIsDialogOpen(true);
  };

  // 打开编辑弹窗
  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayName(holiday.name);
    setHolidayDescription(holiday.description || '');
    setIsRangeMode(holiday.type === 'range');
    setStartDate(new Date(holiday.date));
    setEndDate(holiday.endDate ? new Date(holiday.endDate) : undefined);
    setError('');
    setSuccess('');
    setIsDialogOpen(true);
  };

  // 保存节假日
  const handleSaveHoliday = async () => {
    if (!holidayName.trim()) {
      setError('请输入节假日名称');
      return;
    }

    if (!startDate) {
      setError('请选择日期');
      return;
    }

    if (isRangeMode && !endDate) {
      setError('请选择结束日期');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const dateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = isRangeMode && endDate ? format(endDate, 'yyyy-MM-dd') : undefined;

    try {
      if (editingHoliday) {
        // 更新现有节假日
        const result = await updateHoliday(editingHoliday.id, {
          name: holidayName,
          description: holidayDescription,
          type: isRangeMode ? 'range' : 'single',
          date: dateStr,
          endDate: endDateStr,
        });

        if (result.success) {
          setSuccess(result.message);
          await loadHolidays();
          setTimeout(() => {
            setIsDialogOpen(false);
          }, 1000);
        } else {
          setError(result.message);
        }
      } else {
        // 创建新节假日
        const result = await createHoliday(
          holidayName,
          dateStr,
          isRangeMode ? 'range' : 'single',
          endDateStr,
          holidayDescription
        );

        if (result.success) {
          setSuccess(result.message);
          await loadHolidays();
          setTimeout(() => {
            setIsDialogOpen(false);
          }, 1000);
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 打开删除确认弹窗
  const openDeleteDialog = (holiday: Holiday) => {
    setDeleteHolidayItem(holiday);
    setIsDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteHolidayItem) return;

    const result = await deleteHoliday(deleteHolidayItem.id);
    if (result.success) {
      await loadHolidays();
      setIsDeleteDialogOpen(false);
      setDeleteHolidayItem(null);
    }
  };

  // 确认清空所有节假日
  const handleConfirmClearAll = async () => {
    const result = await clearAllHolidays();
    if (result.success) {
      await loadHolidays();
      setIsClearAllDialogOpen(false);
      setSuccess(result.message);
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    }
  };

  // 导出节假日
  const handleExport = async (format: 'json' | 'csv') => {
    const content = format === 'json' ? await exportHolidaysToJSON() : await exportHolidaysToCSV();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holidays.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 打开导入弹窗
  const openImportDialog = () => {
    setImportContent('');
    setImportFormat('json');
    setError('');
    setSuccess('');
    setIsImportDialogOpen(true);
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportContent(content);
      // 根据文件扩展名自动选择格式
      if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      } else {
        setImportFormat('json');
      }
    };
    reader.readAsText(file);
  };

  // 处理导入
  const handleImport = async () => {
    if (!importContent.trim()) {
      setError('请输入导入内容');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      let holidaysToImport: Array<{ name: string; date: string; endDate?: string; description?: string }> = [];

      if (importFormat === 'json') {
        const parsed = JSON.parse(importContent);
        if (Array.isArray(parsed)) {
          holidaysToImport = parsed.map((h: Holiday) => ({
            name: h.name,
            date: h.date,
            endDate: h.endDate,
            description: h.description,
          }));
        }
      } else {
        holidaysToImport = parseHolidayCSV(importContent);
      }

      const result = await batchImportHolidays(holidaysToImport);

      if (result.imported > 0) {
        setSuccess(result.message);
        await loadHolidays();
        if (result.failed === 0) {
          setTimeout(() => {
            setIsImportDialogOpen(false);
          }, 1500);
        }
      } else {
        setError(result.message);
      }

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch {
      setError('导入格式错误，请检查数据格式');
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化日期显示
  const formatDateRange = (holiday: Holiday) => {
    if (holiday.type === 'single') {
      return format(new Date(holiday.date), 'yyyy年MM月dd日', { locale: zhCN });
    } else {
      const start = format(new Date(holiday.date), 'yyyy年MM月dd日', { locale: zhCN });
      const end = holiday.endDate ? format(new Date(holiday.endDate), 'yyyy年MM月dd日', { locale: zhCN }) : '';
      return `${start} 至 ${end}`;
    }
  };

  // 计算天数
  const getDaysCount = (holiday: Holiday) => {
    if (holiday.type === 'single') return 1;
    if (!holiday.endDate) return 1;
    const start = new Date(holiday.date);
    const end = new Date(holiday.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-orange-400" />
            <CardTitle className="text-lg font-semibold text-white">节假日设置</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={() => handleExport('json')}
            >
              <FileJson className="w-4 h-4 mr-1" />
              导出JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={() => handleExport('csv')}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              导出CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={openImportDialog}
            >
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={() => setIsClearAllDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              清空节假日
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-secondary text-white"
              onClick={openAddDialog}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加节假日
            </Button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-xs text-slate-400">节假日总数</p>
            <p className="text-xl font-semibold text-white">{stats.totalCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-xs text-slate-400">单日节假日</p>
            <p className="text-xl font-semibold text-blue-400">{stats.singleDayCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-xs text-slate-400">日期范围</p>
            <p className="text-xl font-semibold text-purple-400">{stats.rangeCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-xs text-slate-400">总休息天数</p>
            <p className="text-xl font-semibold text-green-400">{stats.totalDays}</p>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索节假日名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="选择年份" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">全部年份</SelectItem>
              {getYearOptions().map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* 节假日列表 - 带垂直滚动 */}
        <div 
          className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 hover:scrollbar-thumb-slate-500 pr-2 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px]"
          style={{ 
            scrollbarWidth: 'thin',
            msOverflowStyle: 'auto',
            scrollbarColor: '#475569 rgba(42, 47, 52, 0.5)',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
          role="region"
          aria-label="节假日列表"
          tabIndex={0}
        >
          {holidays.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无节假日设置</p>
              <p className="text-sm mt-1">点击"添加节假日"按钮创建</p>
            </div>
          ) : (
            holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-white">{holiday.name}</h4>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        holiday.type === 'single'
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                      )}
                    >
                      {holiday.type === 'single' ? '单日' : '日期范围'}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                    >
                      {getDaysCount(holiday)} 天
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      {formatDateRange(holiday)}
                    </span>
                    {holiday.description && (
                      <span className="text-slate-500 truncate max-w-[300px]">
                        {holiday.description}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20"
                    onClick={() => openEditDialog(holiday)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                    onClick={() => openDeleteDialog(holiday)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* 添加/编辑弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-orange-400" />
              {editingHoliday ? '编辑节假日' : '添加节假日'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-900/50 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{success}</AlertDescription>
              </Alert>
            )}

            {/* 节假日名称 */}
            <div className="space-y-3">
              <Label className="text-white text-base">
                节假日名称 <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="例如：春节、国庆节..."
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white h-12 text-base"
              />
            </div>

            {/* 日期范围切换 */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <span className="text-base text-slate-300">日期范围模式</span>
              </div>
              <Switch
                checked={isRangeMode}
                onCheckedChange={setIsRangeMode}
                className="scale-110"
              />
            </div>

            {/* 开始日期 */}
            <div className="space-y-3">
              <Label className="text-white text-base">
                {isRangeMode ? '开始日期' : '日期'} <span className="text-red-400">*</span>
              </Label>
              <Input
                type="date"
                value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setStartDate(value ? new Date(value) : undefined);
                }}
                className="bg-slate-700 border-slate-600 text-white h-12 text-base"
              />
            </div>

            {/* 结束日期（仅在范围模式显示） */}
            {isRangeMode && (
              <div className="space-y-3">
                <Label className="text-white text-base">
                  结束日期 <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEndDate(value ? new Date(value) : undefined);
                  }}
                  className="bg-slate-700 border-slate-600 text-white h-12 text-base"
                />
              </div>
            )}

            {/* 描述 */}
            <div className="space-y-3">
              <Label className="text-white text-base">描述（可选）</Label>
              <Textarea
                placeholder="添加节假日的详细描述..."
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white min-h-[100px] text-base"
              />
            </div>

            {/* 按钮 */}
            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 h-12 text-base"
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-secondary text-white h-12 text-base"
                onClick={handleSaveHoliday}
                disabled={isLoading}
              >
                {isLoading ? '保存中...' : editingHoliday ? '保存修改' : '添加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              确认删除
            </DialogTitle>
          </DialogHeader>

          <div className="pt-4">
            <p className="text-slate-300 mb-4">
              确定要删除节假日 <span className="font-medium text-white">"{deleteHolidayItem?.name}"</span> 吗？
            </p>
            <p className="text-sm text-slate-400 mb-6">
              此操作不可撤销，删除后该节假日将不再计入任务排程的排除日期。
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmDelete}
              >
                确认删除
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 导入弹窗 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />
              导入节假日
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-900/50 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{success}</AlertDescription>
              </Alert>
            )}

            {/* 格式选择 */}
            <div className="space-y-2">
              <Label className="text-white">导入格式</Label>
              <div className="flex gap-2">
                <Button
                  variant={importFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  className={importFormat === 'json' ? 'bg-primary' : 'border-slate-600 text-slate-300'}
                  onClick={() => setImportFormat('json')}
                >
                  <FileJson className="w-4 h-4 mr-1" />
                  JSON
                </Button>
                <Button
                  variant={importFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  className={importFormat === 'csv' ? 'bg-primary' : 'border-slate-600 text-slate-300'}
                  onClick={() => setImportFormat('csv')}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  CSV
                </Button>
              </div>
            </div>

            {/* 文件上传 */}
            <div className="space-y-2">
              <Label className="text-white">上传文件</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={importFormat === 'json' ? '.json' : '.csv'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  选择文件
                </Button>
                <span className="text-sm text-slate-400 self-center">
                  支持 {importFormat === 'json' ? '.json' : '.csv'} 格式
                </span>
              </div>
            </div>

            {/* 粘贴内容 */}
            <div className="space-y-2">
              <Label className="text-white">或粘贴内容</Label>
              <Textarea
                placeholder={importFormat === 'json'
                  ? '[{"name": "春节", "date": "2024-02-10", "endDate": "2024-02-17", "description": "春节假期"}]'
                  : '名称,开始日期,结束日期,类型,描述\n春节,2024-02-10,2024-02-17,日期范围,春节假期'
                }
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white min-h-[150px] font-mono text-sm"
              />
            </div>

            {/* 按钮 */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => setIsImportDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-secondary text-white"
                onClick={handleImport}
                disabled={isLoading || !importContent.trim()}
              >
                {isLoading ? '导入中...' : '开始导入'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 清空所有节假日弹窗 */}
      <Dialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              确认清空
            </DialogTitle>
          </DialogHeader>

          <div className="pt-4">
            <p className="text-slate-300 mb-4">
              确定要清除所有系统设置的节假日吗？
            </p>
            <p className="text-sm text-slate-400 mb-6">
              此操作不可恢复，所有节假日数据将被永久删除。
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => setIsClearAllDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmClearAll}
              >
                确认清空
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
