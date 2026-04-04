# 项目任务管理系统 - AI 开发指南

> **重要**: 本文件是 AI 助手的核心指导文档，所有文件生成和代码操作都必须严格遵守本文档规定。

---

## 🚨 核心原则

### 1. 文件组织规则

#### 📁 根目录文件限制
**根目录只能包含以下文件**：
- `README.md` - 项目说明文档（必需）
- `CLAUDE.md` - AI 开发指南（本文件，必需）
- `package.json` - 依赖管理
- 配置文件（.gitignore, .eslintrc, tsconfig.json 等）

**❌ 禁止在根目录创建**：
- 任何 `.md` 文件（除了 README.md 和 CLAUDE.md）
- 报告类文档
- 临时文件
- 草稿文件

#### 📁 文档存放规则
**所有文档必须存放在 `docs/` 目录下**：

```
docs/
├── reports/              # 报告类文档
│   └── [主题]_[类型].md
├── analysis/             # 分析类文档
│   └── [主题]_ANALYSIS.md
├── guides/               # 指南类文档
│   └── [主题]_GUIDE.md
└── 自定义Prompt/         # 自定义 Prompt
```

**文件命名规范**：
- 报告类：`[主题]_REPORT.md`（大写字母 + 下划线）
- 分析类：`[主题]_ANALYSIS.md`
- 指南类：`[主题]_GUIDE.md`
- 索引类：`INDEX.md`

#### 📁 源代码存放规则
```
app/                      # 所有源代码
├── src/                  # 前端源代码
│   ├── components/       # UI 组件
│   ├── services/         # 服务层
│   ├── utils/            # 工具函数
│   ├── hooks/            # React Hooks
│   └── types/            # TypeScript 类型
└── server/               # 后端源代码
    └── src/              # Express 服务源码
        ├── routes/       # API 路由
        ├── services/     # 业务逻辑
        ├── middleware/   # 中间件
        ├── migrations/   # 数据库迁移
        └── utils/        # 工具函数
```

#### 📁 测试代码存放规则
```
Test/                     # 所有测试代码
├── frontend/             # 前端测试
├── backend/              # 后端测试
├── E2E_AutoTest/         # E2E 测试
└── docs/                 # 测试文档
```

#### 📁 构建输出规则
```
Build/                    # 构建输出（不提交到 git）
├── frontend/dist/        # 前端构建结果
└── backend/dist/         # 后端构建结果

logs/                     # 日志文件（不提交到 git）
├── build/                # 构建日志
└── ai-assist/            # AI 辅助日志
```

---

## 📋 AI 操作检查清单

### 创建新文件前，必须确认：

- [ ] 文件类型（文档/代码/测试/配置）
- [ ] 正确的目录位置
- [ ] 正确的文件命名
- [ ] 不违反根目录限制

### 文档类文件决策树：

```
是否是 README.md？
├─ 是 → 放在根目录
└─ 否 → 是否是 CLAUDE.md？
    ├─ 是 → 放在根目录
    └─ 否 → 放在 docs/ 目录下
        ├─ 报告类 → docs/reports/
        ├─ 分析类 → docs/analysis/
        ├─ 指南类 → docs/guides/
        └─ 其他 → docs/ 相应子目录
```

### 代码类文件决策树：

```
是否是源代码？
├─ 是 → app/
│   ├─ 前端 → app/src/
│   └─ 后端 → app/server/src/
└─ 否 → 是否是测试？
    ├─ 是 → Test/
    │   ├─ 前端测试 → Test/frontend/
    │   ├─ 后端测试 → Test/backend/
    │   └─ E2E 测试 → Test/E2E_AutoTest/
    └─ 否 → 配置文件 → 根目录或相应位置
```

---

## 🔧 常见场景规范

### 场景 1: 生成代码分析报告
```bash
# ❌ 错误
CODE_ANALYSIS_REPORT.md（根目录）

# ✅ 正确
docs/reports/CODE_ANALYSIS_REPORT.md
```

### 场景 2: 生成重构建议
```bash
# ❌ 错误
REFACTORING_SUGGESTIONS.md（根目录）

# ✅ 正确
docs/analysis/REFACTORING_ANALYSIS.md
```

### 场景 3: 生成 API 文档
```bash
# ❌ 错误
API_DOCUMENTATION.md（根目录）

# ✅ 正确
docs/guides/API_GUIDE.md
```

### 场景 4: 创建新组件
```bash
# ❌ 错误
components/NewComponent.tsx（根目录）

# ✅ 正确
app/src/components/NewComponent.tsx
```

### 场景 5: 创建测试文件
```bash
# ❌ 错误
__tests__/Component.test.tsx（根目录）

# ✅ 正确
Test/frontend/unit/components/Component.test.tsx
```

---

## 🎯 强制执行规则

### AI 必须遵守：

1. **文件创建前检查**
   - 检查文件类型
   - 检查目录结构
   - 确认是否符合规范

2. **文档文件处理**
   - 所有 .md 文件（除 README.md, CLAUDE.md）必须放在 docs/
   - 报告类文档必须放在 docs/reports/
   - 创建索引文件 INDEX.md

3. **代码文件处理**
   - 源代码必须放在 app/ 目录
   - 测试代码必须放在 Test/ 目录
   - 配置文件按约定放置

4. **构建输出处理**
   - 构建输出必须放在 Build/ 目录
   - 日志文件必须放在 logs/ 目录
   - 这些目录已被 .gitignore 忽略

4. **终端输出要求**
   - 请始终使用中文进行思考和回复，包括内部推理过程

## 📝 示例对话

### 用户请求
```
用户: 请帮我分析一下代码质量，生成一个报告。
```

### AI 正确响应
```
我将为您分析代码质量并生成报告。

报告将保存到: docs/reports/CODE_QUALITY_ANALYSIS.md

分析内容包括：
- 代码复杂度
- 命名规范
- 架构设计
- 性能优化建议

分析完成后，我会更新 docs/reports/INDEX.md 索引文件。
```

### AI 错误响应（禁止）
```
❌ 我将在根目录生成 CODE_QUALITY_REPORT.md 报告。
```

---

## 🔍 验证机制

### 文件创建后验证：

1. **检查文件位置**
   ```bash
   # 验证文件是否在正确位置
   git ls-files | grep [filename]
   ```

2. **检查目录结构**
   ```bash
   # 查看目录树
   tree docs/ -L 2
   ```

3. **检查 .gitignore**
   ```bash
   # 验证是否被正确忽略
   git check-ignore -v [filename]
   ```

---

## 📚 相关文档

- [AI 快速参考](docs/guides/AI_QUICK_REFERENCE.md) - 🚨 **速查表，每次操作前先查阅！**
- [目录结构说明](docs/reports/DIRECTORY_REORGANIZATION_REPORT.md)
- [项目 README](README.md)
- [.gitignore 规则](docs/reports/GITIGNORE_FINAL_VERIFICATION.md)

---

## ⚠️ 重要提醒

### 如果发现违规文件：
1. 立即停止操作
2. 通知用户目录结构规范
3. 建议正确的文件位置
4. 等待用户确认后再继续

### 如果不确定：
1. 询问用户文件类型和用途
2. 参考本文档的决策树
3. 选择最合适的目录位置
4. 在操作前获得用户确认

---

**最后更新**: 2025-03-03
**版本**: 2.0
**状态**: ✅ 强制执行
