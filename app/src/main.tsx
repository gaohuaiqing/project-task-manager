import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 导入主题提供者
import { ThemeProvider } from '@/components/theme/ThemeProvider'

// 导入存储迁移脚本（自动执行旧数据迁移到新的缓存系统）
import '@/utils/storageMigration'

// 导入前端日志服务（必须在最前面引入，以捕获所有日志）
import '@/services/FrontendLogger'

// 导入服务管理器（代替直接导入 BackendMonitor）
import { serviceManager } from '@/services/ServiceManager'

// 创建根组件包装器
function RootApp() {
  useEffect(() => {
    // 初始化所有服务
    serviceManager.init().catch(error => {
      console.error('[RootApp] 服务初始化失败:', error);
    });

    // 页面卸载时清理所有服务
    return () => {
      serviceManager.destroy().catch(error => {
        console.error('[RootApp] 服务清理失败:', error);
      });
    };
  }, []);

  // 定期监控内存使用（仅开发环境）
  useEffect(() => {
    if (import.meta.env.DEV) {
      const interval = setInterval(() => {
        const memory = serviceManager.getMemoryUsage();
        if (memory.used > 500) { // 超过 500MB 时警告
          console.warn(`[内存监控] 当前内存使用: ${memory.used}MB / ${memory.total}MB`);
        }
      }, 30000); // 每 30 秒检查一次

      return () => clearInterval(interval);
    }
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RootApp />
    </ThemeProvider>
  </StrictMode>,
)
