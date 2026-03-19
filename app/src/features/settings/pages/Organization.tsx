/**
 * 组织架构设置页面
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Plus, ChevronRight, ChevronDown, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Department {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  managerName: string | null;
  memberCount: number;
  children?: Department[];
}

// 模拟数据
const mockDepartments: Department[] = [];

export function OrganizationSettings() {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = (parentId: number | null = null) => {
    setSelectedParent(parentId);
    setCreateDialogOpen(true);
  };

  // 渲染部门树
  const renderDepartment = (dept: Department, level: number = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedIds.has(dept.id);

    return (
      <div key={dept.id}>
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors',
            level > 0 && 'ml-6'
          )}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleExpand(dept.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <span className="w-6" />
            )}
            <div>
              <p className="font-medium">{dept.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {dept.memberCount} 人
                </Badge>
                {dept.managerName && (
                  <span>负责人: {dept.managerName}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCreate(dept.id)}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加子部门
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 子部门 */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {dept.children!.map((child) => renderDepartment(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                组织架构
              </CardTitle>
              <CardDescription>
                管理公司的部门和团队结构
              </CardDescription>
            </div>
            <Button onClick={() => handleCreate(null)}>
              <Plus className="h-4 w-4 mr-2" />
              添加部门
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mockDepartments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-2 opacity-50" />
              <p>暂无部门数据</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleCreate(null)}
              >
                创建第一个部门
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {mockDepartments.map((dept) => renderDepartment(dept))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建部门对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParent ? '添加子部门' : '添加部门'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">部门名称</Label>
              <Input
                id="deptName"
                placeholder="请输入部门名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager">部门负责人</Label>
              <Input
                id="manager"
                placeholder="请选择或输入负责人"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setCreateDialogOpen(false)}>
              确认创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
