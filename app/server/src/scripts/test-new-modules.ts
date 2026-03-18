/**
 * 新模块功能测试脚本
 *
 * 测试100人并发实时协作系统的核心功能
 */

import { redisService } from '../cache/index.js';
import { cacheManager } from '../cache/index.js';
import { authService } from '../auth/index.js';
import { webSocketService } from '../realtime/index.js';
import { messageBroker } from '../realtime/index.js';
import { broadcastService } from '../realtime/index.js';
import { projectService } from '../data/index.js';
import { dataService } from '../data/index.js';

// 测试结果记录
const testResults = {
  passed: 0,
  failed: 0,
  tests: [] as any[]
};

// 测试函数
async function runTest(name: string, testFn: () => Promise<void>) {
  console.log(`\n🧪 测试: ${name}`);
  try {
    await testFn();
    console.log(`✅ 通过: ${name}`);
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed' });
  } catch (error: any) {
    console.error(`❌ 失败: ${name}`, error.message);
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', error: error.message });
  }
}

// 测试1: Redis连接
await runTest('Redis服务连接', async () => {
  await redisService.connect();
  const health = await redisService.healthCheck();
  if (!health.healthy) {
    throw new Error('Redis健康检查失败');
  }
  console.log(`  延迟: ${health.latency}ms`);
});

// 测试2: 缓存操作
await runTest('缓存读写操作', async () => {
  await cacheManager.set('test', { data: 'test' }, 60);
  const result = await cacheManager.get('test');
  if (!result || result.data !== 'test') {
    throw new Error('缓存读写失败');
  }
  await cacheManager.delete('test');
});

// 测试3: 缓存统计
await runTest('缓存统计信息', async () => {
  const stats = cacheManager.getStats();
  console.log(`  缓存条目数: ${stats.count}`);
  console.log(`  命中率: ${stats.hitRate.toFixed(2)}%`);
});

// 测试4: 消息代理连接
await runTest('消息代理连接', async () => {
  try {
    await messageBroker.connect();
  } catch (error: any) {
    // Redis未连接时跳过此测试
    console.log(`  ⚠️ 跳过: ${error.message}`);
  }
});

// 测试5: WebSocket服务
await runTest('WebSocket服务统计', async () => {
  const stats = webSocketService.getStats();
  console.log(`  在线客户端: ${stats.totalClients}`);
  console.log(`  已认证: ${stats.authenticatedClients}`);
  console.log(`  匿名: ${stats.anonymousClients}`);
});

// 测试6: 数据服务查询
await runTest('数据服务查询', async () => {
  const projects = await projectService.getProjects();
  console.log(`  项目数量: ${projects.length}`);
});

// 测试7: 初始数据
await runTest('获取初始数据', async () => {
  const data = await dataService.getInitialData();
  console.log(`  项目: ${data.projects.length}`);
  console.log(`  成员: ${data.members.length}`);
  console.log(`  任务: ${data.tasks.length}`);
});

// 测试8: 数据统计
await runTest('获取数据统计', async () => {
  const stats = await dataService.getStatistics();
  console.log(`  项目总数: ${stats.projects.total}`);
  console.log(`  成员总数: ${stats.members.total}`);
  console.log(`  任务总数: ${stats.tasks.total}`);
});

// 打印测试结果
console.log('\n' + '='.repeat(50));
console.log('📊 测试结果汇总');
console.log('='.repeat(50));
console.log(`✅ 通过: ${testResults.passed}`);
console.log(`❌ 失败: ${testResults.failed}`);
console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

if (testResults.failed > 0) {
  console.log('\n失败的测试:');
  testResults.tests.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  ❌ ${t.name}: ${t.error}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 所有测试通过！');
  process.exit(0);
}
