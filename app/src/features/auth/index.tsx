import { LoginForm } from './components/LoginForm';

/**
 * 登录页面
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <LoginForm />
    </div>
  );
}

// 导出组件和 hooks
export { LoginForm } from './components/LoginForm';
export { ProtectedRoute } from './components/ProtectedRoute';
export { useAuth } from './hooks/useAuth';
export type { User, Permission, LoginRequest, AuthState } from './types';
