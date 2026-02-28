/**
 * 任务分配队列服务
 *
 * 职责：
 * 1. 实现任务分配的原子性操作
 * 2. 防止多人同时分配同一个任务
 * 3. 使用乐观锁 + 版本控制确保一致性
 * 4. 提供分配历史和状态追踪
 */

import { wsService } from './WebSocketService';
import { conflictManager } from './ConflictManager';

// ================================================================
// 类型定义
// ================================================================

export interface TaskAssignmentRequest {
  /** 任务ID */
  taskId: string;
  /** 任务类型（project/task/wbs_task） */
  taskType: 'project' | 'task' | 'wbs_task';
  /** 分配给（用户ID） */
  assignTo: string;
  /** 分配给（用户名） */
  assignToName?: string;
  /** 操作者ID */
  operatorId: string;
  /** 操作者名 */
  operatorName: string;
  /** 期望版本（用于乐观锁） */
  expectedVersion?: number;
  /** 备注 */
  notes?: string;
}

export interface AssignmentResult {
  /** 是否成功 */
  success: boolean;
  /** 任务ID */
  taskId: string;
  /** 分配ID */
  assignmentId: string;
  /** 当前版本 */
  version: number;
  /** 消息 */
  message: string;
  /** 是否冲突 */
  conflict?: boolean;
  /** 服务器数据（冲突时） */
  serverData?: any;
}

export interface AssignmentStatus {
  /** 分配ID */
  assignmentId: string;
  /** 任务ID */
  taskId: string;
  /** 状态 */
  status: 'pending' | 'assigned' | 'conflict' | 'failed';
  /** 当前分配给 */
  assignedTo?: string;
  /** 创建时间 */
  createdAt: number;
  /** 完成时间 */
  completedAt?: number;
}

// ================================================================
// TaskAssignQueue 类
// ================================================================

class TaskAssignQueue {
  private pendingAssignments: Map<string, AssignmentStatus> = new Map();
  private assignmentHistory: AssignmentStatus[] = [];
  private maxHistorySize = 100;

  /**
   * 分配任务（原子操作）
   */
  async assignTask(request: TaskAssignmentRequest): Promise<AssignmentResult> {
    const assignmentId = `assign_${request.taskId}_${Date.now()}`;

    // 1. 检查是否有正在进行的相同任务分配
    const existing = this.findPendingAssignment(request.taskId);
    if (existing) {
      return {
        success: false,
        taskId: request.taskId,
        assignmentId: existing.assignmentId,
        version: 0,
        message: `任务 ${request.taskId} 正在被分配中，请稍后再试`,
        conflict: true
      };
    }

    // 2. 创建分配状态
    const status: AssignmentStatus = {
      assignmentId,
      taskId: request.taskId,
      status: 'pending',
      createdAt: Date.now()
    };
    this.pendingAssignments.set(request.taskId, status);

    try {
      // 3. 发送分配请求到服务器
      const response = await wsService.request({
        type: 'task_assign',  // 新的消息类型
        data: {
          assignmentId,
          taskType: request.taskType,
          taskId: request.taskId,
          assignTo: request.assignTo,
          assignToName: request.assignToName,
          operatorId: request.operatorId,
          operatorName: request.operatorName,
          expectedVersion: request.expectedVersion,
          notes: request.notes
        }
      });

      // 4. 处理响应
      if (response.success) {
        // 分配成功
        status.status = 'assigned';
        status.assignedTo = request.assignTo;
        status.completedAt = Date.now();

        // 移除待处理，添加到历史
        this.pendingAssignments.delete(request.taskId);
        this.addToHistory(status);

        return {
          success: true,
          taskId: request.taskId,
          assignmentId,
          version: response.version,
          message: response.message || '任务分配成功'
        };
      } else if (response.conflict) {
        // 版本冲突
        status.status = 'conflict';
        status.completedAt = Date.now();

        this.pendingAssignments.delete(request.taskId);
        this.addToHistory(status);

        // 添加到冲突管理器
        conflictManager.addConflict({
          dataType: `${request.taskType}s`,
          dataId: request.taskId,
          message: `任务分配冲突：${response.message}`,
          localData: { assignTo: request.assignTo },
          serverData: response.serverData,
          serverVersion: response.version
        });

        return {
          success: false,
          taskId: request.taskId,
          assignmentId,
          version: response.version || 0,
          message: response.message || '任务分配冲突',
          conflict: true,
          serverData: response.serverData
        };
      } else {
        // 其他错误
        status.status = 'failed';
        status.completedAt = Date.now();

        this.pendingAssignments.delete(request.taskId);
        this.addToHistory(status);

        return {
          success: false,
          taskId: request.taskId,
          assignmentId,
          version: 0,
          message: response.message || '任务分配失败'
        };
      }
    } catch (error) {
      // 请求失败
      status.status = 'failed';
      status.completedAt = Date.now();

      this.pendingAssignments.delete(request.taskId);
      this.addToHistory(status);

      return {
        success: false,
        taskId: request.taskId,
        assignmentId,
        version: 0,
        message: error instanceof Error ? error.message : '任务分配失败'
      };
    }
  }

