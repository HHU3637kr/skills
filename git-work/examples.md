# GitHub Flow 工作流示例

以下所有示例遵循统一的 GitHub Flow 流程：
**同步 main → 创建分支 → 开发提交 → 推送 → 创建 PR → Review → 合并 → 删除分支**

## Example 1: 功能开发

### 场景
实现用户认证功能，包含登录、注册和会话管理。

### 完整流程
```bash
# 1. 同步 main
git checkout main
git pull origin main

# 2. 创建工作分支
git checkout -b feat/user-auth

# 3. 开发并提交（可多次提交）
git add src/auth/
git commit -m "feat: 添加用户认证模块

- 实现登录和注册接口
- 集成数据库用户存储
- 添加密码哈希处理
- 实现 JWT 令牌会话管理

closes #15"

# 4. 推送到远程
git push origin feat/user-auth

# 5. 在 GitHub 上创建 PR → 等待 Review → 审批后合并

# 6. 清理
git checkout main
git pull origin main
git branch -d feat/user-auth
```

## Example 2: Bug 修复

### 场景
用户反馈 WebSocket 连接在空闲 5 分钟后会断开。

### 完整流程
```bash
# 1. 同步 main
git checkout main
git pull origin main

# 2. 创建工作分支
git checkout -b fix/websocket-disconnect

# 3. 修复并提交
git add .
git commit -m "fix: 修复 WebSocket 空闲断开问题

- 添加心跳机制保持连接（30s 间隔）
- 增加自动重连逻辑（最多 3 次）
- 优化错误处理和日志输出

fixes #28"

# 4. 推送
git push origin fix/websocket-disconnect

# 5. 创建 PR → Review → Merge

# 6. 清理
git checkout main
git pull origin main
git branch -d fix/websocket-disconnect
```

## Example 3: 代码重构

### 场景
将聊天存储从 localStorage 迁移到 IndexedDB。

### 完整流程
```bash
# 1. 同步 main
git checkout main
git pull origin main

# 2. 创建工作分支
git checkout -b refactor/chat-storage

# 3. 分多个原子提交
git add src/storage/indexeddb.ts
git commit -m "refactor: 新增 IndexedDB 存储实现"

git add src/storage/migration.ts
git commit -m "refactor: 添加 localStorage 到 IndexedDB 迁移逻辑"

git add src/chat/
git commit -m "refactor: 切换聊天模块使用 IndexedDB 存储"

# 4. 推送
git push origin refactor/chat-storage

# 5. 创建 PR → Review → Merge

# 6. 清理
git checkout main
git pull origin main
git branch -d refactor/chat-storage
```

## Example 4: 文档更新

### 场景
更新项目 README 和 API 文档。

### 完整流程
```bash
# 1. 同步 main
git checkout main
git pull origin main

# 2. 创建工作分支
git checkout -b docs/update-api-docs

# 3. 提交
git add .
git commit -m "docs: 更新 API 文档和 README

- 补充认证接口文档
- 更新安装和部署说明
- 添加贡献指南"

# 4. 推送
git push origin docs/update-api-docs

# 5. 创建 PR → Merge（文档变更可简化 Review）

# 6. 清理
git checkout main
git pull origin main
git branch -d docs/update-api-docs
```

## 最佳实践模式

### 1. 原子提交
每个 commit 聚焦一个变更，便于单独回滚：
```bash
git add src/components/Button.jsx
git commit -m "feat: 添加主按钮组件及悬停效果"

git add src/styles/buttons.css
git commit -m "style: 添加按钮变体样式"
```

### 2. 分支命名
使用 `类型/简短描述` 格式：
```bash
git checkout -b feat/user-authentication
git checkout -b fix/login-error-handling
git checkout -b docs/api-documentation
git checkout -b refactor/database-connection-pool
```

### 3. Conventional Commits
```bash
git commit -m "feat: 添加用户认证模块"
git commit -m "fix: 修复登录超时问题"
git commit -m "docs: 更新 API 参考文档"
git commit -m "refactor: 优化数据库查询"
git commit -m "test: 添加支付模块单元测试"
```

### 4. 处理 Review 反馈
审查者提出修改意见后，在同一分支继续提交：
```bash
# 根据 Review 意见修改
git add .
git commit -m "fix: 根据 Review 反馈修复边界检查"
git push origin feat/user-auth
# PR 自动更新，无需重建
```