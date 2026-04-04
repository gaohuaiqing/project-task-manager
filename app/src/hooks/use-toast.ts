/**
 * Toast Hook - 包装 sonner 以提供统一的 API
 */
import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant } = options;

    // 直接使用 sonner 的 toast 函数
    // sonner 的 toast.error/toast.success 会自动渲染到 Toaster 组件中
    if (variant === 'destructive') {
      sonnerToast.error(title, {
        description,
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
    } else {
      sonnerToast.success(title, {
        description,
      });
    }
  };

  return { toast };
}

// 导出 toast 函数以便在非 hook 上下文中使用
export const toast = {
  success: (title: string, description?: string) => {
    sonnerToast.success(title, { description });
  },
  error: (title: string, description?: string) => {
    sonnerToast.error(title, {
      description,
      style: {
        background: '#ef4444',
        color: 'white',
      },
    });
  },
};
