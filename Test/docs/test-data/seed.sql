-- ============================================================================
-- E2E 测试数据初始化脚本
-- 项目任务管理系统 v3.0
--
-- 用途：为 E2E 自动化测试创建隔离的测试数据
-- 基准日期：2026-04-11
-- 密码：Test@123（bcrypt hash 需替换为实际值）
--
-- 使用方法：
--   mysql -u <user> -p <database> < seed.sql
--   或在测试框架中通过 connection.query() 逐条执行
--
-- 注意事项：
--   - 所有测试数据以 'E2E' 前缀标识，便于清理
--   - 使用固定 ID（INT 或 UUID），便于用例引用
--   - 外键约束要求按顺序插入：部门 -> 用户 -> 项目 -> 任务
-- ============================================================================

-- ============================================================================
-- 第 0 步：清理已有 E2E 测试数据（按外键依赖逆序删除）
-- ============================================================================

-- 清理变更审批记录（依赖 wbs_tasks + users）
DELETE FROM plan_changes WHERE task_id IN (
  SELECT id FROM wbs_tasks WHERE project_id IN (
    SELECT id FROM projects WHERE code LIKE 'E2E-PROJ-%'
  )
);

-- 清理任务进展记录（依赖 wbs_tasks + users）
DELETE FROM progress_records WHERE task_id IN (
  SELECT id FROM wbs_tasks WHERE project_id IN (
    SELECT id FROM projects WHERE code LIKE 'E2E-PROJ-%'
  )
);

-- 清理 WBS 任务（依赖 projects + users）
DELETE FROM wbs_tasks WHERE project_id IN (
  SELECT id FROM projects WHERE code LIKE 'E2E-PROJ-%'
);

-- 清理里程碑（依赖 projects）
DELETE FROM milestones WHERE project_id IN (
  SELECT id FROM projects WHERE code LIKE 'E2E-PROJ-%'
);

-- 清理时间线任务（依赖 timelines）
DELETE FROM timeline_tasks WHERE timeline_id IN (
  SELECT id FROM timelines WHERE project_id IN (
    SELECT id FROM projects WHERE code LIKE 'E2E-PROJ-%'
  )
);

-- 清理时间线（依赖 projects）
DELETE FROM timelines WHERE project_id IN (
  SELECT id FROM projects WHERE code LIKE 'E2E-PROJ-%'
);

-- 清理项目成员（依赖 projects + users）
DELETE FROM project_members WHERE project_id IN (
  SELECT id FROM projects WHERE code LIKE 'E2E-PROJ-%'
);

-- 清理项目
DELETE FROM projects WHERE code LIKE 'E2E-PROJ-%';

-- 清理通知（依赖 users）
DELETE FROM notifications WHERE user_id IN (
  SELECT id FROM users WHERE username LIKE 'e2e_%'
);

-- 清理测试用户（注意：users.id 为 INT，使用固定 ID 避免冲突）
DELETE FROM users WHERE username LIKE 'e2e_%';

-- 清理测试部门（先删子部门，再删父部门）
DELETE FROM departments WHERE name LIKE 'E2E%';

-- 清理测试节假日
DELETE FROM holidays WHERE holiday_name LIKE 'E2E%';


-- ============================================================================
-- 第 1 步：创建部门层级
-- ============================================================================
-- 目标结构：
--   E2E总公司 (ID=9001)
--   ├── E2E研发部 (ID=9002, manager: e2e_dept_mgr 用户ID=9012)
--   │   └── E2E前端组 (ID=9003, manager: e2e_tech_mgr 用户ID=9013)
--   └── E2E产品部 (ID=9004)
-- ============================================================================

INSERT INTO departments (id, name, parent_id, manager_id, created_at, updated_at) VALUES
  (9001, 'E2E总公司',  NULL,  NULL,    NOW(), NOW()),
  (9002, 'E2E研发部',  9001,  9012,    NOW(), NOW()),   -- manager_id 指向 e2e_dept_mgr
  (9003, 'E2E前端组',  9002,  9013,    NOW(), NOW()),   -- manager_id 指向 e2e_tech_mgr
  (9004, 'E2E产品部',  9001,  NULL,    NOW(), NOW());


