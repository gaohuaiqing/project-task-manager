# 清除浏览器缓存指南

## 方法 1：浏览器开发者工具（推荐）

### Chrome/Edge
1. 按 `F12` 打开开发者工具
2. 点击 **Application** 标签（或 **应用程序**）
3. 左侧找到 **Storage** → **Local Storage**
4. 选择 `http://localhost:5173`
5. 右键点击 **Clear**（或手动删除所有键）

### Firefox
1. 按 `F12` 打开开发者工具
2. 点击 **Storage** 标签
3. 展开 **Local Storage**
4. 选择 `http://localhost:5173`
5. 右键点击 **All** → **Delete**

### Safari
1. 按 `Cmd+Option+I` 打开开发者工具
2. 点击 **Storage** 标签
3. 展开 **Local Storage**
4. 选择你的网站
5. 点击所有项并删除

---

## 方法 2：控制台命令（快速）

1. 按 `F12` 打开控制台
2. 粘贴以下命令并按回车：

```javascript
// 清除当前域的所有 localStorage
localStorage.clear();

// 验证已清除
console.log('localStorage 已清除，剩余项：', localStorage.length);
```

---

## 方法 3：浏览器设置（彻底清除）

### Chrome/Edge
1. 点击地址栏左侧的锁图标
2. 点击 **网站设置**
3. 点击 **清除数据**
4. 刷新页面

---

## 方法 4：无痕模式（临时测试）

- **Chrome/Edge**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`
- **Safari**: `Cmd + Shift + N`

在无痕窗口中访问应用，不会有缓存问题。

---

## 验证清除成功

在控制台执行：
```javascript
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('user'));
```

如果都显示 `null`，说明清除成功。

---

## 常见需要清除的键

```
- token
- user
- auth_token
- session
- refreshToken
```

---

**提示**：清除 localStorage 后需要重新登录。
