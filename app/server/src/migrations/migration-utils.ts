/**
 * 数据库迁移工具函数
 *
 * 提供统一的迁移执行逻辑，避免重复代码
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import { databaseService } from '../services/DatabaseService.js';
import { logger } from '../core/logger.js';

/** 迁移配置 */
interface MigrationConfig {
  version: string;
  name: string;
}

/** 创建迁移执行器 */
export function createMigrationRunner(config: MigrationConfig) {
  const { version, name } = config;

  /** 检查迁移是否已执行 */
  async function checkMigrationExecuted(): Promise<boolean> {
    try {
      const result = (await databaseService.query(
        'SELECT 1 FROM migrations WHERE version = ?',
        [version]
      )) as unknown[];
      return result && result.length > 0;
    } catch {
      return false;
    }
  }

  /** 记录迁移执行 */
  async function recordMigration(): Promise<void> {
    await databaseService.query(
      'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
      [name, version]
    );
  }

  /** 执行迁移（统一接口） */
  async function runMigration(up: () => Promise<void>): Promise<boolean> {
    try {
      // 确保 DatabaseService 已初始化
      if (!databaseService['pool']) {
        await databaseService.init();
      }

      // 检查是否已执行
      if (await checkMigrationExecuted()) {
        logger.info('[Migration %s] 已执行，跳过', version);
        return true;
      }

      logger.info('[Migration %s] 开始执行: %s', version, name);

      await up();
      await recordMigration();

      logger.info('[Migration %s] 完成', version);
      return true;
    } catch (error) {
      logger.error('[Migration %s] 失败: %s', version, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** 直接执行迁移脚本 */
  function runDirect(up: () => Promise<void>): void {
    if (import.meta.url === `file://${process.argv[1]}`) {
      (async () => {
        try {
          await databaseService.init();
          await up();
          logger.info('[Migration %s] 完成', version);
          process.exit(0);
        } catch (error) {
          logger.error('[Migration %s] 失败: %s', version, error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      })();
    }
  }

  return {
    version,
    name,
    checkMigrationExecuted,
    recordMigration,
    runMigration,
    runDirect
  };
}
