/**
 * 共享类型定义 - 前后端通用
 *
 * 此文件包含前后端共享的基础类型定义
 * 确保类型一致性和类型安全
 */
/**
 * 类型守卫：检查是否为有效的 EntityId
 */
export function isValidEntityId(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
/**
 * 类型守卫：检查是否为有效的 EntityId 列表
 */
export function isValidEntityIdList(value) {
    return Array.isArray(value) && value.every(isValidEntityId);
}
/**
 * 类型转换：将 unknown 转换为 EntityId
 */
export function toEntityId(value) {
    if (isValidEntityId(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const num = Number(value);
        if (isValidEntityId(num)) {
            return num;
        }
    }
    return null;
}
/**
 * 类型转换：将 unknown 转换为 EntityId 列表
 */
export function toEntityIdList(value) {
    if (isValidEntityIdList(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const ids = value.split(',').map(toEntityId).filter((id) => id !== null);
        if (ids.length > 0) {
            return ids;
        }
    }
    return null;
}
//# sourceMappingURL=common.js.map