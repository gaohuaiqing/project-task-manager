# 认证模块E2E测试索引

## 📁 测试文件

### 1. auth-complete.spec.ts
**完整功能测试套件**

测试用户登录、管理员登录、密码切换、会话管理等所有核心功能。

**主要内容**:
- 所有角色的用户登录测试
- 管理员登录和权限验证
- 密码可见性切换（用户和管理员）
- 错误凭据验证和处理
- 会话保持和跨标签页同步
- 会话超时模拟
- 多角色切换
- UI元素完整验证
- 键盘交互测试
- 响应式布局测试
- 可访问性测试
- 登出功能完整测试
- 跨标签页会话同步

**测试用例数**: 80+

### 2. auth-data.spec.ts
**数据验证测试套件**

验证认证相关的数据存储、结构和完整性。

**主要内容**:
- 会话数据结构验证
- 会话ID唯一性和格式验证
- 设备信息记录验证
- 时间戳记录验证
- 用户数据存储验证
- 管理员权限标志验证
- 密码哈希验证
- 会话数据安全验证
- 登出后数据清除验证
- 数据完整性验证

**测试用例数**: 30+

### 3. auth-api.spec.ts
**API端点测试套件**

测试认证相关的API调用和响应处理。

**主要内容**:
- 登录API调用验证
- 登录API请求体验证
- 登录失败错误处理
- 会话验证API测试
- 登出API测试
- 健康检查API测试
- WebSocket连接测试
- 数据同步API测试
- 跨域请求测试
- 错误处理测试
- API性能测试

**测试用例数**: 20+

### 4. auth-security.spec.ts
**安全测试套件**

测试认证模块的安全功能和漏洞防护。

**主要内容**:
- 密码安全测试
- 会话安全测试
- CSRF防护测试
- SQL注入防护测试
- XSS防护测试
- 暴力破解防护测试
- 会话固定攻击防护测试
- 敏感数据保护测试
- 权限验证测试
- 安全配置验证

**测试用例数**: 40+

## 🛠️ 配置文件

### auth.config.ts
**测试配置文件**

包含所有认证测试的配置、常量和辅助函数。

**主要内容**:
- 超时设置
- 重试设置
- 会话配置
- 测试用户配置
- 测试URL配置
- 存储键配置
- 错误消息配置
- 选择器配置
- 测试数据集

## 📊 测试覆盖

### UI组件覆盖

| 组件 | 覆盖范围 |
|------|----------|
| LoginPage | 100% |
| AuthContext | 95% |
| Header (部分) | 80% |

### 功能覆盖

| 功能模块 | 覆盖率 | 测试用例数 |
|----------|--------|------------|
| 用户登录 | 100% | 20+ |
| 管理员登录 | 100% | 10+ |
| 密码功能 | 100% | 10+ |
| 会话管理 | 95% | 25+ |
| 登出功能 | 100% | 15+ |
| UI验证 | 100% | 15+ |
| 数据验证 | 100% | 30+ |
| API测试 | 90% | 20+ |
| 安全测试 | 85% | 40+ |

### API端点覆盖

| 端点 | 方法 | 状态 |
|------|------|------|
| `/api/login` | POST | ✅ 已测试 |
| `/api/logout` | POST | ✅ 已测试 |
| `/api/session/status/:id` | GET | ✅ 已测试 |
| `/api/sessions/:user/terminate` | POST | ✅ 已测试 |
| `/health` | GET | ✅ 已测试 |
| WebSocket | WS | ✅ 已测试 |

## 🎯 测试场景

### 登录场景
- ✅ 技术经理登录
- ✅ 部门经理登录
- ✅ 工程师登录
- ✅ 管理员登录
- ✅ 错误凭据处理
- ✅ 空凭据验证
- ✅ 表单验证

### 会话场景
- ✅ 会话创建
- ✅ 会话保持
- ✅ 会话延期
- ✅ 会话超时
- ✅ 跨标签页同步
- ✅ 会话验证

### 安全场景
- ✅ SQL注入防护
- ✅ XSS防护
- ✅ CSRF防护
- ✅ 会话固定防护
- ✅ 密码安全
- ✅ 数据保护

## 📖 使用指南

### 运行所有测试
```bash
npx playwright test tests/auth/
```

### 运行特定测试文件
```bash
npx playwright test tests/auth/auth-complete.spec.ts
npx playwright test tests/auth/auth-data.spec.ts
npx playwright test tests/auth/auth-api.spec.ts
npx playwright test tests/auth/auth-security.spec.ts
```

### 调试模式
```bash
npx playwright test tests/auth/ --debug
```

### 生成报告
```bash
npx playwright test tests/auth/ --reporter=html
npx playwright show-report
```

## 📚 相关文档

- [完整测试报告](../../../docs/reports/E2E_AUTH_TEST_REPORT.md)
- [快速参考指南](../../../docs/guides/E2E_AUTH_QUICK_REFERENCE.md)
- [执行摘要](../../../docs/reports/E2E_AUTH_TEST_SUMMARY.md)
- [Playwright配置](../../playwright.config.ts)
- [认证辅助函数](../../src/helpers/auth-helpers.ts)
- [LoginPage页面对象](../../src/pages/LoginPage.ts)

## 🔧 维护说明

### 添加新测试
1. 在相应的测试文件中添加测试用例
2. 遵循现有的命名和结构规范
3. 使用页面对象和辅助函数
4. 添加必要的注释和文档

### 更新测试数据
1. 修改 `test-users.ts` 中的用户数据
2. 更新 `auth.config.ts` 中的配置
3. 确保所有相关测试同步更新

### 修复测试问题
1. 查看测试报告确定失败原因
2. 检查选择器是否仍然有效
3. 验证测试数据是否正确
4. 更新超时设置（如果需要）

---

**最后更新**: 2025-03-04
**维护者**: QA Team
