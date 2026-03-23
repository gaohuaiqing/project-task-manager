/**
 * 节假日管理页面
 */
import { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
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

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'holiday' | 'working_day';
  isWorkingDay: boolean;
}

const mockHolidays: Holiday[] = [
  { id: '1', date: '2026-01-01', name: '元旦', type: 'holiday', isWorkingDay: false },
  { id: '2', date: '2026-02-17', name: '春节', type: 'holiday', isWorkingDay: false },
  { id: '2026-02-18', date: '2026-02-18', name: '春节调休', type: 'working_day', isWorkingDay: true },
];

export function HolidaysSettings() {
  const [holidays, setHolidays] = useState<Holiday[]>(mockHolidays);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedHoliday({
      id: '',
      date: '',
      name: '',
      type: 'holiday',
      isWorkingDay: false,
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    // 保存逻辑
    setEditDialogOpen(false);
    setSelectedHoliday(null);
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            导入年度节假日
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
          <CardTitle>节假日配置</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>是否工作日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-mono">
                    {new Date(holiday.date).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell>
                    <Badge variant={holiday.type === 'holiday' ? 'destructive' : 'default'}>
                      {holiday.type === 'holiday' ? '节假日' : '调休日'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={holiday.isWorkingDay ? 'default' : 'secondary'}>
                      {holiday.isWorkingDay ? '是' : '否'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(holiday)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedHoliday?.id ? '编辑节假日' : '添加节假日'}</DialogTitle>
          </DialogHeader>
          {selectedHoliday && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>日期</Label>
                <Input type="date" value={selectedHoliday.date} />
              </div>
              <div className="space-y-2">
                <Label>名称</Label>
                <Input value={selectedHoliday.name} placeholder="如：春节" />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={selectedHoliday.type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">节假日</SelectItem>
                    <SelectItem value="working_day">调休日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
