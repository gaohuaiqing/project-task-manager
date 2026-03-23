/**
 * 手动补充缺失的默认数据
 *
 * 用于在迁移已执行但数据不完整的情况下补充数据
 */

import mysql from 'mysql2/promise';

async function syncDefaultData() {
  const pool = await mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'task_manager',
  });

  console.log('🔄 开始同步默认数据...\n');

  try {
    // 1. 同步节假日数据
    console.log('📅 同步节假日数据...');
    const holidays: [string, string, boolean][] = [
      // 2024年
      ['2024-01-01', '元旦', false],
      ['2024-02-10', '春节', false],
      ['2024-02-11', '春节', false],
      ['2024-02-12', '春节', false],
      ['2024-02-13', '春节', false],
      ['2024-02-14', '春节', false],
      ['2024-02-15', '春节', false],
      ['2024-02-16', '春节', false],
      ['2024-02-17', '春节', false],
      ['2024-02-04', '春节调休', true],
      ['2024-02-18', '春节调休', true],
      ['2024-04-04', '清明节', false],
      ['2024-04-05', '清明节', false],
      ['2024-04-06', '清明节', false],
      ['2024-04-07', '清明节调休', true],
      ['2024-05-01', '劳动节', false],
      ['2024-05-02', '劳动节', false],
      ['2024-05-03', '劳动节', false],
      ['2024-05-04', '劳动节', false],
      ['2024-05-05', '劳动节', false],
      ['2024-04-28', '劳动节调休', true],
      ['2024-05-11', '劳动节调休', true],
      ['2024-06-08', '端午节', false],
      ['2024-06-09', '端午节', false],
      ['2024-06-10', '端午节', false],
      ['2024-09-15', '中秋节', false],
      ['2024-09-16', '中秋节', false],
      ['2024-09-17', '中秋节', false],
      ['2024-10-01', '国庆节', false],
      ['2024-10-02', '国庆节', false],
      ['2024-10-03', '国庆节', false],
      ['2024-10-04', '国庆节', false],
      ['2024-10-05', '国庆节', false],
      ['2024-10-06', '国庆节', false],
      ['2024-10-07', '国庆节', false],
      ['2024-09-29', '国庆节调休', true],
      ['2024-10-12', '国庆节调休', true],
      // 2025年
      ['2025-01-01', '元旦', false],
      ['2025-01-26', '春节调休', true],
      ['2025-01-28', '春节', false],
      ['2025-01-29', '春节', false],
      ['2025-01-30', '春节', false],
      ['2025-01-31', '春节', false],
      ['2025-02-01', '春节', false],
      ['2025-02-02', '春节', false],
      ['2025-02-03', '春节', false],
      ['2025-02-04', '春节', false],
      ['2025-02-08', '春节调休', true],
      ['2025-04-04', '清明节', false],
      ['2025-04-05', '清明节', false],
      ['2025-04-06', '清明节', false],
      ['2025-04-27', '劳动节调休', true],
      ['2025-05-01', '劳动节', false],
      ['2025-05-02', '劳动节', false],
      ['2025-05-03', '劳动节', false],
      ['2025-05-04', '劳动节', false],
      ['2025-05-05', '劳动节', false],
      ['2025-05-28', '端午节', false],
      ['2025-05-29', '端午节', false],
      ['2025-05-30', '端午节', false],
      ['2025-06-01', '端午节调休', true],
      ['2025-10-01', '国庆节', false],
      ['2025-10-02', '国庆节', false],
      ['2025-10-03', '国庆节', false],
      ['2025-10-04', '国庆节', false],
      ['2025-10-05', '国庆节', false],
      ['2025-10-06', '国庆节', false],
      ['2025-10-07', '国庆节', false],
      ['2025-10-08', '国庆节', false],
      ['2025-09-28', '国庆节调休', true],
      ['2025-10-11', '国庆节调休', true],
      // 2026年（预估）
      ['2026-01-01', '元旦', false],
      ['2026-01-02', '元旦', false],
      ['2026-01-03', '元旦', false],
      ['2026-02-17', '春节', false],
      ['2026-02-18', '春节', false],
      ['2026-02-19', '春节', false],
      ['2026-02-20', '春节', false],
      ['2026-02-21', '春节', false],
      ['2026-02-22', '春节', false],
      ['2026-02-23', '春节', false],
      ['2026-04-05', '清明节', false],
      ['2026-04-06', '清明节', false],
      ['2026-05-01', '劳动节', false],
      ['2026-05-02', '劳动节', false],
      ['2026-05-03', '劳动节', false],
      ['2026-05-25', '端午节', false],
      ['2026-10-01', '国庆节', false],
      ['2026-10-02', '国庆节', false],
      ['2026-10-03', '国庆节', false],
      ['2026-10-03', '中秋节', false],
    ];

    let holidaysInserted = 0;
    for (const [date, name, isWorkingDay] of holidays) {
      try {
        await pool.execute(
          `INSERT IGNORE INTO holidays (holiday_date, holiday_name, is_working_day)
           VALUES (?, ?, ?)`,
          [date, name, isWorkingDay ? 1 : 0]
        );
        holidaysInserted++;
      } catch {
        // 忽略重复
      }
    }
    console.log(`✅ 节假日数据同步完成，插入 ${holidaysInserted} 条\n`);

    // 2. 同步任务类型与能力模型映射
    console.log('🔗 同步任务类型映射...');
    const CAPABILITY_MODEL_IDS = {
      embedded_dev: 'cap-model-001-embedded-dev',
      sys_design: 'cap-model-002-sys-design',
      general: 'cap-model-003-general',
    };

    const mappings = [
      { task_type: 'firmware', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 1 },
      { task_type: 'board', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 1 },
      { task_type: 'driver', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 1 },
      { task_type: 'hw_recovery', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 1 },
      { task_type: 'sys_design', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 1 },
      { task_type: 'interface', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 1 },
      { task_type: 'core_risk', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 1 },
      { task_type: 'material_import', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },
      { task_type: 'material_sub', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },
      { task_type: 'func_task', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },
      { task_type: 'contact', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },
      { task_type: 'other', model_id: CAPABILITY_MODEL_IDS.general, priority: 1 },
      { task_type: 'firmware', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 2 },
      { task_type: 'driver', model_id: CAPABILITY_MODEL_IDS.sys_design, priority: 2 },
      { task_type: 'sys_design', model_id: CAPABILITY_MODEL_IDS.general, priority: 2 },
      { task_type: 'core_risk', model_id: CAPABILITY_MODEL_IDS.embedded_dev, priority: 2 },
    ];

    let mappingsInserted = 0;
    for (const mapping of mappings) {
      try {
        await pool.execute(
          `INSERT IGNORE INTO task_type_model_mapping (task_type, model_id, priority, created_at)
           VALUES (?, ?, ?, NOW())`,
          [mapping.task_type, mapping.model_id, mapping.priority]
        );
        mappingsInserted++;
      } catch {
        // 忽略重复
      }
    }
    console.log(`✅ 任务类型映射同步完成，插入 ${mappingsInserted} 条\n`);

    // 3. 验证结果
    console.log('📊 数据验证:');
    const [holidaysCount] = await pool.execute('SELECT COUNT(*) as count FROM holidays');
    const [mappingsCount] = await pool.execute('SELECT COUNT(*) as count FROM task_type_model_mapping');
    const [usersCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [membersCount] = await pool.execute('SELECT COUNT(*) as count FROM members');
    const [deptsCount] = await pool.execute('SELECT COUNT(*) as count FROM departments');
    const [capModelsCount] = await pool.execute('SELECT COUNT(*) as count FROM capability_models');

    console.log(`   节假日: ${(holidaysCount as any[])[0].count} 条`);
    console.log(`   任务类型映射: ${(mappingsCount as any[])[0].count} 条`);
    console.log(`   用户: ${(usersCount as any[])[0].count} 条`);
    console.log(`   成员: ${(membersCount as any[])[0].count} 条`);
    console.log(`   部门: ${(deptsCount as any[])[0].count} 条`);
    console.log(`   能力模型: ${(capModelsCount as any[])[0].count} 条`);

    console.log('\n🎉 默认数据同步完成！');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 同步失败:', error);
    await pool.end();
    process.exit(1);
  }
}

syncDefaultData();