  /**
   * 批量分配任务
   */
  async assignTasks(requests: TaskAssignmentRequest[]): Promise<AssignmentResult[]> {
    // 串行执行，确保顺序
    const results: AssignmentResult[] = [];

    for (const request of requests) {
      const result = await this.assignTask(request);
      results.push(result);

      // 如果分配失败，询问是否继续
      if (!result.success && !result.conflict) {
        console.warn(`[TaskAssignQueue] 任务 ${request.taskId} 分配失败，停止批量分配`);
        break;
      }
    }

    return results;
  }

  /**
   * 取消分配
   */
  cancelAssignment(taskId: string): boolean {
    const status = this.pendingAssignments.get(taskId);
    if (status && status.status === 'pending') {
      status.status = 'failed';
      status.completedAt = Date.now();

      this.pendingAssignments.delete(taskId);
      this.addToHistory(status);

      return true;
    }
    return false;
  }

  /**
   * 获取分配状态
   */
  getAssignmentStatus(taskId: string): AssignmentStatus | undefined {
    return this.pendingAssignments.get(taskId);
  }

  /**
   * 获取所有待处理分配
   */
  getPendingAssignments(): AssignmentStatus[] {
    return Array.from(this.pendingAssignments.values());
  }

  /**
   * 获取分配历史
   */
  getAssignmentHistory(limit?: number): AssignmentStatus[] {
    if (limit) {
      return this.assignmentHistory.slice(-limit);
    }
    return [...this.assignmentHistory];
  }

  /**
   * 清理已完成的历史记录
   */
  cleanHistory(beforeTime?: number): number {
    const cutoffTime = beforeTime || Date.now() - 24 * 60 * 60 * 1000; // 默认24小时

    const beforeLength = this.assignmentHistory.length;
    this.assignmentHistory = this.assignmentHistory.filter(
      s => s.completedAt && s.completedAt > cutoffTime
    );

    const cleaned = beforeLength - this.assignmentHistory.length;
    if (cleaned > 0) {
      console.log(`[TaskAssignQueue] 清理了 ${cleaned} 条历史记录`);
    }

    return cleaned;
  }

  /**
   * 查找正在进行的分配
   */
  private findPendingAssignment(taskId: string): AssignmentStatus | undefined {
    return this.pendingAssignments.get(taskId);
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(status: AssignmentStatus): void {
    this.assignmentHistory.push(status);

    // 限制历史记录大小
    if (this.assignmentHistory.length > this.maxHistorySize) {
      this.assignmentHistory.shift();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    pending: number;
    assigned: number;
    conflict: number;
    failed: number;
    totalHistory: number;
  } {
    const pending = Array.from(this.pendingAssignments.values());

    return {
      pending: pending.filter(s => s.status === 'pending').length,
      assigned: this.assignmentHistory.filter(s => s.status === 'assigned').length,
      conflict: this.assignmentHistory.filter(s => s.status === 'conflict').length,
      failed: this.assignmentHistory.filter(s => s.status === 'failed').length,
      totalHistory: this.assignmentHistory.length
    };
  }
}

// ================================================================
// 导出单例
// ================================================================

export const taskAssignQueue = new TaskAssignQueue();

// 为了向后兼容，同时导出类
export { TaskAssignQueue };
