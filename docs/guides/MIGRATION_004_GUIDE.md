# 数据库迁移 004 指南

## 概述

迁移 004: **补充缺失的数据库字段**

### 目标

为现有数据库表添加缺失的字段，完善数据模型：

1. **projects 表**：添加实际开始/结束日期
2. **project_members 表**：添加角色和成员名称字段
3. **project_milestones 表**：添加实际完成日期和排序序号
4. **wbs_tasks 表**：添加 WBS 编码、层级深度和子任务数组

---

## 迁移前准备

### 1. 备份数据库

```bash
# 使用 mysqldump 备份
mysqldump -u root -p task_manager > backup_004_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 检查当前状态

```bash
npm run migrate:status
```

### 3. 检查表结构

```sql
-- 查看表结构
DESCRIBE projects;
DESCRIBE project_members;
DESCRIBE project_milestones;
DESCRIBE wbs_tasks;
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

---

## 迁移详情

### 步骤1: 为 projects 表添加实际日期字段

```sql
ALTER TABLE projects
ADD COLUMN actual_start_date DATE NULL COMMENT '实际开始日期' AFTER planned_end_date,
ADD COLUMN actual_end_date DATE NULL COMMENT '实际结束日期' AFTER actual_start_date;
```

**用途**：
- 记录项目的实际开始和结束日期
- 用于项目执行分析和绩效评估

### 步骤2: 为 project_members 表添加 role 和 member_name 字段

```sql
-- 检查是否已有 role 字段（迁移 002 可能已添加）
-- 如果没有，添加 role 和 member_name 字段
ALTER TABLE project_members
ADD COLUMN role ENUM('owner', 'manager', 'member', 'viewer') DEFAULT 'member' COMMENT '成员角色' AFTER user_id,
ADD COLUMN member_name VARCHAR(100) NULL COMMENT '冗余成员名称' AFTER role;

-- 为现有记录填充 member_name
UPDATE project_members pm
LEFT JOIN members m ON pm.member_id = m.id
SET pm.member_name = m.name
WHERE pm.member_name IS NULL AND m.id IS NOT NULL;
```

**用途**：
- `role`：定义成员在项目中的角色权限
- `member_name`：冗余存储成员名称，提高查询性能

### 步骤3: 为 project_milestones 表添加 actual_date 和 sort_order 字段

```sql
ALTER TABLE project_milestones
ADD COLUMN actual_date DATE NULL COMMENT '实际完成日期' AFTER planned_date,
ADD COLUMN sort_order INT DEFAULT 0 COMMENT '排序序号' AFTER status;

-- 为现有记录填充 sort_order
UPDATE project_milestones
SET sort_order = id
WHERE sort_order = 0 OR sort_order IS NULL;
```

**用途**：
- `actual_date`：记录里程碑的实际完成日期
- `sort_order`：控制里程碑在UI中的显示顺序

### 步骤4: 为 wbs_tasks 表添加 wbs_code、level 和 subtasks 字段

```sql
ALTER TABLE wbs_tasks
ADD COLUMN wbs_code VARCHAR(50) NULL COMMENT 'WBS编码(如1.1.2)' AFTER task_code,
ADD COLUMN level INT NULL COMMENT '层级深度' AFTER task_name,
ADD COLUMN subtasks JSON NULL COMMENT '子任务ID数组' AFTER attachments;

-- 为现有记录计算 level
UPDATE wbs_tasks w
LEFT JOIN wbs_tasks p ON w.parent_id = p.id
SET w.level = CASE
  WHEN w.parent_id IS NULL THEN 1
  WHEN p.level IS NOT NULL THEN p.level + 1
  ELSE NULL
END
WHERE w.level IS NULL;

-- 为现有记录填充 subtasks（基于 parent_id 反向查询）
-- （迁移脚本会自动处理）
```

**用途**：
- `wbs_code`：标准 WBS 编码，如 "1.1.2"
- `level`：任务层级深度，便于UI显示和查询优化
- `subtasks`：子任务ID数组，便于快速获取子任务列表

### 步骤5: 添加索引优化

```sql
-- 为 project_members.role 添加索引
ALTER TABLE project_members
ADD INDEX idx_role (role);
```

---

## 迁移后验证

### 1. 检查迁移状态

```bash
npm run migrate:status
```

应该看到：
```
✅ 004 | add_missing_fields              | 2025-01-04 10:00:00
```

### 2. 验证字段存在

```sql
-- 检查 projects 表
DESCRIBE projects;
-- 应该看到 actual_start_date 和 actual_end_date

-- 检查 project_members 表
DESCRIBE project_members;
-- 应该看到 role 和 member_name

-- 检查 project_milestones 表
DESCRIBE project_milestones;
-- 应该看到 actual_date 和 sort_order

-- 检查 wbs_tasks 表
DESCRIBE wbs_tasks;
-- 应该看到 wbs_code、level 和 subtasks
```

