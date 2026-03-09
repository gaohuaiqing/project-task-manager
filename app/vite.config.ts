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

// 热更新时间插件 - 每次热更新时发送最新时间
const hmrTimePlugin: Plugin = {
  name: 'hmr-time-plugin',
  handleHotUpdate({ server }) {
    // 每次热更新时发送最新时间
    server.ws.send({
      type: 'custom',
      event: 'hmr-time',
      data: {
        time: formatLocalTime(new Date()),
        type: 'update'
      }
    });
    return [];
  },
  configureServer(server) {
    // 服务器启动后，发送初始时间给所有已连接的客户端
    server.httpServer?.once('listening', () => {
      setTimeout(() => {
        server.ws.send({
          type: 'custom',
          event: 'hmr-time',
          data: {
            time: formatLocalTime(new Date()),
            type: 'init'
          }
        });
      }, 100);
    });
  }
};

export default defineConfig({
  // 明确指定根目录（因为 vite 从项目根目录运行）
  root: path.resolve(__dirname),
  base: '/',
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
    // 极限性能优化
    minify: 'esbuild',          // 使用 esbuild 压缩（比 terser 快）
    sourcemap: false,            // 生产环境不生成 sourcemap
    reportCompressedSize: false, // 不报告压缩大小（加快构建）
    rollupOptions: {
      output: {
        // 更细粒度的代码分割
        manualChunks: (id) => {
          // React 核心库
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Radix UI 组件
          if (id.includes('@radix-ui')) {
            return 'radix-vendor';
          }
          // 工具库
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'utils-vendor';
          }
          // 图标库
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          // 数据服务
          if (id.includes('services/') || id.includes('contexts/')) {
            return 'data-vendor';
          }
        },
        // 优化文件名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
      // Tree Shaking 优化
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      }
    },
    // 目标浏览器
    target: 'es2020',
    // CSS 代码分割
    cssCodeSplit: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "../Test/frontend"),
    },
  },
  // ==================== 开发服务器性能优化 ====================
  server: {
    host: '0.0.0.0',      // 监听所有网络接口
    port: 5173,           // 固定使用 5173 端口
    strictPort: true,     // 端口被占用时失败（不自动尝试其他端口）

    // HMR 性能优化
    hmr: {
      overlay: true,      // 错误覆盖层
      // 减少 WebSocket 连接开销
      timeout: 30000,     // 连接超时 30 秒
      // 减少 HMR 消息频率
      port: 5173,         // HMR WebSocket 端口
    },

    // 文件监听优化 - 减少文件监听压力
    watch: {
      // 忽略不需要监听的目录
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/Build/**',
        '**/.git/**',
        '**/logs/**',
        '**/Test/**',
      ],
      // 使用轮询而非原生监听（可选，在 WSL 等环境有用）
      // usePolling: false,
      // 减少轮询间隔
      // interval: 100,
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

    // 服务器响应中间件 - 性能监控
    middlewareMode: false,
  },
  // ==================== 依赖预构建优化 ====================
  optimizeDeps: {
    // 强制预构建这些依赖（避免运行时预构建导致的进程激增）
    include: [
      'react',
      'react-dom',
      'react-hook-form',
      'date-fns',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      'class-variance-authority',
    ],
    // 排除不需要预构建的包
    exclude: [],
    // 缓存配置
    force: false,         // 不强制重新预构建（使用缓存）
    // 指定预构建的入口
    entries: ['index.html'],
  },
  // ==================== 源码映射优化 ====================
  // 开发环境使用 cheap 模式，减少内存占用和编译时间
  css: {
    devSourcemap: false,  // CSS 不生成源码映射
    // CSS 代码分割
    modules: {
      localsConvention: 'camelCase'
    }
  },
  // ==================== 性能优化 ====================
  // 减少内存占用
  cacheDir: path.resolve(__dirname, 'node_modules', '.vite'),
  // 启用实验性功能
  experimental: {
    // 启用更高效的 HMR
    renderBuiltUrl(filename, { hostType }) {
      return { relative: true };
    },
    // 启用导入分析（开发模式）
    // importGlobDebug: false,
  },
  // ==================== 插件配置 ====================
  // esbuild 配置
  esbuild: {
    // 生产环境移除 console
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // 设置 JSX 转换
    jsx: 'automatic',
    // 更好的 target 配置
    target: 'es2020',
    // 纯数据标记（Tree Shaking）
    legalComments: 'none'
  },
  // ==================== 预览配置 ====================
  preview: {
    port: 4173,
    host: '0.0.0.0',
    strictPort: true
  }
});
