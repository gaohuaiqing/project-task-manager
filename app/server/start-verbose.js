/**
 * 直接启动后端并显示错误
 */
console.log('Starting backend with full error reporting...');

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const { config } = await import('dotenv');
config({ path: '../.env' });

try {
  // 使用 tsx 直接运行 TypeScript 文件
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
