/**
 * 测试数据清理脚本
 * 仅清理测试项目和任务数据，不删除用户数据
 */
import databaseService from '../../app/server/src/services/DatabaseService';

async function clearTestData() {
  console.log('========================================');
  console.log('  开始清理测试数据');
  console.log('========================================');
  console.log('');

  // 初始化数据库连接
  await databaseService.init();

  try {
    // 按依赖关系顺序删除
    console.log('删除测试任务数据...');
    const taskResult = await databaseService.query(
      'DELETE FROM wbs_tasks WHERE project_id IN (SELECT id FROM projects WHERE name LIKE \'测试项目%\')'
    );
    console.log(`  ✓ 已删除 ${taskResult.affectedRows || 0} 条任务`);
    console.log('');

    console.log('删除测试项目成员关系...');
    const memberResult = await databaseService.query(
      'DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE name LIKE \'测试项目%\')'
    );
    console.log(`  ✓ 已删除 ${memberResult.affectedRows || 0} 条成员关系`);
    console.log('');

    console.log('删除测试项目数据...');
    const projectResult = await databaseService.query(
      'DELETE FROM projects WHERE name LIKE \'测试项目%\''
    );
    console.log(`  ✓ 已删除 ${projectResult.affectedRows || 0} 个项目`);
    console.log('');

    console.log('========================================');
    console.log('  测试数据清理完成');
    console.log('========================================');
    console.log('');
    console.log('用户数据保留，可继续使用现有账户登录测试');

  } catch (error) {
    console.error('❌ 测试数据清理失败:', error);
    throw error;
  } finally {
    await databaseService.close();
  }
}

clearTestData()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch(() => {
    console.log('');
    process.exit(1);
  });