-- ============================================================================
-- 第 2 步：创建测试用户
-- ============================================================================
-- 密码统一为 Test@123 的 bcrypt hash
-- 实际部署时需要用 bcryptjs.hash('Test@123', 10) 生成真实 hash
--
-- 用户列表：
--   e2e_admin      (ID=9011, admin,        E2E总公司)
--   e2e_dept_mgr   (ID=9012, dept_manager, E2E研发部)
--   e2e_tech_mgr   (ID=9013, tech_manager, E2E前端组)
--   e2e_engineer   (ID=9014, engineer,     E2E前端组)
-- ============================================================================

-- 注意：以下密码 hash 为占位符，需替换为 '$2b$10$' + bcryptjs.hash('Test@123', 10) 的实际值
INSERT INTO users (id, username, password, name, real_name, role, gender, department_id, email, phone, is_active, is_builtin, created_at, updated_at) VALUES
  (9011, 'e2e_admin',
   '$2b$10$E2eTestHashPlaceholder_Replace_With_Real_Bcrypt_Hash_Of_Test123',
   'E2E管理员', 'E2E管理员', 'admin', 'male',
   9001, 'e2e_admin@test.com', '13800000001',
   1, 0, NOW(), NOW()),

  (9012, 'e2e_dept_mgr',
   '$2b$10$E2eTestHashPlaceholder_Replace_With_Real_Bcrypt_Hash_Of_Test123',
   'E2E部门经理', 'E2E部门经理', 'dept_manager', 'male',
   9002, 'e2e_dept_mgr@test.com', '13800000002',
   1, 0, NOW(), NOW()),

  (9013, 'e2e_tech_mgr',
   '$2b$10$E2eTestHashPlaceholder_Replace_With_Real_Bcrypt_Hash_Of_Test123',
   'E2E技术经理', 'E2E技术经理', 'tech_manager', 'female',
   9003, 'e2e_tech_mgr@test.com', '13800000003',
   1, 0, NOW(), NOW()),

  (9014, 'e2e_engineer',
   '$2b$10$E2eTestHashPlaceholder_Replace_With_Real_Bcrypt_Hash_Of_Test123',
   'E2E工程师', 'E2E工程师', 'engineer', 'male',
   9003, 'e2e_engineer@test.com', '13800000004',
   1, 0, NOW(), NOW());

-- 更新部门经理关联（确保 manager_id 指向已创建的用户）
UPDATE departments SET manager_id = 9012 WHERE id = 9002;  -- E2E研发部 -> e2e_dept_mgr
UPDATE departments SET manager_id = 9013 WHERE id = 9003;  -- E2E前端组 -> e2e_tech_mgr


-- ============================================================================
-- 第 3 步：创建测试项目
-- ============================================================================
-- E2E-PROJ-001: 产品开发项目（planning 状态）
-- E2E-PROJ-002: 职能管理项目（active 状态，主测试项目）
-- ============================================================================

INSERT INTO projects (id, code, name, description, status, project_type,
  planned_start_date, planned_end_date, actual_start_date, actual_end_date,
  member_ids, progress, task_count, completed_task_count, version, created_at, updated_at) VALUES
  (
    'e2e-proj-001-aaaa-bbbb-cccc00000001',
    'E2E-PROJ-001',
    'E2E测试项目-产品开发',
    'E2E自动化测试专用-产品开发类项目',
    'planning',
    'product_dev',
    '2026-05-01', '2026-09-30',
    NULL, NULL,
    '[9011, 9013, 9014]',
    0, 0, 0,
    1, NOW(), NOW()
  ),
  (
    'e2e-proj-002-aaaa-bbbb-cccc00000002',
    'E2E-PROJ-002',
    'E2E测试项目-职能管理',
    'E2E自动化测试专用-职能管理类项目（主测试项目）',
    'active',
    'func_mgmt',
    '2026-04-01', '2026-07-31',
    '2026-04-01', NULL,
    '[9011, 9013, 9014]',
    25, 4, 1,
    1, NOW(), NOW()
  );


