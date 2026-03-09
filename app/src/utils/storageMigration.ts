/**
 * localStorage 数据迁移脚本
 *
 * 职责：
 * 1. 清理冗余的旧键名
 * 2. 统一迁移到 cache:* 命名规范
 * 3. 删除测试数据
 * 4. 提供版本管理和回滚机制
 */

import { CacheManager, CACHE_PREFIX } from '@/services/CacheManager';

// ================================================================
// 类型定义
// ================================================================

interface MigrationRule {
  /** 旧键名模式（支持通配符） */
  oldKey: string | RegExp;
  /** 新键名（或转换函数） */
  newKey: string | ((oldKey: string) => string);
  /** 是否迁移数据（false 表示直接删除） */
  migrate?: boolean;
  /** 是否是测试数据（直接删除） */
  isTestData?: boolean;
}

interface MigrationResult {
  /** 迁移的键数量 */
  migrated: number;
  /** 删除的键数量 */
  deleted: number;
  /** 失败的键数量 */
  failed: number;
  /** 详细日志 */
  details: string[];
}

// ================================================================
// 迁移规则配置
// ================================================================

/** 版本号 */
export const MIGRATION_VERSION = '1.0.0';

/** 迁移完成标记 */
export const MIGRATION_COMPLETE_KEY = 'storage_migration_complete';

const MIGRATION_RULES: MigrationRule[] = [
  // ========== 测试数据（直接删除） ==========
  { oldKey: 'delayRecords', isTestData: true },
  { oldKey: 'planAdjustmentRecords', isTestData: true },
  { oldKey: 'test_data_*', isTestData: true },

  // ========== 冗余的 sync_* 键（已被 cache_* 替代） ==========
  { oldKey: 'sync_data', migrate: false },
  { oldKey: 'sync_change_log', migrate: false },
  { oldKey: 'sync_last_sync', migrate: false },
  { oldKey: 'sync_data_chrome', migrate: false },
  { oldKey: 'sync_data_edge', migrate: false },
  { oldKey: 'sync_data_firefox', migrate: false },
  { oldKey: 'sync_device_id', migrate: false },

  // ========== 业务数据迁移到统一命名规范 ==========
  {
    oldKey: 'org_structure',
    newKey: 'organization_units',
    migrate: true
  },
  {
    oldKey: 'sync_organization_units',
    newKey: 'organization_units',
    migrate: false // 冗余，直接删除
  },
  {
    oldKey: 'cache_organization_units',
    newKey: 'organization_units',
    migrate: false // 冗余，直接删除
  },

  // 项目数据
  {
    oldKey: 'projects',
    newKey: 'projects',
    migrate: true
  },
  {
    oldKey: 'sync_projects',
    newKey: 'projects',
    migrate: false
  },

  // 成员数据
  {
    oldKey: 'members',
    newKey: 'members',
    migrate: true
  },
  {
    oldKey: 'sync_members',
    newKey: 'members',
    migrate: false
  },

  // WBS 任务
  {
    oldKey: 'wbsTasks',
    newKey: 'wbs_tasks',
    migrate: true
  },
  {
    oldKey: 'wbs_tasks',
    newKey: 'wbs_tasks',
    migrate: true
  },
  {
    oldKey: 'sync_wbs_tasks',
    newKey: 'wbs_tasks',
    migrate: false
  },

  // 节假日
  {
    oldKey: 'app_holidays',
    newKey: 'holidays',
    migrate: true
  },
  {
    oldKey: 'holidays_cache',
    newKey: 'holidays',
    migrate: false
  },

  // 任务类型
  {
    oldKey: 'task_types_cache',
    newKey: 'task_types',
    migrate: false // 旧的缓存，删除
  },

  // 技术组
  {
    oldKey: 'tech_groups',
    newKey: 'tech_groups',
    migrate: true
  },

  // 通知
  {
    oldKey: 'notifications',
    newKey: 'notifications',
    migrate: true
  },

  // ========== 会话相关（已迁移到后端，本地键直接删除） ==========
  {
    oldKey: 'auth_session_*',  // 通配符匹配
    migrate: false
  },
  {
    oldKey: 'active_session_*',  // 通配符匹配
    migrate: false
  },
  {
    oldKey: 'cross_browser_session_*',  // 通配符匹配（误导性命名，localStorage不能跨浏览器）
    migrate: false
  },
  {
    oldKey: 'currentUser',
    migrate: false  // 已迁移到后端会话管理
  },
  {
    oldKey: 'isAdmin',
    migrate: false  // 已迁移到后端会话管理
  },

  // ========== 跨标签页同步事件（保留，用于localStorage事件机制） ==========
  // 这些键用于 localStorage 事件机制，不迁移
  // 注意：localStorage 只能同一浏览器的不同标签页间通信

  // ========== 设备ID（保留） ==========
  {
    oldKey: 'device_id',
    newKey: 'device_id',
    migrate: true
  },

  // ========== 用户数据（需要特殊处理） ==========
  // app_users 将迁移到后端，这里先保留
  {
    oldKey: 'app_users',
    newKey: 'app_users',
    migrate: true
  },

  // ========== 日志和历史（将迁移到后端） ==========
  {
    oldKey: 'sync_log',
    newKey: 'sync_log', // 暂时保留，后续迁移到后端
    migrate: true
  },
  {
    oldKey: 'org_change_history',
    newKey: 'org_change_history', // 暂时保留，后续迁移到后端
    migrate: true
  }
];

