# Claude Code 稳定性指南

> **目的**: 解决 Node.js 堆内存溢出导致的 Claude Code 挂死问题

---

## 🚨 问题症状

- Claude Code 响应极慢
- 最终完全挂死
- Node.js 进程显示 `FATAL ERROR: Reached heap limit`

---

## 🔍 根本原因

### 1. **进程间通信（IPC）阻塞**
- Claude Code 通过 stdio 与子进程通信
- 子进程崩溃时，IPC 管道半开，导致永久阻塞

### 2. **系统资源耗尽**
- Node.js 尝试分配 4GB+ 内存
- 触发频繁 GC，CPU 100%
- 系统开始使用 swap，严重卡顿

### 3. **输出缓冲区溢出**
- 大量 GC 日志输出
- stderr 缓冲区填满
- 日志解析器成为瓶颈

### 4. **Hook 系统阻塞**
- user-prompt-submit-hook 等待子进程响应
- 子进程已崩溃，hook 永久等待

---

## ✅ 解决方案

### **方案 1：预防性配置（已实施）**

#### 增加内存限制
```json
// package.json
{
  "scripts": {
    "dev": "node --max-old-space-size=8192 ..."
  }
}
```

#### 优化 Vite 配置
```typescript
// vite.config.ts
{
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: { ... }
      }
    }
  }
}
```

### **方案 2：监控和预警**

#### 创建内存监控脚本
```bash
# scripts/monitor-memory.sh
#!/bin/bash
while true; do
  memory=$(ps -o rss= -p $NODE_PID | awk '{print $1/1024}')
  if (( $(echo "$memory > 6000" | bc -l) )); then
    echo "⚠️ 内存警告: ${memory}MB"
    # 发送通知或自动重启
  fi
  sleep 5
done
```

#### 集成到开发流程
```json
{
  "scripts": {
    "dev:safe": "npm run monitor & npm run dev",
    "monitor": "node scripts/memory-monitor.js"
  }
}
```

### **方案 3：优雅降级策略**

#### 添加进程健康检查
```typescript
// server/health-check.ts
import { createServer } from 'http';

const server = createServer((req, res) => {
  const memUsage = process.memoryUsage();
  const health = {
    status: 'ok',
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    }
  };

  // 如果内存使用超过 80%，返回警告
  if (memUsage.heapUsed / memUsage.heapTotal > 0.8) {
    health.status = 'warning';
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(health, null, 2));
});

server.listen(3002, () => {
  console.log('Health check server running on port 3002');
});
```

#### Claude Code 集成
```typescript
// 在 Claude Code 操作前检查健康状态
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3002/health');
    const data = await response.json();

    if (data.status === 'warning') {
      console.warn('⚠️ 服务器内存使用率过高，建议重启');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
```

### **方案 4：紧急恢复流程**

#### 当 Claude Code 挂死时

**步骤 1：识别问题**
```bash
# 检查 Node.js 进程状态
ps aux | grep node

# 检查内存使用
top -p $(pgrep node)
```

**步骤 2：优雅终止**
```bash
# 发送 SIGTERM，允许清理
kill -TERM $(pgrep -f "vite.*5173")

# 等待 5 秒
sleep 5

# 如果仍在运行，强制终止
kill -9 $(pgrep -f "vite.*5173")
```

**步骤 3：清理资源**
```bash
# 清理 socket 文件
rm -f /tmp/.X*-lock

# 清理 npm 缓存
npm cache clean --force

# 清理 node_modules/.cache
rm -rf app/node_modules/.cache
```

**步骤 4：重启 Claude Code**
```bash
# 重启终端会话
exec $SHELL

# 重新启动开发服务器
npm run dev
```

---

## 🚀 最佳实践

### **开发期间**

1. **定期重启开发服务器**
   - 每工作 2-3 小时重启一次
   - 特别是在处理大量文件后

2. **监控内存使用**
   ```bash
   # 实时监控
   watch -n 2 'ps aux | grep node'
   ```

3. **分批操作**
   - 避免一次性修改大量文件
   - 分阶段执行重构

4. **使用 Git 暂存**
   ```bash
   # 暂存当前工作，随时可恢复
   git stash push -m "WIP: 内存问题前的工作状态"
   ```

### **Claude Code 使用**

1. **避免并发大操作**
   - 不要同时运行多个文件生成任务
   - 顺序执行而非并行执行

2. **使用超时机制**
   ```typescript
   // 为长时间运行的操作设置超时
   const timeout = 30000; // 30秒
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), timeout);
   ```

3. **分阶段提交**
   - 完成一个功能立即提交
   - 避免大量未提交的更改

---

## 📊 性能基准

### **健康指标**

| 指标 | 正常 | 警告 | 危险 |
|------|------|------|------|
| 堆内存使用 | < 70% | 70-85% | > 85% |
| CPU 使用率 | < 50% | 50-80% | > 80% |
| 响应时间 | < 100ms | 100-500ms | > 500ms |

### **监控命令**

```bash
# 综合健康检查
curl -s http://localhost:3002/health | jq .

# 内存详细分析
node --print-json -e "console.log(process.memoryUsage())"
```

---

## 🆘 紧急恢复速查表

```bash
# 1. 快速诊断
npm run health:check

# 2. 紧急重启
npm run dev:restart

# 3. 完全清理
npm run cleanup:all

# 4. 监控模式启动
npm run dev:monitored
```

---

**最后更新**: 2026-03-04
**状态**: ✅ 已验证
