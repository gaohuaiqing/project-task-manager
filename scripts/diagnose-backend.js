/**
 * 诊断后端启动问题
 */
const { spawn } = require('child_process');
const path = require('path');

console.log('========================================');
console.log('后端启动诊断');
console.log('========================================\n');

// 1. 检查端口占用
console.log('1. 检查端口 3001...');
const { execSync } = require('child_process');

try {
  const result = execSync('netstat -ano | findstr ":3001"', { encoding: 'utf8' });
  if (result.trim()) {
    console.log('   端口 3001 已被占用:');
    console.log('   ', result.trim().split('\n')[0]);
    console.log('\n   建议: 终止占用端口的进程或使用其他端口\n');
  } else {
    console.log('   ✓ 端口 3001 可用\n');
  }
} catch (e) {
  console.log('   ✓ 端口 3001 可用\n');
}

// 2. 尝试直接运行后端
console.log('2. 尝试启动后端...\n');

const backendProcess = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd: path.join(__dirname, '../app/server'),
  shell: true,
  stdio: 'pipe',
  env: { ...process.env }
});

let output = '';
let errorOutput = '';

backendProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

backendProcess.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  process.stderr.write(text);
});

backendProcess.on('error', (error) => {
  console.error('   ✗ 启动失败:', error.message);
});

backendProcess.on('close', (code) => {
  console.log(`\n后端进程退出，代码: ${code}`);

  if (code !== 0) {
    console.log('\n========================================');
    console.log('诊断结果:');
    console.log('========================================\n');
    console.log('后端启动失败，可能的原因:\n');

    if (errorOutput.includes('Cannot find module')) {
      console.log('1. 缺少依赖包 → 运行: cd app/server && npm install');
    } else if (errorOutput.includes('EADDRINUSE')) {
      console.log('2. 端口 3001 被占用 → 终止占用端口的进程');
    } else if (errorOutput.includes('ECONNREFUSED')) {
      console.log('3. 数据库连接失败 → 检查 MySQL 服务是否启动');
    } else {
      console.log('其他错误:', errorOutput);
    }
  } else {
    console.log('\n✓ 后端启动成功！');
  }

  process.exit(code);
});

// 等待一段时间，然后测试连接
setTimeout(async () => {
  try {
    console.log('\n3. 测试后端连接...');
    const response = await fetch('http://localhost:3001/health');
    const text = await response.text();
    console.log('   ✓ 后端响应:', text);
  } catch (e) {
    console.log('   ✗ 后端无响应:', e.message);
  }

  // 终止后端进程
  setTimeout(() => {
    backendProcess.kill();
  }, 2000);
}, 5000);
