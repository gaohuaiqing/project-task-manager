# AI 快速参考卡片

> **速查表**: 在创建文件前，先查阅此卡片！

---

## 🚨 文件位置速查

### .md 文件（文档）
```
文件名                    │ 位置
─────────────────────────┼─────────────────────
README.md               │ 根目录 ✅
CLAUDE.md               │ 根目录 ✅
其他所有 .md 文件        │ docs/ ✅
```

### 代码文件
```
文件类型                  │ 位置
─────────────────────────┼─────────────────────
前端组件                 │ app/src/components/
前端服务                 │ app/src/services/
前端工具                 │ app/src/utils/
后端路由                 │ app/server/src/routes/
后端服务                 │ app/server/src/services/
后端中间件               │ app/server/src/middleware/
```

### 测试文件
```
文件类型                  │ 位置
─────────────────────────┼─────────────────────
前端单元测试             │ Test/frontend/unit/
后端单元测试             │ Test/backend/unit/
E2E 测试                 │ Test/E2E_AutoTest/tests/
```

---

## 📋 文档分类

### 报告类 → docs/reports/
- `*_REPORT.md` - 报告文档
- `*_SUMMARY.md` - 总结文档
- `*_ANALYSIS.md` - 分析文档

### 指南类 → docs/guides/
- `*_GUIDE.md` - 指南文档
- `*_TUTORIAL.md` - 教程文档

### 其他 → docs/相应子目录

---

## ⚡ 快速决策

### 创建文件前问自己：

1. **这是什么类型的文件？**
   - 📄 文档 → docs/
   - 💻 代码 → app/
   - 🧪 测试 → Test/
   - ⚙️ 配置 → 根目录或相应位置

2. **文档类文件？**
   - README.md? → 根目录
   - CLAUDE.md? → 根目录
   - 其他 .md? → docs/

3. **docs/ 子目录？**
   - 报告类 → docs/reports/
   - 分析类 → docs/analysis/
   - 指南类 → docs/guides/

---

## 🚫 常见错误（避免！）

```
❌ CODE_ANALYSIS.md → 根目录
✅ docs/reports/CODE_ANALYSIS.md

❌ MyComponent.tsx → 根目录
✅ app/src/components/MyComponent.tsx

� test.ts → 根目录
✅ Test/frontend/unit/test.ts

❌ notes.md → 根目录
✅ docs/reports/NOTES.md
```

---

## ✅ 正确示例

### 用户: "帮我分析代码质量"
```
AI: 好的，我将为您分析代码质量并生成报告。
    报告将保存到: docs/reports/CODE_QUALITY_ANALYSIS.md
```

### 用户: "创建一个新组件"
```
AI: 好的，我将创建新组件。
    文件将保存到: app/src/components/NewComponent.tsx
```

### 用户: "写一个测试"
```
AI: 好的，我将编写测试文件。
    文件将保存到: Test/frontend/unit/components/
```

---

**记住**: 不确定？查 CLAUDE.md！
