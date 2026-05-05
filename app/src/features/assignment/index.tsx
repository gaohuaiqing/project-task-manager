/**
 * 智能分配页面
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle } from 'lucide-react';
import { CapabilityMatrix } from './components/CapabilityMatrix';
import { AssignmentSuggestion } from './components/AssignmentSuggestion';
import { MemberCapabilities } from './components/MemberCapabilities';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

// 临时类型定义
interface Task {
  id: string;
  name: string;
  assigneeId?: string;
}

export default function AssignmentPage() {
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('matrix');

  // 模拟待分配任务
  const pendingTasks: Task[] = [];
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div data-testid="assignment-page-container" className="space-y-6 animate-fade-in">
      {/* 功能开发中提示 */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <h2 className="text-3xl font-bold text-amber-700 dark:text-amber-400">
            功能开发中
          </h2>
          <AlertTriangle className="w-12 h-12 text-amber-500" />
        </div>
        <p className="text-xl text-amber-600 dark:text-amber-300 mb-2">
          智能分配模块正在完善中，暂时不开放使用
        </p>
        <p className="text-base text-amber-500 dark:text-amber-400">
          敬请期待后续版本更新
        </p>
      </div>
      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger data-testid="assignment-tab-matrix" value="matrix">能力矩阵</TabsTrigger>
          <TabsTrigger data-testid="assignment-tab-suggest" value="suggest">分配建议</TabsTrigger>
          <TabsTrigger data-testid="assignment-tab-profile" value="profile">能力档案</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <CapabilityMatrix
            onMemberClick={(profile) => {
              setSelectedMemberId(profile.memberId);
              setActiveTab('profile');
            }}
          />
        </TabsContent>

        <TabsContent value="suggest">
          <AssignmentSuggestion
            tasks={pendingTasks as any}
            onAssign={(taskId, memberId) => {
              console.log('Assign task', taskId, 'to member', memberId);
            }}
          />
        </TabsContent>

        <TabsContent value="profile">
          {selectedMemberId ? (
            <MemberCapabilities memberId={selectedMemberId} showHistory />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>请从能力矩阵中选择成员查看详情</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
