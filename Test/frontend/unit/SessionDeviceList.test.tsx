/**
 * SessionDeviceList 组件测试
 *
 * 测试范围：
 * 1. 当前设备标记显示正确
 * 2. 其他设备显示终止按钮
 * 3. 终止单个设备流程
 * 4. 终止其他所有设备流程
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionDeviceList } from '@/features/settings/components/SessionDeviceList';
import type { SessionInfo } from '@/features/auth/api';

// ============ Mock 依赖 ============

// Mock API
vi.mock('@/features/auth/api', () => ({
  authApi: {
    terminateSession: vi.fn(),
    terminateOtherSessions: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock userAgent utils
vi.mock('@/utils/userAgent', () => ({
  parseUserAgent: vi.fn((ua: string) => ({
    browser: ua.includes('Chrome') ? 'Chrome' : 'Safari',
    os: ua.includes('Windows') ? 'Windows' : 'macOS',
    display: ua.includes('Chrome') && ua.includes('Windows') ? 'Chrome / Windows' : 'Safari / macOS',
  })),
  maskIPAddress: vi.fn((ip: string) => ip.replace(/\.\d+$/, '.*')),
  formatRelativeTime: vi.fn(() => '1小时前'),
}));

// ============ 测试数据 ============

import { authApi } from '@/features/auth/api';

const mockSessions: SessionInfo[] = [
  {
    id: 'session-1',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    lastAccessed: Math.floor(Date.now() / 1000) - 60,
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 7,
    isCurrent: true,
  },
  {
    id: 'session-2',
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
    createdAt: Math.floor(Date.now() / 1000) - 86400,
    lastAccessed: Math.floor(Date.now() / 1000) - 7200,
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 6,
    isCurrent: false,
  },
  {
    id: 'session-3',
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
    lastAccessed: Math.floor(Date.now() / 1000) - 86400,
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 5,
    isCurrent: false,
  },
];

// ============ 测试 ============

describe('SessionDeviceList', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应显示当前设备标记', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('当前设备')).toBeInTheDocument();
  });

  it('应显示其他设备', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    // 有两个其他设备
    const otherDevices = screen.getAllByText('其他设备');
    expect(otherDevices).toHaveLength(2);
  });

  it('当前设备不应显示终止按钮', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    // 当前设备区域不应有终止按钮
    // 只有其他设备才有终止按钮，共2个
    const terminateButtons = screen.getAllByRole('button', { name: '终止' });
    expect(terminateButtons).toHaveLength(2);
  });

  it('其他设备应显示终止按钮', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    const terminateButtons = screen.getAllByRole('button', { name: '终止' });
    expect(terminateButtons).toHaveLength(2);
  });

  it('有多个其他设备时应显示"终止其他所有设备"按钮', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByRole('button', { name: /终止其他所有设备/ })).toBeInTheDocument();
  });

  it('点击终止按钮应弹出确认弹窗', async () => {
    const user = userEvent.setup();
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    const terminateButtons = screen.getAllByRole('button', { name: '终止' });
    await user.click(terminateButtons[0]);

    expect(screen.getByText('终止设备登录')).toBeInTheDocument();
    expect(screen.getByText(/确定要终止该设备的登录吗/)).toBeInTheDocument();
  });

  it('确认终止应调用API并刷新列表', async () => {
    vi.mocked(authApi.terminateSession).mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    const terminateButtons = screen.getAllByRole('button', { name: '终止' });
    await user.click(terminateButtons[0]);

    const confirmButton = screen.getByRole('button', { name: '确认终止' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(authApi.terminateSession).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('无会话时应显示提示信息', () => {
    render(
      <SessionDeviceList
        sessions={[]}
        currentSessionId={null}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('暂无登录设备')).toBeInTheDocument();
  });

  it('只有一个其他设备时不应显示"终止其他所有设备"按钮', () => {
    const singleOtherSession = [mockSessions[0], mockSessions[1]];
    render(
      <SessionDeviceList
        sessions={singleOtherSession}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    // 只有一个其他设备时，不显示"终止其他所有设备"按钮
    expect(screen.queryByRole('button', { name: /终止其他所有设备/ })).not.toBeInTheDocument();
  });

  it('点击"终止其他所有设备"应显示确认弹窗', async () => {
    const user = userEvent.setup();
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    const terminateAllButton = screen.getByRole('button', { name: /终止其他所有设备/ });
    await user.click(terminateAllButton);

    expect(screen.getByText('终止其他所有设备')).toBeInTheDocument();
    expect(screen.getByText(/确定要终止其他所有设备的登录吗/)).toBeInTheDocument();
  });

  it('确认"终止其他所有设备"应调用API并刷新', async () => {
    vi.mocked(authApi.terminateOtherSessions).mockResolvedValueOnce({ terminatedCount: 2 });

    const user = userEvent.setup();
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    const terminateAllButton = screen.getByRole('button', { name: /终止其他所有设备/ });
    await user.click(terminateAllButton);

    const confirmButton = screen.getByRole('button', { name: '确认终止' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(authApi.terminateOtherSessions).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });
});
