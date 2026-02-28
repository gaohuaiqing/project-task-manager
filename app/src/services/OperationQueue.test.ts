/**
 * 操作队列服务单元测试
 */

import { OperationQueue, type Operation, type OperationResult } from './OperationQueue';

// 模拟 setTimeout 和 clearTimeout
let mockTimers: Array<{ timeout: number; callback: () => void }> = [];
let mockTimeoutId = 0;

global.setTimeout = ((callback: () => void, timeout: number) => {
  const id = mockTimeoutId++;
  mockTimers.push({ timeout, callback });
  return id as any;
}) as any;

global.clearTimeout = ((id: number) => {
  mockTimers = mockTimers.filter(t => t.timeout !== id);
}) as any;

describe('OperationQueue', () => {
  let queue: OperationQueue;
  let testConfig: Partial<{
    maxRetryCount: number;
    retryDelay: number;
    acknowledgedDeleteDelay: number;
  }>;

  beforeEach(() => {
    // 使用快速配置进行测试
    testConfig = {
      maxRetryCount: 2,
      retryDelay: 100,
      acknowledgedDeleteDelay: 1000
    };
    queue = new OperationQueue(testConfig);
    mockTimers = [];
    mockTimeoutId = 0;
  });

  afterEach(() => {
    // 清理所有定时器
    mockTimers = [];
  });

  describe('入队操作', () => {
    test('应该成功入队操作并返回唯一ID', () => {
      const opId1 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试项目' }
      });

      const opId2 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ002',
        data: { name: '测试项目2' }
      });

      expect(opId1).not.toBe(opId2);
      expect(opId1).toMatch(/^op_\d+_[a-z0-9]+$/);
      expect(opId2).toMatch(/^op_\d+_[a-z0-9]+$/);
    });

    test('入队操作应该包含所有必需字段', () => {
      const opId = queue.enqueue({
        type: 'create',
        dataType: 'members',
        dataId: 'MEM001',
        data: { name: '张三' },
        expectedVersion: 1
      });

      const operation = queue.getOperation(opId);
      expect(operation).toBeDefined();
      expect(operation?.id).toBe(opId);
      expect(operation?.type).toBe('create');
      expect(operation?.dataType).toBe('members');
      expect(operation?.dataId).toBe('MEM001');
      expect(operation?.data).toEqual({ name: '张三' });
      expect(operation?.expectedVersion).toBe(1);
      expect(operation?.status).toBe('pending');
      expect(operation?.retryCount).toBe(0);
      expect(operation?.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('应该支持所有操作类型', () => {
      const createOpId = queue.enqueue({
        type: 'create',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '新项目' }
      });

      const updateOpId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '更新项目' }
      });

      const deleteOpId = queue.enqueue({
        type: 'delete',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: null
      });

      expect(queue.getOperation(createOpId)?.type).toBe('create');
      expect(queue.getOperation(updateOpId)?.type).toBe('update');
      expect(queue.getOperation(deleteOpId)?.type).toBe('delete');
    });
  });

  describe('获取操作', () => {
    test('应该能够获取已入队的操作', () => {
      const opId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      const operation = queue.getOperation(opId);
      expect(operation).toBeDefined();
      expect(operation?.id).toBe(opId);
    });

    test('获取不存在的操作应该返回 undefined', () => {
      const operation = queue.getOperation('non_existent_id');
      expect(operation).toBeUndefined();
    });
  });

  describe('获取待发送操作', () => {
    test('应该按时间顺序返回待发送操作', () => {
      // 入队三个操作
      queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '项目1' }
      });

      // 等待一小段时间确保时间戳不同
      const start = Date.now();
      while (Date.now() - start < 2) {
        // 等待
      }

      queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ002',
        data: { name: '项目2' }
      });

      while (Date.now() - start < 4) {
        // 等待
      }

      queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ003',
        data: { name: '项目3' }
      });

      const pendingOps = queue.getPendingOperations();
      expect(pendingOps).toHaveLength(3);
      // 检查是否按时间顺序排列
      for (let i = 1; i < pendingOps.length; i++) {
        expect(pendingOps[i].timestamp).toBeGreaterThanOrEqual(pendingOps[i - 1].timestamp);
      }
    });

    test('应该只返回 pending 状态的操作', () => {
      const opId1 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '项目1' }
      });

      const opId2 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ002',
        data: { name: '项目2' }
      });

      // 标记第一个为已发送
      queue.markAsSent(opId1);

      const pendingOps = queue.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].id).toBe(opId2);
    });
  });

  describe('标记操作状态', () => {
    test('应该能够标记操作为已发送', () => {
      const opId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      queue.markAsSent(opId);

      const operation = queue.getOperation(opId);
      expect(operation?.status).toBe('sent');
    });

    test('标记不存在的操作不应该报错', () => {
      expect(() => {
        queue.markAsSent('non_existent_id');
      }).not.toThrow();
    });
  });

  describe('处理服务器响应', () => {
    test('成功响应应该标记操作为已确认', () => {
      const opId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      const response: OperationResult = {
        success: true,
        data: { id: 'PRJ001', name: '测试' },
        version: 2
      };

      queue.handleResponse(opId, response);

      const operation = queue.getOperation(opId);
      expect(operation?.status).toBe('acknowledged');
    });

    test('冲突响应应该标记操作为冲突', () => {
      const opId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      const response: OperationResult = {
        success: false,
        conflict: true,
        data: { name: '服务器数据' }
      };

      queue.handleResponse(opId, response);

      const operation = queue.getOperation(opId);
      expect(operation?.status).toBe('conflict');
    });

    test('失败响应应该增加重试次数', () => {
      const opId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      const response: OperationResult = {
        success: false,
        message: '操作失败'
      };

      queue.handleResponse(opId, response);

      const operation = queue.getOperation(opId);
      expect(operation?.status).toBe('failed');
      expect(operation?.retryCount).toBe(1);
    });

    test('失败响应应该在重试次数未超限时自动重试', (done) => {
      const opId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      const response: OperationResult = {
        success: false,
        message: '操作失败'
      };

      queue.handleResponse(opId, response);

      // 检查是否设置了重试定时器
      expect(mockTimers.length).toBe(1);
      expect(mockTimers[0].timeout).toBe(testConfig.retryDelay);

      // 执行定时器回调
      mockTimers[0].callback();

      const operation = queue.getOperation(opId);
      expect(operation?.status).toBe('pending');
      done();
    });

    test('失败响应在重试次数超限时不应自动重试', () => {
      const opId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      // 模拟达到最大重试次数
      const operation = queue.getOperation(opId);
      if (operation) {
        operation.retryCount = testConfig.maxRetryCount! - 1;
      }

      const response: OperationResult = {
        success: false,
        message: '操作失败'
      };

      mockTimers = []; // 清空之前的定时器
      queue.handleResponse(opId, response);

      // 不应该设置新的重试定时器
      expect(mockTimers.length).toBe(0);

      const updatedOperation = queue.getOperation(opId);
      expect(updatedOperation?.retryCount).toBe(testConfig.maxRetryCount);
    });
  });

  describe('重试操作', () => {
    test('应该能够重试失败或冲突的操作', () => {
      const failedOpId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      const conflictOpId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ002',
        data: { name: '测试2' }
      });

      // 标记为失败和冲突
      const failedOp = queue.getOperation(failedOpId);
      if (failedOp) failedOp.status = 'failed';

      const conflictOp = queue.getOperation(conflictOpId);
      if (conflictOp) conflictOp.status = 'conflict';

      // 重试
      queue.retryOperation(failedOpId);
      queue.retryOperation(conflictOpId);

      expect(queue.getOperation(failedOpId)?.status).toBe('pending');
      expect(queue.getOperation(conflictOpId)?.status).toBe('pending');
    });

    test('重试不存在的操作不应该报错', () => {
      expect(() => {
        queue.retryOperation('non_existent_id');
      }).not.toThrow();
    });
  });

  describe('重试所有失败操作', () => {
    test('应该重试所有未达到最大重试次数的失败操作', () => {
      const opId1 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试1' }
      });

      const opId2 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ002',
        data: { name: '测试2' }
      });

      const opId3 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ003',
        data: { name: '测试3' }
      });

      // 设置不同的重试次数
      const op1 = queue.getOperation(opId1);
      if (op1) {
        op1.status = 'failed';
        op1.retryCount = 1;
      }

      const op2 = queue.getOperation(opId2);
      if (op2) {
        op2.status = 'failed';
        op2.retryCount = testConfig.maxRetryCount!;
      }

      const op3 = queue.getOperation(opId3);
      if (op3) {
        op3.status = 'failed';
        op3.retryCount = 0;
      }

      queue.retryFailedOperations();

      // 只有未达到最大重试次数的操作应该被重试
      expect(queue.getOperation(opId1)?.status).toBe('pending');
      expect(queue.getOperation(opId2)?.status).toBe('failed'); // 已达到最大重试次数
      expect(queue.getOperation(opId3)?.status).toBe('pending');
    });
  });

  describe('删除操作', () => {
    test('应该能够删除操作', () => {
      const opId = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试' }
      });

      expect(queue.getOperation(opId)).toBeDefined();

      queue.deleteOperation(opId);

      expect(queue.getOperation(opId)).toBeUndefined();
    });

    test('删除不存在的操作不应该报错', () => {
      expect(() => {
        queue.deleteOperation('non_existent_id');
      }).not.toThrow();
    });
  });

  describe('队列统计', () => {
    test('应该正确统计队列状态', () => {
      // 入队多个操作
      const opId1 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试1' }
      });

      const opId2 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ002',
        data: { name: '测试2' }
      });

      const opId3 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ003',
        data: { name: '测试3' }
      });

      const opId4 = queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ004',
        data: { name: '测试4' }
      });

      // 设置不同状态
      queue.markAsSent(opId2);

      const op3 = queue.getOperation(opId3);
      if (op3) op3.status = 'failed';

      const op4 = queue.getOperation(opId4);
      if (op4) op4.status = 'conflict';

      const stats = queue.getQueueStats();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(1); // opId1
      expect(stats.sent).toBe(1);    // opId2
      expect(stats.failed).toBe(1);  // opId3
      expect(stats.conflict).toBe(1); // opId4
      expect(stats.acknowledged).toBe(0);
    });
  });

  describe('清空队列', () => {
    test('应该能够清空队列', () => {
      // 入队多个操作
      queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试1' }
      });

      queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ002',
        data: { name: '测试2' }
      });

      queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ003',
        data: { name: '测试3' }
      });

      expect(queue.getQueueStats().total).toBe(3);

      queue.clear();

      expect(queue.getQueueStats().total).toBe(0);
    });
  });

  describe('获取所有操作', () => {
    test('应该返回所有操作', () => {
      queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ001',
        data: { name: '测试1' }
      });

      queue.enqueue({
        type: 'update',
        dataType: 'projects',
        dataId: 'PRJ002',
        data: { name: '测试2' }
      });

      const allOps = queue.getAllOperations();

      expect(allOps).toHaveLength(2);
      expect(allOps.every(op => op instanceof Object)).toBe(true);
    });
  });
});