-- ============================================================================
-- 第 4 步：创建 WBS 任务（在 E2E-PROJ-002 下）
-- ============================================================================
-- 任务结构：
--   WBS 1:   E2E根任务-系统设计 (sys_design, in_progress, assignee: e2e_engineer)
--   WBS 1.1: E2E子任务-前端开发 (firmware, not_started, assignee: e2e_engineer)
--   WBS 1.2: E2E子任务-后端开发 (driver, not_started, 无负责人)
--   WBS 2:   E2E根任务-测试验收 (other, not_started, 无负责人)
-- ============================================================================

-- WBS 1: 根任务 - 系统设计
INSERT INTO wbs_tasks (
  id, project_id, parent_id, wbs_code, wbs_level,
  description, status, task_type, priority,
  assignee_id, start_date, end_date, duration,
  planned_duration, is_six_day_week, warning_days,
  predecessor_id, dependency_type, lag_days,
  redmine_link, full_time_ratio,
  delay_count, plan_change_count, progress_record_count,
  version, created_at, updated_at
) VALUES (
  'e2e-task-0011-aaaa-bbbb-cccc00000001',
  'e2e-proj-002-aaaa-bbbb-cccc00000002',
  NULL,
  '1', 1,
  'E2E根任务-系统设计', 'in_progress', 'sys_design', 'high',
  9014,                          -- assignee_id: e2e_engineer
  '2026-04-01', '2026-04-20', 15,
  15, false, 3,                  -- planned_duration=15, is_six_day_week=false, warning_days=3
  NULL, 'FS', NULL,              -- predecessor_id=NULL, dependency_type=FS
  NULL, 100,                     -- redmine_link=NULL, full_time_ratio=100
  0, 0, 0,                       -- delay_count, plan_change_count, progress_record_count
  1, NOW(), NOW()
);

-- WBS 1.1: 子任务 - 前端开发
INSERT INTO wbs_tasks (
  id, project_id, parent_id, wbs_code, wbs_level,
  description, status, task_type, priority,
  assignee_id, start_date, end_date, duration,
  planned_duration, is_six_day_week, warning_days,
  predecessor_id, dependency_type, lag_days,
  redmine_link, full_time_ratio,
  delay_count, plan_change_count, progress_record_count,
  version, created_at, updated_at
) VALUES (
  'e2e-task-0011-aaaa-bbbb-cccc00000002',
  'e2e-proj-002-aaaa-bbbb-cccc00000002',
  'e2e-task-0011-aaaa-bbbb-cccc00000001',   -- parent_id: WBS 1
  '1.1', 2,
  'E2E子任务-前端开发', 'not_started', 'firmware', 'medium',
  9014,                          -- assignee_id: e2e_engineer
  '2026-04-21', '2026-05-10', 14,
  14, false, 3,
  'e2e-task-0011-aaaa-bbbb-cccc00000001',   -- predecessor_id: WBS 1 (FS依赖)
  'FS', 0,                       -- dependency_type=FS, lag_days=0
  NULL, 100,
  0, 0, 0,
  1, NOW(), NOW()
);

-- WBS 1.2: 子任务 - 后端开发
INSERT INTO wbs_tasks (
  id, project_id, parent_id, wbs_code, wbs_level,
  description, status, task_type, priority,
  assignee_id, start_date, end_date, duration,
  planned_duration, is_six_day_week, warning_days,
  predecessor_id, dependency_type, lag_days,
  redmine_link, full_time_ratio,
  delay_count, plan_change_count, progress_record_count,
  version, created_at, updated_at
) VALUES (
  'e2e-task-0011-aaaa-bbbb-cccc00000003',
  'e2e-proj-002-aaaa-bbbb-cccc00000002',
  'e2e-task-0011-aaaa-bbbb-cccc00000001',   -- parent_id: WBS 1
  '1.2', 2,
  'E2E子任务-后端开发', 'not_started', 'driver', 'medium',
  NULL,                          -- assignee_id: 无负责人（测试未分配场景）
  '2026-04-21', '2026-05-15', 18,
  18, false, 3,
  'e2e-task-0011-aaaa-bbbb-cccc00000001',   -- predecessor_id: WBS 1 (FS依赖)
  'FS', 2,                       -- dependency_type=FS, lag_days=2 (2天滞后)
  NULL, 80,                      -- full_time_ratio=80 (兼职)
  0, 0, 0,
  1, NOW(), NOW()
);

