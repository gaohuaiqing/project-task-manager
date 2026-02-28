import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotification } from '@/hooks/useNotification';

export interface NotificationProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
}

const NotificationTypeMap = {
  info: {
    icon: null,
    className: 'bg-blue-900/20 border-blue-700/50 text-blue-200',
    title: '信息'
  },
  success: {
    icon: null,
    className: 'bg-green-900/20 border-green-700/50 text-green-200',
    title: '成功'
  },
  warning: {
    icon: null,
    className: 'bg-amber-900/20 border-amber-700/50 text-amber-200',
    title: '警告'
  },
  error: {
    icon: null,
    className: 'bg-red-900/20 border-red-700/50 text-red-200',
    title: '错误'
  }
};

export function Notification({ 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          onClose();
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const config = NotificationTypeMap[type];

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-md">
      <Alert className={cn('relative', config.className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {title && (
              <AlertTitle className="font-medium mb-1">
                {title}
              </AlertTitle>
            )}
            <AlertDescription>
              {message}
            </AlertDescription>
          </div>
          <button
            type="button"
            className="ml-4 text-slate-400 hover:text-white focus:outline-none"
            onClick={() => {
              setIsVisible(false);
              if (onClose) {
                onClose();
              }
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Alert>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notificationContext = useNotification();

  return (
    <div>
      {children}
      {notificationContext.notifications.map(notification => (
        <Notification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          duration={notification.duration}
          onClose={() => notificationContext.removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}