/**
 * 任务管理模块 - Chrome DevTools 自动化测试脚本
 *
 * 使用方法：
 * 1. 打开浏览器，登录系统
 * 2. 导航到任务管理页面 (/tasks)
 * 3. 按 F12 打开 Chrome DevTools
 * 4. 切换到 Console 标签页
 * 5. 复制粘贴以下脚本并按回车执行
 *
 * 注意：脚本执行前请确保已登录且有相应权限
 */

// ============================================
// 工具函数
// ============================================

const TestUtils = {
  /**
   * 等待指定毫秒
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 等待元素出现
   */
  waitForElement: async (selector, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await TestUtils.sleep(100);
    }
    throw new Error(`元素未找到: ${selector}`);
  },

  /**
   * 等待元素消失
   */
  waitForElementHidden: async (selector, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const el = document.querySelector(selector);
      if (!el) return true;
      await TestUtils.sleep(100);
    }
    throw new Error(`元素仍然可见: ${selector}`);
  },

  /**
   * 模拟点击
   */
  click: async (selector) => {
    const el = await TestUtils.waitForElement(selector);
    el.click();
    await TestUtils.sleep(300);
    return el;
  },

  /**
   * 模拟输入
   */
  fill: async (selector, value) => {
    const el = await TestUtils.waitForElement(selector);
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await TestUtils.sleep(200);
    return el;
  },

  /**
   * 模拟选择下拉框
   */
  select: async (selector, value) => {
    // 先点击打开下拉框
    const trigger = await TestUtils.waitForElement(selector);
    trigger.click();
    await TestUtils.sleep(300);

    // 查找选项并点击
    const option = await TestUtils.waitForElement(`[data-value="${value}"]`, 2000);
    option.click();
    await TestUtils.sleep(300);
  },

  /**
   * 获取元素文本
   */
  getText: (selector) => {
    const el = document.querySelector(selector);
    return el ? el.textContent : null;
  },

  /**
   * 检查元素是否存在
   */
  exists: (selector) => !!document.querySelector(selector),

  /**
   * 日志输出
   */
  log: (type, message, data = null) => {
    const styles = {
      info: 'color: #2196F3; font-weight: bold',
      success: 'color: #4CAF50; font-weight: bold',
      error: 'color: #F44336; font-weight: bold',
      warn: 'color: #FF9800; font-weight: bold',
    };
    console.log(`%c[${type.toUpperCase()}] ${message}`, styles[type]);
    if (data) console.log(data);
  }
};

// ============================================
// API 辅助函数（直接调用后端 API）
// ============================================

const ApiHelper = {
  /**
   * 获取当前认证 token
   */
  getToken: () => {
    // 从 localStorage 获取 token
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  },

  /**
   * 发送 API 请求
   */
  request: async (method, path, body = null) => {
    const token = ApiHelper.getToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`/api${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API 错误: ${data.error?.message || response.statusText}`);
    }

    return data;
  },

  /**
   * 获取任务列表
   */
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    return ApiHelper.request('GET', `/tasks?${params.toString()}`);
  },

  /**
   * 创建任务
   */
  createTask: async (data) => {
    return ApiHelper.request('POST', '/tasks', data);
  },

  /**
   * 更新任务
   */
  updateTask: async (id, data) => {
    return ApiHelper.request('PUT', `/tasks/${id}`, data);
  },

  /**
   * 删除任务
   */
  deleteTask: async (id) => {
    return ApiHelper.request('DELETE', `/tasks/${id}`);
  },

  /**
   * 获取项目列表
   */
  getProjects: async () => {
    return ApiHelper.request('GET', '/projects');
  },

  /**
   * 获取成员列表
   */
  getMembers: async () => {
    return ApiHelper.request('GET', '/org/members?status=active&pageSize=100');
  }
};

// ============================================
// 测试场景
// ============================================

