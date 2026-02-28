/**
 * 成员选择组件
 * 支持搜索、部门分组展示
 */

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Member } from '@/types';

interface MemberSelectProps {
  members: Member[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// 按角色/部门对成员进行分组
const groupMembersByRole = (members: Member[]) => {
  const groups: Record<string, Member[]> = {};
  
  members.forEach(member => {
    const role = member.role || '未分组';
    if (!groups[role]) {
      groups[role] = [];
    }
    groups[role].push(member);
  });
  
  // 按角色名称排序
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
};

export function MemberSelect({
  members,
  value,
  onChange,
  placeholder = '选择负责人...',
  disabled = false,
  className,
}: MemberSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // 根据搜索词过滤成员
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    
    const query = searchQuery.toLowerCase();
    return members.filter(member =>
      member.name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      member.level.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // 按角色分组
  const groupedMembers = useMemo(() => {
    return groupMembersByRole(filteredMembers);
  }, [filteredMembers]);

  // 获取选中的成员信息
  const selectedMember = useMemo(() => {
    return members.find(m => m.id === value);
  }, [members, value]);

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={cn("bg-background border-border text-white", className)}>
        <SelectValue placeholder={placeholder}>
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{selectedMember.name}</span>
              <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                {selectedMember.role}
              </Badge>
            </div>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border max-h-[400px] w-[320px]">
        {/* 搜索框 */}
        <div className="sticky top-0 bg-card p-2 border-b border-slate-700 z-10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索成员姓名、角色..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-slate-800 border-slate-700 text-white"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* 成员列表 */}
        <div className="max-h-[300px] overflow-y-auto">
          {members.length === 0 ? (
            <div className="py-8 text-center">
              <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <div className="text-sm text-muted-foreground mb-1">暂无成员</div>
              <div className="text-xs text-slate-500">请联系管理员添加团队成员</div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              未找到匹配的成员
            </div>
          ) : (
            groupedMembers.map(([role, roleMembers]) => (
              <div key={role} className="py-1">
                {/* 分组标题 */}
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-slate-800/50 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {role}
                  <span className="text-slate-500">({roleMembers.length})</span>
                </div>

                {/* 分组成员 */}
                {roleMembers.map((member) => (
                  <SelectItem
                    key={member.id}
                    value={member.id}
                    className="text-white cursor-pointer py-2 px-2 hover:bg-slate-700 focus:bg-slate-700"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {/* 头像 */}
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white flex-shrink-0">
                        {member.name.charAt(0)}
                      </div>

                      {/* 姓名和级别 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium truncate">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.level}</span>
                        </div>
                      </div>

                      {/* 饱和度指示 */}
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        member.saturation <= 60 ? "bg-green-500" :
                        member.saturation <= 85 ? "bg-yellow-500" : "bg-red-500"
                      )} title={`饱和度: ${member.saturation}%`} />
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))
          )}
        </div>

        {/* 底部统计 */}
        <div className="sticky bottom-0 bg-card p-2 border-t border-slate-700 text-xs text-muted-foreground">
          共 {filteredMembers.length} 名成员
          {searchQuery && ` (搜索: "${searchQuery}")`}
        </div>
      </SelectContent>
    </Select>
  );
}
