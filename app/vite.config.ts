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
  build: {
    outDir: path.resolve(__dirname, '../Build/frontend/dist'),
    emptyOutDir: true,
    // 内存优化配置
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'radix-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "../Test/frontend"),
    },
  },
  // 开发服务器优化
  server: {
    host: '0.0.0.0',      // 监听所有网络接口
    port: 5173,           // 明确指定端口
    strictPort: false,    // 端口被占用时自动尝试其他端口
    hmr: {
      overlay: true,
    },
    watch: {
      // 减少文件监听压力
      ignored: ['**/node_modules/**', '**/dist/**', '**/Build/**'],
    },
    // 企业代理绕过配置（解决 localhost:3001 无法访问的问题）
    proxy: {
      // 不使用代理，直接访问本地后端
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 确保不经过企业代理
            proxyReq.removeHeader('proxy-connection');
            console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:3001${req.url}`);
          });
        },
      },
    },
  },
  // 优化预构建配置
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-hook-form',
      'date-fns',
      'lucide-react',
    ],
  },
});
