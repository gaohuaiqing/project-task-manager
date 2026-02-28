/**
 * WBS 层级管理服务
 *
 * 职责：
 * 1. 管理 WBS 任务的层级结构
 * 2. 处理节点移动时的级联路径更新
 * 3. 检测并发编辑冲突
 * 4. 提供变更通知机制
 * 5. 维护路径缓存
 */

import type { WbsTask } from '@/types/wbs';
import { wsService } from './WebSocketService';

// ================================================================
// 类型定义
// ================================================================

export interface TreeNode {
  /** 节点ID */
  id: string;
  /** 父节点ID */
  parentId: string | null;
  /** 路径（从根到该节点的ID链） */
  path: string;
  /** 层级深度 */
  depth: number;
  /** 子节点数量 */
  childCount: number;
  /** 是否有子孙节点正在被编辑 */
  hasEditingDescendants?: boolean;
}

export interface NodeMoveOperation {
  /** 节点ID */
  nodeId: string;
  /** 新父节点ID */
  newParentId: string | null;
  /** 旧父节点ID */
  oldParentId: string | null;
  /** 操作者ID */
  operatorId: string;
  /** 操作者名 */
  operatorName: string;
  /** 期望版本 */
  expectedVersion?: number;
}

export interface MoveResult {
  /** 是否成功 */
  success: boolean;
  /** 节点ID */
  nodeId: string;
  /** 影响的节点数量 */
  affectedCount: number;
  /** 新的路径 */
  newPath: string;
  /** 消息 */
  message: string;
  /** 是否冲突 */
  conflict?: boolean;
  /** 冲突信息 */
  conflictInfo?: {
    editingUsers: Array<{ userId: string; userName: string; taskId: string }>;
    hasProgressTasks: boolean;
  };
}

export interface PathCache {
  /** 节点路径映射 */
  paths: Map<string, string>;  // nodeId -> path
  /** 子节点映射 */
  children: Map<string, string[]>;  // parentId -> childIds
  /** 最后更新时间 */
  lastUpdate: number;
}

// ================================================================
// WbsHierarchyService 类
// ================================================================

class WbsHierarchyService {
  private pathCache: PathCache = {
    paths: new Map(),
    children: new Map(),
    lastUpdate: Date.now()
  };

  private editingNodes: Set<string> = new Set();

  /**
   * 构建路径缓存
   */
  async buildPathCache(tasks: WbsTask[]): Promise<void> {
    console.log('[WbsHierarchy] 构建路径缓存，任务数量:', tasks.length);

    // 清空缓存
    this.pathCache.paths.clear();
    this.pathCache.children.clear();

    // 按父子关系组织
    const rootNodes: WbsTask[] = [];
    const taskMap = new Map<string, WbsTask>();

    // 构建任务映射
    for (const task of tasks) {
      taskMap.set(task.id, task);
      if (!task.parentId || task.parentId === '0') {
        rootNodes.push(task);
      }
    }

    // 递归构建路径
    for (const root of rootNodes) {
      this.buildNodePath(root, taskMap, '');
    }

    this.pathCache.lastUpdate = Date.now();
    console.log('[WbsHierarchy] 路径缓存构建完成，根节点数:', rootNodes.length);
  }

  /**
   * 递归构建节点路径
   */
  private buildNodePath(
    task: WbsTask,
    taskMap: Map<string, WbsTask>,
    parentPath: string
  ): void {
    const currentPath = parentPath ? `${parentPath}/${task.id}` : task.id;

    // 缓存路径
    this.pathCache.paths.set(task.id, currentPath);

    // 记录父子关系
    if (task.parentId && task.parentId !== '0') {
      if (!this.pathCache.children.has(task.parentId)) {
        this.pathCache.children.set(task.parentId, []);
      }
      this.pathCache.children.get(task.parentId)!.push(task.id);
    }

    // 递归处理子节点
    const children = Array.from(taskMap.values()).filter(t => t.parentId === task.id);
    for (const child of children) {
      this.buildNodePath(child, taskMap, currentPath);
    }
  }

