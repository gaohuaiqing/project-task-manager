# 交付前测试执行计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 执行项目任务管理系统交付前的全系统功能测试，确保交付质量

**Architecture:** 采用测试数据准备脚本 + Chrome DevTools MCP 执行测试 + 测试报告生成的三阶段架构

**Tech Stack:** TypeScript, Node.js, Chrome DevTools MCP, MySQL, Redis

**参考文档:** `Test/docs/DELIVERY_TEST_PLAN.md`

---

## 测试账户信息

**登录方式**: 登录名=工号，密码=工号

| 角色 | 工号 | 姓名 | 密码 |
|------|------|------|------|
| admin | admin | 系统管理员 | admin |
| dept_manager | 50223183 | 高怀庆 | 50223183 |
| tech_manager | 50233164 | 汪志明 | 50233164 |
| tech_manager | 50234447 | 陈理 | 50234447 |
| engineer | 50241392 | 张达 | 50241392 |
| engineer | 50260249 | 陈霄 | 50260249 |
| engineer | 50261934 | 叶协通 | 50261934 |
| engineer | 50265571 | 胡斌 | 50265571 |

---

## 文件结构

```
Test/
├── docs/
│   ├── DELIVERY_TEST_PLAN.md         # 测试方案文档
│   └── TEST_EXECUTION_CHECKLIST.md   # 执行检查清单
├── scripts/
│   ├── setup-test-data.ts            # 测试数据准备脚本
│   ├── clear-test-data.ts            # 清理测试数据脚本
│   ├── generate-test-report.ts       # 测试报告生成脚本
│   └── run-tests.sh                  # 快速启动脚本
├── data/
│   └── test-data.json                # 测试数据配置
└── reports/
    └── TEST_REPORT_YYYYMMDD.md       # 测试报告输出
```

---

## Task 1: 创建测试数据配置文件

**Files:**
- Create: `Test/data/test-data.json`

- [x] **Step 1: 查询数据库获取用户列表**

Run: `cd app/server && npx tsx scripts/list-users.ts`

- [x] **Step 2: 创建测试数据目录**

Run: `mkdir -p Test/data Test/scripts Test/reports`

- [x] **Step 3: 创建测试数据配置文件**

已创建 `Test/data/test-data.json`，包含：
- 8个系统已有用户（从数据库查询）
- 3个测试项目
- 7个测试任务（WBS结构）

- [x] **Step 4: 验证配置文件**

Run: `cat Test/data/test-data.json`

---

## Task 2: 创建测试数据准备脚本

**Files:**
- Create: `Test/scripts/setup-test-data.ts`

- [x] **Step 1: 创建脚本文件**

已创建 `Test/scripts/setup-test-data.ts`
- 仅创建项目和任务数据
- 不修改用户数据
- 用户使用系统已有账户

- [x] **Step 2: 执行测试数据准备**

Run: `cd app/server && npx tsx ../../Test/scripts/setup-test-data.ts`

---

## Task 3: 创建测试数据清理脚本

**Files:**
- Create: `Test/scripts/clear-test-data.ts`

- [x] **Step 1: 创建清理脚本**

已创建 `Test/scripts/clear-test-data.ts`
- 清理测试项目和任务
- 保留用户数据

- [x] **Step 2: 验证清理功能**

Run: `cd app/server && npx tsx ../../Test/scripts/clear-test-data.ts`

---

## Task 4: 创建测试报告生成脚本

**Files:**
- Create: `Test/scripts/generate-test-report.ts`

- [x] **Step 1: 创建报告生成脚本**

已创建 `Test/scripts/generate-test-report.ts`
- 生成 Markdown 格式报告
- 包含测试统计和问题汇总
- 包含测试账户信息

- [x] **Step 2: 验证报告生成**

Run: `npx tsx Test/scripts/generate-test-report.ts`

---

## Task 5: 创建测试执行检查清单

**Files:**
- Create: `Test/docs/TEST_EXECUTION_CHECKLIST.md`

- [x] **Step 1: 创建检查清单**

已创建 `Test/docs/TEST_EXECUTION_CHECKLIST.md`
- 基于 DELIVERY_TEST_PLAN.md
- 使用正确的工号账户
- 按测试阶段组织

---

## Task 6: 创建快速启动脚本

**Files:**
- Create: `Test/scripts/run-tests.sh`

- [x] **Step 1: 创建启动脚本**

已创建 `Test/scripts/run-tests.sh`
- 环境检查
- 数据准备/清理
- 报告生成
- 账号信息显示

---

## Task 7: 提交测试执行计划文档

**Files:**
- This plan file

- [ ] **Step 1: 验证所有文件已创建**

Run: `ls -la Test/`

- [ ] **Step 2: 提交到 Git**

```bash
git add Test/data/test-data.json
git add Test/scripts/setup-test-data.ts
git add Test/scripts/clear-test-data.ts
git add Test/scripts/generate-test-report.ts
git add Test/scripts/run-tests.sh
git add Test/docs/TEST_EXECUTION_CHECKLIST.md
git add docs/superpowers/plans/2026-05-13-delivery-test-execution.md
git commit -m "docs: 添加交付前测试执行计划和测试脚本"
```

---

## 自我审查检查清单

- [x] **Spec 覆盖**: 所有测试场景都已在计划中引用
- [x] **占位符检查**: 无 "TBD"、"TODO"、"implement later" 等占位符
- [x] **用户数据正确**: 使用数据库查询的真实用户信息
- [x] **文件路径正确**: 所有文件路径使用正确的相对路径
- [x] **代码完整**: 每个脚本都包含完整的可执行代码
- [x] **登录方式正确**: 登录名=工号，密码=工号

---

**计划完成时间**: 2026-05-14