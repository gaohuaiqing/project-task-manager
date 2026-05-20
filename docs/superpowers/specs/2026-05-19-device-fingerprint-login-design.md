# 设备指纹登录控制设计

> 日期: 2026-05-19
> 状态: 已批准

## 背景

当前系统通过 IP + User-Agent 判断"同一设备"，存在以下问题：
1. 浏览器更新导致 User-Agent 变化 → 同一电脑产生多个设备记录
2. IP 地址变化（DHCP 续租、网络切换）→ 误判为新设备
3. 清除 Cookie 但未登出 → 孤儿会话累积

核心需求：**防止同一用户在不同电脑上同时登录**，同电脑不同浏览器允许共存。

## 方案

**deviceFingerprint + IP 兜底**：前端生成稳定的设备指纹（UUID，存 localStorage），后端结合 IP 地址判断是否为不同物理设备。

### 设备识别规则

| 场景 | fingerprint | IP | 处理 |
|------|-------------|-----|------|
| 同浏览器重新登录 | 相同 | 相同 | 替换旧会话 |
| 同电脑不同浏览器 | 不同 | 相同 | 保留，允许共存 |
| 不同电脑登录 | 不同 | 不同 | 踢掉旧电脑所有会话 |
| 不同电脑但同 IP（罕见） | 不同 | 相同 | 保留（同 IP 视为同电脑） |

### 登录流程

```
1. 验证用户名密码
2. 获取用户所有活跃会话
3. 按 IP 分组:
   - 同 IP 会话组（可能同电脑）→ 检查 fingerprint
     - 有相同 fingerprint → 替换（同浏览器重登）
     - 无相同 fingerprint → 保留（同电脑不同浏览器）
   - 不同 IP 会话组（确定不同电脑）→ 全部踢掉 + 发通知
4. 创建新会话（含 device_fingerprint）
5. 超过 MAX_SESSIONS 时淘汰最旧的
```

## 数据层变更

### sessions 表新增字段

- `device_fingerprint VARCHAR(64) NULL` — 前端生成的设备指纹

### 新增索引

- `idx_user_status (user_id, status)` — 加速活跃会话查询
- `idx_device_fingerprint (device_fingerprint)` — 加速设备查询

### 迁移文件

`060-add-device-fingerprint.ts`

## 前端改动

### `deviceId.ts`

- 键名从 `device_id` 改为 `device_fingerprint`
- 导出 `getDeviceFingerprint()` 供登录时使用

### `auth/api.ts`

- `login()` 请求体增加 `deviceId` 参数

### `AuthContext.tsx`

- 登录时调用 `getDeviceFingerprint()` 传入请求

## 后端改动

### `auth/types.ts`

- `LoginRequest` 增加 `deviceId?: string`

### `auth/routes.ts`

- 登录路由从请求体提取 `deviceId`

### `auth/repository.ts`

- `createSession()` 增加 `device_fingerprint` 字段
- 查询活跃会话时返回 `device_fingerprint`

### `auth/service.ts`

- 重写 `login()` 中的设备判断逻辑（核心变更）
- 替换原有的 `isNewDeviceLogin()` 和 IP+UA 精确匹配

### `Session` 类型

- 增加 `device_fingerprint: string | null`

## 设备列表显示

### `SessionDeviceList.tsx`

- 按 IP 分组显示设备
- 同 IP 多个会话归为一组显示
- 不同 IP 各自独立显示

## 影响文件清单

| 文件 | 变更类型 |
|------|----------|
| `deviceId.ts` | 修改 |
| `auth/api.ts` | 修改 |
| `AuthContext.tsx` | 修改 |
| `auth/types.ts` | 修改 |
| `auth/routes.ts` | 修改 |
| `auth/service.ts` | 修改 |
| `auth/repository.ts` | 修改 |
| `user.types.ts` | 修改 |
| `SessionDeviceList.tsx` | 修改 |
| `060-add-device-fingerprint.ts` | 新增 |
