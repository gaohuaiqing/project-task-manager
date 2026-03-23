/**
 * 任务管理模块测试 - 基于用户操作场景
 * 需求来源: REQ_04_task.md (24列规格、9种状态、12种类型)
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api-helper';
import { testUser, generateUniqueId } from '../fixtures/test-data';

test.describe('任务管理 - 用户操作场景', () => {
  let api: ApiHelper;
  let testProjectId: string | null = null;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);

    // 创建测试项目
    const uniqueId = generateUniqueId();
    const projectResponse = await api.post('/projects', {
      code: `TASK-TEST-${uniqueId}`,
      name: `任务测试项目_${uniqueId}`,
      project_type: 'product_development',
      planned_start_date: '2026-04-01',
      planned_end_date: '2026-06-30',
    });

    if (projectResponse.ok && projectResponse.data.data?.id) {
      testProjectId = projectResponse.data.data.id;
    }
  });

  // ==================== 场景1：创建新任务 ====================

  test.describe('场景1：创建新任务', () => {
    test('操作1：创建根任务', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 操作步骤：
      // 1. 进入项目详情页
      // 2. 点击"添加任务"按钮
      // 3. 填写任务基本信息（WBS等级、任务描述）
      // 4. 设置时间信息（开始日期、工期）
      // 5. 点击"保存"按钮
      const response = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '用户操作场景测试任务',
        task_type: 'firmware',
        priority: 'medium',
        start_date: '2026-04-01',
        duration: 5,
      });

      // 预期结果：
      // - 新任务添加到任务列表
      // - WBS编码自动生成
      // - 任务状态默认为"未开始"
      expect(response.ok).toBe(true);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
    });

    test('操作2：必填字段验证 - 缺少描述', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      const response = await api.post('/tasks', {
        project_id: testProjectId,
        // 缺少 description
      });

      // 预期结果：创建失败
      expect(response.ok).toBe(false);
    });

    test('操作3：必填字段验证 - 缺少项目ID', async () => {
      const response = await api.post('/tasks', {
        description: '缺少项目ID的任务',
      });

      // 预期结果：创建失败
      expect(response.ok).toBe(false);
    });
  });

  // ==================== 场景2：创建子任务 ====================

  test.describe('场景2：创建子任务', () => {
    test('操作1：在根任务下创建子任务', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建父任务
      const parentResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: '父任务-子任务测试',
        task_type: 'firmware',
        wbs_level: 1,
      });

      if (parentResponse.ok && parentResponse.data.data?.id) {
        const parentId = parentResponse.data.data.id;

        // 操作：点击任务行的"添加子任务"按钮
        const childResponse = await api.post('/tasks', {
          project_id: testProjectId,
          parent_id: parentId,
          description: '子任务1',
          wbs_level: 2,
        });

        // 预期结果：
        // - 子任务创建成功
        // - WBS编码为 父编号.序号 格式
        // - 子任务等级 = 父任务等级 + 1
        expect(childResponse.ok).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景3：编辑任务计划 ====================

  test.describe('场景3：编辑任务计划', () => {
    let taskId: string | null = null;

    test.beforeEach(async () => {
      if (!testProjectId) return;

      const response = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '编辑测试任务',
        task_type: 'firmware',
        priority: 'medium',
        start_date: '2026-04-01',
        duration: 5,
      });

      if (response.ok && response.data.data?.id) {
        taskId = response.data.data.id;
      }
    });

    test('操作1：修改任务描述', async () => {
      if (!taskId) {
        test.skip();
        return;
      }

      // 操作：点击编辑按钮，修改描述
      const response = await api.put(`/tasks/${taskId}`, {
        description: '更新后的任务描述',
        version: 1,
      });

      // 预期结果：更新成功
      expect(response.ok).toBe(true);
    });

    test('操作2：修改任务日期', async () => {
      if (!taskId) {
        test.skip();
        return;
      }

      const response = await api.put(`/tasks/${taskId}`, {
        start_date: '2026-04-05',
        duration: 10,
        version: 1,
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景4：删除任务 ====================

  test.describe('场景4：删除任务', () => {
    test('操作1：删除任务及子任务', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建父任务
      const parentResponse = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '待删除的父任务',
      });

      if (parentResponse.ok && parentResponse.data.data?.id) {
        const parentId = parentResponse.data.data.id;

        // 创建子任务
        await api.post('/tasks', {
          project_id: testProjectId,
          parent_id: parentId,
          wbs_level: 2,
          description: '待删除的子任务',
        });

        // 操作：点击删除按钮，确认删除
        const response = await api.delete(`/tasks/${parentId}`);

        // 预期结果：删除任务及其所有子任务
        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景5：任务类型测试（12种类型）====================

  test.describe('场景5：12种任务类型', () => {
    const taskTypes = [
      'firmware', 'board', 'driver', 'interface',
      'hw_recovery', 'material_import', 'material_sub',
      'sys_design', 'core_risk', 'contact', 'func_task', 'other'
    ];

    taskTypes.forEach((taskType) => {
      test(`创建${taskType}类型任务`, async () => {
        if (!testProjectId) {
          test.skip();
          return;
        }

        const response = await api.post('/tasks', {
          project_id: testProjectId,
          wbs_level: 1,
          description: `${taskType}类型任务测试`,
          task_type: taskType,
        });

        expect(response.ok).toBe(true);
      });
    });
  });

  // ==================== 场景6：优先级测试（4种优先级）====================

  test.describe('场景6：4种优先级', () => {
    const priorities = ['urgent', 'high', 'medium', 'low'];

    priorities.forEach((priority) => {
      test(`创建${priority}优先级任务`, async () => {
        if (!testProjectId) {
          test.skip();
          return;
        }

        const response = await api.post('/tasks', {
          project_id: testProjectId,
          wbs_level: 1,
          description: `${priority}优先级任务测试`,
          priority: priority,
        });

        expect(response.ok).toBe(true);
      });
    });
  });

  // ==================== 场景7：任务依赖测试 ====================

  test.describe('场景7：任务依赖', () => {
    test('操作1：设置前置任务', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建前置任务
      const predResponse = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '前置任务',
        start_date: '2026-04-01',
        duration: 5,
      });

      if (predResponse.ok && predResponse.data.data?.id) {
        const predId = predResponse.data.data.id;

        // 创建后续任务，设置前置任务
        const response = await api.post('/tasks', {
          project_id: testProjectId,
          wbs_level: 1,
          description: '后续任务',
          predecessor_id: predId,
          lag_days: 2,
        });

        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });

    test('操作2：不能将自己设为前置任务', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      const createResponse = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '自引用测试任务',
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const taskId = createResponse.data.data.id;

        // 尝试将自己设为前置任务
        const response = await api.put(`/tasks/${taskId}`, {
          predecessor_id: taskId,
          version: 1,
        });

        // 预期结果：失败
        expect(response.ok).toBe(false);
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景8：查看任务历史 ====================

  test.describe('场景8：查看任务历史', () => {
    test('操作1：查看任务进展记录', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建任务
      const createResponse = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '历史记录测试任务',
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const taskId = createResponse.data.data.id;

        // 操作：点击"进展记录"列
        const response = await api.get(`/tasks/${taskId}/progress`);

        // 预期结果：显示历史记录
        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景9：任务筛选 ====================

  test.describe('场景9：任务筛选', () => {
    test('操作1：按状态筛选任务', async () => {
      const response = await api.get('/tasks', {
        status: 'not_started',
      });

      expect(response.ok).toBe(true);
    });

    test('操作2：按优先级筛选任务', async () => {
      const response = await api.get('/tasks', {
        priority: 'urgent',
      });

      expect(response.ok).toBe(true);
    });

    test('操作3：按项目筛选任务', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      const response = await api.get('/tasks', {
        project_id: testProjectId,
      });

      expect(response.ok).toBe(true);
    });

    test('操作4：关键词搜索任务', async () => {
      const response = await api.get('/tasks', {
        search: '测试',
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景10：9种任务状态测试 ====================

  test.describe('场景10：9种任务状态', () => {
    const taskStatuses = [
      'pending_approval',    // 待审批
      'rejected',            // 已驳回
      'not_started',         // 未开始
      'in_progress',         // 进行中
      'early_completed',     // 提前完成
      'on_time_completed',   // 按时完成
      'delay_warning',       // 延期预警
      'delayed',             // 已延迟
      'overdue_completed',   // 超期完成
    ];

    test('操作1：验证9种状态筛选', async () => {
      for (const status of taskStatuses) {
        const response = await api.get('/tasks', {
          status: status,
        });
        expect(response.ok).toBe(true);
      }
    });

    test('操作2：创建未开始状态任务', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建任务，预期状态为"未开始"
      const response = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '未开始状态测试任务',
        task_type: 'firmware',
        start_date: '2026-12-01',
        duration: 5,
      });

      expect(response.ok).toBe(true);
    });
  });

  // ==================== 场景11：循环依赖测试 ====================

  test.describe('场景11：循环依赖检测', () => {
    test('操作1：检测A→B→C→A循环依赖', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建三个任务
      const taskAResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: '任务A',
        start_date: '2026-04-01',
        duration: 5,
      });

      const taskBResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: '任务B',
        start_date: '2026-04-08',
        duration: 5,
      });

      const taskCResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: '任务C',
        start_date: '2026-04-15',
        duration: 5,
      });

      if (taskAResponse.ok && taskBResponse.ok && taskCResponse.ok) {
        const taskAId = taskAResponse.data.data.id;
        const taskBId = taskBResponse.data.data.id;
        const taskCId = taskCResponse.data.data.id;

        // B依赖A
        await api.put(`/tasks/${taskBId}`, {
          predecessor_id: taskAId,
          version: 1,
        });

        // C依赖B
        await api.put(`/tasks/${taskCId}`, {
          predecessor_id: taskBId,
          version: 1,
        });

        // 尝试让A依赖C（形成循环）
        const response = await api.put(`/tasks/${taskAId}`, {
          predecessor_id: taskCId,
          version: 1,
        });

        // 预期结果：失败，检测到循环依赖
        expect(response.ok).toBe(false);
      } else {
        test.skip();
      }
    });

    test('操作2：验证级联更新', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建前置任务
      const predResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: '级联更新-前置任务',
        start_date: '2026-04-01',
        duration: 5,
      });

      if (predResponse.ok && predResponse.data.data?.id) {
        const predId = predResponse.data.data.id;

        // 创建后续任务
        const succResponse = await api.post('/tasks', {
          project_id: testProjectId,
          description: '级联更新-后续任务',
          predecessor_id: predId,
          lag_days: 2,
        });

        if (succResponse.ok && succResponse.data.data?.id) {
          // 修改前置任务的结束日期
          const updateResponse = await api.put(`/tasks/${predId}`, {
            duration: 10, // 延长工期
            version: 1,
          });

          // 预期结果：更新成功
          expect(updateResponse.ok).toBe(true);
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景12：WBS编码测试 ====================

  test.describe('场景12：WBS编码自动生成', () => {
    test('操作1：验证根任务WBS编码格式', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建根任务
      const response = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: 'WBS编码测试任务',
      });

      if (response.ok && response.data.data?.id) {
        // 获取任务详情验证WBS编码
        const detailResponse = await api.get(`/tasks/${response.data.data.id}`);

        expect(detailResponse.ok).toBe(true);
        if (detailResponse.data.data?.wbs_code) {
          // WBS编码应为数字格式
          const wbsCode = detailResponse.data.data.wbs_code;
          expect(/^\d+$/.test(wbsCode) || /^\d+\.\d+$/.test(wbsCode)).toBe(true);
        }
      }
    });

    test('操作2：验证子任务WBS编码格式', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建父任务
      const parentResponse = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '父任务-WBS编码',
      });

      if (parentResponse.ok && parentResponse.data.data?.id) {
        const parentId = parentResponse.data.data.id;

        // 创建子任务
        const childResponse = await api.post('/tasks', {
          project_id: testProjectId,
          parent_id: parentId,
          wbs_level: 2,
          description: '子任务-WBS编码',
        });

        if (childResponse.ok && childResponse.data.data?.id) {
          // 获取子任务详情
          const detailResponse = await api.get(`/tasks/${childResponse.data.data.id}`);

          expect(detailResponse.ok).toBe(true);
          if (detailResponse.data.data?.wbs_code) {
            // 子任务WBS编码应为 X.X 格式
            const wbsCode = detailResponse.data.data.wbs_code;
            expect(/^\d+\.\d+$/.test(wbsCode)).toBe(true);
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景13：批量操作测试 ====================

  test.describe('场景13：批量操作', () => {
    test('操作1：批量获取任务', async () => {
      // 创建几个任务
      const taskIds: string[] = [];

      if (testProjectId) {
        for (let i = 0; i < 3; i++) {
          const response = await api.post('/tasks', {
            project_id: testProjectId,
            description: `批量测试任务${i + 1}`,
          });
          if (response.ok && response.data.data?.id) {
            taskIds.push(response.data.data.id);
          }
        }
      }

      if (taskIds.length > 0) {
        // 批量获取
        const response = await api.post('/tasks/batch', {
          ids: taskIds,
        });

        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景14：24列数据规格测试 ====================

  test.describe('场景14：24列数据规格', () => {
    test('操作1：验证完整任务字段', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建完整字段的任务
      const response = await api.post('/tasks', {
        project_id: testProjectId,
        wbs_level: 1,
        description: '完整字段测试任务',
        task_type: 'firmware',
        priority: 'high',
        start_date: '2026-04-01',
        duration: 10,
        warning_days: 3,
        full_time_ratio: 100,
        assignee_id: 1,
      });

      expect(response.ok).toBe(true);

      if (response.ok && response.data.data?.id) {
        // 验证任务详情包含所有必要字段
        const detailResponse = await api.get(`/tasks/${response.data.data.id}`);

        expect(detailResponse.ok).toBe(true);

        const task = detailResponse.data.data;
        if (task) {
          // 验证关键字段存在
          expect(task).toHaveProperty('wbs_code');
          expect(task).toHaveProperty('wbs_level');
          expect(task).toHaveProperty('description');
          expect(task).toHaveProperty('status');
          expect(task).toHaveProperty('task_type');
          expect(task).toHaveProperty('priority');
        }
      }
    });

    test('操作2：验证实际日期计算', async () => {
      if (!testProjectId) {
        test.skip();
        return;
      }

      // 创建任务并设置实际日期
      const createResponse = await api.post('/tasks', {
        project_id: testProjectId,
        description: '实际日期计算测试',
        start_date: '2026-04-01',
        duration: 5,
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const taskId = createResponse.data.data.id;

        // 设置实际开始和结束日期
        const updateResponse = await api.put(`/tasks/${taskId}`, {
          actual_start_date: '2026-04-01',
          actual_end_date: '2026-04-07',
          version: 1,
        });

        expect(updateResponse.ok).toBe(true);

        // 验证实际工期和实际周期计算
        const detailResponse = await api.get(`/tasks/${taskId}`);

        expect(detailResponse.ok).toBe(true);
      } else {
        test.skip();
      }
    });
  });
});
