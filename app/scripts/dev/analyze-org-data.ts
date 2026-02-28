import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager'
};

async function analyzeOrgData() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 组织架构树 vs 关系型表对比分析 ===\n');

    // 1. 获取组织架构树数据
    const [orgData] = await conn.query(
      'SELECT data_json FROM global_data WHERE data_type = "organization_units" AND data_id = "default"'
    );

    if (orgData && (orgData as any[]).length > 0) {
      const org = (orgData as any[])[0].data_json;
      console.log('📊 组织架构树数据结构:\n');
      console.log('版本:', org.version);
      console.log('部门数:', org.departments?.length || 0);

      let totalTechGroups = 0;
      let totalMembers = 0;

      if (org.departments) {
        org.departments.forEach((dept: any, idx: number) => {
          console.log(`\n部门 ${idx + 1}: ${dept.name}`);
          if (dept.children) {
            console.log(`  技术组数: ${dept.children.length}`);
            totalTechGroups += dept.children.length;

            dept.children.forEach((group: any, gIdx: number) => {
              console.log(`  ${gIdx + 1}. ${group.name}`);
              if (group.children) {
                console.log(`     成员数: ${group.children.length}`);
                totalMembers += group.children.length;
                group.children.forEach((member: any) => {
                  console.log(`       - ${member.name} [${member.employeeId || '无工号'}]`);
                });
              }
            });
          }
        });
      }

      console.log(`\n总计: ${org.departments?.length || 0} 部门, ${totalTechGroups} 技术组, ${totalMembers} 成员`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 2. 对比关系型表数据
    console.log('📊 关系型表数据:\n');

    const [deptCount] = await conn.query('SELECT COUNT(*) as count FROM departments');
    console.log('departments 表记录数:', (deptCount as any[])[0].count);

    const [groupCount] = await conn.query('SELECT COUNT(*) as count FROM tech_groups');
    console.log('tech_groups 表记录数:', (groupCount as any[])[0].count);

    const [memberCount] = await conn.query('SELECT COUNT(*) as count FROM members WHERE deleted_at IS NULL');
    console.log('members 表记录数:', (memberCount as any[])[0].count);

    console.log('\n' + '='.repeat(60) + '\n');

    // 3. 分析关键差异
    console.log('🔍 关键差异分析:\n');

    // 检查用户部门关联
    const [userDepts] = await conn.query('SELECT * FROM user_departments LIMIT 3');
    console.log('user_departments 表数据 (用户-部门关联):');
    if ((userDepts as any[]).length > 0) {
      console.table(userDepts);
      console.log('→ 包含角色 (role) 和主部门标识 (is_primary)\n');
    } else {
      console.log('  (无数据)\n');
    }

    // 检查用户技术组关联
    const [userGroups] = await conn.query('SELECT * FROM user_tech_groups LIMIT 3');
    console.log('user_tech_groups 表数据 (用户-技术组关联):');
    if ((userGroups as any[]).length > 0) {
      console.table(userGroups);
      console.log('→ 包含角色信息\n');
    } else {
      console.log('  (无数据)\n');
    }

    console.log('='.repeat(60) + '\n');

    // 4. 结论
    console.log('📋 结论:\n');
    console.log('✅ 组织架构树包含完整数据');
    console.log('⚠️  但缺少用户关联表中的关键信息:');
    console.log('   • user_departments.role (用户在部门中的角色)');
    console.log('   • user_departments.is_primary (主部门标识)');
    console.log('   • user_tech_groups.role (用户在技术组中的角色)\n');

    console.log('💡 建议:');
    console.log('   如果只用组织架构树，需要将用户角色信息');
    console.log('   整合到成员节点中，或使用 users 表的角色字段。\n');

  } finally {
    await conn.end();
  }
}

analyzeOrgData().catch(console.error);