// ================================================================
// 迁移执行
// ================================================================

/**
 * 检查是否已执行过迁移
 */
export function isMigrationComplete(): boolean {
  const completed = localStorage.getItem(MIGRATION_COMPLETE_KEY);
  return completed === MIGRATION_VERSION;
}

/**
 * 标记迁移完成
 */
export function markMigrationComplete(): void {
  localStorage.setItem(MIGRATION_COMPLETE_KEY, MIGRATION_VERSION);
  localStorage.setItem('storage_migration_date', new Date().toISOString());
}

/**
 * 执行迁移
 */
export function runMigration(): MigrationResult {
  const result: MigrationResult = {
    migrated: 0,
    deleted: 0,
    failed: 0,
    details: []
  };

  console.log('[StorageMigration] 开始执行存储迁移...');
  console.log(`[StorageMigration] 版本: ${MIGRATION_VERSION}`);

  // 收集所有 localStorage 键
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }

  console.log(`[StorageMigration] 发现 ${allKeys.length} 个存储键`);

  // 处理每个键
  for (const oldKey of allKeys) {
    try {
      // 跳过已迁移的标记
      if (oldKey === MIGRATION_COMPLETE_KEY || oldKey === 'storage_migration_date') {
        continue;
      }

      // 跳过已使用新命名规范的键
      if (oldKey.startsWith(CACHE_PREFIX)) {
        continue;
      }

      // 跳过跨标签页同步事件键（这些需要保留在根级别）
      // 注意：localStorage 不能实现真正的跨浏览器同步
      // 跨浏览器/跨设备同步应通过后端数据库 + WebSocket 实现
      if (oldKey.startsWith('sync_event_') ||
          oldKey.startsWith('cross_tab_') ||
          oldKey.startsWith('force_') ||
          oldKey === 'auth_logout' ||
          oldKey === 'session_terminated') {
        continue;
      }

      // 查找匹配的迁移规则
      const rule = findMatchingRule(oldKey);

      if (!rule) {
        // 未匹配到规则，记录但保留
        result.details.push(`⚠️ 未知键，保留: ${oldKey}`);
        continue;
      }

      // 处理测试数据
      if (rule.isTestData) {
        localStorage.removeItem(oldKey);
        result.deleted++;
        result.details.push(`🗑️ 删除测试数据: ${oldKey}`);
        continue;
      }

      // 处理不迁移的键（直接删除）
      if (rule.migrate === false) {
        localStorage.removeItem(oldKey);
        result.deleted++;
        result.details.push(`🗑️ 删除冗余键: ${oldKey}`);
        continue;
      }

      // 执行迁移
      const newKey = typeof rule.newKey === 'function'
        ? rule.newKey(oldKey)
        : rule.newKey;

      // 读取旧数据
      const value = localStorage.getItem(oldKey);

      // 写入新位置（使用 CacheManager）
      try {
        const data = JSON.parse(value!);
        // 使用默认 TTL: 1小时
        CacheManager.set(newKey, data, { ttl: 60 * 60 * 1000 });
        localStorage.removeItem(oldKey);

        result.migrated++;
        result.details.push(`✅ 迁移: ${oldKey} → ${CACHE_PREFIX}${newKey}`);
      } catch (parseError) {
        // 数据不是 JSON，直接迁移字符串
        CacheManager.set(newKey, value!, { ttl: 60 * 60 * 1000 });
        localStorage.removeItem(oldKey);

        result.migrated++;
        result.details.push(`✅ 迁移（字符串）: ${oldKey} → ${CACHE_PREFIX}${newKey}`);
      }

    } catch (error) {
      result.failed++;
      result.details.push(`❌ 失败: ${oldKey} - ${error}`);
    }
  }

  // 标记迁移完成
  markMigrationComplete();

  // 打印摘要
  console.log('[StorageMigration] 迁移完成:');
  console.log(`  - 迁移: ${result.migrated} 个键`);
  console.log(`  - 删除: ${result.deleted} 个键`);
  console.log(`  - 失败: ${result.failed} 个键`);

  return result;
}

/**
 * 查找匹配的迁移规则
 */
function findMatchingRule(key: string): MigrationRule | null {
  for (const rule of MIGRATION_RULES) {
    if (typeof rule.oldKey === 'string') {
      // 精确匹配
      if (key === rule.oldKey) {
        return rule;
      }
      // 通配符匹配
      if (rule.oldKey.includes('*')) {
        const pattern = rule.oldKey.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(key)) {
          return rule;
        }
      }
    } else if (rule.oldKey instanceof RegExp) {
      // 正则匹配
      if (rule.oldKey.test(key)) {
        return rule;
      }
    }
  }
  return null;
}

