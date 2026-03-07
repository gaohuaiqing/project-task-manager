# 组织架构模块 E2E 测试

本目录包含组织架构模块的端到端自动化测试。

## 测试文件

- `organization-tree.spec.ts` - 组织架构树测试
- `department-management.spec.ts` - 部门管理测试
- `tech-group-management.spec.ts` - 技术组管理测试
- `member-management.spec.ts` - 成员管理测试
- `capability-models.spec.ts` - 能力模型测试
- `organization-permissions.spec.ts` - 权限控制测试
- `import-export.spec.ts` - 导入导出测试

## 快速开始

### 安装依赖

```bash
cd Test/E2E_AutoTest
npm install
```

### 运行所有测试

```bash
npm run test:organization
```

### 运行特定测试文件

```bash
npx playwright test tests/organization/organization-tree.spec.ts
```

### 运行特定测试用例

```bash
npx playwright test tests/organization/ --grep "应该显示组织架构树"
```

### 调试模式运行

```bash
npx playwright test tests/organization/ --headed --debug
```

## 测试覆盖

本测试套件覆盖以下功能：

### 组织架构树
- ✅ 树结构加载和显示
- ✅ 节点展开/收起
- ✅ 节点选择
- ✅ 统计信息显示
- ✅ 大量节点处理

### 部门管理
- ✅ 创建部门
- ✅ 编辑部门
- ✅ 删除部门
- ✅ 表单验证
- ✅ 工号唯一性

### 技术组管理
- ✅ 创建技术组
- ✅ 编辑技术组
- ✅ 删除技术组
- ✅ 成员列表显示
- ✅ 多技术组管理

### 成员管理
- ✅ 创建成员
- ✅ 编辑成员
- ✅ 删除成员
- ✅ 角色管理
- ✅ 能力模型显示

### 能力模型
- ✅ 创建能力模型组
- ✅ 编辑能力模型组
- ✅ 删除能力模型组
- ✅ 能力维度管理
- ✅ 应用到技术组

### 权限控制
- ✅ 管理员权限
- ✅ 部门经理权限
- ✅ 技术经理权限
- ✅ 工程师权限
- ✅ 菜单访问控制

### 导入导出
- ✅ Excel导入
- ✅ 数据导出
- ✅ 格式验证
- ✅ 统计信息

## 测试数据

测试数据定义在 `src/data/test-organization.ts` 文件中，包括：

- 完整的测试组织架构
- 测试部门、技术组、成员数据
- 测试能力模型数据
- 随机数据生成器

## 页面对象

组织架构页面对象定义在 `src/pages/OrganizationPage.ts`，封装了所有页面元素和操作。

## 测试报告

测试运行后，查看HTML报告：

```bash
npx playwright show-report
```

详细的测试报告请参考：
- [组织架构模块E2E测试报告](../../../docs/reports/ORGANIZATION_E2E_TEST_REPORT.md)

## 故障排查

### 测试失败

如果测试失败，检查：

1. 应用是否正常运行在 http://localhost:5173
2. 测试用户账号是否正确
3. 浏览器驱动是否最新

### 元素找不到

如果元素定位失败，可能是因为：

1. UI元素定位器已更改
2. 元素加载时机不对
3. 页面路由已更改

### 超时错误

增加等待时间或调整超时设置：

```typescript
await page.waitForTimeout(2000);
```

## 贡献指南

添加新测试时：

1. 在相应文件中添加测试用例
2. 使用清晰的中文描述
3. 确保测试独立性
4. 添加必要的清理逻辑
5. 更新测试报告

## 相关文档

- [项目README](../../../../README.md)
- [测试指南](../../../docs/guides/)
- [AI开发指南](../../../../CLAUDE.md)
