/**
 * 数据库迁移管理工具
 *
 * 用途：
 * - 手动执行迁移
 * - 回滚迁移
 * - 查看迁移状态
 *
 * 使用方法：
 * npm run migration:status    # 查看迁移状态
 * npm run migration:up        # 执行所有待执行的迁移
 * npm run migration:rollback  # 回滚最新的迁移
 */

import { databaseService } from '../services/DatabaseService.js';

interface MigrationInfo {
  version: string;
  name: string;
  executed_at: Date | null;
  status: 'pending' | 'executed' | 'failed';
}

/**
 * 获取所有迁移信息
 */
export async function getMigrationsStatus(): Promise<MigrationInfo[]> {
  try {
    // 确保数据库连接
    if (!databaseService['pool']) {
      await databaseService.init();
    }

    // 检查 migrations 表是否存在
    const tables = await databaseService.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'migrations'
    `) as any[];

    if (tables.length === 0) {
      console.log('⚠️ migrations 表不存在，创建中...');
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(10) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_version (version)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ migrations 表创建成功');
    }

    // 定义所有迁移
    const allMigrations = [
      { version: '001', name: 'initial_schema' },
      { version: '002', name: 'add_project_tables' },
      { version: '003', name: 'unify_users_members' },
      { version: '004', name: 'add_missing_fields' },
      { version: '023', name: 'create_plan_changes_table' },
      { version: '024', name: 'create_delay_records_table' },
    ];

    // 获取已执行的迁移
    const executedMigrations = await databaseService.query(`
      SELECT version, name, executed_at FROM migrations ORDER BY version
    `) as any[];

    const executedMap = new Map(
      executedMigrations.map(m => [m.version, m])
    );

    // 构建迁移状态
    return allMigrations.map(m => ({
      version: m.version,
      name: m.name,
      executed_at: executedMap.get(m.version)?.executed_at || null,
      status: executedMap.has(m.version) ? 'executed' : 'pending',
    }));
  } catch (error) {
    console.error('❌ 获取迁移状态失败:', error);
    throw error;
  }
}

/**
 * 显示迁移状态
 */
export async function showMigrationStatus(): Promise<void> {
  try {
    const migrations = await getMigrationsStatus();

    console.log('\n📊 数据库迁移状态');
    console.log('=' .repeat(70));

    if (migrations.length === 0) {
      console.log('没有找到迁移记录');
      return;
    }

    migrations.forEach(m => {
      const icon = m.status === 'executed' ? '✅' : m.status === 'pending' ? '⏳' : '❌';
      const date = m.executed_at ? new Date(m.executed_at).toLocaleString('zh-CN') : '未执行';
      console.log(`${icon} ${m.version} | ${m.name.padEnd(30)} | ${date}`);
    });

    console.log('=' .repeat(70));

    const executed = migrations.filter(m => m.status === 'executed').length;
    const pending = migrations.filter(m => m.status === 'pending').length;

    console.log(`总计: ${migrations.length} | 已执行: ${executed} | 待执行: ${pending}`);
  } catch (error) {
    console.error('❌ 显示迁移状态失败:', error);
  }
}

/**
 * 执行所有待执行的迁移
 */
export async function runAllPendingMigrations(): Promise<boolean> {
  try {
    console.log('\n🚀 开始执行待执行的数据库迁移...');

    // 导入迁移函数
    const { runPendingMigrations: runAllMigrations } = await import('./run-migration.js');

    // 执行迁移（runAllMigrations 会按顺序执行 002, 003, 004）
    await runAllMigrations();

    console.log('✅ 所有待执行的迁移已完成');

    // 显示更新后的状态
    await showMigrationStatus();

    return true;
  } catch (error) {
    console.error('❌ 执行迁移失败:', error);
    return false;
  }
}

/**
 * 回滚最新的迁移
 */
export async function rollbackLatestMigration(): Promise<boolean> {
  try {
    console.log('\n🔄 开始回滚最新的数据库迁移...');

    // 获取已执行的最新迁移
    const migrations = await getMigrationsStatus();
    const executedMigrations = migrations
      .filter(m => m.status === 'executed')
      .sort((a, b) => b.version.localeCompare(a.version));

    if (executedMigrations.length === 0) {
      console.log('⚠️ 没有已执行的迁移可以回滚');
      return false;
    }

    const latest = executedMigrations[0];
    console.log(`📋 准备回滚迁移: ${latest.version} - ${latest.name}`);

    // 根据版本执行回滚
    switch (latest.version) {
      case '004':
        const { rollbackMigration004 } = await import('./004-rollback-add-missing-fields.js');
        await rollbackMigration004();
        break;

      case '003':
        const { rollbackMigration003 } = await import('./003-rollback-unify-users-members.js');
        await rollbackMigration003();
        break;

      case '002':
        console.log('⚠️ 迁移 002 暂不支持自动回滚，请手动处理');
        return false;

      case '001':
        console.log('⚠️ 迁移 001 是初始架构，不支持回滚');
        return false;

      default:
        console.log(`⚠️ 未知的迁移版本: ${latest.version}`);
        return false;
    }

    console.log('✅ 回滚完成');

    // 显示更新后的状态
    await showMigrationStatus();

    return true;
  } catch (error) {
    console.error('❌ 回滚失败:', error);
    return false;
  }
}

/**
 * 创建数据库备份
 */
export async function createBackup(): Promise<string> {
  // 这里可以实现数据库备份逻辑
  // 例如使用 mysqldump 或其他备份工具
  console.log('⚠️ 数据库备份功能待实现');
  return '';
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  databaseService.init().then(async () => {
    try {
      switch (command) {
        case 'status':
          await showMigrationStatus();
          break;

        case 'up':
          await runAllPendingMigrations();
          break;

        case 'rollback':
          await rollbackLatestMigration();
          break;

        case 'backup':
          await createBackup();
          break;

        default:
          console.log(`
使用方法:
  npm run migration:status    查看迁移状态
  npm run migration:up        执行所有待执行的迁移
  npm run migration:rollback  回滚最新的迁移
  npm run migration:backup    创建数据库备份

示例:
  node dist/migrations/migration-manager.js status
  node dist/migrations/migration-manager.js up
  node dist/migrations/migration-manager.js rollback
          `);
      }

      process.exit(0);
    } catch (error) {
      console.error('执行失败:', error);
      process.exit(1);
    }
  });
}