const TaskTests = {
  /**
   * 测试结果收集
   */
  results: [],

  /**
   * 记录测试结果
   */
  recordResult: (name, passed, message = '', data = null) => {
    TaskTests.results.push({ name, passed, message, data, time: new Date().toISOString() });
    if (passed) {
      TestUtils.log('success', `✓ ${name}`, message);
    } else {
      TestUtils.log('error', `✗ ${name}`, message);
    }
  },

  /**
   * 场景 1: 创建根任务
   */
  testCreateRootTask: async () => {
    const testName = '创建根任务';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      // 获取第一个可用项目
      const projectsData = await ApiHelper.getProjects();
      if (!projectsData.data?.items?.length) {
        throw new Error('没有可用项目，请先创建项目');
      }
      const project = projectsData.data.items[0];
      TestUtils.log('info', `选择项目: ${project.name} (${project.id})`);

      // 生成唯一任务描述
      const timestamp = Date.now();
      const taskDescription = `自动化测试任务-${timestamp}`;

      // 创建任务
      const createData = {
        project_id: project.id,
        wbs_level: 1,
        description: taskDescription,
        task_type: 'firmware',
        priority: 'high',
        duration: 10,
        warning_days: 3,
      };

      const result = await ApiHelper.createTask(createData);

      if (result.success && result.data?.id) {
        TaskTests.recordResult(testName, true, `任务创建成功，ID: ${result.data.id}`, {
          taskId: result.data.id,
          description: taskDescription,
          projectId: project.id
        });
        return result.data.id;
      } else {
        throw new Error('创建任务返回数据异常');
      }
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return null;
    }
  },

  /**
   * 场景 2: 创建子任务
   */
  testCreateSubtask: async (parentTaskId) => {
    const testName = '创建子任务';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      if (!parentTaskId) {
        throw new Error('需要父任务 ID');
      }

      // 获取父任务信息
      const parentTask = await ApiHelper.request('GET', `/tasks/${parentTaskId}`);
      if (!parentTask.data) {
        throw new Error('父任务不存在');
      }

      const timestamp = Date.now();
      const taskDescription = `自动化测试子任务-${timestamp}`;

      // 创建子任务
      const createData = {
        project_id: parentTask.data.project_id,
        parent_id: parentTaskId,
        wbs_level: parentTask.data.wbs_level + 1,
        description: taskDescription,
        task_type: parentTask.data.task_type,
        priority: 'medium',
        duration: 5,
      };

      const result = await ApiHelper.createTask(createData);

      if (result.success && result.data?.id) {
        TaskTests.recordResult(testName, true, `子任务创建成功，ID: ${result.data.id}`, {
          taskId: result.data.id,
          parentId: parentTaskId,
          description: taskDescription
        });
        return result.data.id;
      } else {
        throw new Error('创建子任务返回数据异常');
      }
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return null;
    }
  },

  /**
   * 场景 3: 编辑任务（修改描述和优先级）
   */
  testEditTask: async (taskId) => {
    const testName = '编辑任务';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      if (!taskId) {
        throw new Error('需要任务 ID');
      }

      // 获取当前任务信息
      const taskResult = await ApiHelper.request('GET', `/tasks/${taskId}`);
      if (!taskResult.data) {
        throw new Error('任务不存在');
      }
      const task = taskResult.data;

      // 更新任务
      const timestamp = Date.now();
      const updateData = {
        description: `${task.description}-已编辑-${timestamp}`,
        priority: task.priority === 'high' ? 'medium' : 'high',
        version: task.version,
      };

      const result = await ApiHelper.updateTask(taskId, updateData);

      if (result.success) {
        TaskTests.recordResult(testName, true, `任务编辑成功`, {
          taskId,
          newDescription: updateData.description,
          newPriority: updateData.priority
        });
        return true;
      } else {
        throw new Error('编辑任务返回数据异常');
      }
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  },

  /**
   * 场景 4: 分配负责人
   */
  testAssignTask: async (taskId) => {
    const testName = '分配负责人';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      if (!taskId) {
        throw new Error('需要任务 ID');
      }

      // 获取成员列表
      const membersData = await ApiHelper.getMembers();
      if (!membersData.data?.items?.length) {
        throw new Error('没有可用成员');
      }
      const member = membersData.data.items[0];

      // 获取当前任务信息
      const taskResult = await ApiHelper.request('GET', `/tasks/${taskId}`);
      if (!taskResult.data) {
        throw new Error('任务不存在');
      }

      // 更新负责人
      const updateData = {
        assignee_id: member.id,
        full_time_ratio: 100,
        version: taskResult.data.version,
      };

      const result = await ApiHelper.updateTask(taskId, updateData);

      if (result.success) {
        TaskTests.recordResult(testName, true, `负责人分配成功: ${member.name}`, {
          taskId,
          assigneeId: member.id,
          assigneeName: member.name
        });
        return true;
      } else {
        throw new Error('分配负责人返回数据异常');
      }
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  },

  /**
   * 场景 5: 设置任务依赖
   */
  testSetDependency: async (taskId, predecessorId) => {
    const testName = '设置任务依赖';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      if (!taskId || !predecessorId) {
        throw new Error('需要任务 ID 和前置任务 ID');
      }

      // 获取当前任务信息
      const taskResult = await ApiHelper.request('GET', `/tasks/${taskId}`);
      if (!taskResult.data) {
        throw new Error('任务不存在');
      }

      // 设置依赖
      const updateData = {
        predecessor_id: predecessorId,
        dependency_type: 'FS',
        lag_days: 0,
        version: taskResult.data.version,
      };

      const result = await ApiHelper.updateTask(taskId, updateData);

      if (result.success) {
        TaskTests.recordResult(testName, true, `依赖设置成功`, {
          taskId,
          predecessorId,
          dependencyType: 'FS'
        });
        return true;
      } else {
        throw new Error('设置依赖返回数据异常');
      }
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  },

  /**
   * 场景 6: 更新任务状态（填写实际日期）
   */
  testUpdateTaskStatus: async (taskId) => {
    const testName = '更新任务状态';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      if (!taskId) {
        throw new Error('需要任务 ID');
      }

      // 获取当前任务信息
      const taskResult = await ApiHelper.request('GET', `/tasks/${taskId}`);
      if (!taskResult.data) {
        throw new Error('任务不存在');
      }
      const task = taskResult.data;

      // 设置实际开始日期（触发状态变为"进行中"）
      const today = new Date().toISOString().split('T')[0];
      const updateData = {
        actual_start_date: today,
        version: task.version,
      };

      const result = await ApiHelper.updateTask(taskId, updateData);

      if (result.success) {
        TaskTests.recordResult(testName, true, `状态更新成功，实际开始日期: ${today}`, {
          taskId,
          actualStartDate: today
        });
        return true;
      } else {
        throw new Error('更新状态返回数据异常');
      }
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  },

  /**
   * 场景 7: 删除任务
   */
  testDeleteTask: async (taskId) => {
    const testName = '删除任务';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      if (!taskId) {
        throw new Error('需要任务 ID');
      }

      const result = await ApiHelper.deleteTask(taskId);

      if (result.success) {
        TaskTests.recordResult(testName, true, `任务删除成功`, { taskId });
        return true;
      } else {
        throw new Error('删除任务返回数据异常');
      }
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  },

  /**
   * 场景 8: 任务筛选测试
   */
  testTaskFilter: async () => {
    const testName = '任务筛选';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      // 获取项目列表
      const projectsData = await ApiHelper.getProjects();
      if (!projectsData.data?.items?.length) {
        throw new Error('没有可用项目');
      }
      const project = projectsData.data.items[0];

      // 按项目筛选
      const filterResult = await ApiHelper.getTasks({
        project_id: project.id,
        page: 1,
        pageSize: 10
      });

      if (filterResult.success) {
        const count = filterResult.data?.items?.length || 0;
        TaskTests.recordResult(testName, true, `筛选成功，项目 ${project.name} 下有 ${count} 个任务`, {
          projectId: project.id,
          taskCount: count
        });
        return true;
      } else {
        throw new Error('筛选任务返回数据异常');
      }
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  }
};

