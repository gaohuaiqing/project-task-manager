/**
 * 头像工具函数
 * 根据用户姓名和性别生成不同风格的头像
 */

export type Gender = 'male' | 'female' | 'other' | null;

/**
 * 根据性别生成 DiceBear 头像 URL
 * - male: 使用 adventurer 风格（男性化）
 * - female: 使用 big-smile 风格（女性化）
 * - other/未指定: 使用 avataaars 风格（中性）
 */
export function getAvatarUrl(name: string, gender: Gender = null): string {
  const seed = encodeURIComponent(name);
  switch (gender) {
    case 'male':
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
    case 'female':
      return `https://api.dicebear.com/7.x/big-smile/svg?seed=${seed}&backgroundColor=ffdfbf`;
    case 'other':
    default:
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }
}
