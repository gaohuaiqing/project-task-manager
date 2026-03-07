/**
 * 苹果风格登录页面
 * Apple Style Login Page
 *
 * 基于 Apple Human Interface Guidelines 设计
 * 简洁、优雅、注重细节
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AppleButton,
  AppleCard,
  AppleInput,
} from '@/components/apple-design';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';

/**
 * 苹果风格登录页面
 *
 * 设计特点：
 * - 简洁的背景，使用柔和的渐变
 * - 玻璃态效果的登录卡片
 * - 系统蓝色作为主色调
 * - 流畅的动画过渡
 * - 清晰的视觉层次
 */
export function LoginPage() {
  const { login } = useAuth();

  // 表单状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 消息状态
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (!success) {
        setError('账号或密码错误');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        // 苹果风格的柔和渐变背景
        background: `
          linear-gradient(135deg,
            hsl(var(--system-blue) / 0.05) 0%,
            hsl(var(--background)) 50%,
            hsl(var(--system-purple) / 0.05) 100%
          )
        `,
      }}
    >
      {/* 背景装饰圆 */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--system-blue) / 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--system-purple) / 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 10s ease-in-out infinite reverse',
        }}
      />

      {/* 主内容区 */}
      <div className="w-full max-w-md relative z-10 animate-scale-fade-in">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          {/* 系统图标 */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-apple-card mb-6 shadow-apple-floating animate-spring-scale">
            <Shield
              className="w-10 h-10"
              style={{ color: 'hsl(var(--system-blue))' }}
            />
          </div>

          {/* 标题 */}
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            技术团队智能管理平台
          </h1>
        </div>

        {/* 登录卡片 */}
        <AppleCard elevated className="animate-slide-up-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="space-y-6">
            {/* 卡片标题 */}
            <div className="text-center">
              <h2
                className="text-xl font-semibold mb-1"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                欢迎回来
              </h2>
              <p
                className="text-sm"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                请使用您的账号和密码登录
              </p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div
                className="p-3 rounded-apple-alert flex items-start gap-3 animate-shake"
                style={{
                  backgroundColor: 'hsl(var(--system-red) / 0.1)',
                  border: `1px solid hsl(var(--system-red) / 0.2)`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: 'hsl(var(--system-red))' }}
                >
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p
                    className="text-sm font-medium mb-0.5"
                    style={{ color: 'hsl(var(--system-red))' }}
                  >
                    登录失败
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'hsl(var(--system-red) / 0.8)' }}
                  >
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* 登录表单 */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* 工号输入 */}
              <AppleInput
                label="工号 / 账号"
                placeholder="请输入工号或管理员账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                prefixIcon={
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ backgroundColor: 'hsl(var(--system-blue) / 0.1)' }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: 'hsl(var(--system-blue))' }}
                    >
                      #
                    </span>
                  </div>
                }
                helperText="您的系统登录账号"
              />

              {/* 密码输入 */}
              <div>
                <AppleInput
                  label="密码"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  prefixIcon={
                    <Lock className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  }
                  suffixIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded hover:bg-muted transition-colors duration-fast"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <p
                  className="text-xs mt-2"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  密码长度至少8个字符
                </p>
              </div>

              {/* 登录按钮 */}
              <AppleButton
                type="submit"
                variant="primary"
                size="large"
                className="w-full"
                disabled={isLoading}
                loading={isLoading}
              >
                {isLoading ? '登录中...' : '登录'}
              </AppleButton>
            </form>

            {/* 底部信息 */}
            <div className="pt-4 border-t border-border text-center">
              <p
                className="text-xs"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                忘记密码？
                <button
                  type="button"
                  className="ml-1 font-medium hover:underline"
                  style={{ color: 'hsl(var(--system-blue))' }}
                >
                  联系管理员重置
                </button>
              </p>
            </div>
          </div>
        </AppleCard>

      </div>

      {/* 浮动动画关键帧 */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(20px, -20px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
