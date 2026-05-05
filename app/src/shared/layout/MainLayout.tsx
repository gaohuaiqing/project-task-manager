import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { InlinePageLoader } from '../components/LoadingSpinner';

/**
 * 主布局组件
 * Suspense包裹Outlet，确保懒加载页面在Header/Sidebar已渲染时
 * 只在内容区域显示加载状态，避免整页白屏
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

        {/* 内容区域 - 启用滚动以显示完整内容 */}
        <main className="flex-1 overflow-auto bg-background p-6">
          <ErrorBoundary>
            <Suspense fallback={<InlinePageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
