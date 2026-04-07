import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * 主布局组件
 */
export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 头部 */}
        <Header />

        {/* 内容区域 - 移除 overflow-auto 避免嵌套滚动问题 */}
        <main className="flex-1 overflow-hidden bg-background p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
