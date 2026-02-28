/**
 * 快速验证部门表创建
 */

import { databaseService } from '../src/services/DatabaseService.js';

async function verifyMigration() {
  try {
    await databaseService.init();

    console.log('验证部门管理表创建...\n');

    // 检查表是否存在
    const tables = await databaseService.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'task_manager'
      AND table_name IN ('departments', 'tech_groups', 'user_departments', 'user_tech_groups')
    `) as any[];

    console.log('创建的表:');
    if (Array.isArray(tables)) {
      tables.forEach((t: any) => {
        console.log(`  ✓ ${t.table_name}`);
      });
    } else if (tables && typeof tables === 'object') {
      console.log(`  ✓ ${Object.values(tables).map((t: any) => t.table_name).join(', ')}`);
    }

    // 统计数据
    const deptCount = await databaseService.query('SELECT COUNT(*) as count FROM departments') as any[];
    const groupCount = await databaseService.query('SELECT COUNT(*) as count FROM tech_groups') as any[];
    const userDeptCount = await databaseService.query('SELECT COUNT(*) as count FROM user_departments') as any[];
    const userGroupCount = await databaseService.query('SELECT COUNT(*) as count FROM user_tech_groups') as any[];

    console.log('\n数据统计:');
    console.log(`  部门数量: ${deptCount.length > 0 ? deptCount[0].count : 0}`);
    console.log(`  技术组数量: ${groupCount.length > 0 ? groupCount[0].count : 0}`);
    console.log(`  用户部门关联: ${userDeptCount.length > 0 ? userDeptCount[0].count : 0}`);
    console.log(`  用户技术组关联: ${userGroupCount.length > 0 ? userGroupCount[0].count : 0}`);

    console.log('\n数据统计:');
    console.log(`  部门数量: ${deptCount[0].count}`);
    console.log(`  技术组数量: ${groupCount[0].count}`);
    console.log(`  用户部门关联: ${userDeptCount[0].count}`);
    console.log(`  用户技术组关联: ${userGroupCount[0].count}`);

    console.log('\n✅ 验证完成！');

    process.exit(0);
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

verifyMigration();