-- WBS 2: 根任务 - 测试验收
INSERT INTO wbs_tasks (
  id, project_id, parent_id, wbs_code, wbs_level,
  description, status, task_type, priority,
  assignee_id, start_date, end_date, duration,
  planned_duration, is_six_day_week, warning_days,
  predecessor_id, dependency_type, lag_days,
  redmine_link, full_time_ratio,
  delay_count, plan_change_count, progress_record_count,
  version, created_at, updated_at
) VALUES (
  'e2e-task-0022-aaaa-bbbb-cccc00000001',
  'e2e-proj-002-aaaa-bbbb-cccc00000002',
  NULL,
  '2', 1,
  'E2E根任务-测试验收', 'not_started', 'other', 'low',
  NULL,                          -- assignee_id: 无负责人
  '2026-05-16', '2026-06-15', 22,
  22, false, 3,
  'e2e-task-0011-aaaa-bbbb-cccc00000002',   -- predecessor_id: WBS 1.1 (等前端完成)
  'FS', 0,
  NULL, 100,
  0, 0, 0,
  1, NOW(), NOW()
);


-- ============================================================================
-- 第 5 步：创建里程碑（在 E2E-PROJ-002 下）
-- ============================================================================
-- E2E里程碑-一期交付: 2026-05-15
-- ============================================================================

INSERT INTO milestones (id, project_id, name, target_date, planned_date, description,
  status, completion_percentage, created_at, updated_at) VALUES (
  'e2e-mile-0001-aaaa-bbbb-cccc00000001',
  'e2e-proj-002-aaaa-bbbb-cccc00000002',
  'E2E里程碑-一期交付',
  '2026-05-15',
  '2026-05-15',
  '一期交付里程碑-完成系统设计和前后端开发',
  'pending',
  0,
  NOW(), NOW()
);


-- ============================================================================
-- 第 6 步：添加项目成员（E2E-PROJ-002）
-- ============================================================================
-- e2e_engineer  (ID=9014) -> member 角色
-- e2e_tech_mgr  (ID=9013) -> manager 角色
-- e2e_admin     (ID=9011) -> owner 角色（注意：project_members 表 role 枚举为 owner/manager/member/viewer）
-- ============================================================================

INSERT INTO project_members (project_id, user_id, role, joined_at, created_at, updated_at) VALUES
  ('e2e-proj-002-aaaa-bbbb-cccc00000002', 9014, 'member',  NOW(), NOW(), NOW()),
  ('e2e-proj-002-aaaa-bbbb-cccc00000002', 9013, 'manager', NOW(), NOW(), NOW()),
  ('e2e-proj-002-aaaa-bbbb-cccc00000002', 9011, 'owner',   NOW(), NOW(), NOW());


-- ============================================================================
-- 第 7 步：添加测试节假日
-- ============================================================================

INSERT INTO holidays (holiday_date, holiday_name, is_working_day, year, created_at, updated_at) VALUES
  ('2026-05-01', 'E2E劳动节-测试',  FALSE, 2026, NOW(), NOW()),
  ('2026-10-01', 'E2E国庆节-测试',  FALSE, 2026, NOW(), NOW());


-- ============================================================================
-- 第 8 步：添加测试通知（可选）
-- ============================================================================
-- 为 e2e_engineer 创建一条测试通知，用于通知相关 E2E 用例
-- ============================================================================

INSERT INTO notifications (id, user_id, type, title, content, link, is_read, created_at) VALUES (
  'e2e-ntfy-0001-aaaa-bbbb-cccc00000001',
  9014,                           -- e2e_engineer
  'task_assigned',
  'E2E测试通知-任务分配',
  '您已被分配任务：E2E根任务-系统设计',
  '/projects/e2e-proj-002-aaaa-bbbb-cccc00000002',
  FALSE,
  NOW()
);


