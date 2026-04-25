/**
 * 登录设备列表组件
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { authApi, type SessionInfo } from '@/features/auth/api';
import { parseUserAgent, maskIPAddress, formatRelativeTime } from '@/utils/userAgent';
import { TerminateConfirmDialog } from './TerminateConfirmDialog';
import { toast } from 'sonner';

interface SessionDeviceListProps {
  sessions: SessionInfo[];
  currentSessionId: string | null;
  onRefresh: () => void;
}

export function SessionDeviceList({ sessions, currentSessionId, onRefresh }: SessionDeviceListProps) {
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [showTerminateAll, setShowTerminateAll] = useState(false);
  const [terminateAllCount, setTerminateAllCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 当前会话
  const currentSession = sessions.find(s => s.isCurrent);
  // 其他会话
  const otherSessions = sessions.filter(s => !s.isCurrent);

  // 终止单个设备
  const handleTerminate = async (sessionId: string) => {
    setLoading(true);
    try {
      await authApi.terminateSession(sessionId);
      toast.success('设备已终止');
      onRefresh();
    } catch {
      toast.error('终止失败，请重试');
    } finally {
      setLoading(false);
      setTerminatingId(null);
    }
  };

  // 终止其他所有设备
  const handleTerminateAll = async () => {
    setLoading(true);
    try {
      const result = await authApi.terminateOtherSessions();
      toast.success(`已终止 ${result.terminatedCount} 个设备`);
      onRefresh();
    } catch {
      toast.error('终止失败，请重试');
    } finally {
      setLoading(false);
      setShowTerminateAll(false);
    }
  };

  // 打开终止所有确认弹窗
  const openTerminateAllDialog = () => {
    setTerminateAllCount(otherSessions.length);
    setShowTerminateAll(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">登录设备</CardTitle>
        <CardDescription>
          管理您的登录设备，如发现可疑设备请立即终止
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无登录设备</div>
        ) : (
          <>
            {/* 当前设备 */}
            {currentSession && (
              <SessionItem
                session={currentSession}
                isCurrent
              />
            )}

            {/* 其他设备 */}
            {otherSessions.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                onTerminate={() => setTerminatingId(session.id)}
              />
            ))}

            {/* 终止其他所有设备按钮 */}
            {otherSessions.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={openTerminateAllDialog}
                className="w-full"
              >
                终止其他所有设备 ({otherSessions.length})
              </Button>
            )}
          </>
        )}

        {/* 单个设备终止确认弹窗 */}
        <TerminateConfirmDialog
          open={terminatingId !== null}
          onOpenChange={(open) => !open && setTerminatingId(null)}
          onConfirm={() => terminatingId && handleTerminate(terminatingId)}
          title="终止设备登录"
          description="确定要终止该设备的登录吗？该设备将需要重新登录。"
          loading={loading}
        />

        {/* 终止所有设备确认弹窗 */}
        <TerminateConfirmDialog
          open={showTerminateAll}
          onOpenChange={setShowTerminateAll}
          onConfirm={handleTerminateAll}
          title="终止其他所有设备"
          description={`确定要终止其他所有设备的登录吗？将终止 ${terminateAllCount} 个设备。`}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}

/**
 * 单个会话项组件
 */
function SessionItem({
  session,
  isCurrent = false,
  onTerminate,
}: {
  session: SessionInfo;
  isCurrent?: boolean;
  onTerminate?: () => void;
}) {
  const deviceInfo = parseUserAgent(session.userAgent);
  const maskedIP = maskIPAddress(session.ipAddress);
  const loginTime = formatRelativeTime(session.createdAt);
  const lastActive = formatRelativeTime(session.lastAccessed);

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border bg-card">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {/* 当前设备标记 */}
          <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="font-medium text-sm">
            {isCurrent ? '当前设备' : '其他设备'}
          </span>
          <span className="text-sm text-muted-foreground">
            {deviceInfo.display}
          </span>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>IP: {maskedIP}</div>
          <div>登录: {loginTime} · 最后活跃: {lastActive}</div>
        </div>
      </div>
      {/* 终止按钮（仅非当前设备显示） */}
      {!isCurrent && onTerminate && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onTerminate}
        >
          终止
        </Button>
      )}
    </div>
  );
}

/**
 * 加载骨架屏
 */
export function SessionDeviceListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}
