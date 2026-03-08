import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './fonts.css'
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

    // 修复深色主题下日期选择器图标颜色
    const styleId = 'date-input-icon-fix'

    const fixDateInputIcons = () => {
      const isDark = document.documentElement.classList.contains('dark')
      const existingStyle = document.getElementById(styleId) as HTMLStyleElement

      if (isDark) {
        // 深色主题：添加修复样式
        if (!existingStyle) {
          const styleEl = document.createElement('style')
          styleEl.id = styleId
          styleEl.textContent = `
            input[type="date"]::-webkit-calendar-picker-indicator {
              filter: brightness(0) invert(1) !important;
              opacity: 1 !important;
              cursor: pointer !important;
            }
            input[type="date"]::-moz-calendar-picker-indicator {
              filter: brightness(0) invert(1) !important;
              opacity: 1 !important;
              cursor: pointer !important;
            }
          `
          document.head.appendChild(styleEl)
        }
      } else {
        // 浅色主题：移除修复样式
        if (existingStyle) {
          existingStyle.remove()
        }
      }
    }

    // 初始修复
    fixDateInputIcons()

    // 监听主题变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          fixDateInputIcons()
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    // 页面卸载时清理所有服务
    return () => {
      observer.disconnect()
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
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
