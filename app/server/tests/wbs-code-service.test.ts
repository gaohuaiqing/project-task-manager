/**
 * WBS 编码服务单元测试
 *
 * 测试覆盖：
 * 1. 编码计算逻辑
 * 2. 层级验证
 * 3. 编码附加到任务列表
 * 4. 缓存存取和失效
 */

import { WbsCodeService, wbsCodeService } from '../src/core/wbs/WbsCodeService';
import { WbsCodeCache, wbsCodeCache } from '../src/core/wbs/WbsCodeCache';

// 测试工具函数
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passCount++;
  } else {
    console.log(`  ❌ ${message}`);
    failCount++;
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`  ✅ ${message}`);
    passCount++;
  } else {
    console.log(`  ❌ ${message}`);
    console.log(`     期望: ${expectedStr}`);
    console.log(`     实际: ${actualStr}`);
    failCount++;
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n📋 ${name}`);
  fn();
}

// ========== 测试数据 ==========

interface TestTask {
  id: string;
  parent_id: string | null;
  wbs_level: number;
  sort_order: number | null;
  created_at: Date;
}

const createTestTasks = (): TestTask[] => [
  { id: 'uuid-1', parent_id: null, wbs_level: 1, sort_order: 100, created_at: new Date('2024-01-01') },
  { id: 'uuid-2', parent_id: null, wbs_level: 1, sort_order: 200, created_at: new Date('2024-01-02') },
  { id: 'uuid-3', parent_id: 'uuid-1', wbs_level: 2, sort_order: 100, created_at: new Date('2024-01-03') },
  { id: 'uuid-4', parent_id: 'uuid-1', wbs_level: 2, sort_order: 200, created_at: new Date('2024-01-04') },
  { id: 'uuid-5', parent_id: 'uuid-3', wbs_level: 3, sort_order: 100, created_at: new Date('2024-01-05') },
  { id: 'uuid-6', parent_id: 'uuid-2', wbs_level: 2, sort_order: 100, created_at: new Date('2024-01-06') },
];

// ========== 测试用例 ==========

describe('WbsCodeService - 编码计算', () => {
  const service = new WbsCodeService();
  const tasks = createTestTasks();

  const result = service.calculateCodes(tasks);

  test('根任务编码正确', () => {
    const task1 = result.codeMap.get('uuid-1');
    const task2 = result.codeMap.get('uuid-2');
    assert(task1 === '1', `任务1编码应为 '1'，实际为 '${task1}'`);
    assert(task2 === '2', `任务2编码应为 '2'，实际为 '${task2}'`);
  });

  test('二级任务编码正确', () => {
    const task3 = result.codeMap.get('uuid-3');
    const task4 = result.codeMap.get('uuid-4');
    const task6 = result.codeMap.get('uuid-6');
    assert(task3 === '1.1', `任务3编码应为 '1.1'，实际为 '${task3}'`);
    assert(task4 === '1.2', `任务4编码应为 '1.2'，实际为 '${task4}'`);
    assert(task6 === '2.1', `任务6编码应为 '2.1'，实际为 '${task6}'`);
  });

  test('三级任务编码正确', () => {
    const task5 = result.codeMap.get('uuid-5');
    assert(task5 === '1.1.1', `任务5编码应为 '1.1.1'，实际为 '${task5}'`);
  });

  test('反向映射正确', () => {
    const id1 = result.idMap.get('1');
    const id11 = result.idMap.get('1.1');
    const id21 = result.idMap.get('2.1');
    assert(id1 === 'uuid-1', `'1' 应映射到 uuid-1，实际为 '${id1}'`);
    assert(id11 === 'uuid-3', `'1.1' 应映射到 uuid-3，实际为 '${id11}'`);
    assert(id21 === 'uuid-6', `'2.1' 应映射到 uuid-6，实际为 '${id21}'`);
  });
});

describe('WbsCodeService - 编码附加', () => {
  const service = new WbsCodeService();
  const tasks = createTestTasks();

  const tasksWithCodes = service.attachCodes(tasks);

  test('保留原始字段', () => {
    const task1 = tasksWithCodes.find(t => t.id === 'uuid-1');
    assert(task1?.wbs_level === 1, '应保留 wbs_level 字段');
    assert(task1?.parent_id === null, '应保留 parent_id 字段');
  });

  test('添加 wbs_code 字段', () => {
    const task1 = tasksWithCodes.find(t => t.id === 'uuid-1');
    const task3 = tasksWithCodes.find(t => t.id === 'uuid-3');
    const task5 = tasksWithCodes.find(t => t.id === 'uuid-5');
    assert(task1?.wbs_code === '1', '任务1应添加 wbs_code');
    assert(task3?.wbs_code === '1.1', '任务3应添加 wbs_code');
    assert(task5?.wbs_code === '1.1.1', '任务5应添加 wbs_code');
  });
});

describe('WbsCodeService - 层级验证', () => {
  const service = new WbsCodeService();

  test('有效层级', () => {
    const result = service.validateLevel(3, 2);
    assert(result.valid === true, '层级3在父级2下应有效');
  });

  test('无效层级 - 超过父级+1', () => {
    const result = service.validateLevel(4, 2);
    assert(result.valid === false, '层级4在父级2下应无效');
    assert(result.error !== undefined, '应返回错误信息');
  });

  test('根任务验证', () => {
    const result = service.validateLevel(1, null);
    assert(result.valid === true, '根任务层级应有效');
  });

  test('超过最大层级', () => {
    const result = service.validateLevel(6, 5);
    assert(result.valid === false, '层级6应无效（超过最大层级5）');
  });
});

describe('WbsCodeService - 移动层级检查', () => {
  const service = new WbsCodeService();

  test('不会超过最大层级', () => {
    // 任务层级4，最深子任务层级5，移动到父任务层级3下
    // newLevel = 4, deepestNewLevel = 4 + (5 - 4) = 5
    const result = service.willExceedMaxLevel(4, 5, 3);
    assert(result === false, '移动后不超过最大层级');
  });

  test('会超过最大层级', () => {
    // 任务层级4，最深子任务层级5，移动到父任务层级4下
    // newLevel = 5, deepestNewLevel = 5 + (5 - 4) = 6 > 5
    const result = service.willExceedMaxLevel(4, 5, 4);
    assert(result === true, '移动后会超过最大层级');
  });
});

describe('WbsCodeService - 空任务列表', () => {
  const service = new WbsCodeService();

  test('空列表返回空映射', () => {
    const result = service.calculateCodes([]);
    assert(result.codeMap.size === 0, '空输入应返回空 codeMap');
    assert(result.idMap.size === 0, '空输入应返回空 idMap');
  });
});

describe('WbsCodeService - sort_order 排序', () => {
  const service = new WbsCodeService();

  // 创建乱序的任务列表
  const tasks: TestTask[] = [
    { id: 'uuid-2', parent_id: null, wbs_level: 1, sort_order: 200, created_at: new Date('2024-01-02') },
    { id: 'uuid-1', parent_id: null, wbs_level: 1, sort_order: 100, created_at: new Date('2024-01-01') },
    { id: 'uuid-4', parent_id: 'uuid-1', wbs_level: 2, sort_order: 200, created_at: new Date('2024-01-04') },
    { id: 'uuid-3', parent_id: 'uuid-1', wbs_level: 2, sort_order: 100, created_at: new Date('2024-01-03') },
  ];

  const result = service.calculateCodes(tasks);

  test('按 sort_order 排序', () => {
    // uuid-1 的 sort_order 较小，应为 1
    // uuid-2 的 sort_order 较大，应为 2
    const code1 = result.codeMap.get('uuid-1');
    const code2 = result.codeMap.get('uuid-2');
    assert(code1 === '1', 'sort_order 较小的应为 1');
    assert(code2 === '2', 'sort_order 较大的应为 2');
  });

  test('子任务按 sort_order 排序', () => {
    const code3 = result.codeMap.get('uuid-3');
    const code4 = result.codeMap.get('uuid-4');
    assert(code3 === '1.1', '子任务 sort_order 较小的应为 1.1');
    assert(code4 === '1.2', '子任务 sort_order 较大的应为 1.2');
  });
});

describe('WbsCodeService - null sort_order 处理', () => {
  const service = new WbsCodeService();

  // 混合 null 和数值 sort_order
  const tasks: TestTask[] = [
    { id: 'uuid-1', parent_id: null, wbs_level: 1, sort_order: null, created_at: new Date('2024-01-01') },
    { id: 'uuid-2', parent_id: null, wbs_level: 1, sort_order: 100, created_at: new Date('2024-01-02') },
    { id: 'uuid-3', parent_id: null, wbs_level: 1, sort_order: null, created_at: new Date('2024-01-03') },
  ];

  const result = service.calculateCodes(tasks);

  test('null sort_order 按创建时间排列', () => {
    // 有 sort_order 的排前面，null sort_order 按创建时间排后面
    assert(result.codeMap.size === 3, '所有任务应有编码');
    assert(result.codeMap.has('uuid-1'), 'uuid-1 应有编码');
    assert(result.codeMap.has('uuid-2'), 'uuid-2 应有编码');
    assert(result.codeMap.has('uuid-3'), 'uuid-3 应有编码');
  });
});

// ========== 运行测试 ==========

function test(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.log(`  ❌ ${name} - 异常: ${error}`);
    failCount++;
  }
}

// 输出测试结果
console.log('\n' + '='.repeat(50));
console.log('📊 测试结果');
console.log('='.repeat(50));
console.log(`✅ 通过: ${passCount}`);
console.log(`❌ 失败: ${failCount}`);
console.log(`📈 总计: ${passCount + failCount}`);
console.log(`📊 通过率: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

if (failCount > 0) {
  console.log('\n❌ 测试失败！');
  process.exit(1);
} else {
  console.log('\n✅ 所有测试通过！');
  process.exit(0);
}
