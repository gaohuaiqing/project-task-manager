/**
 * 简单的后端启动脚本
 */
console.log('Starting backend...');

const { config } = await import('dotenv');
config({ path: '../.env' });

// 直接导入并运行
try {
  const { execSync } = await import('child_process');
  console.log('Starting backend server with tsx...');
  execSync('npx tsx src/index.ts', {
    stdio: 'inherit',
    cwd: new URL('.', import.meta.url).pathname
  });
} catch (error) {
  console.error('Failed to start backend:', error);
  process.exit(1);
}