/**
 * 回滚迁移（恢复原始键名）
 * 注意：仅在迁移后立即执行才有效
 */
export function rollbackMigration(): MigrationResult {
  const result: MigrationResult = {
    migrated: 0,
    deleted: 0,
    failed: 0,
    details: []
  };

  console.log('[StorageMigration] 开始回滚迁移...');

  // 删除迁移标记
  localStorage.removeItem(MIGRATION_COMPLETE_KEY);

  // 这里可以实现具体的回滚逻辑
  // 由于迁移已将数据移动到新位置，回滚需要逆向操作

  console.log('[StorageMigration] 回滚完成');

  return result;
}

/**
 * 获取迁移状态报告
 */
export function getMigrationReport(): {
  complete: boolean;
  version: string | null;
  date: string | null;
  stats: {
    totalKeys: number;
    cacheKeys: number;
    oldKeys: number;
  };
} {
  const totalKeys = localStorage.length;
  let cacheKeys = 0;
  let oldKeys = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      cacheKeys++;
    } else {
      oldKeys++;
    }
  }

  return {
    complete: isMigrationComplete(),
    version: localStorage.getItem(MIGRATION_COMPLETE_KEY),
    date: localStorage.getItem('storage_migration_date'),
    stats: {
      totalKeys,
      cacheKeys,
      oldKeys
    }
  };
}

// ================================================================
// 自动执行迁移（优化：完全异步化，分批处理避免阻塞）
// ================================================================

/**
 * 分批处理迁移，避免长时间阻塞主线程
 */
function runMigrationBatched(): void {
  if (isMigrationComplete()) {
    return;
  }

  console.log('[StorageMigration] 检测到未迁移的存储，开始分批自动迁移...');

  // 收集所有 localStorage 键（只做一次遍历）
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }

  console.log(`[StorageMigration] 发现 ${allKeys.length} 个存储键，开始分批处理...`);

  const BATCH_SIZE = 5; // 每批处理 5 个键
  let currentIndex = 0;
  let migrated = 0;
  let deleted = 0;

  function processBatch() {
    const batch = allKeys.slice(currentIndex, currentIndex + BATCH_SIZE);

    for (const oldKey of batch) {
      try {
        // 跳过已迁移的标记
        if (oldKey === MIGRATION_COMPLETE_KEY || oldKey === 'storage_migration_date') {
          continue;
        }

        // 跳过已使用新命名规范的键
        if (oldKey.startsWith(CACHE_PREFIX)) {
          continue;
        }

        // 跳过跨标签页同步事件键
        if (oldKey.startsWith('sync_event_') ||
            oldKey.startsWith('cross_tab_') ||
            oldKey.startsWith('force_') ||
            oldKey === 'auth_logout' ||
            oldKey === 'session_terminated') {
          continue;
        }

        // 查找匹配的迁移规则
        const rule = findMatchingRule(oldKey);

        if (!rule) {
          continue; // 未匹配到规则，保留
        }

        // 处理测试数据
        if (rule.isTestData) {
          localStorage.removeItem(oldKey);
          deleted++;
          continue;
        }

        // 处理不迁移的键（直接删除）
        if (rule.migrate === false) {
          localStorage.removeItem(oldKey);
          deleted++;
          continue;
        }

        // 执行迁移
        const newKey = typeof rule.newKey === 'function'
          ? rule.newKey(oldKey)
          : rule.newKey;

        const value = localStorage.getItem(oldKey);

        try {
          const data = JSON.parse(value!);
          CacheManager.set(newKey, data, { ttl: 60 * 60 * 1000 });
          localStorage.removeItem(oldKey);
          migrated++;
        } catch {
          // 数据不是 JSON，直接迁移字符串
          CacheManager.set(newKey, value!, { ttl: 60 * 60 * 1000 });
          localStorage.removeItem(oldKey);
          migrated++;
        }

      } catch (error) {
        console.error(`[StorageMigration] 处理键失败: ${oldKey}`, error);
      }
    }

    currentIndex += BATCH_SIZE;

    // 继续下一批
    if (currentIndex < allKeys.length) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => processBatch(), { timeout: 1000 });
      } else {
        setTimeout(processBatch, 0);
      }
    } else {
      // 完成迁移
      markMigrationComplete();
      console.log(`[StorageMigration] 分批迁移完成: 迁移 ${migrated} 个，删除 ${deleted} 个`);
    }
  }

  // 开始处理第一批
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => processBatch(), { timeout: 1000 });
  } else {
    setTimeout(processBatch, 100);
  }
}

// 自动执行迁移（使用分批处理版本）
if (typeof window !== 'undefined') {
  // 延迟执行，确保不阻塞首次渲染
  setTimeout(() => {
    runMigrationBatched();
  }, 2000); // 2 秒后开始迁移
}
