import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

/**
 * 补充默认能力模型数据
 */
async function syncCapabilityModels() {
  const pool = await mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'task_manager',
  });

  console.log('🔄 开始同步能力模型数据...\n');

  try {
    // 默认能力模型（与前端 constants 同步）
    const capabilityModels = [
      {
        id: 'cap-model-001-embedded-dev',
        name: '嵌入式开发能力',
        description: '评估嵌入式系统开发相关能力，包括固件开发、驱动开发、系统设计和问题分析等维度',
        dimensions: JSON.stringify([
          { name: '固件开发', weight: 35, description: '嵌入式固件设计与实现能力' },
          { name: '驱动开发', weight: 30, description: '硬件驱动程序开发能力' },
          { name: '系统设计', weight: 20, description: '嵌入式系统架构设计能力' },
          { name: '问题分析', weight: 15, description: '硬件相关问题分析与调试能力' }
        ])
      },
      {
        id: 'cap-model-002-sys-design',
        name: '系统设计能力',
        description: '评估系统架构设计相关能力，包括架构设计、接口设计和文档编写等维度',
        dimensions: JSON.stringify([
          { name: '架构设计', weight: 40, description: '系统整体架构设计能力' },
          { name: '接口设计', weight: 30, description: '模块间接口定义与设计能力' },
          { name: '文档编写', weight: 30, description: '技术文档撰写与维护能力' }
        ])
      },
      {
        id: 'cap-model-003-general',
        name: '通用能力',
        description: '评估员工通用职场能力，包括沟通协调、问题解决和执行力等维度',
        dimensions: JSON.stringify([
          { name: '沟通协调', weight: 30, description: '团队沟通与跨部门协调能力' },
          { name: '问题解决', weight: 35, description: '问题分析与解决能力' },
          { name: '执行力', weight: 35, description: '任务执行与目标达成能力' }
        ])
      }
    ];

    // 插入能力模型
    let insertedCount = 0;
    for (const model of capabilityModels) {
      try {
        await pool.execute(
          `INSERT IGNORE INTO capability_models (id, name, description, dimensions, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [model.id, model.name, model.description, model.dimensions]
        );
        insertedCount++;
        console.log(`   ✅ ${model.name}`);
      } catch (error) {
        console.log(`   ⚠️ ${model.name} 已存在，跳过`);
      }
    }

    // 更新任务类型映射中的 model_id
    console.log('\n🔗 更新任务类型映射...');
    const mappingUpdates = [
      { task_types: ['firmware', 'board', 'driver', 'hw_recovery'], model_id: 'cap-model-001-embedded-dev' },
      { task_types: ['sys_design', 'interface', 'core_risk'], model_id: 'cap-model-002-sys-design' },
      { task_types: ['material_import', 'material_sub', 'func_task', 'contact', 'other'], model_id: 'cap-model-003-general' },
    ];

    for (const update of mappingUpdates) {
      for (const taskType of update.task_types) {
        await pool.execute(
          `UPDATE task_type_model_mapping SET model_id = ? WHERE task_type = ?`,
          [update.model_id, taskType]
        );
      }
    }

    // 验证结果
    const [models] = await pool.execute('SELECT id, name FROM capability_models');
    console.log('\n📊 能力模型列表:');
    for (const model of models as any[]) {
      console.log(`   [${model.id}] ${model.name}`);
    }

    console.log(`\n✅ 能力模型同步完成，插入 ${insertedCount} 条`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 同步失败:', error);
    await pool.end();
    process.exit(1);
  }
}

syncCapabilityModels();
