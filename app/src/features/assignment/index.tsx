/**
 * 智能分配页面
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <div className="space-y-6 animate-fade-in">
      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="matrix">能力矩阵</TabsTrigger>
          <TabsTrigger value="suggest">分配建议</TabsTrigger>
          <TabsTrigger value="profile">能力档案</TabsTrigger>
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
