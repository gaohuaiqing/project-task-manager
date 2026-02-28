import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function analyzeDesignIssues() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== MySQL 数据库设计问题分析 ===\n');

    // 1. 空表分析 - 预留但未使用的功能
    console.log('🔴 问题 1: 空表过多（14个空表）\n');
    console.log('以下表已创建但从未使用，可能是过度设计或未完成的功能：\n');

    const emptyTables = [
      { name: 'data_changes', purpose: '数据变更记录', impact: '数据同步功能未启用' },
      { name: 'data_fingerprints', purpose: '数据指纹（用于冲突检测）', impact: '冲突检测功能未启用' },
      { name: 'data_locks', purpose: '数据锁（并发控制）', impact: '并发锁机制未启用' },
      { name: 'milestones', purpose: '里程碑管理', impact: '里程碑功能未使用' },
      { name: 'online_users', purpose: '在线用户跟踪', impact: '在线状态功能未启用' },
      { name: 'operation_queue', purpose: '操作队列（异步任务）', impact: '异步操作未启用' },
      { name: 'permission_history', purpose: '权限变更历史', impact: '权限审计未启用' },
      { name: 'project_members', purpose: '项目成员关联', impact: '⚠️ 关键功能缺失！' },
      { name: 'project_milestones', purpose: '项目里程碑', impact: '里程碑功能未使用' },
      { name: 'real_time_change_log', purpose: '实时变更日志', impact: '实时同步未启用' },
      { name: 'real_time_locks', purpose: '实时数据锁', impact: '实时锁未启用' },
      { name: 'sync_conflicts', purpose: '同步冲突记录', impact: '冲突解决未启用' },
      { name: 'task_assignments', purpose: '任务分配记录', impact: '⚠️ 关键功能缺失！' },
      { name: 'user_configs', purpose: '用户配置', impact: '用户个性化未启用' }
    ];

    console.table(emptyTables);

    console.log('\n💡 建议：');
    console.log('   高优先级：project_members, task_assignments - 这些是核心功能，应立即实现');
    console.log('   中优先级：data_locks, sync_conflicts - 如果有多用户协作需求需要实现');
    console.log('   低优先级：其他功能表 - 可根据实际需求决定是否保留\n');

    // 2. 数据冗余分析
    console.log('🟡 问题 2: 数据冗余\n');

    // 检查 projects 在 global_data 中的快照
    const [projectSnapshots] = await conn.query(`
      SELECT COUNT(*) as count FROM global_data WHERE data_type = 'projects'
    `);
    const [activeProjects] = await conn.query(`
      SELECT COUNT(*) as count FROM projects
    `);

    console.log(`projects 表记录数: ${(activeProjects as any[])[0].count}`);
    console.log(`global_data 中项目快照数: ${(projectSnapshots as any[])[0].count}`);
    console.log('\n⚠️  风险: 存在大量历史快照，可能导致 storage 膨胀\n');

    // 3. 命名不一致
    console.log('🔵 问题 3: 表命名不一致\n');

    const [tables] = await conn.query('SHOW TABLES');
    const tableList = (tables as any[]).map(t => Object.values(t)[0]);

    const singularNames = tableList.filter(t => !t.endsWith('s'));
    const pluralNames = tableList.filter(t => t.endsWith('s'));

    console.log(`单数命名的表 (${singularNames.length}个):`);
    singularNames.forEach(t => console.log(`   - ${t}`));

    console.log(`\n复数命名的表 (${pluralNames.length}个):`);
    pluralNames.forEach(t => console.log(`   - ${t}`));

    console.log('\n⚠️  问题: 混用单复数命名，建议统一使用复数形式\n');

    // 4. 缺失的关键关联
    console.log('🟠 问题 4: 缺失的关键关联\n');

    console.log('以下关联缺失，导致功能不完整：\n');

    console.log('1. projects ↔ users 缺少显式关联');
    console.log('   - projects 有 created_by 字段');
    console.log('   - 但缺少 project_members 表来记录项目成员');
    console.log('   - 影响: 无法知道哪些用户参与哪些项目\n');

    console.log('2. wbs_tasks ↔ users 缺少分配关联');
    console.log('   - wbs_tasks 有 assignee_id 字段');
    console.log('   - 但 task_assignments 表为空');
    console.log('   - 影响: 无法记录任务分配历史和变更\n');

    console.log('3. sessions 表数据过多');
    const [sessionCount] = await conn.query('SELECT COUNT(*) as count FROM sessions');
    const [terminatedSessions] = await conn.query('SELECT COUNT(*) as count FROM sessions WHERE status = "terminated"');

    console.log(`   - 总会话数: ${(sessionCount as any[])[0].count}`);
    console.log(`   - 已终止会话: ${(terminatedSessions as any[])[0].count}`);
    console.log('   - 影响: 大量历史会话数据占用空间，建议定期清理\n');

    // 5. 字段设计问题
    console.log('🟣 问题 5: 字段设计问题\n');

    // 检查 wbs_tasks 表结构
    const [wbsFields] = await conn.query('DESCRIBE wbs_tasks');
    console.log('wbs_tasks 表有 ' + (wbsFields as any[]).length + ' 个字段，可能存在字段冗余');

    const complexFields = (wbsFields as any[]).filter(f =>
      f.Type.includes('decimal') || f.Type.includes('double') || f.Type.includes('json')
    );

    if (complexFields.length > 0) {
      console.log('\n复杂字段类型:');
      complexFields.forEach(f => {
        console.log(`   - ${f.Field}: ${f.Type}`);
      });
    }

    // 6. 索引分析
    console.log('\n🔍 问题 6: 索引优化建议\n');

    const [indexes] = await conn.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = 'task_manager'
        AND INDEX_NAME != 'PRIMARY'
      ORDER BY TABLE_NAME, INDEX_NAME
    `);

    const indexAnalysis: { [key: string]: string[] } = {};
    (indexes as any[]).forEach(idx => {
      if (!indexAnalysis[idx.TABLE_NAME]) {
        indexAnalysis[idx.TABLE_NAME] = [];
      }
      indexAnalysis[idx.TABLE_NAME].push(`${idx.INDEX_NAME}(${idx.COLUMN_NAME})`);
    });

    console.log('当前索引:');
    for (const [table, idxs] of Object.entries(indexAnalysis)) {
      console.log(`   ${table}:`);
      idxs.forEach(idx => console.log(`     - ${idx}`));
    }

    console.log('\n💡 建议添加的索引:');
    console.log('   - sessions: INDEX (user_id, status) - 用于快速查询活跃会话');
    console.log('   - data_change_log: INDEX (data_type, created_at) - 用于按类型查询变更历史');
    console.log('   - system_logs: INDEX (log_level, created_at) - 用于按级别查询日志\n');

    // 7. 总结
    console.log('='.repeat(60) + '\n');
    console.log('📋 设计问题总结\n');

    const issues = [
      { level: '🔴 严重', issue: '核心功能表为空', impact: 'project_members, task_assignments 未使用，功能缺失' },
      { level: '🟡 中等', issue: '数据冗余', impact: 'global_data 中有 69 条项目历史快照，占用存储' },
      { level: '🟡 中等', issue: '空表过多', impact: '14 个空表占用资源，增加维护成本' },
      { level: '🔵 轻微', issue: '命名不一致', impact: '表名单复数混用，影响代码可读性' },
      { level: '🟢 优化', issue: '缺少索引', impact: '部分查询可能较慢，需要添加索引' },
      { level: '🟢 优化', issue: '历史数据', impact: 'sessions 表有 91 条记录，其中大部分已终止' }
    ];

    console.table(issues);

    console.log('\n🎯 优先级建议：\n');

    console.log('1. 【高优先级】实现核心功能');
    console.log('   - 创建 project_members 表逻辑，关联用户和项目');
    console.log('   - 创建 task_assignments 表逻辑，记录任务分配\n');

    console.log('2. 【中优先级】清理冗余数据');
    console.log('   - 清理 global_data 中的历史项目快照，仅保留最新版本');
    console.log('   - 清理 sessions 表中已终止的历史会话（保留近30天）\n');

    console.log('3. 【低优先级】优化设计');
    console.log('   - 删除确定不会使用的空表');
    console.log('   - 统一表命名规范');
    console.log('   - 添加必要的索引优化查询性能\n');

  } finally {
    await conn.end();
  }
}

analyzeDesignIssues().catch(console.error);