// ============================================
// UI 模拟测试（通过 DOM 操作）
// ============================================

const UITests = {
  /**
   * 通过 UI 创建任务
   */
  testCreateTaskViaUI: async () => {
    const testName = 'UI创建任务';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      // 1. 点击新建任务按钮
      await TestUtils.click('[data-testid="task-btn-create-task"]');

      // 2. 等待表单出现
      await TestUtils.waitForElement('[data-testid="task-dialog-form"]');

      // 3. 填写任务描述
      const timestamp = Date.now();
      await TestUtils.fill('[data-testid="task-input-description"]', `UI测试任务-${timestamp}`);

      // 4. 选择任务类型
      await TestUtils.select('[data-testid="task-select-type"]', 'firmware');

      // 5. 选择优先级
      await TestUtils.select('[data-testid="task-select-priority"]', 'high');

      // 6. 填写工期
      await TestUtils.fill('[data-testid="task-input-estimated-days"]', '10');

      // 7. 提交表单
      await TestUtils.click('[data-testid="task-btn-submit"]');

      // 8. 等待表单关闭
      await TestUtils.waitForElementHidden('[data-testid="task-dialog-form"]');

      TaskTests.recordResult(testName, true, '通过 UI 创建任务成功');
      return true;
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  },

  /**
   * 通过 UI 编辑任务
   */
  testEditTaskViaUI: async () => {
    const testName = 'UI编辑任务';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      // 1. 找到第一个任务行的编辑按钮
      const editBtn = document.querySelector('[data-testid="task-btn-edit-task"]');
      if (!editBtn) {
        throw new Error('未找到编辑按钮，请确保有任务数据');
      }

      // 2. 点击编辑按钮
      editBtn.click();
      await TestUtils.sleep(500);

      // 3. 等待表单出现
      await TestUtils.waitForElement('[data-testid="task-dialog-form"]');

      // 4. 修改任务描述
      const descInput = document.querySelector('[data-testid="task-input-description"]');
      const currentDesc = descInput.value;
      await TestUtils.fill('[data-testid="task-input-description"]', `${currentDesc}-UI编辑`);

      // 5. 提交表单
      await TestUtils.click('[data-testid="task-btn-submit"]');

      // 6. 等待表单关闭
      await TestUtils.waitForElementHidden('[data-testid="task-dialog-form"]');

      TaskTests.recordResult(testName, true, '通过 UI 编辑任务成功');
      return true;
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  },

  /**
   * 通过 UI 删除任务
   */
  testDeleteTaskViaUI: async () => {
    const testName = 'UI删除任务';
    try {
      TestUtils.log('info', `开始测试: ${testName}`);

      // 1. 找到删除按钮
      const deleteBtn = document.querySelector('[data-testid="task-btn-delete-task"]');
      if (!deleteBtn) {
        throw new Error('未找到删除按钮，请确保有任务数据');
      }

      // 2. 点击删除按钮
      deleteBtn.click();
      await TestUtils.sleep(500);

      // 3. 等待确认对话框出现
      await TestUtils.waitForElement('[data-testid="task-dialog-delete-confirm"]');

      // 4. 点击确认按钮
      await TestUtils.click('[data-testid="confirm-btn-ok"]');

      // 5. 等待对话框关闭
      await TestUtils.waitForElementHidden('[data-testid="task-dialog-delete-confirm"]');

      TaskTests.recordResult(testName, true, '通过 UI 删除任务成功');
      return true;
    } catch (error) {
      TaskTests.recordResult(testName, false, error.message);
      return false;
    }
  }
};

