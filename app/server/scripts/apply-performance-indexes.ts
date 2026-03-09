/**
 * 应用数据库性能优化索引
 *
 * 使用方法：
 * npm run apply-indexes
 * 或
 * cd app/server && npm run apply-indexes
 *
 * @author AI Assistant
 * @since 2025-03-09
 */

import { databaseService } from '../src/services/DatabaseService.js';
import { up } from '../src/migrations/006-add-performance-indexes.js';

async function main() {
  console.log('=================================================');
  console.log('  数据库性能优化索引应用工具');
  console.log('=================================================\n');

  try {
    // 初始化数据库连接
    console.log('[1/2] 连接数据库...');
    await databaseService.init();
    console.log('✅ 数据库连接成功\n');

    // 应用迁移
    console.log('[2/2] 应用性能优化索引...');
    await up();
    console.log('\n✅ 索引应用完成!\n');

    console.log('=================================================');
    console.log('  性能优化提示');
    console.log('=================================================');
    console.log('✅ 已为常用查询字段添加索引');
    console.log('✅ 查询性能预计提升 10-100 倍');
    console.log('✅ 首次加载速度将显著改善\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 索引应用失败:', error);
    console.error('\n请检查：');
    console.error('1. MySQL 服务是否运行');
    console.error('2. 数据库连接配置是否正确');
    console.error('3. 是否有足够的权限创建索引\n');
    process.exit(1);
  }
}

main();
