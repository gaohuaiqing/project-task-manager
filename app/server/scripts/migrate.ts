/**
 * 数据库迁移脚本
 *
 * 使用方法：
 * npm run migrate:status     - 查看迁移状态
 * npm run migrate:up         - 执行所有待执行的迁移
 * npm run migrate:down       - 回滚最新的迁移
 */

import { showMigrationStatus, runAllPendingMigrations, rollbackLatestMigration } from '../src/migrations/migration-manager.js';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'status':
        await showMigrationStatus();
        break;

      case 'up':
        const success = await runAllPendingMigrations();
        process.exit(success ? 0 : 1);
        break;

      case 'down':
        await rollbackLatestMigration();
        break;

      default:
        console.log(`
使用方法:
  npm run migrate:status     查看迁移状态
  npm run migrate:up         执行所有待执行的迁移
  npm run migrate:down       回滚最新的迁移

示例:
  npm run migrate:status
  npm run migrate:up
  npm run migrate:down
        `);
    }
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

main();
