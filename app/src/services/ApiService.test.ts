/**
 * API 服务单元测试
 * 测试 API 请求封装和错误处理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiService } from './ApiService';

describe('ApiService 测试', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 模拟 fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该正确导出 apiService 单例', () => {
      expect(apiService).toBeDefined();
      expect(typeof apiService.login).toBe('function');
      expect(typeof apiService.logout).toBe('function');
      expect(typeof apiService.healthCheck).toBe('function');
    });
  });

  describe('登录相关', () => {
    it('应该成功登录', async () => {
      const mockResponse = {
        success: true,
        session: {
          sessionId: 'test-session-id',
          username: 'test',
          createdAt: Date.now()
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiService.login('test', 'password');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test')
        })
      );
    });

    it('登录失败应该抛出错误', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' })
      });

      await expect(apiService.login('test', 'wrong')).rejects.toThrow();
    });

    it('应该支持管理员登录', async () => {
      const mockResponse = {
        success: true,
        session: {
          sessionId: 'admin-session-id',
          username: 'admin',
          createdAt: Date.now()
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await apiService.login('admin', 'admin123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('admin')
        })
      );
    });
  });

  describe('登出相关', () => {
    it('应该成功登出', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await apiService.logout('test-session-id');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/logout'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-session-id')
        })
      );
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', timestamp: '2026-02-18T01:00:00.000Z' })
      });

      const result = await apiService.healthCheck();

      expect(result.status).toBe('ok');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/health'
      );
    });

    it('健康检查失败应该抛出错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(apiService.healthCheck()).rejects.toThrow('Network error');
    });
  });

  describe('会话管理', () => {
    it('应该获取用户会话列表', async () => {
      const mockSessions = [
        { sessionId: 's1', createdAt: Date.now() },
        { sessionId: 's2', createdAt: Date.now() }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: mockSessions })
      });

      const result = await apiService.getSessions('testuser');

      expect(result.sessions).toEqual(mockSessions);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/sessions/testuser',
        expect.any(Object)
      );
    });
  });

  describe('数据同步', () => {
    it('应该触发数据同步', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, synced: true })
      });

      const result = await apiService.syncData('session-id', 'members', [{ id: '1', name: 'Test' }]);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sync'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('members')
        })
      );
    });

    it('应该获取用户数据', async () => {
      const mockData = [
        { id: '1', name: 'Data 1' }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockData })
      });

      const result = await apiService.getData('test-user', 'members');

      expect(result.data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/data/test-user/members',
        expect.any(Object)
      );
    });
  });

  describe('错误处理', () => {
    it('网络错误应该被正确处理', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(apiService.login('test', 'password')).rejects.toThrow('Network error');
    });

    it('服务器错误应该抛出异常', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' })
      });

      await expect(apiService.login('test', 'password')).rejects.toThrow();
    });

    it('JSON 解析错误应该被处理', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(apiService.login('test', 'password')).rejects.toThrow();
    });
  });

  describe('IP获取', () => {
    it('应该能够获取客户端IP（通过外部API）', async () => {
      // 这个测试验证 getClientIP 方法的调用
      // 实际IP获取是异步的，这里主要测试不会抛出错误
      const mockIpResponse = { ip: '127.0.0.1' };

      // Mock 外部IP API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIpResponse
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: { sessionId: 'test', username: 'test', createdAt: Date.now() }
        })
      });

      // 调用登录会触发 getClientIP
      await apiService.login('test', 'password');

      // 验证调用了外部API
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('IP获取失败时应该使用unknown', async () => {
      // Mock 外部IP API失败
      mockFetch.mockRejectedValueOnce(new Error('IP API failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            session: { sessionId: 'test', username: 'test', createdAt: Date.now() }
          })
        });

      // 登录应该成功，即使IP获取失败
      const result = await apiService.login('test', 'password');

      expect(result.success).toBe(true);
    });
  });
});
