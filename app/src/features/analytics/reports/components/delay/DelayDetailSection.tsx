/**
 * L3 明细：延期任务列表 ↔ 成员统计（Tab 切换）
 * 支持下钻：onSelectMember 筛选任务列表到该成员；selectedDeptId 筛选成员统计到该组
 */
import { useState } from 'react';
import { DataTable } from '../shared';
import { DELAY_TASK_COLUMNS, MEMBER_RANKING_COLUMNS } from '../../config';
import type { DelayTaskItem, MemberRankingData } from '../../types';

export interface DelayDetailSectionProps {
  delayTasks: DelayTaskItem[];
  memberRanking: MemberRankingData[];
  selectedMemberName?: string | null;
  onSelectMember?: (name: string | null) => void;
  /** 选中的部门 id（来自 TeamSection 点组下钻）；非空时成员统计 Tab 只展示该组成员 */
  selectedDeptId?: number | null;
}

export function DelayDetailSection({
  delayTasks, memberRanking, selectedMemberName, onSelectMember, selectedDeptId,
}: DelayDetailSectionProps) {
  const [activeTable, setActiveTable] = useState<'tasks' | 'members'>('tasks');

  const filteredTasks = selectedMemberName
    ? delayTasks.filter((t) => t.assigneeName === selectedMemberName)
    : delayTasks;

  // 成员统计 Tab：dept_manager 点组后只显示该组成员
  const filteredMembers = selectedDeptId
    ? memberRanking.filter((m) => m.deptId === selectedDeptId)
    : memberRanking;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-sm font-semibold">数据明细</h3>
        {selectedMemberName && (
          <span className="text-xs text-primary">已筛选：{selectedMemberName}
            <button className="ml-2 underline" onClick={() => onSelectMember?.(null)}>清除</button>
          </span>
        )}
        <div className="flex gap-2">
          <TabBtn active={activeTable === 'tasks'} onClick={() => setActiveTable('tasks')}>延期任务列表</TabBtn>
          <TabBtn active={activeTable === 'members'} onClick={() => setActiveTable('members')}>成员延期统计</TabBtn>
        </div>
      </div>

      {activeTable === 'tasks' ? (
        <DataTable
          columns={DELAY_TASK_COLUMNS}
          data={filteredTasks}
          pagination={{ page: 1, pageSize: 10, total: filteredTasks.length }}
        />
      ) : (
        <DataTable
          columns={MEMBER_RANKING_COLUMNS}
          data={filteredMembers}
          pagination={{ page: 1, pageSize: 10, total: filteredMembers.length }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`px-3 py-1 text-xs rounded-md transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
      onClick={onClick}
    >{children}</button>
  );
}
