/**
 * 登录设备列表组件
 * 按 IP 分组显示设备，同 IP 视为同一台电脑
 */
import { useState, useMemo } from 'react';
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

  // 按 IP 分组，每组内按最后活跃时间倒序
  const deviceGroups = useMemo(() => {
    const groups = new Map<string, { label: string; sessions: SessionInfo[] }>();

    for (const session of sessions) {
      const groupKey = session.ipGroup || 'unknown';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          label: session.ipAddress || '未知',
          sessions: [],
        });
      }
      groups.get(groupKey)!.sessions.push(session);
    }

    // 每组内按最后活跃时间倒序
    for (const group of groups.values()) {
      group.sessions.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
    }

    return Array.from(groups.values());
  }, [sessions]);

  // 按 IP 分组：当前设备组 vs 其他设备组（按最新会话时间倒序）
  const currentDevice = deviceGroups.find(g =>
    g.sessions.some(s => s.isCurrent)
  );
  const otherDevices = deviceGroups
    .filter(g => !g.sessions.some(s => s.isCurrent))
    .sort((a, b) => {
      const aMax = Math.max(...a.sessions.map(s => s.lastAccessed ?? 0));
      const bMax = Math.max(...b.sessions.map(s => s.lastAccessed ?? 0));
      return bMax - aMax;
    });

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

  // 终止某个 IP 组的所有会话（整台电脑）
  const handleTerminateDevice = async (groupKey: string) => {
    const group = deviceGroups.find(g =>
      (g.sessions[0]?.ipGroup || 'unknown') === groupKey
    );
    if (!group) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        group.sessions.map(session => authApi.terminateSession(session.id))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        toast.warning(`${group.sessions.length - failed} 个已终止，${failed} 个失败`);
      } else {
        toast.success(`已终止 ${group.sessions.length} 个会话`);
      }
      onRefresh();
    } catch {
      toast.error('终止失败，请重试');
    } finally {
      setLoading(false);
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

  // 其他设备的总会话数
  const otherSessionCount = otherDevices.reduce(
    (sum, g) => sum + g.sessions.length, 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">登录设备</CardTitle>
        <CardDescription>
          管理您的登录设备，同电脑多浏览器共享，不同电脑登录会自动踢掉旧设备
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无登录设备</div>
        ) : (
          <>
            {/* 当前设备 */}
            {currentDevice && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  当前设备
                </div>
                <DeviceGroup
                  group={currentDevice}
                  isCurrentGroup
                />
              </div>
            )}

            {/* 其他设备 */}
            {otherDevices.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  其他设备
                </div>
                {otherDevices.map(group => (
                  <DeviceGroup
                    key={group.sessions[0]?.ipGroup || 'unknown'}
                    group={group}
                    onTerminateDevice={() => handleTerminateDevice(group.sessions[0]?.ipGroup || 'unknown')}
                    onTerminateSession={setTerminatingId}
                  />
                ))}
              </div>
            )}

            {/* 终止其他所有设备按钮 */}
            {otherSessionCount > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setTerminateAllCount(otherSessionCount);
                  setShowTerminateAll(true);
                }}
                className="w-full"
              >
                终止其他所有设备 ({otherSessionCount})
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
          description={`确定要终止其他所有设备的登录吗？将终止 ${terminateAllCount} 个会话。`}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}

/**
 * 设备组（同一 IP 的所有浏览器会话）
 */
function DeviceGroup({
  group,
  isCurrentGroup = false,
  onTerminateDevice,
  onTerminateSession,
}: {
  group: { label: string; sessions: SessionInfo[] };
  isCurrentGroup?: boolean;
  onTerminateDevice?: () => void;
  onTerminateSession?: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card">
      {/* 设备头部 */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isCurrentGroup ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="font-medium text-sm">
            {isCurrentGroup ? '当前设备' : '其他设备'}
          </span>
          <span className="text-xs text-muted-foreground">
            IP: {group.label}
          </span>
          {group.sessions.length > 1 && (
            <span className="text-xs text-muted-foreground">
              ({group.sessions.length} 个浏览器)
            </span>
          )}
        </div>
        {/* 终止整台电脑 */}
        {!isCurrentGroup && onTerminateDevice && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onTerminateDevice}
          >
            终止此设备
          </Button>
        )}
      </div>

      {/* 该 IP 下的每个浏览器会话 */}
      <div className="divide-y last:border-b-0">
        {group.sessions.map(session => (
          <SessionItem
            key={session.id}
            session={session}
            isCurrent={session.isCurrent}
            onTerminate={onTerminateSession ? () => onTerminateSession(session.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 单个会话项
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
  const loginTime = formatRelativeTime(session.createdAt);
  const lastActive = formatRelativeTime(session.lastAccessed);

  return (
    <div className="flex items-start justify-between p-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {deviceInfo.display}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          登录: {loginTime} · 最后活跃: {lastActive}
        </div>
      </div>
      {/* 终止按钮（仅非当前设备显示） */}
      {!isCurrent && onTerminate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onTerminate}
          className="text-destructive hover:text-destructive"
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
