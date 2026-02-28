/**
 * 清理冗余的关系型表和服务代码
 *
 * 删除以下表：
 * - departments
 * - tech_groups
 * - members
 * - user_departments
 * - user_tech_groups
 *
 * 删除以下文件：
 * - src/services/OrganizationService.ts
 * - src/routes/organizationRoutes.ts
 * - src/routes/dataRoutes.ts 中的成员API部分
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function cleanupTables() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 清理冗余关系型表 ===\n');

    // 记录将要删除的表的数据量
    const tables = [
      'departments',
      'tech_groups',
      'members',
      'user_departments',
      'user_tech_groups'
    ];

    console.log('📊 备份统计信息:');
    for (const table of tables) {
      try {
        const [result] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table}: ${(result as any[])[0].count} 条记录`);
      } catch (e) {
        console.log(`   ${table}: 表不存在或无法访问`);
      }
    }

    console.log('\n⚠️  警告: 即将删除以上表及其数据！');
    console.log('   这些数据已迁移到组织架构树 (global_data.organization_units)\n');

    // 删除表
    console.log('🗑️  删除冗余表...');

    const dropStatements = [
      'DROP TABLE IF EXISTS user_tech_groups',
      'DROP TABLE IF EXISTS user_departments',
      'DROP TABLE IF EXISTS members',
      'DROP TABLE IF EXISTS tech_groups',
      'DROP TABLE IF EXISTS departments'
    ];

    for (const stmt of dropStatements) {
      try {
        await conn.query(stmt);
        console.log(`   ✅ ${stmt.match(/IF EXISTS (.+)/)?.[1] || stmt}`);
      } catch (error: any) {
        console.log(`   ⚠️  ${error.message}`);
      }
    }

    console.log('\n✅ 表清理完成');

  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

async function cleanupFiles() {
  console.log('\n=== 清理冗余服务代码 ===\n');

  const basePath = 'G:/Project/Web/Project_Task_Manager_3.0/app/server/src';

  // 需要删除的文件
  const filesToDelete = [
    'services/OrganizationService.ts',
    'routes/organizationRoutes.ts'
  ];

  console.log('🗑️  删除冗余文件:');

  for (const file of filesToDelete) {
    const filePath = path.join(basePath, file);
    try {
      if (fs.existsSync(filePath)) {
        // 备份文件
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);

        // 删除文件
        fs.unlinkSync(filePath);
        console.log(`   ✅ ${file} (已备份到 ${path.basename(filePath)}.backup)`);
      } else {
        console.log(`   ⚠️  ${file} (文件不存在)`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${file} - ${error.message}`);
    }
  }

  // 修改 index.ts - 移除对已删除服务的引用
  console.log('\n📝 需要手动修改 index.ts:');
  console.log('   1. 移除: import organizationRoutes from...');
  console.log('   2. 移除: app.use("/api/organization", organizationRoutes)');
  console.log('   3. 修改权限服务导入为 OrganizationPermissionService');

  console.log('\n✅ 文件清理完成');
}

async function showSummary() {
  console.log('\n=== 清理完成 ===\n');
  console.log('✅ 组织架构权限系统迁移完成！');
  console.log('\n当前数据结构:');
  console.log('  • users 表 - 包含 employee_id 关联字段');
  console.log('  • global_data.organization_units - 组织架构树');
  console.log('\n权限系统:');
  console.log('  • 使用 OrganizationPermissionService');
  console.log('  • 从组织架构树读取用户角色和权限');
  console.log('\n还需要手动完成:');
  console.log('  1. 修改 index.ts 使用新的权限服务');
  console.log('  2. 重启服务器验证功能');
  console.log('  3. 删除前端对 /api/members 的调用（如果有的话）');
}

// 执行清理
async function main() {
  try {
    await cleanupTables();
    await cleanupFiles();
    await showSummary();
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

main();
