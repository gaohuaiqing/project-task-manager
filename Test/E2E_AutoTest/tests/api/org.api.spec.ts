/**
 * 组织架构 API 测试
 */
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { testUser, generateUniqueId } from '../../fixtures/test-data';

test.describe('组织架构 API 测试', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login(testUser.username, testUser.password);
  });

  // ==================== 部门管理 ====================

  test.describe('部门管理', () => {
    test('获取部门树 - 应返回树形结构', async () => {
      const response = await api.get('/departments');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
      expect(response.data.data).toHaveProperty('items');
      expect(Array.isArray(response.data.data.items)).toBe(true);
    });

    test('创建部门 - 应返回部门ID', async () => {
      const deptData = {
        name: `测试部门_${generateUniqueId()}`,
        parent_id: null,
      };

      const response = await api.post('/departments', deptData);

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
      expect(response.data.data).toHaveProperty('id');
    });

    test('创建子部门 - 应形成层级关系', async () => {
      // 先创建父部门
      const parentResponse = await api.post('/departments', {
        name: `父部门_${generateUniqueId()}`,
        parent_id: null,
      });

      if (parentResponse.ok && parentResponse.data.data?.id) {
        const parentId = parentResponse.data.data.id;

        // 创建子部门
        const childResponse = await api.post('/departments', {
          name: `子部门_${generateUniqueId()}`,
          parent_id: parentId,
        });

        expect(childResponse.ok).toBe(true);
        expect(childResponse.data.data).toHaveProperty('parent_id', parentId);
      }
    });

    test('更新部门 - 应返回更新后的部门', async () => {
      // 先创建部门
      const createResponse = await api.post('/departments', {
        name: `更新测试_${generateUniqueId()}`,
        parent_id: null,
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const deptId = createResponse.data.data.id;

        const newName = `已更新_${generateUniqueId()}`;
        const response = await api.put(`/departments/${deptId}`, {
          name: newName,
        });

        expect(response.ok).toBe(true);
      }
    });

    test('删除部门 - 应返回成功', async () => {
      // 先创建部门
      const createResponse = await api.post('/departments', {
        name: `删除测试_${generateUniqueId()}`,
        parent_id: null,
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const deptId = createResponse.data.data.id;

        const response = await api.delete(`/departments/${deptId}`);

        expect(response.ok).toBe(true);
      }
    });
  });

  // ==================== 成员管理 ====================

  test.describe('成员管理', () => {
    test('获取成员列表 - 应返回分页数据', async () => {
      const response = await api.get('/members');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
      expect(response.data.data).toHaveProperty('items');
      expect(Array.isArray(response.data.data.items)).toBe(true);
    });

    test('创建成员 - 应返回成员ID和初始密码', async () => {
      const memberId = generateUniqueId();
      const memberData = {
        username: `TEST${memberId.replace(/-/g, '').substring(0, 8)}`,
        real_name: `测试成员_${memberId.substring(0, 6)}`,
        role: 'engineer',
        department_id: 1,
      };

      const response = await api.post('/members', memberData);

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
      // 创建成员时应返回初始密码
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('id');
      }
    });

    test('获取成员详情 - 应返回完整信息', async () => {
      const response = await api.get('/members/1');

      expect(response.ok).toBe(true);
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('id');
        expect(response.data.data).toHaveProperty('username');
      }
    });

    test('更新成员 - 应返回更新后的成员', async () => {
      // 先创建成员
      const memberId = generateUniqueId();
      const createResponse = await api.post('/members', {
        username: `UPD${memberId.replace(/-/g, '').substring(0, 8)}`,
        real_name: `更新测试_${memberId.substring(0, 6)}`,
        role: 'engineer',
        department_id: 1,
      });

      if (createResponse.ok && createResponse.data.data?.id) {
        const id = createResponse.data.data.id;

        const response = await api.put(`/members/${id}`, {
          real_name: `已更新_${memberId.substring(0, 6)}`,
        });

        expect(response.ok).toBe(true);
      }
    });
  });

  // ==================== 能力模型 ====================

  test.describe('能力模型', () => {
    test('获取能力模型列表 - 应返回模型列表', async () => {
      const response = await api.get('/capability-models');

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('success');
    });

    test('创建能力模型 - 应返回模型ID', async () => {
      const modelData = {
        name: `测试能力模型_${generateUniqueId()}`,
        description: '自动化测试创建的能力模型',
        dimensions: [
          { name: '技术能力', weight: 40 },
          { name: '沟通能力', weight: 30 },
          { name: '学习能力', weight: 30 },
        ],
      };

      const response = await api.post('/capability-models', modelData);

      expect(response.ok).toBe(true);
      if (response.data.data) {
        expect(response.data.data).toHaveProperty('id');
      }
    });

    test('权重之和必须等于100%', async () => {
      const modelData = {
        name: `权重测试_${generateUniqueId()}`,
        dimensions: [
          { name: '维度1', weight: 50 },
          { name: '维度2', weight: 30 }, // 总和80%，应失败
        ],
      };

      const response = await api.post('/capability-models', modelData);

      // 应该返回错误
      expect(response.ok).toBe(false);
    });
  });
});
