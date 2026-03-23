/**
 * AvatarGroup 组件 - 头像堆叠显示
 * 用于项目卡片等场景，显示成员头像组
 */
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

export interface AvatarGroupMember {
  id: number | string;
  name: string;
  avatar?: string;
}

interface AvatarGroupProps {
  members: AvatarGroupMember[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: {
    avatar: 'size-6',
    text: 'text-[10px]',
    overlap: '-ml-1.5',
    more: 'size-6 text-[10px]',
  },
  md: {
    avatar: 'size-8',
    text: 'text-xs',
    overlap: '-ml-2',
    more: 'size-8 text-xs',
  },
  lg: {
    avatar: 'size-10',
    text: 'text-sm',
    overlap: '-ml-2.5',
    more: 'size-10 text-sm',
  },
};

/**
 * 获取名称的首字母（最多2个字符）
 */
function getInitials(name: string): string {
  if (!name) return '?';
  const chars = name.trim().split('');
  if (chars.length === 1) return chars[0].toUpperCase();
  // 中文名取前两个字符，英文名取首字母
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return chars.slice(0, 2).join('');
  }
  // 英文名取首字母
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return chars[0].toUpperCase();
}

/**
 * 根据名称生成稳定的背景颜色
 */
function getColorByName(name: string): string {
  const colors = [
    'bg-red-400',
    'bg-orange-400',
    'bg-amber-400',
    'bg-yellow-400',
    'bg-lime-400',
    'bg-green-400',
    'bg-emerald-400',
    'bg-teal-400',
    'bg-cyan-400',
    'bg-sky-400',
    'bg-blue-400',
    'bg-indigo-400',
    'bg-violet-400',
    'bg-purple-400',
    'bg-fuchsia-400',
    'bg-pink-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function AvatarGroup({
  members,
  max = 5,
  size = 'md',
  className,
}: AvatarGroupProps) {
  if (!members || members.length === 0) {
    return null;
  }

  const config = sizeConfig[size];
  const displayMembers = members.slice(0, max);
  const remainingCount = members.length - max;

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        {displayMembers.map((member, index) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'relative ring-2 ring-background rounded-full',
                  config.overlap,
                  index === 0 && 'ml-0'
                )}
              >
                <Avatar className={config.avatar}>
                  {member.avatar ? (
                    <AvatarImage src={member.avatar} alt={member.name} />
                  ) : null}
                  <AvatarFallback
                    className={cn(
                      config.text,
                      'text-white font-medium',
                      getColorByName(member.name)
                    )}
                  >
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{member.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'relative ring-2 ring-background rounded-full bg-muted',
                  config.overlap
                )}
              >
                <Avatar className={config.more}>
                  <AvatarFallback className={cn(config.text, 'font-medium')}>
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>还有 {remainingCount} 人</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
