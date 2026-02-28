import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin } from "vite"

function formatLocalTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const BUILD_START_TIME = formatLocalTime(new Date());

console.log('\n' + '='.repeat(60));
console.log('系统构建时间 (BUILD_TIME)');
console.log('生成时间点: 构建流程启动');
console.log(`时间戳数值: ${BUILD_START_TIME}`);
console.log('时间格式: YYYY-MM-DD HH:MM:SS (本地时间)');
console.log('精确度: 秒级');
console.log('说明: 此时间戳代表代码修改完成并开始构建的时间点');
console.log('='.repeat(60) + '\n');

// 热更新时间插件
const hmrTimePlugin: Plugin = {
  name: 'hmr-time-plugin',
  configureServer(server) {
    server.ws.on('update', () => {
      // 热更新时不修改构建时间，而是在前端通过其他方式处理
    });
  }
};

export default defineConfig({
  base: './',
  plugins: [react(), hmrTimePlugin],
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_START_TIME),
    __IS_DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