// ============================================
// 主测试运行器
// ============================================

const TestRunner = {
  /**
   * 运行所有 API 测试
   */
  runAllApiTests: async () => {
    TestUtils.log('info', '========================================');
    TestUtils.log('info', '开始运行任务管理模块 API 测试');
    TestUtils.log('info', '========================================');

    TaskTests.results = [];
    const createdTasks = [];

    // 1. 创建根任务
    const rootTaskId = await TaskTests.testCreateRootTask();
    if (rootTaskId) createdTasks.push(rootTaskId);

    // 2. 创建子任务
    if (rootTaskId) {
      const subtaskId = await TaskTests.testCreateSubtask(rootTaskId);
      if (subtaskId) createdTasks.push(subtaskId);

      // 3. 编辑任务
      await TaskTests.testEditTask(subtaskId);

      // 4. 分配负责人
      await TaskTests.testAssignTask(subtaskId);

      // 5. 设置依赖（子任务依赖父任务）
      await TaskTests.testSetDependency(subtaskId, rootTaskId);

      // 6. 更新任务状态
      await TaskTests.testUpdateTaskStatus(subtaskId);
    }

    // 7. 任务筛选
    await TaskTests.testTaskFilter();

    // 8. 清理：删除创建的任务（先删子任务，再删父任务）
    TestUtils.log('info', '开始清理测试数据...');
    for (let i = createdTasks.length - 1; i >= 0; i--) {
      await TaskTests.testDeleteTask(createdTasks[i]);
    }

    // 输出测试报告
    TestRunner.printReport();
  },

  /**
   * 运行所有 UI 测试
   */
  runAllUITests: async () => {
    TestUtils.log('info', '========================================');
    TestUtils.log('info', '开始运行任务管理模块 UI 测试');
    TestUtils.log('info', '========================================');

    TaskTests.results = [];

    // UI 测试需要手动确认页面状态
    await UITests.testCreateTaskViaUI();
    await UITests.testEditTaskViaUI();
    // 删除测试可选，因为会影响数据
    // await UITests.testDeleteTaskViaUI();

    TestRunner.printReport();
  },

  /**
   * 打印测试报告
   */
  printReport: () => {
    const total = TaskTests.results.length;
    const passed = TaskTests.results.filter(r => r.passed).length;
    const failed = total - passed;

    console.log('\n');
    TestUtils.log('info', '========================================');
    TestUtils.log('info', '测试报告');
    TestUtils.log('info', '========================================');
    console.log(`总计: ${total} 个测试`);
    console.log(`%c通过: ${passed}`, 'color: #4CAF50; font-weight: bold');
    console.log(`%c失败: ${failed}`, 'color: #F44336; font-weight: bold');
    console.log('\n详细结果:');
    console.table(TaskTests.results.map(r => ({
      测试名称: r.name,
      结果: r.passed ? '✓ 通过' : '✗ 失败',
      消息: r.message,
      时间: r.time
    })));
  }
};

