import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { authApi } from '../api';
import { queryKeys } from '@/lib/api/query-keys';
import { useAppContext } from '@/shared/context/AppContext';
import type { LoginRequest, User, Permission, AuthState } from '../types';

/**
 * 认证 Hook
 */
export function useAuth(): AuthState & {
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
} {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCurrentUser } = useAppContext();

  // 检查是否有登录标记
  const [hasAuthSession, setHasAuthSession] = useState(() => {
    return localStorage.getItem('auth_session') === 'true';
  });

  // 获取当前用户
  const { data: user } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: authApi.getCurrentUser,
    enabled: hasAuthSession,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 分钟
  });

  // 登录
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      // 设置登录标记
      localStorage.setItem('auth_session', 'true');
      setHasAuthSession(true);

      // 设置用户信息
      setCurrentUser({
        id: response.user.id,
        username: response.user.username,
        displayName: response.user.displayName,
        email: response.user.email,
        avatar: response.user.avatar,
      });

      // 刷新用户数据
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });

      // 跳转到仪表板
      navigate('/dashboard');
    },
  });

  // 登出
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // 清除登录标记
      localStorage.removeItem('auth_session');
      setHasAuthSession(false);

      // 清除用户信息
      setCurrentUser(null);

      // 清除所有缓存
      queryClient.clear();

      // 跳转到登录页
      navigate('/login');
    },
  });

  // 登录方法
  const login = useCallback(
    async (data: LoginRequest) => {
      await loginMutation.mutateAsync(data);
    },
    [loginMutation]
  );

  // 登出方法
  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // 检查单个权限
  const hasPermission = useCallback(
    (permission: Permission) => {
      return user?.permissions.includes(permission) ?? false;
    },
    [user?.permissions]
  );

  // 检查是否有任一权限
  const hasAnyPermission = useCallback(
    (permissions: Permission[]) => {
      if (!user?.permissions) return false;
      return permissions.some((p) => user.permissions.includes(p));
    },
    [user?.permissions]
  );

  // 检查是否有所有权限
  const hasAllPermissions = useCallback(
    (permissions: Permission[]) => {
      if (!user?.permissions) return false;
      return permissions.every((p) => user.permissions.includes(p));
    },
    [user?.permissions]
  );

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: loginMutation.isPending || logoutMutation.isPending,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

export default useAuth;
