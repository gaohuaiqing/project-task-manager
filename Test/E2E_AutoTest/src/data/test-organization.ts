/**
 * 组织架构测试数据
 */

import type { OrganizationStructure, Department, TechGroup, Member } from '../../../app/src/types/organization';

/**
 * 测试用的组织架构数据
 */
export const TEST_ORGANIZATION: OrganizationStructure = {
  version: 1,
  lastUpdated: Date.now(),
  lastUpdatedBy: 'test_admin',
  departments: [
    {
      id: 'dept_test_001',
      name: '研发一部',
      level: 'department',
      parentId: null,
      managerName: '张经理',
      description: '负责核心产品研发',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: [
        {
          id: 'tech_test_001',
          name: '前端组',
          level: 'tech_group',
          parentId: 'dept_test_001',
          leaderName: '李组长',
          description: '负责前端界面开发',
          memberIds: ['member_test_001', 'member_test_002'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [
            {
              id: 'member_test_001',
              employeeId: 'E001',
              name: '王小明',
              level: 'member',
              parentId: 'tech_test_001',
              role: 'tech_manager',
              capabilities: {
                boardDev: 7,
                firmwareDev: 5,
                componentImport: 6,
                systemDesign: 8,
                driverInterface: 7
              },
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            {
              id: 'member_test_002',
              employeeId: 'E002',
              name: '李小红',
              level: 'member',
              parentId: 'tech_test_001',
              role: 'engineer',
              capabilities: {
                boardDev: 6,
                firmwareDev: 7,
                componentImport: 8,
                systemDesign: 5,
                driverInterface: 6
              },
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          ]
        },
        {
          id: 'tech_test_002',
          name: '后端组',
          level: 'tech_group',
          parentId: 'dept_test_001',
          leaderName: '赵组长',
          description: '负责后端服务开发',
          memberIds: ['member_test_003'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [
            {
              id: 'member_test_003',
              employeeId: 'E003',
              name: '赵小强',
              level: 'member',
              parentId: 'tech_test_002',
              role: 'engineer',
              capabilities: {
                boardDev: 4,
                firmwareDev: 8,
                componentImport: 5,
                systemDesign: 7,
                driverInterface: 9
              },
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          ]
        }
      ]
    }
  ]
};

/**
 * 测试部门数据
 */
export const TEST_DEPARTMENTS = [
  {
    name: '研发一部',
    managerEmployeeId: 'E001',
    managerName: '张经理',
    description: '负责核心产品研发'
  },
  {
    name: '研发二部',
    managerEmployeeId: 'E005',
    managerName: '王经理',
    description: '负责创新产品研发'
  },
  {
    name: '测试部',
    managerEmployeeId: 'E006',
    managerName: '刘经理',
    description: '负责产品质量保证'
  }
];

/**
 * 测试技术组数据
 */
export const TEST_TECH_GROUPS = [
  {
    name: '前端组',
    leaderEmployeeId: 'E002',
    leaderName: '李组长',
    description: '负责前端界面开发'
  },
  {
    name: '后端组',
    leaderEmployeeId: 'E003',
    leaderName: '赵组长',
    description: '负责后端服务开发'
  },
  {
    name: '测试组',
    leaderEmployeeId: 'E004',
    leaderName: '孙组长',
    description: '负责自动化测试'
  }
];

/**
 * 测试成员数据
 */
export const TEST_MEMBERS = [
  {
    name: '王小明',
    employeeId: 'E100',
    role: 'engineer',
    email: 'wangxm@test.com'
  },
  {
    name: '李小红',
    employeeId: 'E101',
    role: 'engineer',
    email: 'lixh@test.com'
  },
  {
    name: '赵小强',
    employeeId: 'E102',
    role: 'tech_manager',
    email: 'zhaoxq@test.com'
  },
  {
    name: '孙小美',
    employeeId: 'E103',
    role: 'engineer',
    email: 'sunxm@test.com'
  }
];

/**
 * 测试能力模型数据
 */
export const TEST_CAPABILITIES = {
  frontend: {
    name: '前端开发能力模型',
    description: '评估前端工程师的综合能力',
    dimensions: [
      { key: 'html_css', name: 'HTML/CSS', description: '基础样式能力', color: '#3b82f6' },
      { key: 'javascript', name: 'JavaScript', description: 'JS编程能力', color: '#22c55e' },
      { key: 'framework', name: '框架应用', description: 'React/Vue等框架', color: '#a855f7' },
      { key: 'build_tools', name: '构建工具', description: 'Webpack/Vite等', color: '#f59e0b' }
    ]
  },
  backend: {
    name: '后端开发能力模型',
    description: '评估后端工程师的综合能力',
    dimensions: [
      { key: 'database', name: '数据库', description: 'SQL和NoSQL', color: '#3b82f6' },
      { key: 'api_design', name: 'API设计', description: 'RESTful API', color: '#22c55e' },
      { key: 'server', name: '服务端', description: 'Node.js/Java', color: '#a855f7' },
      { key: 'cache', name: '缓存', description: 'Redis/Memcached', color: '#f59e0b' }
    ]
  }
};

/**
 * 生成的随机组织架构数据
 */
export function generateRandomOrganization(deptCount: number = 2): OrganizationStructure {
  const departments: Department[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < deptCount; i++) {
    const deptId = `dept_${timestamp}_${i}`;
    const dept: Department = {
      id: deptId,
      name: `测试部门${i + 1}`,
      level: 'department',
      parentId: null,
      managerName: `测试经理${i + 1}`,
      description: `这是测试部门${i + 1}的描述`,
      createdAt: timestamp,
      updatedAt: timestamp,
      children: []
    };

    // 为每个部门添加1-2个技术组
    const groupCount = Math.floor(Math.random() * 2) + 1;
    for (let j = 0; j < groupCount; j++) {
      const groupId = `group_${timestamp}_${i}_${j}`;
      const group: TechGroup = {
        id: groupId,
        name: `测试技术组${i + 1}-${j + 1}`,
        level: 'tech_group',
        parentId: deptId,
        leaderName: `测试组长${i + 1}-${j + 1}`,
        description: `这是测试技术组${i + 1}-${j + 1}的描述`,
        memberIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        children: []
      };

      // 为每个技术组添加1-3个成员
      const memberCount = Math.floor(Math.random() * 3) + 1;
      for (let k = 0; k < memberCount; k++) {
        const memberId = `member_${timestamp}_${i}_${j}_${k}`;
        const member: Member = {
          id: memberId,
          employeeId: `E${String(1000 + i * 100 + j * 10 + k).padStart(4, '0')}`,
          name: `测试员工${i + 1}-${j + 1}-${k + 1}`,
          level: 'member',
          parentId: groupId,
          role: k === 0 ? 'tech_manager' : 'engineer',
          capabilities: {
            boardDev: Math.floor(Math.random() * 5) + 5,
            firmwareDev: Math.floor(Math.random() * 5) + 5,
            componentImport: Math.floor(Math.random() * 5) + 5,
            systemDesign: Math.floor(Math.random() * 5) + 5,
            driverInterface: Math.floor(Math.random() * 5) + 5
          },
          createdAt: timestamp,
          updatedAt: timestamp
        };

        group.memberIds.push(memberId);
        group.children.push(member);
      }

      dept.children.push(group);
    }

    departments.push(dept);
  }

  return {
    version: 1,
    lastUpdated: timestamp,
    lastUpdatedBy: 'test_generator',
    departments
  };
}

/**
 * 清理测试数据
 */
export function cleanupTestData() {
  // 清理 localStorage 中的组织架构数据
  localStorage.removeItem('org_structure');
  localStorage.removeItem('capability_models');

  // 清理测试用户
  const usersKey = 'app_users';
  const usersData = localStorage.getItem(usersKey);
  if (usersData) {
    const users = JSON.parse(usersData);
    // 删除测试用户
    Object.keys(users).forEach(key => {
      if (key.startsWith('E') && !isNaN(parseInt(key.substring(1)))) {
        delete users[key];
      }
    });
    localStorage.setItem(usersKey, JSON.stringify(users));
  }
}

/**
 * 设置测试组织架构数据
 */
export function setupTestOrganization(org: OrganizationStructure) {
  localStorage.setItem('org_structure', JSON.stringify(org));
}

/**
 * 获取测试组织架构数据
 */
export function getTestOrganization(): OrganizationStructure {
  const data = localStorage.getItem('org_structure');
  if (data) {
    return JSON.parse(data);
  }
  return TEST_ORGANIZATION;
}
