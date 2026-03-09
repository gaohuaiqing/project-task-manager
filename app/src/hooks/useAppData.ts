/**
 * 应用数据管理 Hook
 *
 * 职责：
 * - 初始数据加载
 * - 数据变更监听
 * - WebSocket 实时更新
 * - 手动刷新数据
 *
 * 性能优化：
 * - 按用户角色按需加载数据
 * - 工程师角色只加载自己的任务
 * - 管理员加载全量数据
 * - 使用分页减少首次加载量
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { mySqlDataService } from '@/services/MySqlDataService';
import { useAuth } from '@/contexts/AuthContext';

export interface AppData {
  members: any[];
  projects: any[];
  tasks: any[];
  isLoading: boolean;
  lastUpdate: Date;
}

/**
 * 根据用户角色获取需要加载的数据类型
 */
function getDataLoadConfig(userRole: string) {
  switch (userRole) {
    case 'engineer':
      // 工程师：只需要成员列表和自己的任务
      return {
        loadProjects: false,
        loadMembers: true,
        loadTasks: 'self' as const
      };
    case 'manager':
      // 经理：需要项目和成员，加载所有任务
      return {
        loadProjects: true,
        loadMembers: true,
        loadTasks: 'all' as const
      };
    case 'admin':
      // 管理员：加载全量数据
      return {
        loadProjects: true,
        loadMembers: true,
        loadTasks: 'all' as const
      };
    default:
      // 未知角色：最小数据集
      return {
        loadProjects: false,
        loadMembers: true,
        loadTasks: 'self' as const
      };
  }
}