  /**
   * 获取节点的完整路径
   */
  getNodePath(nodeId: string): string | undefined {
    return this.pathCache.paths.get(nodeId);
  }

  /**
   * 获取节点的所有子孙节点ID
   */
  getDescendantIds(nodeId: string): string[] {
    const descendants: string[] = [];
    const children = this.pathCache.children.get(nodeId);

    if (children) {
      for (const childId of children) {
        descendants.push(childId);
        descendants.push(...this.getDescendantIds(childId));
      }
    }

    return descendants;
  }

  /**
   * 计算移动节点的影响范围
   */
  calculateMoveImpact(nodeId: string, newParentId: string | null): {
    affectedNodeIds: string[];
    oldPath: string;
    newPath: string;
    depthChange: number;
  } {
    const oldPath = this.getNodePath(nodeId) || '';
    const descendants = this.getDescendantIds(nodeId);
    const affectedNodeIds = [nodeId, ...descendants];

    // 计算新路径
    let newPath: string;
    if (newParentId) {
      const parentPath = this.getNodePath(newParentId) || '';
      newPath = `${parentPath}/${nodeId}`;
    } else {
      newPath = nodeId; // 成为根节点
    }

    // 计算深度变化
    const oldDepth = oldPath.split('/').length;
    const newDepth = newPath.split('/').length;
    const depthChange = newDepth - oldDepth;

    return {
      affectedNodeIds,
      oldPath,
      newPath,
      depthChange
    };
  }

  /**
   * 检测移动冲突
   */
  async detectMoveConflicts(nodeId: string): Promise<{
    hasEditingDescendants: boolean;
    editingUsers: Array<{ userId: string; userName: string; taskId: string }>;
    hasProgressTasks: boolean;
  }> {
    const descendants = this.getDescendantIds(nodeId);

    // TODO: 实际应用中应该从数据库或状态管理器获取这些信息
    // 这里简化处理，使用已注册的编辑节点
    const editingUsers: Array<{ userId: string; userName: string; taskId: string }> = [];
    const editingDescendants = descendants.filter(id => this.editingNodes.has(id));

    // TODO: 检查是否有进行中的任务
    const hasProgressTasks = false; // 需要从任务数据中检查

    return {
      hasEditingDescendants: editingDescendants.length > 0,
      editingUsers,
      hasProgressTasks
    };
  }

  /**
   * 注册编辑节点
   */
  registerEditingNode(nodeId: string): () => void {
    this.editingNodes.add(nodeId);
    console.log('[WbsHierarchy] 节点开始编辑:', nodeId);

    // 返回取消注册函数
    return () => {
      this.editingNodes.delete(nodeId);
      console.log('[WbsHierarchy] 节点停止编辑:', nodeId);
    };
  }

