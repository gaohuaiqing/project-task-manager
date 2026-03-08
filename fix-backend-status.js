// 后端状态修复脚本
// 在浏览器控制台中运行此脚本

console.log('🔧 开始修复后端状态...');

// 1. 清除 localStorage 中的离线状态
const keysToRemove = [
  'backend_offline_status',
  'backend_status_cache',
  'ws_reconnect_attempts',
  'ws_last_disconnect_time',
  'backend_status_fallback'
];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ 已清除: ${key}`);
  }
});

// 2. 清除所有前端日志缓存
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('frontend_log_') || 
      key.startsWith('log_') || 
      key.startsWith('async_log_')) {
    localStorage.removeItem(key);
    console.log(`✅ 已清除日志缓存: ${key}`);
  }
});

// 3. 手动触发后端状态检查
console.log('🔍 检查后端服务...');

fetch('http://localhost:3001/health')
  .then(response => {
    if (response.ok) {
      console.log('✅ 后端服务在线！');
      console.log('📝 正在刷新页面...');
      setTimeout(() => {
        location.reload();
      }, 1000);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  })
  .catch(error => {
    console.error('❌ 后端服务检查失败:', error);
    console.log('💡 请确保后端服务正在运行:');
    console.log('   cd app/server && npm run dev');
  });

console.log('✨ 修复脚本执行完成');
