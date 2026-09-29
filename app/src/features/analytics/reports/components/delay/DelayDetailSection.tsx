/**
 * v3 L3 明细：三状态任务列表 Tab + 成员统计
 * Tab 组：[延期预警 (n)] [已延期 (n)] [逾期未开始 (n)] [成员延期统计]
 * - 前三 Tab 按 delayType 过滤 delayTasks（后端明细已扩三态，与统计总览支撑行三数字同口径）
 * - 组下钻（selectedDeptId）：三状态 Tab 按 deptId 过滤（行无 deptId 时跳过组过滤保持现状）+ 成员统计按部门
 * - 成员筛选（selectedMemberName）：三状态 Tab 按 assigneeName 过滤（复用原逻辑）
 * - activeTab 状态提升至 DelayAnalysisTab（统计总览支撑卡点击联动 + anchor 滚动）
 */
import { DataTable } from '../shared';
import { DELAY_TASK_COLUMNS, MEMBER_RANKING_COLUMNS } from '../../config';
import type { DelayTaskItem, DelayDetailTab, MemberRankingData } from '../../types';

export interface DelayDetailSectionProps {
  /** 三状态明细（已延期/延期预警/逾期未开始，后端 delayTasks） */
  delayTasks: DelayTaskItem[];
  memberRanking: MemberRankingData[];
  selectedMemberName?: string | null;
  onSelectMember?: (name: string | null) => void;
  /** 选中的部门 id（来自 TeamSection 点组下钻）；非空时三状态 Tab 与成员统计均按部门筛选 */
  selectedDeptId?: number | null;
  /** 当前激活 Tab（状态提升，统计总览支撑卡点击联动切换） */
  activeTab: DelayDetailTab;
  onChangeTab: (tab: DelayDetailTab) => void;
}

export function DelayDetailSection({
  delayTasks, memberRanking, selectedMemberName, onSelectMember, selectedDeptId, activeTab, onChangeTab,
}: DelayDetailSectionProps) {
  // 三状态 Tab 全量计数（不随本地成员/组筛选变化，保证与统计总览支撑行数字一致）
  const warningCount = delayTasks.filter((t) => t.delayType === 'delay_warning').length;
  const delayedCount = delayTasks.filter((t) => t.delayType === 'delayed').length;
  const overdueStartCount = delayTasks.filter((t) => t.delayType === 'overdue_start').length;

  // 三状态 Tab 过滤链：按 Tab 类型 → 成员 → 组
  let filteredTasks = delayTasks;
  if (activeTab !== 'members') {
    filteredTasks = filteredTasks.filter((t) => t.delayType === activeTab);
  }
  if (selectedMemberName) {
    filteredTasks = filteredTasks.filter((t) => t.assigneeName === selectedMemberName);
  }
  if (selectedDeptId != null) {
    // 未分配任务（deptId 为 null，旧缓存缺字段防御）在任何组下钻下都显示——接受现状，避免整表被误清空
    filteredTasks = filteredTasks.filter((t) => t.deptId == null || t.deptId === selectedDeptId);
  }

  // 成员统计 Tab：dept_manager 点组后只显示该组成员
  const filteredMembers = selectedDeptId
    ? memberRanking.filter((m) => m.deptId === selectedDeptId)
    : memberRanking;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h3 className="text-sm font-semibold">数据明细</h3>
        {selectedMemberName && (
          <span className="text-xs text-primary">已筛选：{selectedMemberName}
            <button className="ml-2 underline" onClick={() => onSelectMember?.(null)}>清除</button>
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <TabBtn active={activeTab === 'delay_warning'} onClick={() => onChangeTab('delay_warning')}>
            延期预警 ({warningCount})
          </TabBtn>
          <TabBtn active={activeTab === 'delayed'} onClick={() => onChangeTab('delayed')}>
            已延期 ({delayedCount})
          </TabBtn>
          <TabBtn active={activeTab === 'overdue_start'} onClick={() => onChangeTab('overdue_start')}>
            逾期未开始 ({overdueStartCount})
          </TabBtn>
          <TabBtn active={activeTab === 'members'} onClick={() => onChangeTab('members')}>
            成员延期统计
          </TabBtn>
        </div>
      </div>

      {activeTab !== 'members' ? (
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
