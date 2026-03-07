# 数据库迁移 003 指南

## 概述

迁移 003: **统一 users 和 members 表关系**

### 目标

1. **明确两表职责**：
   - `users` 表：系统登录账户（认证用）
   - `members` 表：员工档案（业务用）

2. **建立关联**：
   - 添加 `members.user_id` 外键关联两表
   - 统一所有 assignee 字段引用 members.id

3. **保持数据完整性**：
   - 为现有 members 数据创建对应的 user 记录
   - 维护 task_assignments 的审计追踪功能

---

## 迁移前准备

### 1. 备份数据库

```bash
# 使用 mysqldump 备份
mysqldump -u root -p task_manager > backup_003_$(date +%Y%m%d_%H%M%S).sql

# 或使用 MySQL Shell
mysql -u root -p -e "CREATE DATABASE task_manager_backup_003"
mysqldump -u root -p task_manager | mysql -u root -p task_manager_backup_003
```

### 2. 检查当前状态

```bash
npm run migrate:status
```

预期输出：
```
📊 数据库迁移状态
======================================================================
✅ 001 | initial_schema                   | 2025-01-01 10:00:00
✅ 002 | add_project_tables               | 2025-01-02 10:00:00
⏳ 003 | unify_users_members              | 未执行
======================================================================
总计: 3 | 已执行: 2 | 待执行: 1
```

### 3. 检查数据一致性

```sql
-- 检查 members 记录数量
SELECT COUNT(*) as member_count FROM members WHERE status = 'active';

-- 检查 users 记录数量
SELECT COUNT(*) as user_count FROM users;

-- 检查已有关联的 members
SELECT COUNT(*) as linked_count FROM members WHERE user_id IS NOT NULL;

-- 检查 wbs_tasks.assignee_id 的分布
SELECT
  CASE WHEN m.id IS NULL THEN '未关联' ELSE '已关联' END as status,
  COUNT(*) as count
FROM wbs_tasks w
LEFT JOIN members m ON w.assignee_id = m.id
GROUP BY status;
```

---

## 执行迁移

### 方法1：使用 npm 脚本（推荐）

```bash
# 执行所有待执行的迁移
npm run migrate:up
```

### 方法2：直接使用迁移管理器

```bash
cd app/server
npx tsx src/migrations/migration-manager.ts up
```

### 方法3：服务器启动时自动执行

迁移会在服务器启动时自动执行（如果尚未执行）。

```bash
npm run dev
```

---

## 迁移过程详解

迁移 003 包含以下步骤：

### 步骤1: 添加 members.user_id 字段

```sql
ALTER TABLE members
ADD COLUMN user_id INT NULL COMMENT '关联的用户账户ID' AFTER created_by,
ADD INDEX idx_user_id (user_id);
```

### 步骤2: 关联 members 到 users

迁移会尝试自动匹配：
1. 通过 `employee_id` 匹配 `users.username`
2. 通过 `members.name` 匹配 `users.name`

**手动处理未关联的 members**：

```sql
-- 查看未关联的 members
SELECT m.id, m.name, m.employee_id
FROM members m
LEFT JOIN users u ON m.user_id = u.id
WHERE m.user_id IS NULL AND m.status = 'active';

-- 为 member 创建对应的 user 记录
INSERT INTO users (username, password, role, name)
VALUES
  ('employee_001', '$2a$10$...', 'engineer', '张三'),
  ('employee_002', '$2a$10$...', 'engineer', '李四');

-- 关联 member 到 user
UPDATE members SET user_id = (SELECT id FROM users WHERE username = 'employee_001') WHERE id = 1;
```

### 步骤3: 创建 members.user_id 外键约束

```sql
ALTER TABLE members
ADD CONSTRAINT fk_members_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

### 步骤4: 统一 task_assignments.assignee_id 引用

```sql
-- 备份数据
CREATE TABLE IF NOT EXISTS task_assignments_backup_003
AS SELECT * FROM task_assignments;

-- 修改外键引用
ALTER TABLE task_assignments
DROP FOREIGN KEY task_assignments_ibfk_2;

ALTER TABLE task_assignments
ADD CONSTRAINT fk_task_assignments_assignee_id
FOREIGN KEY (assignee_id) REFERENCES members(id) ON DELETE CASCADE;
```

### 步骤5: 验证数据一致性

```sql
-- 检查孤立的 members
SELECT COUNT(*) as count
FROM members m
LEFT JOIN users u ON m.user_id = u.id
WHERE m.user_id IS NOT NULL AND u.id IS NULL;

-- 检查 wbs_tasks.assignee_id 有效性
SELECT COUNT(*) as count
FROM wbs_tasks w
LEFT JOIN members m ON w.assignee_id = m.id
WHERE w.assignee_id IS NOT NULL AND m.id IS NULL;

