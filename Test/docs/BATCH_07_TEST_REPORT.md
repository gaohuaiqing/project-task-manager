# Batch 07: 任务导入导出测试报告

**测试日期**: 2026-05-06
**测试执行者**: E2E Runner Agent
**测试环境**:
- 前端: http://localhost:5173
- 后端: http://localhost:3001
- 测试用户: admin / admin123, engineer (50241392)

---

## 测试概要

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| TC-IMP-01: 导入任务数据 | **部分通过** | 模板下载正常，导入API正常，UI按钮存在 |
| TC-IMP-02: 导出任务数据 | **失败** | 导出API返回404（路由顺序Bug） |
| TC-IMP-03: 权限验证 | **部分通过** | engineer可导入但看不到导出按钮 |

---

## 详细测试结果

### TC-IMP-01: 导入任务数据

**状态**: 部分通过

#### 步骤执行情况

| 步骤 | 状态 | 详情 |
|------|------|------|
| 1. admin登录 | 通过 | 登录成功 |
| 2. 进入任务页面 | 通过 | 页面加载正常 |
| 3. 检查导入按钮 | 通过 | 找到导入按钮 (选择器: `button:has-text("导入")`) |
| 4. 下载导入模板 | 通过 | API返回200，文件大小10936 bytes |
| 5. 测试导入API | 通过 | API返回200，验证失败（WBS编码格式错误） |

#### 测试输出

```
✓ 找到导入按钮 (选择器: button:has-text("导入"))
模板下载响应状态: 200
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
✓ 导入模板 API 可用
✓ 模板已保存到: G:/Project/Web/Project_Task_Manager_4.0/Test/downloads/task-import-template.xlsx
模板文件大小: 10936 bytes
✓ 模板文件下载成功，文件有效

导入响应状态: 200
导入结果: {
  "success": true,
  "data": {
    "total": 1,
    "success": 0,
    "failed": 1,
    "results": [
      {
        "success": false,
        "wbs_code": "TEST-IMPORT-001",
        "error": "WBS编码格式无效：TEST-IMPORT-001，应为数字点分格式（如 1, 1.1, 1.2.3）"
      }
    ]
  }
}
```

#### 发现的问题

1. **数据验证**: WBS编码需要使用数字点分格式（如 1, 1.1, 1.2.3），不能使用自定义格式

---

### TC-IMP-02: 导出任务数据

**状态**: 失败 (CRITICAL BUG)

#### 步骤执行情况

| 步骤 | 状态 | 详情 |
|------|------|------|
| 1. admin登录 | 通过 | 登录成功 |
| 2. 进入任务页面 | 通过 | 页面加载正常 |
| 3. 检查导出按钮 | 通过 | 找到导出按钮并点击成功 |
| 4. 测试CSV导出API | **失败** | 返回404，"任务不存在" |
| 5. 测试JSON导出API | **失败** | 返回404 |
| 6. 测试项目导出 | **失败** | 返回404 |

#### 测试输出

```
✓ 找到导出按钮 (选择器: button:has-text("导出"))
✓ 点击导出按钮成功

CSV导出响应状态: 404
! CSV导出失败: 404

JSON导出响应状态: 404
! JSON导出失败: 404
```

#### CRITICAL BUG: 路由顺序问题

**问题描述**:
- API端点 `/api/tasks/export` 返回404，错误消息 "任务不存在"
- 原因: Express路由顺序问题

**根本原因**:
在 `app/server/src/modules/task/routes.ts` 中:
- 第120行: `router.get('/:id', ...)` - 动态路由先定义
- 第262行: `router.get('/export', ...)` - 静态路由后定义

Express按顺序匹配路由，所以 `/export` 被 `/:id` 先匹配，把 "export" 当成任务ID。

**修复建议**:
将静态路由 `/export` 移到动态路由 `/:id` 之前:

```typescript
// 正确顺序：
router.get('/export', ...);        // 静态路由在前
router.get('/import/template', ...); // 静态路由在前
router.post('/import', ...);        // 静态路由在前
router.get('/:id', ...);           // 动态路由在后
```

---

### TC-IMP-03: 权限验证（engineer 导出权限）

**状态**: 部分通过

#### 步骤执行情况

| 步骤 | 状态 | 详情 |
|------|------|------|
| 1. engineer登录 | 通过 | 登录成功 |
| 2. 进入任务页面 | 通过 | 页面加载正常 |
| 3. 检查导出按钮 | **失败** | engineer看不到导出按钮 |
| 4. 测试导出API | **失败** | 返回404（路由bug，非权限问题） |
| 5. 测试导入权限 | 通过 | engineer可以下载模板和导入任务 |

#### 测试输出

```
! engineer 看不到导出按钮（可能被权限隐藏）

engineer导出响应状态: 404
! 意外响应: 404

engineer模板下载响应状态: 200
! engineer 可以下载导入模板
engineer导入响应状态: 200
! engineer 可以导入任务
```

#### 权限分析

| 功能 | engineer权限 | 预期 |
|------|------------|------|
| 下载导入模板 | 有 | 取决于业务需求 |
| 导入任务 | 有 | 取决于业务需求 |
| 导出按钮可见 | 无 | 可能是UI权限控制 |
| 导出API | 无法测试 | 因路由bug无法验证 |

---

## 生成的文件

| 文件类型 | 路径 | 大小 |
|---------|------|------|
| 导入模板 | `Test/downloads/task-import-template.xlsx` | 10,936 bytes |
| 截图 | `Test/screenshots/TC-IMP-*.png` | 多个文件 |

---

## Bug 列表

### CRITICAL: 路由顺序导致导出API不可用

- **严重级别**: CRITICAL
- **影响**: 所有导出功能不可用
- **文件**: `app/server/src/modules/task/routes.ts`
- **修复**: 将静态路由 `/export` 移到动态路由 `/:id` 之前

### MEDIUM: 导入数据验证提示

- **严重级别**: MEDIUM
- **影响**: 用户可能使用错误的WBS编码格式
- **建议**: 在导入模板中添加WBS编码格式说明

### LOW: engineer权限控制

- **严重级别**: LOW
- **影响**: engineer可以导入但看不到导出按钮
- **建议**: 确认权限策略是否一致

---

## 建议

1. **立即修复**: 路由顺序问题（CRITICAL）
2. **改进文档**: 在导入模板中添加WBS编码格式说明
3. **权限审查**: 确认engineer的导入导出权限策略

---

**测试完成时间**: 2026-05-06
**测试状态**: 3 passed (但存在CRITICAL bug)
