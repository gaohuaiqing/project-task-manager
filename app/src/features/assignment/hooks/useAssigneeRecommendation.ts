/**
 * 智能推荐负责人 Hook
 */
import { useQuery } from '@tanstack/react-query';
import { getAssigneeRecommendations, type AssigneeRecommendation } from '@/lib/api/org.api';

// 重导出类型
export type { AssigneeRecommendation };

/**
 * 获取任务负责人智能推荐
 */
export function useAssigneeRecommendation(taskType: string | undefined, enabled: boolean = false) {
  return useQuery({
    queryKey: ['org', 'recommend-assignee', taskType],
    queryFn: () => getAssigneeRecommendations(taskType!),
    enabled: !!taskType && enabled,
    staleTime: 2 * 60 * 1000, // 2 分钟
  });
}

/**
 * 获取匹配等级样式
 */
export function getMatchLevelStyle(level: 'excellent' | 'good' | 'fair'): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (level) {
    case 'excellent':
      return { label: '优秀', color: 'text-emerald-600', bgColor: 'bg-emerald-50' };
    case 'good':
      return { label: '良好', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    case 'fair':
      return { label: '一般', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    default:
      return { label: '未知', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
}