-- ============================================================================
-- 第 9 步：补充更多状态的任务（供报表测试）
-- ============================================================================
-- WBS 3: 已完成任务
-- WBS 4: 已延期任务
-- ============================================================================

-- WBS 3: 根任务 - 已完成（completed）
INSERT INTO wbs_tasks (
  id, project_id, parent_id, wbs_code, wbs_level,
  description, status, task_type, priority,
  assignee_id, start_date, end_date, duration,
  planned_duration, is_six_day_week, warning_days,
  predecessor_id, dependency_type, lag_days,
  redmine_link, full_time_ratio,
  delay_count, plan_change_count, progress_record_count,
  version, created_at, updated_at
) VALUES (
  'e2e-task-0033-aaaa-bbbb-cccc00000001',
  'e2e-proj-002-aaaa-bbbb-cccc00000002',
  NULL,
  '3', 1,
  'E2E根任务-需求分析', 'completed', 'sys_design', 'high',
  9013,                          -- assignee_id: e2e_tech_mgr
  '2026-04-01', '2026-04-10', 8,
  8, false, 3,
  NULL, 'FS', NULL,
  NULL, 100,
  0, 0, 0,
  1, NOW(), NOW()
);

-- WBS 4: 根任务 - 已延期（delayed）
INSERT INTO wbs_tasks (
  id, project_id, parent_id, wbs_code, wbs_level,
  description, status, task_type, priority,
  assignee_id, start_date, end_date, duration,
  planned_duration, is_six_day_week, warning_days,
  predecessor_id, dependency_type, lag_days,
  redmine_link, full_time_ratio,
  delay_count, plan_change_count, progress_record_count,
  version, created_at, updated_at
) VALUES (
  'e2e-task-0044-aaaa-bbbb-cccc00000001',
  'e2e-proj-002-aaaa-bbbb-cccc00000002',
  NULL,
  '4', 1,
  'E2E根任务-文档编写', 'delayed', 'doc', 'medium',
  9014,                          -- assignee_id: e2e_engineer
  '2026-04-05', '2026-04-08', 3,
  3, false, 3,
  'e2e-task-0033-aaaa-bbbb-cccc00000001',   -- predecessor: WBS 3
  'FS', 0,
  NULL, 50,
  1, 0, 0,                       -- delay_count=1
  1, NOW(), NOW()
);


-- ============================================================================
-- 第 10 步：创建进展记录（供任务详情测试）
-- ============================================================================

INSERT INTO progress_records (id, task_id, user_id, content, progress_percentage, created_at, updated_at) VALUES (
  'e2e-progress-0001-aaaa-bbbb',
  'e2e-task-0011-aaaa-bbbb-cccc00000001',   -- WBS 1: 系统设计
  9014,                                      -- e2e_engineer
  'E2E测试进展-系统设计已完成概要设计',
  40,
  NOW(), NOW()
);


-- ============================================================================
-- 第 11 步：创建变更审批记录（供审批流程测试）
-- ============================================================================

INSERT INTO plan_changes (id, task_id, requester_id, reviewer_id,
  field_name, old_value, new_value, reason,
  status, created_at, updated_at) VALUES (
  'e2e-change-0001-aaaa-bbbb-cccc00000001',
  'e2e-task-0044-aaaa-bbbb-cccc00000001',   -- WBS 4: 文档编写
  9014,                                      -- requester: e2e_engineer
  NULL,                                      -- reviewer: 未审批
  'duration',
  '3',
  '5',
  'E2E测试变更-文档编写需要更多时间',
  'pending',
  NOW(), NOW()
);


-- ============================================================================
-- 第 12 步：补充通知数据（供通知系统测试）
-- ============================================================================

INSERT INTO notifications (id, user_id, type, title, content, link, is_read, created_at) VALUES
  (
    'e2e-ntfy-0002-aaaa-bbbb-cccc00000002',
    9014,                         -- e2e_engineer
    'approval_result',
    'E2E测试通知-审批通过',
    '您的变更申请已通过审批',
    '/tasks',
    FALSE,
    NOW()
  ),
  (
    'e2e-ntfy-0003-aaaa-bbbb-cccc00000003',
    9013,                         -- e2e_tech_mgr
    'delay_warning',
    'E2E测试通知-延期预警',
    '任务"E2E根任务-文档编写"已延期，请关注',
    '/tasks',
    FALSE,
    NOW()
  );


