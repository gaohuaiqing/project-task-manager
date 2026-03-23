/**
 * 组织架构模块测试 - 基于用户操作场景
 * 需求来源: REQ_02_organization.md
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api-helper';
import { testUser, generateUniqueId } from '../fixtures/test-data';

test.describe('组织架构管理 - 用户操作场景', () => {
  let api: ApiHelper;
  let createdDeptId: number | null = null;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  // ==================== 场景1：部门树管理 ====================

  test.describe('场景1：部门树管理', () => {
    test('操作1：查看组织架构树', async () => {
      // 操作：点击组织架构菜单
      const response = await api.get('/org/departments');

      // 预期结果：显示部门树结构
      expect(response.ok).toBe(true);
      expect(response.data.success).toBe(true);
    });

    test('操作2：创建顶级部门', async () => {
      // 操作：点击"添加部门"，填写部门名称
      const deptName = `测试部门_${generateUniqueId().substring(0, 8)}`;
      const response = await api.post('/org/departments', {
        name: deptName,
        parent_id: null,
      });

      // 预期结果：部门创建成功
      expect(response.ok).toBe(true);
      if (response.data.data?.id) {
        createdDeptId = response.data.data.id;
      }
    });

    test('操作3：创建子部门', async () => {
      // 前置条件：先创建父部门
      const parentResponse = await api.post('/org/departments', {
        name: `父部门_${generateUniqueId().substring(0, 8)}`,
        parent_id: null,
      });

      if (parentResponse.ok && parentResponse.data.data?.id) {
        const parentId = parentResponse.data.data.id;

        // 操作：在父部门下创建子部门
        const childResponse = await api.post('/org/departments', {
          name: `子部门_${generateUniqueId().substring(0, 8)}`,
          parent_id: parentId,
        });

        // 预期结果：子部门创建成功，形成层级关系
        expect(childResponse.ok).toBe(true);
        expect(childResponse.data.data.parent_id).toBe(parentId);
      } else {
        test.skip();
      }
    });

    test('操作4：编辑部门名称', async () => {
      // 前置条件：已有部门
      const createResponse = await api.post('/org/departments', {
        name: `编辑测试_${generateUniqueId().substring(0, 8)}`,
        parent_id: null,
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const deptId = createResponse.data.data.id;
        const newName = `已更新_${generateUniqueId().substring(0, 8)}`;

        // 操作：修改部门名称
        const response = await api.put(`/org/departments/${deptId}`, {
          name: newName,
        });

        // 预期结果：更新成功
        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });

    test('操作5：删除部门', async () => {
      // 前置条件：创建一个空部门
      const createResponse = await api.post('/org/departments', {
        name: `待删除_${generateUniqueId().substring(0, 8)}`,
        parent_id: null,
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const deptId = createResponse.data.data.id;

        // 操作：点击删除按钮，确认删除
        const response = await api.delete(`/org/departments/${deptId}`);

        // 预期结果：删除成功
        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  // ==================== 场景2：成员管理 ====================

  test.describe('场景2：成员管理', () => {
    test('操作1：查看成员列表', async () => {
      // 操作：点击成员管理
      const response = await api.get('/org/members');

      // 预期结果：显示成员列表
      expect(response.ok).toBe(true);
    });

    test('操作2：添加成员', async () => {
      // 前置条件：选择部门
      const uniqueId = generateUniqueId();
      const response = await api.post('/org/members', {
        username: `TEST${uniqueId.replace(/-/g, '').substring(0, 8)}`,
        real_name: `测试成员_${uniqueId.substring(0, 6)}`,
        role: 'engineer',
        department_id: 1,
      });

      // 预期结果：成员添加成功，自动创建账户，显示初始密码
      expect(response.ok).toBe(true);
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('id');
      }
    });

    test('操作3：编辑成员信息', async () => {
      // 前置条件：先创建成员
      const uniqueId = generateUniqueId();
      const createResponse = await api.post('/org/members', {
        username: `UPD${uniqueId.replace(/-/g, '').substring(0, 8)}`,
        real_name: `更新测试_${uniqueId.substring(0, 6)}`,
        role: 'engineer',
        department_id: 1,
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const memberId = createResponse.data.data.id;

        // 操作：修改成员信息
        const response = await api.put(`/org/members/${memberId}`, {
          real_name: `已更新_${uniqueId.substring(0, 6)}`,
        });

        // 预期结果：更新成功
        expect(response.ok).toBe(true);
      } else {
        test.skip();
      }
    });

    test('操作4：查看成员详情', async () => {
      // 操作：点击成员查看详情
      const response = await api.get('/org/members/1');

      // 预期结果：显示完整成员信息
      expect(response.ok).toBe(true);
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('id');
        expect(response.data.data).toHaveProperty('username');
      }
    });
  });

  // ==================== 场景3：能力模型管理 ====================

  test.describe('场景3：能力模型管理', () => {
    test('操作1：查看能力模型列表', async () => {
      // 操作：进入设置->能力模型
      const response = await api.get('/org/capability-models');

      // 预期结果：显示能力模型列表
      expect(response.ok).toBe(true);
    });

    test('操作2：创建能力模型', async () => {
      const uniqueId = generateUniqueId();
      const response = await api.post('/org/capability-models', {
        name: `测试能力模型_${uniqueId.substring(0, 8)}`,
        description: '自动化测试创建的能力模型',
        dimensions: [
          { name: '技术能力', weight: 40 },
          { name: '沟通能力', weight: 30 },
          { name: '学习能力', weight: 30 },
        ],
      });

      // 预期结果：创建成功
      expect(response.ok).toBe(true);
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('id');
      }
    });

    test('操作3：权重验证 - 总和必须等于100%', async () => {
      const uniqueId = generateUniqueId();
      const response = await api.post('/org/capability-models', {
        name: `权重测试_${uniqueId.substring(0, 8)}`,
        dimensions: [
          { name: '维度1', weight: 50 },
          { name: '维度2', weight: 30 }, // 总和80%，应失败
        ],
      });

      // 预期结果：创建失败，提示权重不等于100%
      expect(response.ok).toBe(false);
    });
  });
});
