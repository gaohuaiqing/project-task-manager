/**
 * React 错误边界组件
 *
 * 职责：
 * 1. 捕获子组件树中的 JavaScript 错误
 * 2. 显示友好的错误提示
 * 3. 提供重试机制
 * 4. 记录错误日志
 */

import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * 错误边界类组件
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 可以将错误日志上报给服务器
    console.error('[ErrorBoundary] 捕获到错误:', error);
    console.error('[ErrorBoundary] 错误信息:', errorInfo);

    // 记录详细错误信息到 state
    this.setState({
      error,
      errorInfo
    });

    // 调用自定义错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 发送错误日志到服务器（可选）
    this.logErrorToService(error, errorInfo);
  }

  /**
   * 发送错误日志到服务器
   */
  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // 存储到 localStorage 作为本地日志
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push(errorLog);

      // 只保留最近 50 条错误日志
      if (logs.length > 50) {
        logs.shift();
      }

      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('[ErrorBoundary] 记录错误日志失败:', e);
    }
  };

  /**
   * 重试：重新渲染组件
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  /**
   * 返回首页
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * 重新加载页面
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义降级 UI，使用自定义的
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
            {/* 错误图标 */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/30">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* 错误标题 */}
            <h1 className="text-2xl font-bold text-white text-center mb-3">
              出现了一些问题
            </h1>

            {/* 错误描述 */}
            <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">
              抱歉，页面遇到了意外错误。我们已经记录了这个问题，您可以尝试以下操作：
            </p>

            {/* 错误详情（仅开发环境） */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <summary className="text-sm text-slate-300 cursor-pointer hover:text-white transition-colors mb-2">
                  查看错误详情
                </summary>
                <div className="mt-3 space-y-2">
                  <div className="text-xs">
                    <span className="text-slate-500">错误信息：</span>
                    <span className="text-red-400 font-mono break-all">
                      {this.state.error.message}
                    </span>
                  </div>
                  {this.state.error.stack && (
                    <div className="text-xs">
                      <span className="text-slate-500">堆栈跟踪：</span>
                      <pre className="text-slate-400 font-mono text-xs mt-1 overflow-auto max-h-40 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* 操作按钮 */}
            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  刷新页面
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </div>
            </div>

            {/* 帮助提示 */}
            <div className="mt-6 pt-6 border-t border-slate-700 text-center">
              <p className="text-xs text-slate-500">
                如果问题持续存在，请联系系统管理员
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 函数式错误边界 Hook（适用于函数组件）
 * 注意：React Hooks 不能直接捕获错误，仍需使用类组件 ErrorBoundary
 * 这是一个简化版本，用于在函数组件中包裹可能出错的部分
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