-- ============================================================================
-- 第 13 步：创建能力模型（供智能分配和设置测试）
-- ============================================================================

INSERT INTO capability_models (id, name, description, dimensions, created_at, updated_at) VALUES (
  'e2e-model-0001-aaaa-bbbb-cccc00000001',
  'E2E测试能力模型',
  'E2E自动化测试用能力模型',
  '["系统设计", "前端开发", "后端开发", "测试", "文档编写"]',
  NOW(), NOW()
);


-- ============================================================================
-- 第 14 步：创建任务类型映射（供设置测试）
-- ============================================================================

INSERT INTO task_type_capability_mapping (id, task_type, capability_model_id, priority, created_at, updated_at) VALUES (
  'e2e-mapping-0001-aaaa-bbbb-cccc00000001',
  'sys_design',
  'e2e-model-0001-aaaa-bbbb-cccc00000001',
  1,
  NOW(), NOW()
);


-- ============================================================================
-- 验证查询（可选，用于确认数据插入正确）
-- ============================================================================

-- SELECT '--- 部门验证 ---' AS info;
-- SELECT id, name, parent_id, manager_id FROM departments WHERE name LIKE 'E2E%';
--
-- SELECT '--- 用户验证 ---' AS info;
-- SELECT id, username, real_name, role, department_id, is_active FROM users WHERE username LIKE 'e2e_%';
--
-- SELECT '--- 项目验证 ---' AS info;
-- SELECT id, code, name, status, project_type, planned_start_date, planned_end_date
--   FROM projects WHERE code LIKE 'E2E-PROJ-%';
--
-- SELECT '--- 任务验证 ---' AS info;
-- SELECT id, wbs_code, description, status, task_type, priority, assignee_id, start_date, end_date
--   FROM wbs_tasks WHERE project_id = 'e2e-proj-002-aaaa-bbbb-cccc00000002'
--   ORDER BY wbs_code;
--
-- SELECT '--- 里程碑验证 ---' AS info;
-- SELECT id, name, target_date, status, completion_percentage
--   FROM milestones WHERE project_id = 'e2e-proj-002-aaaa-bbbb-cccc00000002';
--
-- SELECT '--- 项目成员验证 ---' AS info;
-- SELECT pm.project_id, pm.user_id, u.real_name, pm.role
--   FROM project_members pm
--   JOIN users u ON pm.user_id = u.id
--   WHERE pm.project_id = 'e2e-proj-002-aaaa-bbbb-cccc00000002';
--
-- SELECT '--- 节假日验证 ---' AS info;
-- SELECT holiday_date, holiday_name, is_working_day, year FROM holidays WHERE holiday_name LIKE 'E2E%';
--
-- SELECT '--- 通知验证 ---' AS info;
-- SELECT id, user_id, type, title, is_read FROM notifications WHERE id LIKE 'e2e-ntfy-%';


-- ============================================================================
-- 测试数据初始化完成
-- ============================================================================
-- 数据摘要：
--   部门: 4 条（E2E总公司、E2E研发部、E2E前端组、E2E产品部）
--   用户: 4 条（admin/dept_mgr/tech_mgr/engineer）
--   项目: 2 条（E2E-PROJ-001 产品开发、E2E-PROJ-002 职能管理）
--   任务: 6 条（系统设计/前端开发/后端开发/测试验收 + completed + delayed）
--   里程碑: 1 条（一期交付）
--   项目成员: 3 条（owner/manager/member）
--   节假日: 2 条（劳动节/国庆节）
--   通知: 3 条（任务分配/审批通过/延期预警）
--   变更审批: 1 条（pending 状态）
--   进展记录: 1 条
--   能力模型: 1 条（E2E测试能力模型）
--   任务类型映射: 1 条
-- ============================================================================
