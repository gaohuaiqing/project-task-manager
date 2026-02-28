import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 导入存储迁移脚本（自动执行旧数据迁移到新的缓存系统）
import '@/utils/storageMigration'

// 导入前端日志服务（必须在最前面引入，以捕获所有日志）
import '@/services/FrontendLogger'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
