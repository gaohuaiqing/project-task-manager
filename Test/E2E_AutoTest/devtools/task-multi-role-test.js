/**
 * 任务管理模块 - 多角色完整测试脚本
 *
 * 测试用户：
 * - 管理员：admin / admin123
 * - 部门经理：50223183 / 50223183
 * - 技术经理：50234447 / 50234447
 * - 工程师：50241392 / 50241392
 *
 * 使用方法：
 * 1. 打开浏览器，按 F12 打开 DevTools
 * 2. 切换到 Console 标签页
 * 3. 复制粘贴此脚本并按回车
 * 4. 运行 runMultiRoleTests() 开始测试
 */

// ============================================
// 测试配置
// ============================================

const TEST_CONFIG = {
  // 测试用户
  users: [
    { username: 'admin', password: 'admin123', role: '管理员', roleKey: 'admin' },
    { username: '50223183', password: '50223183', role: '部门经理', roleKey: 'dept_manager' },
    { username: '50234447', password: '50234447', role: '技术经理', roleKey: 'tech_manager' },
    { username: '50241392', password: '50241392', role: '工程师', roleKey: 'engineer' },
  ],

  // 任务类型（12种）
  taskTypes: [
    { value: 'firmware', label: '固件' },
    { value: 'board', label: '板卡' },
    { value: 'driver', label: '驱动' },
    { value: 'interface', label: '接口类' },
    { value: 'hw_recovery', label: '硬件恢复包' },
    { value: 'material_import', label: '物料导入' },
    { value: 'material_sub', label: '物料改代' },
    { value: 'sys_design', label: '系统设计' },
    { value: 'core_risk', label: '核心风险' },
    { value: 'contact', label: '接口人' },
    { value: 'func_task', label: '职能任务' },
    { value: 'other', label: '其它' },
  ],

  // 优先级
  priorities: [
    { value: 'urgent', label: '紧急' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ],

  // 每个用户创建的任务数量
  tasksPerUser: 3,

  // API 基础路径
  apiBase: '/api',
};

// ============================================
// 工具函数
// ============================================

const Utils = {
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  log: (type, message, data = null) => {
    const styles = {
      info: 'color: #2196F3; font-weight: bold',
      success: 'color: #4CAF50; font-weight: bold',
      error: 'color: #F44336; font-weight: bold',
      warn: 'color: #FF9800; font-weight: bold',
      user: 'color: #9C27B0; font-weight: bold',
    };
    console.log(`%c[${type.toUpperCase()}] ${message}`, styles[type] || '');
    if (data) console.log(data);
  },

  timestamp: () => Date.now(),

  formatDate: (date) => date.toISOString().split('T')[0],
};

// ============================================
// API 客户端
// ============================================

class ApiClient {
  constructor() {
    this.token = null;
    this.currentUser = null;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(method, path, body = null) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${TEST_CONFIG.apiBase}${path}`, options);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || { message: response.statusText }, status: response.status };
      }

      return { success: true, data: data.data, status: response.status };
    } catch (error) {
      return { success: false, error: { message: error.message } };
    }
  }

  // 认证
  async login(username, password) {
    const result = await this.request('POST', '/auth/login', { username, password });
    if (result.success && result.data?.token) {
      this.setToken(result.data.token);
      this.currentUser = result.data.user;
    }
    return result;
  }

  async logout() {
    this.clearToken();
    this.currentUser = null;
  }

  // 项目
  async getProjects(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, value);
    });
    return this.request('GET', `/projects?${params.toString()}`);
  }

  async createProject(data) {
    return this.request('POST', '/projects', data);
  }

  // 任务
  async getTasks(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value);
        }
      }
    });
    return this.request('GET', `/tasks?${params.toString()}`);
  }

  async getTask(id) {
    return this.request('GET', `/tasks/${id}`);
  }

  async createTask(data) {
    return this.request('POST', '/tasks', data);
  }

  async updateTask(id, data) {
    return this.request('PUT', `/tasks/${id}`, data);
  }

  async deleteTask(id) {
    return this.request('DELETE', `/tasks/${id}`);
  }

  // 成员
  async getMembers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, value);
    });
    return this.request('GET', `/org/members?${params.toString()}`);
  }
}

// ============================================
// 测试结果收集器
// ============================================

class TestReporter {
  constructor() {
    this.results = [];
    this.createdTasks = [];
    this.currentUser = null;
  }

  setUser(user) {
    this.currentUser = user;
  }

  record(testName, passed, message = '', data = null) {
    const result = {
      user: this.currentUser?.role || '未知',
      username: this.currentUser?.username || '未知',
      test: testName,
      passed,
      message,
      data,
      time: new Date().toISOString(),
    };
    this.results.push(result);

    if (passed) {
      Utils.log('success', `  ✓ ${testName}: ${message}`);
    } else {
      Utils.log('error', `  ✗ ${testName}: ${message}`);
    }
  }

  addCreatedTask(taskId, userId, projectId) {
    this.createdTasks.push({ taskId, userId, projectId, time: Date.now() });
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    const byUser = {};
    this.results.forEach(r => {
      if (!byUser[r.user]) {
        byUser[r.user] = { total: 0, passed: 0, failed: 0 };
      }
      byUser[r.user].total++;
      if (r.passed) byUser[r.user].passed++;
      else byUser[r.user].failed++;
    });

    return { total, passed, failed, byUser };
  }

  printReport() {
    const summary = this.getSummary();

    console.log('\n');
    Utils.log('info', '╔════════════════════════════════════════╗');
    Utils.log('info', '║         测 试 报 告 总 览              ║');
    Utils.log('info', '╚════════════════════════════════════════╝');
    console.log(`\n总计: ${summary.total} 个测试`);
    console.log(`%c通过: ${summary.passed}`, 'color: #4CAF50; font-weight: bold; font-size: 14px');
    console.log(`%c失败: ${summary.failed}`, 'color: #F44336; font-weight: bold; font-size: 14px');

    console.log('\n按用户统计:');
    console.table(Object.entries(summary.byUser).map(([user, stats]) => ({
      用户: user,
      总计: stats.total,
      通过: stats.passed,
      失败: stats.failed,
      通过率: `${((stats.passed / stats.total) * 100).toFixed(1)}%`,
    })));

    console.log('\n详细结果:');
    console.table(this.results.map(r => ({
      用户: r.user,
      测试: r.test,
      结果: r.passed ? '✓' : '✗',
      消息: r.message.substring(0, 50),
    })));
  }
}

// ============================================
// 测试执行器
// ============================================

class TaskTestRunner {
  constructor() {
    this.api = new ApiClient();
    this.reporter = new TestReporter();
    this.projects = [];
    this.members = [];
  }

  async init() {
    Utils.log('info', '========================================');
    Utils.log('info', '任务管理模块多角色测试');
    Utils.log('info', '========================================');
  }

  async loginAs(user) {
    Utils.log('user', `登录用户: ${user.role} (${user.username})`);

    const result = await this.api.login(user.username, user.password);

    if (result.success) {
      this.reporter.setUser(user);
      Utils.log('success', `登录成功: ${result.data.user?.real_name || user.username}`);
      return true;
    } else {
      Utils.log('error', `登录失败: ${result.error?.message || '未知错误'}`);
      return false;
    }
  }

  async logout() {
    await this.api.logout();
    this.reporter.setUser(null);
  }

  async fetchProjects() {
    const result = await this.api.getProjects({ pageSize: 50 });
    if (result.success) {
      this.projects = result.data?.items || [];
      Utils.log('info', `获取到 ${this.projects.length} 个项目`);
      return this.projects;
    }
    return [];
  }

  async fetchMembers() {
    const result = await this.api.getMembers({ status: 'active', pageSize: 100 });
    if (result.success) {
      this.members = result.data?.items || [];
      Utils.log('info', `获取到 ${this.members.length} 个成员`);
      return this.members;
    }
    return [];
  }

  async createTaskForUser(user, project, taskType, priority, index) {
    const testName = `创建任务 #${index + 1}`;

    const timestamp = Utils.timestamp();
    const description = `[${user.role}测试] ${taskType.label}任务-${timestamp}`;

    const taskData = {
      project_id: project.id,
      wbs_level: 1,
      description,
      task_type: taskType.value,
      priority: priority.value,
      duration: Math.floor(Math.random() * 15) + 5, // 5-20天
      warning_days: 3,
    };

    const result = await this.api.createTask(taskData);

    if (result.success && result.data?.id) {
      const taskId = result.data.id;
      this.reporter.addCreatedTask(taskId, user.username, project.id);
      this.reporter.record(testName, true, `${taskType.label} | ${priority.label} | 项目: ${project.name}`, {
        taskId,
        taskType: taskType.value,
        priority: priority.value,
        projectId: project.id,
      });
      return taskId;
    } else {
      this.reporter.record(testName, false, result.error?.message || '创建失败');
      return null;
    }
  }

  async editTask(taskId, user) {
    const testName = '编辑任务';

    // 获取任务当前信息
    const taskResult = await this.api.getTask(taskId);
    if (!taskResult.success) {
      this.reporter.record(testName, false, '获取任务失败');
      return false;
    }

    const task = taskResult.data;
    const newPriority = TEST_CONFIG.priorities.find(p => p.value !== task.priority) || TEST_CONFIG.priorities[0];

    const updateData = {
      description: `${task.description}-已编辑`,
      priority: newPriority.value,
      version: task.version,
    };

    const result = await this.api.updateTask(taskId, updateData);

    if (result.success) {
      this.reporter.record(testName, true, `优先级: ${task.priority} → ${newPriority.value}`);
      return true;
    } else {
      this.reporter.record(testName, false, result.error?.message || '更新失败');
      return false;
    }
  }

  async assignTask(taskId, user) {
    const testName = '分配负责人';

    if (this.members.length === 0) {
      this.reporter.record(testName, false, '没有可用成员');
      return false;
    }

    // 获取任务当前信息
    const taskResult = await this.api.getTask(taskId);
    if (!taskResult.success) {
      this.reporter.record(testName, false, '获取任务失败');
      return false;
    }

    // 随机选择一个成员
    const member = this.members[Math.floor(Math.random() * this.members.length)];

    const updateData = {
      assignee_id: member.id,
      full_time_ratio: 100,
      version: taskResult.data.version,
    };

    const result = await this.api.updateTask(taskId, updateData);

    if (result.success) {
      this.reporter.record(testName, true, `分配给: ${member.name}`);
      return true;
    } else {
      this.reporter.record(testName, false, result.error?.message || '分配失败');
      return false;
    }
  }

  async updateTaskStatus(taskId, user) {
    const testName = '更新任务状态';

    const taskResult = await this.api.getTask(taskId);
    if (!taskResult.success) {
      this.reporter.record(testName, false, '获取任务失败');
      return false;
    }

    const today = Utils.formatDate(new Date());
    const updateData = {
      actual_start_date: today,
      version: taskResult.data.version,
    };

    const result = await this.api.updateTask(taskId, updateData);

    if (result.success) {
      this.reporter.record(testName, true, `实际开始日期: ${today}`);
      return true;
    } else {
      this.reporter.record(testName, false, result.error?.message || '更新失败');
      return false;
    }
  }

  async deleteTask(taskId, user) {
    const testName = '删除任务';

    const result = await this.api.deleteTask(taskId);

    if (result.success) {
      this.reporter.record(testName, true, '删除成功');
      return true;
    } else {
      this.reporter.record(testName, false, result.error?.message || '删除失败');
      return false;
    }
  }

  async testTaskFilter(user) {
    const testName = '任务筛选';

    if (this.projects.length === 0) {
      this.reporter.record(testName, false, '没有可用项目');
      return false;
    }

    const project = this.projects[0];
    const result = await this.api.getTasks({ project_id: project.id, page: 1, pageSize: 10 });

    if (result.success) {
      const count = result.data?.items?.length || 0;
      this.reporter.record(testName, true, `项目 ${project.name} 下有 ${count} 个任务`);
      return true;
    } else {
      this.reporter.record(testName, false, result.error?.message || '筛选失败');
      return false;
    }
  }

  async runTestsForUser(user) {
    Utils.log('info', `----------------------------------------`);
    Utils.log('user', `开始测试用户: ${user.role} (${user.username})`);

    // 登录
    const loginSuccess = await this.loginAs(user);
    if (!loginSuccess) {
      this.reporter.record('登录', false, '登录失败');
      return;
    }

    // 获取项目和成员
    await this.fetchProjects();
    await this.fetchMembers();

    if (this.projects.length === 0) {
      this.reporter.record('获取项目', false, '没有可用项目');
      await this.logout();
      return;
    }

    // 为每个用户创建多个任务，覆盖不同项目、不同类型
    const createdTaskIds = [];
    const taskCount = TEST_CONFIG.tasksPerUser;

    for (let i = 0; i < taskCount; i++) {
      // 轮询项目和任务类型
      const project = this.projects[i % this.projects.length];
      const taskType = TEST_CONFIG.taskTypes[i % TEST_CONFIG.taskTypes.length];
      const priority = TEST_CONFIG.priorities[i % TEST_CONFIG.priorities.length];

      const taskId = await this.createTaskForUser(user, project, taskType, priority, i);
      if (taskId) {
        createdTaskIds.push(taskId);
      }

      await Utils.sleep(100); // 避免请求过快
    }

    // 对创建的任务进行编辑、分配、状态更新
    for (const taskId of createdTaskIds) {
      await this.editTask(taskId, user);
      await this.assignTask(taskId, user);
      await this.updateTaskStatus(taskId, user);
      await Utils.sleep(100);
    }

    // 测试筛选
    await this.testTaskFilter(user);

    // 登出
    await this.logout();

    // 返回创建的任务ID（用于后续清理）
    return createdTaskIds;
  }

  async cleanup() {
    Utils.log('info', '========================================');
    Utils.log('info', '清理测试数据');
    Utils.log('info', '========================================');

    // 用管理员身份清理
    const admin = TEST_CONFIG.users.find(u => u.roleKey === 'admin');
    if (!admin) return;

    const loginSuccess = await this.loginAs(admin);
    if (!loginSuccess) {
      Utils.log('error', '无法以管理员身份登录，跳过清理');
      return;
    }

    let deletedCount = 0;
    for (const task of this.reporter.createdTasks) {
      const result = await this.api.deleteTask(task.taskId);
      if (result.success) {
        deletedCount++;
      }
      await Utils.sleep(50);
    }

    Utils.log('success', `已清理 ${deletedCount}/${this.reporter.createdTasks.length} 个测试任务`);
    await this.logout();
  }

  async runAll() {
    await this.init();

    const allCreatedTasks = [];

    // 按用户顺序测试
    for (const user of TEST_CONFIG.users) {
      const tasks = await this.runTestsForUser(user);
      if (tasks) {
        allCreatedTasks.push(...tasks);
      }
      await Utils.sleep(500); // 用户间间隔
    }

    // 输出报告
    this.reporter.printReport();

    // 清理数据
    if (allCreatedTasks.length > 0) {
      Utils.log('info', `\n创建了 ${allCreatedTasks.length} 个测试任务`);
      Utils.log('info', '运行 cleanup() 清理测试数据，或手动保留');
    }

    return allCreatedTasks;
  }
}

// ============================================
// 全局实例
// ============================================

let testRunner = null;

// ============================================
// 快捷命令
// ============================================

/**
 * 运行多角色完整测试
 */
window.runMultiRoleTests = async () => {
  testRunner = new TaskTestRunner();
  return await testRunner.runAll();
};

/**
 * 清理测试数据
 */
window.cleanup = async () => {
  if (testRunner) {
    await testRunner.cleanup();
  } else {
    Utils.log('warn', '请先运行 runMultiRoleTests()');
  }
};

/**
 * 查看测试结果
 */
window.showResults = () => {
  if (testRunner) {
    testRunner.reporter.printReport();
  } else {
    Utils.log('warn', '请先运行 runMultiRoleTests()');
  }
};

/**
 * 单独测试某个用户
 */
window.testUser = async (username) => {
  const user = TEST_CONFIG.users.find(u => u.username === username);
  if (!user) {
    Utils.log('error', `用户不存在: ${username}`);
    Utils.log('info', '可用用户: ' + TEST_CONFIG.users.map(u => u.username).join(', '));
    return;
  }

  testRunner = testRunner || new TaskTestRunner();
  await testRunner.init();
  return await testRunner.runTestsForUser(user);
};

/**
 * 查看配置
 */
window.showConfig = () => {
  console.log('测试配置:');
  console.table(TEST_CONFIG.users.map(u => ({
    用户名: u.username,
    角色: u.role,
    角色Key: u.roleKey,
  })));
  console.log(`\n任务类型: ${TEST_CONFIG.taskTypes.length} 种`);
  console.log(`优先级: ${TEST_CONFIG.priorities.length} 种`);
  console.log(`每用户任务数: ${TEST_CONFIG.tasksPerUser}`);
};

// ============================================
// 初始化提示
// ============================================

console.log('%c╔══════════════════════════════════════════════════════════╗', 'color: #2196F3');
console.log('%c║     任务管理模块多角色自动化测试脚本已加载              ║', 'color: #2196F3; font-weight: bold');
console.log('%c╚══════════════════════════════════════════════════════════╝', 'color: #2196F3');
console.log('\n测试用户:');
console.table(TEST_CONFIG.users.map(u => ({ 用户名: u.username, 密码: u.password, 角色: u.role })));
console.log('\n可用命令:');
console.log('  %crunMultiRoleTests()%c  - 运行多角色完整测试', 'color: #4CAF50', 'color: inherit');
console.log('  %ctestUser(username)%c   - 单独测试某个用户', 'color: #4CAF50', 'color: inherit');
console.log('  %cshowResults()%c        - 查看测试结果', 'color: #4CAF50', 'color: inherit');
console.log('  %ccleanup()%c            - 清理测试数据', 'color: #4CAF50', 'color: inherit');
console.log('  %cshowConfig()%c         - 查看测试配置', 'color: #4CAF50', 'color: inherit');
console.log('\n');