-- 检查 task_assignments.assignee_id 有效性
SELECT COUNT(*) as count
FROM task_assignments ta
LEFT JOIN members m ON ta.assignee_id = m.id
WHERE m.id IS NULL;
```

### 步骤6: 创建数据字典视图

```sql
CREATE OR REPLACE VIEW v_user_members AS
SELECT
  u.id AS user_id,
  u.username,
  u.name AS user_name,
  u.role AS user_role,
  m.id AS member_id,
  m.name AS member_name,
  m.employee_id,
  m.department,
  m.position,
  m.status AS member_status
FROM users u
LEFT JOIN members m ON u.id = m.user_id
ORDER BY u.id;
```

---

## 迁移后验证

### 1. 检查迁移状态

```bash
npm run migrate:status
```

应该看到：
```
✅ 003 | unify_users_members              | 2025-01-03 10:00:00
```

### 2. 验证外键关系

```sql
-- 检查 members.user_id 外键
SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'members'
  AND COLUMN_NAME = 'user_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 检查 task_assignments.assignee_id 外键
SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'task_assignments'
  AND COLUMN_NAME = 'assignee_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

预期输出：
```
+--------------------------+-----------------------+------------------------+
| CONSTRAINT_NAME          | REFERENCED_TABLE_NAME | REFERENCED_COLUMN_NAME |
+--------------------------+-----------------------+------------------------+
| fk_members_user_id       | users                 | id                     |
| fk_task_assignments_...  | members               | id                     |
+--------------------------+-----------------------+------------------------+
```

### 3. 查询数据字典视图

```sql
-- 查看用户-成员关联
SELECT * FROM v_user_members LIMIT 10;
```

### 4. 测试应用程序

1. 启动后端服务
2. 登录系统
3. 查看成员列表
4. 创建任务并分配成员
5. 查看任务分配历史

---

## 回滚迁移

如果迁移出现问题，可以回滚到迁移前的状态。

### 警告

⚠️ **回滚操作可能导致数据丢失，请确保已备份！**

### 回滚步骤

```bash
# 方法1：使用 npm 脚本
npm run migrate:down

# 方法2：直接使用迁移管理器
cd app/server
npx tsx src/migrations/migration-manager.ts rollback

# 方法3：直接运行回滚脚本
cd app/server
npx tsx src/migrations/003-rollback-unify-users-members.ts
```

### 回滚内容

1. 删除数据字典视图 `v_user_members`
2. 恢复 `task_assignments.assignee_id` 引用 `users.id`
3. 删除 `members.user_id` 外键约束
4. 清除 `members.user_id` 关联数据
5. 删除 `members.user_id` 字段
6. 删除迁移记录

---

## 常见问题

### Q1: 迁移失败，提示 "members.user_id 字段已存在"

**A**: 该字段可能已经存在。跳过此步骤即可。

### Q2: 部分成员未关联到用户

**A**: 检查并手动关联：

```sql
-- 查看未关联的成员
SELECT m.id, m.name, m.employee_id
FROM members m
LEFT JOIN users u ON m.user_id = u.id
WHERE m.user_id IS NULL AND m.status = 'active';

-- 手动创建用户并关联
-- (参考上文"步骤2"中的SQL语句)
```

### Q3: task_assignments 数据丢失

**A**: 检查备份表：

```sql
-- 检查备份数据
SELECT COUNT(*) FROM task_assignments_backup_003;

-- 恢复数据（如果需要）
-- INSERT INTO task_assignments SELECT * FROM task_assignments_backup_003;
```

### Q4: 外键约束创建失败

**A**: 可能存在数据不一致。检查并修复：

```sql
-- 检查无效引用
SELECT ta.id, ta.assignee_id
FROM task_assignments ta
LEFT JOIN members m ON ta.assignee_id = m.id
WHERE m.id IS NULL;

-- 删除或修复无效记录
-- DELETE FROM task_assignments WHERE assignee_id NOT IN (SELECT id FROM members);
```

---

## 性能影响

### 预期影响

- **迁移执行时间**：约 1-5 分钟（取决于数据量）
- **锁表时间**：最小化（大部分操作在线进行）
- **查询性能**：改善（新增 idx_user_id 索引）

### 性能优化建议

1. **为 members.user_id 创建索引**：已包含在迁移中
2. **为 task_assignments.assignee_id 创建索引**：已存在
3. **定期清理历史数据**：考虑归档旧的 task_assignments 记录

---

## 下一步

迁移 003 完成后，建议继续执行：

1. **迁移 002**：补充缺失的数据库字段
2. **类型统一**：统一前后端类型定义
3. **Repository 模式**：实现数据访问抽象层

详见：[数据库重构计划](../analysis/DATABASE_REFACTORING_PLAN.md)

---

## 联系支持

如果遇到问题，请联系：

- **技术支持**：tech-support@example.com
- **GitHub Issues**：https://github.com/your-username/project-task-manager/issues

---

**最后更新**：2025-01-03
**版本**：1.0.0