// ============================================
// 快捷命令
// ============================================

/**
 * 运行所有 API 测试
 * 在控制台输入: runAllTests()
 */
window.runAllTests = TestRunner.runAllApiTests;

/**
 * 运行所有 UI 测试
 * 在控制台输入: runUITests()
 */
window.runUITests = TestRunner.runAllUITests;

/**
 * 单独测试创建任务
 * 在控制台输入: testCreate()
 */
window.testCreate = TaskTests.testCreateRootTask;

/**
 * 单独测试编辑任务
 * 在控制台输入: testEdit('任务ID')
 */
window.testEdit = TaskTests.testEditTask;

/**
 * 单独测试删除任务
 * 在控制台输入: testDelete('任务ID')
 */
window.testDelete = TaskTests.testDeleteTask;

/**
 * 单独测试分配负责人
 * 在控制台输入: testAssign('任务ID')
 */
window.testAssign = TaskTests.testAssignTask;

/**
 * 单独测试设置依赖
 * 在控制台输入: testDependency('任务ID', '前置任务ID')
 */
window.testDependency = TaskTests.testSetDependency;

/**
 * 单独测试筛选
 * 在控制台输入: testFilter()
 */
window.testFilter = TaskTests.testTaskFilter;

/**
 * 查看测试结果
 * 在控制台输入: showResults()
 */
window.showResults = () => {
  console.table(TaskTests.results.map(r => ({
    测试名称: r.name,
    结果: r.passed ? '✓ 通过' : '✗ 失败',
    消息: r.message,
    时间: r.time
  })));
};

// ============================================
// 初始化提示
// ============================================

console.log('%c========================================', 'color: #2196F3');
console.log('%c任务管理模块自动化测试脚本已加载', 'color: #2196F3; font-weight: bold');
console.log('%c========================================', 'color: #2196F3');
console.log('\n可用命令:');
console.log('  %crunAllTests()%c    - 运行所有 API 测试', 'color: #4CAF50', 'color: inherit');
console.log('  %crunUITests()%c     - 运行所有 UI 测试', 'color: #4CAF50', 'color: inherit');
console.log('  %ctestCreate()%c     - 测试创建任务', 'color: #4CAF50', 'color: inherit');
console.log('  %ctestEdit(id)%c     - 测试编辑任务', 'color: #4CAF50', 'color: inherit');
console.log('  %ctestDelete(id)%c   - 测试删除任务', 'color: #4CAF50', 'color: inherit');
console.log('  %ctestAssign(id)%c   - 测试分配负责人', 'color: #4CAF50', 'color: inherit');
console.log('  %ctestFilter()%c     - 测试任务筛选', 'color: #4CAF50', 'color: inherit');
console.log('  %cshowResults()%c    - 查看测试结果', 'color: #4CAF50', 'color: inherit');
console.log('\n');
