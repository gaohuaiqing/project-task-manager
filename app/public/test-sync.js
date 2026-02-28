/**
 * 数据同步浏览器测试脚本
 * 复制此脚本到浏览器控制台运行
 */

console.clear();
console.log('='.repeat(60));
console.log('🧪 数据同步测试');
console.log('='.repeat(60));

const API_BASE = 'http://localhost:3001/api';
const testData = {
  project: {
    dataType: 'projects',
    dataId: `test_project_${Date.now()}`,
    data: {
      id: Date.now(),
      code: `TEST-${Date.now()}`,
      name: `同步测试项目-${new Date().toLocaleTimeString()}`,
      description: '用于测试数据同步功能',
      status: 'planning',
      progress: 0,
      taskCount: 0,
      completedTaskCount: 0,
      departmentId: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }
};

// 测试 1: 检查后端连接
async function test1_Connection() {
  console.log('\n[测试 1] 检查后端连接...');
  try {
    const response = await fetch('http://localhost:3001/health');
    const result = await response.json();
    if (result.status === 'ok') {
      console.log('✅ 后端连接正常');
      return true;
    }
  } catch (error) {
    console.log('❌ 后端连接失败:', error.message);
    return false;
  }
}

// 测试 2: 获取现有项目
async function test2_GetProjects() {
  console.log('\n[测试 2] 获取现有项目数据...');
  try {
    const response = await fetch(`${API_BASE}/global-data/get?dataType=projects`);
    const result = await response.json();
    if (result.success && result.data) {
      console.log(`✅ 成功获取 ${result.data.length} 个项目`);
      if (result.data.length > 0) {
        const sample = result.data[0].data_json;
        console.log(`   示例: ${sample.name} (${sample.code})`);
      }
      return result.data;
    }
  } catch (error) {
    console.log('❌ 获取项目失败:', error.message);
    return null;
  }
}

// 测试 3: 创建测试项目
async function test3_CreateProject() {
  console.log('\n[测试 3] 创建测试项目...');
  try {
    const response = await fetch(`${API_BASE}/global-data/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataType: testData.project.dataType,
        dataId: testData.project.dataId,
        data: testData.project.data,
        changeReason: '数据同步测试'
      })
    });
    const result = await response.json();
    if (result.success) {
      console.log(`✅ 成功创建测试项目: ${testData.project.data.name}`);
      console.log(`   dataId: ${testData.project.dataId}`);
      console.log(`   version: ${result.version}`);
      return true;
    } else {
      console.log('❌ 创建失败:', result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 创建失败:', error.message);
    return false;
  }
}

// 测试 4: 验证数据持久化
async function test4_VerifyPersistence() {
  console.log('\n[测试 4] 验证数据持久化...');
  await new Promise(resolve => setTimeout(resolve, 500)); // 等待数据库写入

  try {
    const response = await fetch(`${API_BASE}/global-data/get?dataType=projects&dataId=${testData.project.dataId}`);
    const result = await response.json();
    if (result.success && result.data && result.data.length > 0) {
      const savedData = result.data[0].data_json;
      console.log('✅ 数据已成功持久化到数据库');
      console.log(`   项目名称: ${savedData.name}`);
      console.log(`   版本号: ${result.data[0].version}`);
      return true;
    } else {
      console.log('❌ 数据持久化验证失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 验证失败:', error.message);
    return false;
  }
}

// 测试 5: 修改数据（测试版本控制）
async function test5_UpdateData() {
  console.log('\n[测试 5] 修改数据（测试版本控制）...');
  try {
    const updatedData = {
      ...testData.project.data,
      name: `${testData.project.data.name} (已修改)`,
      progress: 50,
      updatedAt: Date.now()
    };

    const response = await fetch(`${API_BASE}/global-data/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataType: testData.project.dataType,
        dataId: testData.project.dataId,
        data: updatedData,
        expectedVersion: 1, // 期望当前版本为 1
        changeReason: '测试版本控制'
      })
    });
    const result = await response.json();
    if (result.success) {
      console.log('✅ 数据更新成功');
      console.log(`   新版本: ${result.version}`);
      console.log(`   新名称: ${updatedData.name}`);
      console.log(`   新进度: ${updatedData.progress}%`);
      return true;
    } else {
      console.log('❌ 更新失败:', result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 更新失败:', error.message);
    return false;
  }
}

// 测试 6: 清理测试数据
async function test6_Cleanup() {
  console.log('\n[测试 6] 清理测试数据...');
  try {
    const response = await fetch(`${API_BASE}/global-data/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataType: testData.project.dataType,
        dataId: testData.project.dataId,
        changeReason: '清理测试数据'
      })
    });
    const result = await response.json();
    if (result.success) {
      console.log('✅ 测试数据已清理');
      return true;
    } else {
      console.log('❌ 清理失败:', result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 清理失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  let passCount = 0;
  let failCount = 0;

  const tests = [
    { name: '后端连接', fn: test1_Connection },
    { name: '获取项目', fn: test2_GetProjects },
    { name: '创建项目', fn: test3_CreateProject },
    { name: '数据持久化', fn: test4_VerifyPersistence },
    { name: '版本控制', fn: test5_UpdateData },
    { name: '清理数据', fn: test6_Cleanup }
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === false) failCount++;
      else if (result !== null) passCount++;
    } catch (error) {
      console.log(`❌ ${test.name} 测试异常:`, error.message);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`📈 成功率: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n🎉 所有测试通过！数据同步功能正常。');
    console.log('\n💡 提示: 在另一个浏览器中运行此测试，验证数据是否同步');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查错误信息。');
  }
  console.log('='.repeat(60));
}

// 启动测试
runAllTests();

// 保存测试数据 ID 供后续使用
window.__testDataId = testData.project.dataId;
console.log('\n💡 提示: 测试数据 ID 已保存到 window.__testDataId');
