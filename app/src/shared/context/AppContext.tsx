import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * 应用全局状态
 */
interface AppContextValue {
  // 侧边栏状态
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // 主题
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // 用户信息
  currentUser: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatar?: string;
    role?: string;
  } | null;
  setCurrentUser: (user: AppContextValue['currentUser']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * 应用状态 Provider
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    // 从 localStorage 读取主题
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  });
  const [currentUser, setCurrentUser] = useState<AppContextValue['currentUser']>(null);

  // 主题变化时保存到 localStorage
  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    // 更新 document class
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        theme,
        setTheme,
        currentUser,
        setCurrentUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/**
 * 使用应用状态的 Hook
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

export default AppContext;