export function useAppData() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 初始数据加载（按角色优化）
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);

        // 根据用户角色决定加载哪些数据
        const config = user ? getDataLoadConfig(user.role) : getDataLoadConfig('unknown');
        console.log('[useAppData] 用户角色:', user?.role, '加载配置:', config);

        // 使用优化的初始数据接口一次性获取所有数据
        const initialData = await mySqlDataService.getInitialData();

        if (isMounted) {
          let projectsData = initialData.projects || [];
          let membersData = initialData.members || [];
          let tasksData = initialData.tasks || [];

          // 根据角色过滤数据
          if (!config.loadProjects) {
            projectsData = [];
          }
          if (!config.loadMembers) {
            membersData = [];
          }
          if (config.loadTasks === 'self' && user) {
            tasksData = tasksData.filter(task => {
              const assignedTo = task.assignedTo || task.assigned_to;
              const assignees = task.assignees || [];
              return assignedTo === user.id ||
                     (Array.isArray(assignees) && assignees.includes(user.id));
            });
            console.log('[useAppData] 工程师任务过滤:', {
              总任务数: initialData.tasks?.length || 0,
              我的任务数: tasksData.length
            });
          } else if (config.loadTasks !== 'all') {
            tasksData = [];
          }

          setMembers(membersData);
          setProjects(projectsData);
          setTasks(tasksData);
          setLastUpdate(new Date());

          console.log('[useAppData] 数据加载完成:', {
            members: membersData.length,
            projects: projectsData.length,
            tasks: tasksData.length,
            role: user?.role
          });

          // 派发组织架构加载完成事件
          if (membersData.length > 0) {
            window.dispatchEvent(new CustomEvent('organization-changed', {
              detail: { members: membersData, source: 'initial-load' }
            }));
          }
        }
      } catch (error) {
        console.error('[useAppData] 数据加载失败:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]); // 依赖 user，当用户角色变化时重新加载

  // 监听数据变更事件（按角色优化）
  useEffect(() => {
    const handleDataChanged = async (event: CustomEvent) => {
      const { type } = event.detail;
      console.log('[useAppData] 收到数据变更事件:', type);

      try {
        const config = user ? getDataLoadConfig(user.role) : getDataLoadConfig('unknown');

        if (type === 'projects' || type === 'all') {
          if (config.loadProjects) {
            const projectsData = await mySqlDataService.getProjects();
            setProjects(projectsData);
          }
        }
        if (type === 'members' || type === 'all') {
          if (config.loadMembers) {
            const membersData = await mySqlDataService.getMembers();
            setMembers(membersData);
            window.dispatchEvent(new CustomEvent('organization-changed', {
              detail: { members: membersData, source: 'data-refresh' }
            }));
          }
        }
        if (type === 'tasks' || type === 'all') {
          const tasksData = await mySqlDataService.getWbsTasks();
          if (config.loadTasks === 'all') {
            setTasks(tasksData);
          } else if (config.loadTasks === 'self' && user) {
            const filteredTasks = tasksData.filter(task => {
              const assignedTo = task.assignedTo || task.assigned_to;
              const assignees = task.assignees || [];
              return assignedTo === user.id ||
                     (Array.isArray(assignees) && assignees.includes(user.id));
            });
            setTasks(filteredTasks);
          }
        }
        setLastUpdate(new Date());
      } catch (error) {
        console.error('[useAppData] 刷新数据失败:', error);
      }
    };

    window.addEventListener('data-changed', handleDataChanged as EventListener);
    return () => window.removeEventListener('data-changed', handleDataChanged as EventListener);
  }, [user]);

  // 监听 WebSocket 实时更新（按角色过滤）
  useEffect(() => {
    const config = user ? getDataLoadConfig(user.role) : getDataLoadConfig('unknown');

    const unsubscribeMembers = mySqlDataService.on('members', ({ operation, record }) => {
      console.log('[useAppData] 收到成员更新:', operation, record);
      if (!config.loadMembers) return;
      setMembers(prev => {
        switch (operation) {
          case 'create': return [...prev, record];
          case 'update': return prev.map(m => m.id === record.id ? record : m);
          case 'delete': return prev.filter(m => m.id !== record.id);
          default: return prev;
        }
      });
      setLastUpdate(new Date());
    });

    const unsubscribeProjects = mySqlDataService.on('projects', ({ operation, record }) => {
      console.log('[useAppData] 收到项目更新:', operation, record);
      if (!config.loadProjects) return;
      setProjects(prev => {
        switch (operation) {
          case 'create': return [...prev, record];
          case 'update': return prev.map(p => p.id === record.id ? record : p);
          case 'delete': return prev.filter(p => p.id !== record.id);
          default: return prev;
        }
      });
      setLastUpdate(new Date());
    });

    const unsubscribeTasks = mySqlDataService.on('wbs_tasks', ({ operation, record }) => {
      console.log('[useAppData] 收到任务更新:', operation, record);

      // 工程师角色：只处理分配给自己的任务
      if (config.loadTasks === 'self' && user) {
        const isAssignedToUser = record.assignedTo === user.id ||
                                  record.assigned_to === user.id ||
                                  record.assignees?.includes(user.id);
        if (!isAssignedToUser) return;
      }

      setTasks(prev => {
        switch (operation) {
          case 'create': return [...prev, record];
          case 'update': return prev.map(t => t.id === record.id ? record : t);
          case 'delete': return prev.filter(t => t.id !== record.id);
          default: return prev;
        }
      });
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribeMembers();
      unsubscribeProjects();
      unsubscribeTasks();
    };
  }, [user]);

  // 手动刷新数据（按角色优化）
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      await mySqlDataService.refreshAll();

      // 根据用户角色决定刷新哪些数据
      const config = user ? getDataLoadConfig(user.role) : getDataLoadConfig('unknown');

      const dataPromises: Promise<any>[] = [];

      if (config.loadMembers) {
        dataPromises.push(mySqlDataService.getMembers());
      } else {
        dataPromises.push(Promise.resolve([]));
      }

      if (config.loadProjects) {
        dataPromises.push(mySqlDataService.getProjects());
      } else {
        dataPromises.push(Promise.resolve([]));
      }

      if (config.loadTasks === 'all') {
        dataPromises.push(mySqlDataService.getWbsTasks());
      } else if (config.loadTasks === 'self' && user) {
        // 工程师：加载所有任务后过滤
        dataPromises.push(mySqlDataService.getWbsTasks());
      } else {
        dataPromises.push(Promise.resolve([]));
      }

      const [membersData, projectsData, tasksData] = await Promise.all(dataPromises);

      setMembers(membersData);
      setProjects(projectsData);

      // 工程师角色：过滤出分配给自己的任务
      let filteredTasks = tasksData;
      if (config.loadTasks === 'self' && user) {
        filteredTasks = tasksData.filter(task => {
          const assignedTo = task.assignedTo || task.assigned_to;
          const assignees = task.assignees || [];
          return assignedTo === user.id ||
                 (Array.isArray(assignees) && assignees.includes(user.id));
        });
      }

      setTasks(filteredTasks);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[useAppData] 刷新数据失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    members,
    projects,
    tasks,
    isLoading,
    lastUpdate,
    refresh
  };
}
