/**
 * 浏览器存储隔离验证
 *
 * 在不同浏览器中运行此代码，会发现：
 * 1. Chrome 无法读取 Edge 的 IndexedDB
 * 2. Edge 无法读取 Chrome 的 IndexedDB
 * 3. Firefox 无法读取任何其他浏览器的数据
 */

export async function testBrowserStorageIsolation() {
  console.log('🔍 测试浏览器存储隔离...');

  // 1. 测试 IndexedDB
  try {
    const request = indexedDB.open('TestDB', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('testStore');
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['testStore'], 'readwrite');
      const store = transaction.objectStore('testStore');

      // 写入测试数据
      store.put({ browser: navigator.userAgent, timestamp: Date.now() }, 'test');

      console.log('✅ IndexedDB 写入成功');
      console.log('   当前浏览器:', navigator.userAgent);
    };

    request.onerror = () => {
      console.error('❌ IndexedDB 打开失败');
    };
  } catch (error) {
    console.error('❌ IndexedDB 不支持:', error);
  }

  // 2. 测试 localStorage（同样隔离）
  try {
    localStorage.setItem('test_storage', JSON.stringify({
      browser: navigator.userAgent,
      timestamp: Date.now()
    }));
    console.log('✅ localStorage 写入成功');
  } catch (error) {
    console.error('❌ localStorage 失败:', error);
  }

  // 3. 测试 Shared Storage（不存在）
  console.log('❌ Shared Storage API 不存在（浏览器不支持）');
}

/**
 * 跨浏览器数据同步方案对比
 */
export const CROSS_BROWSER_SYNC_METHODS = {
  indexedDB: {
    name: 'IndexedDB',
    description: '浏览器本地存储',
    crossBrowser: false,
    crossTab: true, // 同一浏览器的不同标签页可以共享
    capacity: '~1GB',
    persistence: '永久（除非用户清除）',
    limitations: '完全隔离，无法跨浏览器共享'
  },

  localStorage: {
    name: 'localStorage',
    description: '键值对存储',
    crossBrowser: false,
    crossTab: true, // storage 事件可实现跨标签页
    capacity: '5-10MB',
    persistence: '永久（除非用户清除）',
    limitations: '完全隔离，无法跨浏览器共享'
  },

  sessionStorage: {
    name: 'sessionStorage',
    description: '会话级存储',
    crossBrowser: false,
    crossTab: false, // 连标签页都无法共享
    capacity: '5-10MB',
    persistence: '标签页关闭即清除',
    limitations: '最严格的隔离'
  },

  broadcastChannel: {
    name: 'BroadcastChannel API',
    description: '同源跨标签页通信',
    crossBrowser: false, // 仅限同一浏览器
    crossTab: true,
    capacity: '不存储数据，仅传递消息',
    persistence: '不适用',
    limitations: '同一浏览器的不同标签页/窗口'
  },

  webSocket: {
    name: 'WebSocket',
    description: '服务器中转通信',
    crossBrowser: true, // ✅ 只要连接同一服务器即可
    crossTab: true,
    capacity: '无限制',
    persistence: '依赖服务器',
    limitations: '需要服务器支持'
  },

  httpApi: {
    name: 'HTTP API',
    description: '请求-响应模式',
    crossBrowser: true, // ✅ 只要请求同一服务器即可
    crossTab: true,
    capacity: '无限制',
    persistence: '依赖服务器',
    limitations: '需要网络连接'
  }
};

/**
 * 推荐的跨浏览器同步方案
 */
export const RECOMMENDED_SYNC_SOLUTION = {
  name: 'MySQL + WebSocket 实时推送',
  architecture: `
┌─────────┐    HTTP/WebSocket    ┌─────────┐
│ Chrome  │ ──────────────────→ │         │
└─────────┘                     │         │
                                 │  MySQL  │ ← 唯一真实数据源
┌─────────┐    HTTP/WebSocket    │  服务器 │
│  Edge   │ ──────────────────→ │         │
└─────────┘                     │         │
                                 │         │
┌─────────┐    HTTP/WebSocket    │         │
│ Firefox  │ ──────────────────→ │         │
└─────────┘                     └─────────┘
  `,
  benefits: [
    '✅ 完全跨浏览器支持',
    '✅ 数据一致性保证（MySQL事务）',
    '✅ 实时同步（WebSocket推送）',
    '✅ 无容量限制',
    '✅ 支持版本控制（乐观锁）',
    '✅ 支持冲突检测和解决',
    '✅ 数据持久化（服务器存储）',
    '✅ 支持离线编辑（IndexedDB本地草稿）'
  ]
};

/**
 * IndexedDB 在本系统中的正确用途
 */
export const INDEXEDDB_USAGE_IN_THIS_SYSTEM = {
  offlineDrafts: {
    purpose: '离线草稿存储',
    description: '用户离线时保存编辑内容，网络恢复后同步到服务器',
    benefits: [
      '大容量（1GB+）',
      '支持复杂数据结构（IndexedDB是对象数据库）',
      '异步API，不阻塞主线程',
      '支持索引查询'
    ],
    note: '仅用于临时存储，最终数据源仍是MySQL'
  },

  cache: {
    purpose: '本地缓存',
    description: '缓存已获取的数据，减少API调用',
    benefits: [
      '提升加载速度',
      '减少网络流量',
      '支持离线浏览（只读）'
    ],
    note: '仅作为MySQL的缓存层，不可靠'
  },

  notSuitable: {
    purpose: '❌ 跨浏览器数据共享',
    reason: 'IndexedDB完全隔离，Chrome无法读取Edge的数据',
    solution: '必须通过服务器（MySQL + WebSocket）实现跨浏览器同步'
  }
};

// 导出类型
export type CrossBrowserSyncMethod = keyof typeof CROSS_BROWSER_SYNC_METHODS;

/**
 * 使用示例
 */
export async function demonstrateCrossBrowserSync() {
  // 在Chrome中运行
  await testBrowserStorageIsolation();

  console.log('\n📊 跨浏览器同步方案对比:');
  console.table(CROSS_BROWSER_SYNC_METHODS);

  console.log('\n💡 推荐方案:');
  console.log(RECOMMENDED_SYNC_SOLUTION.name);
  console.log(RECOMMENDED_SYNC_SOLUTION.architecture);

  console.log('\n✅ IndexedDB在本系统中的用途:');
  console.log('1. 离线草稿存储（IndexedDB）');
  console.log('2. 本地数据缓存（内存Map + 30秒TTL）');
  console.log('3. ❌ 不能用于跨浏览器数据共享（使用MySQL）');

  console.log('\n🎯 总结:');
  console.log('IndexedDB + MySQL + WebSocket = 完整解决方案');
  console.log('- IndexedDB: 离线草稿、本地缓存');
  console.log('- MySQL: 唯一真实数据源');
  console.log('- WebSocket: 实时数据同步');
}

// 自动执行演示
if (typeof window !== 'undefined') {
  demonstrateCrossBrowserSync();
}