  /**
   * 执行节点移动（带事务）
   */
  async moveNode(operation: NodeMoveOperation): Promise<MoveResult> {
    console.log('[WbsHierarchy] 开始移动节点:', operation.nodeId, '→', operation.newParentId);

    // 1. 计算影响范围
    const impact = this.calculateMoveImpact(operation.nodeId, operation.newParentId);
    console.log('[WbsHierarchy] 影响节点数:', impact.affectedNodeIds.length);

    // 2. 检测冲突
    const conflicts = await this.detectMoveConflicts(operation.nodeId);
    if (conflicts.hasEditingDescendants || conflicts.hasProgressTasks || conflicts.editingUsers.length > 0) {
      console.warn('[WbsHierarchy] 检测到移动冲突:', conflicts);

      return {
        success: false,
        nodeId: operation.nodeId,
        affectedCount: 0,
        newPath: impact.oldPath,
        message: '节点移动被阻止：子节点有正在编辑或已进度的任务',
        conflict: true,
        conflictInfo: {
          editingUsers: conflicts.editingUsers,
          hasProgressTasks: conflicts.hasProgressTasks
        }
      };
    }

    // 3. 执行移动（通过 WebSocket 发送到服务器）
    try {
      const response = await wsService.request({
        type: 'wbs_move_node',
        data: {
          nodeId: operation.nodeId,
          newParentId: operation.newParentId,
          oldParentId: operation.oldParentId,
          affectedNodeIds: impact.affectedNodeIds,
          oldPath: impact.oldPath,
          newPath: impact.newPath,
          operatorId: operation.operatorId,
          operatorName: operation.operatorName,
          expectedVersion: operation.expectedVersion
        }
      });

      if (response.success) {
        // 4. 更新本地缓存
        for (const nodeId of impact.affectedNodeIds) {
          // 更新路径
          const oldPath = this.getNodePath(nodeId);
          if (oldPath) {
            const relativePath = oldPath.slice(impact.oldPath.length);
            const newPath = impact.newPath + relativePath;
            this.pathCache.paths.set(nodeId, newPath);
          }
        }

        // 更新父子关系
        if (operation.oldParentId) {
          const siblings = this.pathCache.children.get(operation.oldParentId) || [];
          const index = siblings.indexOf(operation.nodeId);
          if (index > -1) {
            siblings.splice(index, 1);
          }
        }

        if (operation.newParentId) {
          if (!this.pathCache.children.has(operation.newParentId)) {
            this.pathCache.children.set(operation.newParentId, []);
          }
          this.pathCache.children.get(operation.newParentId)!.push(operation.nodeId);
        }

        // 5. 广播变更通知
        this.broadcastNodeChange(operation.nodeId, {
          type: 'move',
          oldPath: impact.oldPath,
          newPath: impact.newPath,
          affectedNodeIds: impact.affectedNodeIds,
          operator: operation.operatorName
        });

        console.log('[WbsHierarchy] 节点移动成功:', operation.nodeId);

        return {
          success: true,
          nodeId: operation.nodeId,
          affectedCount: impact.affectedNodeIds.length,
          newPath: impact.newPath,
          message: `成功移动节点及其 ${impact.affectedNodeIds.length - 1} 个子节点`
        };
      } else if (response.conflict) {
        // 版本冲突
        return {
          success: false,
          nodeId: operation.nodeId,
          affectedCount: 0,
          newPath: impact.oldPath,
          message: response.message || '节点移动冲突',
          conflict: true
        };
      } else {
        return {
          success: false,
          nodeId: operation.nodeId,
          affectedCount: 0,
          newPath: impact.oldPath,
          message: response.message || '节点移动失败'
        };
      }
    } catch (error) {
      console.error('[WbsHierarchy] 移动节点失败:', error);
      return {
        success: false,
        nodeId: operation.nodeId,
        affectedCount: 0,
        newPath: impact.oldPath,
        message: error instanceof Error ? error.message : '节点移动失败'
      };
    }
  }

  /**
   * 广播节点变更
   */
  private broadcastNodeChange(nodeId: string, change: {
    type: 'move' | 'update' | 'delete';
    oldPath?: string;
    newPath?: string;
    affectedNodeIds?: string[];
    operator?: string;
  }): void {
    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('wbs-node-changed', {
      detail: {
        nodeId,
        ...change,
        timestamp: Date.now()
      }
    }));

    // 通过 WebSocket 广播
    if (wsService.isConnected()) {
      wsService.send({
        type: 'wbs_node_change',
        data: {
          nodeId,
          change
        }
      });
    }
  }

  /**
   * 获取缓存状态
   */
  getCacheStats(): {
    nodeCount: number;
    relationshipCount: number;
    lastUpdate: number;
    editingNodeCount: number;
  } {
    return {
      nodeCount: this.pathCache.paths.size,
      relationshipCount: Array.from(this.pathCache.children.values())
        .reduce((sum, children) => sum + children.length, 0),
      lastUpdate: this.pathCache.lastUpdate,
      editingNodeCount: this.editingNodes.size
    };
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.pathCache.paths.clear();
    this.pathCache.children.clear();
    this.editingNodes.clear();
    this.pathCache.lastUpdate = Date.now();
    console.log('[WbsHierarchy] 缓存已清空');
  }
}

// ================================================================
// 导出单例
// ================================================================

export const wbsHierarchyService = new WbsHierarchyService();

// 为了向后兼容，同时导出类
export { WbsHierarchyService };
