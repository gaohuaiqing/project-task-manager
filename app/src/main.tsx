import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './fonts.css'
import App from './App.tsx'

// 导入主题提供者
import { ThemeProvider } from '@/components/theme/ThemeProvider'

// 导入服务管理器
import { serviceManager } from '@/services/ServiceManager'

// 标记 HTML 为已加载（显示内容）
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('loaded');
  });
}

// 注意：FrontendLogger 改为延迟加载，避免阻塞初始渲染
// 它将在 RootApp 组件挂载后异步加载

// 创建根组件包装器
function RootApp() {
  useEffect(() => {
    // 异步初始化所有服务（不阻塞渲染）
    Promise.resolve().then(async () => {
      // 延迟加载非关键服务（性能优化）
      if (typeof window !== 'undefined') {
        // 延迟加载日志服务
        import('@/services/FrontendLogger').then(() => {
          console.log('[RootApp] 日志服务已加载');
        }).catch(error => {
          console.warn('[RootApp] 日志服务加载失败:', error);
        });

        // 延迟加载存储迁移
        import('@/utils/storageMigration').then(() => {
          console.log('[RootApp] 存储迁移脚本已加载');
        }).catch(error => {
          console.warn('[RootApp] 存储迁移脚本加载失败:', error);
        });
      }

      // 初始化所有服务
      await serviceManager.init().catch(error => {
        console.error('[RootApp] 服务初始化失败:', error);
      });
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