### 3. 验证数据完整性

```sql
-- 检查 member_name 是否填充
SELECT COUNT(*) as empty_count
FROM project_members
WHERE member_name IS NULL OR member_name = '';

-- 检查 wbs_tasks.level 是否合理
SELECT COUNT(*) as invalid_count
FROM wbs_tasks
WHERE level IS NOT NULL AND (level < 1 OR level > 10);

-- 检查日期逻辑
SELECT COUNT(*) as invalid_count
FROM projects
WHERE (actual_start_date IS NOT NULL AND actual_end_date IS NOT NULL
  AND actual_start_date > actual_end_date);
```

### 4. 测试应用程序

1. 启动后端服务
2. 查看项目详情页，确认显示实际日期
3. 查看项目成员，确认角色显示正常
4. 查看里程碑，确认排序和实际日期显示正常
5. 查看 WBS 任务，确认层级显示正常

---

## 回滚迁移

如果迁移出现问题，可以回滚到迁移前的状态。

### 警告

⚠️ **回滚操作将删除添加的字段和相关数据，请确保已备份！**

### 回滚步骤

```bash
# 方法1：使用 npm 脚本
npm run migrate:down

# 方法2：直接使用迁移管理器
cd app/server
npx tsx src/migrations/migration-manager.ts rollback

# 方法3：直接运行回滚脚本
cd app/server
npx tsx src/migrations/004-rollback-add-missing-fields.ts
```

### 回滚内容

1. 删除 projects.actual_start_date 和 actual_end_date
2. 删除 project_members.member_name（role 字段保留）
3. 删除 project_milestones.actual_date 和 sort_order
4. 删除 wbs_tasks.wbs_code、level 和 subtasks
5. 删除 project_members.idx_role 索引（如果是由本次迁移添加的）
6. 删除迁移记录

---

## 常见问题

### Q1: 迁移失败，提示字段已存在

**A**: 该字段可能已经存在。跳过此步骤即可。

### Q2: member_name 字段为空

**A**: 检查 members 表是否有对应数据，手动填充：

```sql
UPDATE project_members pm
LEFT JOIN members m ON pm.member_id = m.id
SET pm.member_name = m.name
WHERE pm.member_name IS NULL AND m.id IS NOT NULL;
```

### Q3: wbs_tasks.level 计算不正确

**A**: 重新计算层级：

```sql
-- 先清空现有值
UPDATE wbs_tasks SET level = NULL;

-- 重新计算（需要多次执行直到收敛）
SET @max_iterations = 10;
SET @iteration = 0;

WHILE @iteration < @max_iterations DO
  UPDATE wbs_tasks w
  LEFT JOIN wbs_tasks p ON w.parent_id = p.id
  SET w.level = CASE
    WHEN w.parent_id IS NULL THEN 1
    WHEN p.level IS NOT NULL THEN p.level + 1
    ELSE w.level
  END
  WHERE w.level IS NULL OR (p.level IS NOT NULL AND w.level != p.level + 1);

  SET @iteration = @iteration + 1;
END WHILE;
```

### Q4: project_members.role 字段冲突

**A**: 检查是否使用的是旧版本的 project_members 表，可能需要先执行迁移 002。

---

## 性能影响

### 预期影响

- **迁移执行时间**：约 2-10 分钟（取决于数据量）
- **存储空间**：增加约 5-10%（取决于新增字段）
- **查询性能**：无明显影响（新增字段为 NULL 或有默认值）

### 性能优化建议

1. **为新增字段创建索引**：
   ```sql
   -- 根据实际查询需求创建索引
   CREATE INDEX idx_projects_actual_dates ON projects(actual_start_date, actual_end_date);
   CREATE INDEX idx_wbs_tasks_level ON wbs_tasks(level);
   ```

2. **定期清理冗余数据**：
   ```sql
   -- 清理无用的 member_name 冗余数据（如果从 members 表获取）
   -- 实际上保留 member_name 可以提高查询性能
   ```

---

## 下一步

迁移 004 完成后，建议继续执行：

1. **消除 any 类型**：提高类型安全性
2. **Repository 模式**：实现数据访问抽象层
3. **运行时验证**：添加 zod 数据验证

详见：[数据库重构计划](../analysis/DATABASE_REFACTORING_PLAN.md)

---

## 联系支持

如果遇到问题，请联系：

- **技术支持**：tech-support@example.com
- **GitHub Issues**：https://github.com/your-username/project-task-manager/issues

---

**最后更新**：2025-01-04
**版本**：1.0.0
