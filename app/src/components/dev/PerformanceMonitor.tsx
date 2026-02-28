/**
 * 性能监控组件
 * 仅在开发环境显示，实时显示性能指标
 */

import { useState, useEffect } from 'react';
import { Activity, Clock, Database, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  apiResponseTime: number;
  memoryUsage: number;
}

export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    apiResponseTime: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    if (!isVisible) return;

    // 测量渲染时间
    const measureRender = () => {
      const start = performance.now();
      requestAnimationFrame(() => {
        const end = performance.now();
        setMetrics(prev => ({ ...prev, renderTime: end - start }));
      });
    };

    // 测量组件数量
    const countComponents = () => {
      const reactRoot = document.getElementById('root');
      if (reactRoot) {
        const componentCount = reactRoot.querySelectorAll('[class*="rt-"]').length;
        setMetrics(prev => ({ ...prev, componentCount }));
      }
    };

    // 测量内存使用
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1048576)
        }));
      }
    };

    // 定期更新指标
    const interval = setInterval(() => {
      measureRender();
      countComponents();
      measureMemory();
    }, 2000);

    // 监听 API 响应时间
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await originalFetch(...args);
      const end = performance.now();
      setMetrics(prev => ({
        ...prev,
        apiResponseTime: Math.round(end - start)
      }));
      return response;
    };

    return () => {
      clearInterval(interval);
      window.fetch = originalFetch;
    };
  }, [isVisible]);

  // 仅在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* 切换按钮 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        title="性能监控"
      >
        <Activity className="w-5 h-5" />
      </button>

      {/* 性能面板 */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-card border border-border rounded-lg shadow-xl">
          <Card className="border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                性能监控
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 渲染时间 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  渲染时间
                </div>
                <span className={`text-sm font-medium ${
                  metrics.renderTime < 16 ? 'text-green-500' :
                  metrics.renderTime < 50 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {metrics.renderTime.toFixed(2)} ms
                </span>
              </div>

              {/* 组件数量 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  组件数量
                </div>
                <span className="text-sm font-medium">{metrics.componentCount}</span>
              </div>

              {/* API 响应时间 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="w-4 h-4" />
                  API 响应
                </div>
                <span className={`text-sm font-medium ${
                  metrics.apiResponseTime < 200 ? 'text-green-500' :
                  metrics.apiResponseTime < 500 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {metrics.apiResponseTime} ms
                </span>
              </div>

              {/* 内存使用 */}
              {metrics.memoryUsage > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="w-4 h-4" />
                    内存使用
                  </div>
                  <span className="text-sm font-medium">{metrics.memoryUsage} MB</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
