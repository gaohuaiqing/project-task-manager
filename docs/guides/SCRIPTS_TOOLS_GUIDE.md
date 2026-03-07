# 脚本和工具使用指南

本指南提供项目中所有可用脚本和工具的详细说明。

---

## 📊 监控工具

### 内存监控器 (memory-monitor.js)

**用途**: 实时监控 Node.js 进程和系统内存使用情况

**使用方法**:
```bash
npm run memory:monitor
```

**功能**:
- 实时显示堆内存使用情况
- 系统内存监控
- Node.js 进程检测
- 内存使用率可视化
- 自动警告和提示音

**警告阈值**:
- 🟢 正常: < 70%
- 🟡 警告: 70-85%
- 🔴 危险: > 85%

---

## 🏥 健康检查

### 系统健康检查 (health-check.js)

**用途**: 全面检查系统、进程、端口和依赖状态

**使用方法**:
```bash
npm run health:check
```

**检查项目**:
1. 系统内存使用
2. CPU 负载
3. Node.js 进程数量
4. 磁盘空间
5. 依赖包大小
6. 端口占用情况
7. 缓存大小

**退出代码**:
- `0`: 所有检查通过
- `2`: 有警告
- `1`: 有错误

---

## 🧹 清理工具

### 进程清理 (cleanup-processes.js)

**用途**: 清理可能导致内存问题的 Node.js 进程

**使用方法**:
```bash
npm run cleanup:processes
```

**功能**:
- 查找所有 Node.js 进程
- 优雅终止 (SIGTERM)
- 强制终止残留进程
- 跨平台支持 (Windows/Unix)

**安全机制**:
- 显示要终止的进程
- 优先使用优雅终止
- 等待进程退出
- 必要时强制终止

---

## 🚀 组合命令

### 紧急重启

```bash
npm run emergency:restart
```

**执行操作**:
1. 清理所有 Node.js 进程
2. 重新启动开发服务器

### 完全清理

```bash
npm run cleanup:all
```

**执行操作**:
1. 清理 Node.js 进程
2. 清理缓存文件
3. 清理 npm 缓存

### 缓存清理

```bash
npm run cleanup:cache
```

**清理内容**:
- `app/node_modules/.cache`
- `**/.vite` 目录

---

## 📝 快速内存检查

```bash
npm run memory:check
```

**输出**: 当前进程的内存使用情况

---

## 🎯 使用场景

### 场景 1: 开发前检查

```bash
# 1. 检查系统健康
npm run health:check

# 2. 如果有问题，清理环境
npm run cleanup:all

# 3. 启动开发服务器
npm run dev
```

### 场景 2: 内存问题排查

```bash
# 1. 启动内存监控
npm run memory:monitor

# 2. 在另一个终端操作项目
# 3. 观察内存使用情况
# 4. 如果发现异常，按 Ctrl+C 停止监控
```

### 场景 3: Claude Code 挂死后恢复

```bash
# 1. 紧急重启（清理进程 + 重启）
npm run emergency:restart

# 或者分步操作
npm run cleanup:processes  # 清理进程
npm run cleanup:cache      # 清理缓存
npm run dev                # 重启
```

### 场景 4: 定期维护

```bash
# 每天或每周执行
npm run health:check       # 检查系统状态
npm run cleanup:cache      # 清理缓存
npm cache clean --force    # 清理 npm 缓存
```

---

## 🔧 高级用法

### 后台运行监控

```bash
# Unix/Linux/Mac
npm run memory:monitor &

# Windows (PowerShell)
Start-Process -NoNewWindow npm -ArgumentList "run memory:monitor"
```

### 日志查看

内存监控日志保存在:
```
logs/ai-assist/memory-monitor.log
```

### 自定义监控脚本

你可以修改 `scripts/memory-monitor.js` 中的配置:

```javascript
const CONFIG = {
  checkInterval: 5000,        // 检查间隔 (毫秒)
  warningThreshold: 0.7,      // 警告阈值 (70%)
  criticalThreshold: 0.85,    // 危险阈值 (85%)
  alertSound: true,           // 是否启用提示音
};
```

---

## ⚠️ 注意事项

1. **开发服务器重启**: 清理进程会终止所有开发服务器，确保先保存工作

2. **端口占用**: 如果端口被占用，使用 `cleanup:processes` 清理

3. **内存监控**: 监控程序本身会占用少量内存 (~50MB)

4. **跨平台**: 所有脚本都支持 Windows、macOS 和 Linux

5. **日志文件**: 定期清理 `logs/` 目录，避免日志文件过大

---

## 🆘 故障排除

### 问题: 脚本无法执行

```bash
# Unix/Linux/Mac: 添加执行权限
chmod +x scripts/*.js

# 或者直接使用 node 运行
node scripts/memory-monitor.js
```

### 问题: 无法终止进程

```bash
# Windows: 手动在任务管理器中结束 node.exe 进程

# Unix/Linux/Mac: 使用 killall
killall -9 node
```

### 问题: 端口仍被占用

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Unix/Linux/Mac
lsof -ti:5173 | xargs kill -9
```

---

## 📚 相关文档

- [Claude Code 稳定性指南](./CLAUDE_CODE_STABILITY_GUIDE.md) - 详细的问题分析和解决方案
- [AI 快速参考](./AI_QUICK_REFERENCE.md) - AI 助手使用规范

---

**最后更新**: 2026-03-04
**维护者**: 项目团队
