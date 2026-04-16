---
name: git-work
description: 基于 GitHub Flow 的 Git 工作流标准操作规程
---

# Git 工作流 SOP（GitHub Flow）

## 概述

本 Skill 采用 **GitHub Flow** —— 一种轻量级、以分支为基础的工作流：
- 只有一个永久分支 `main`，始终保持可部署状态
- 所有工作（功能、修复、文档）都通过**短生命周期分支 + Pull Request** 完成
- 合并到 `main` 即意味着发布

## 使用场景

当需要执行 Git 操作时，调用此 Skill 以遵循 GitHub Flow 最佳实践。

## 核心原则

1. **`main` 分支始终可部署** —— 任何时候 main 中的代码都是生产就绪的
2. **所有工作在分支上进行** —— 从 main 创建描述性命名的分支
3. **频繁推送到远程** —— 及时备份工作，便于协作
4. **通过 Pull Request 合并** —— 代码审查后才合并到 main
5. **合并后立即删除分支** —— 保持仓库整洁

## 操作步骤

### 1. 同步 main 分支

开始任何工作前，确保本地 main 是最新的：
```bash
git checkout main
git pull origin main
```

### 2. 创建工作分支

从 main 分出一个描述性命名的分支：
```bash
git checkout -b <分支名>
```

**分支命名规范**（使用类型前缀 + 简短描述）：
- `feat/user-auth` — 新功能
- `fix/login-timeout` — Bug 修复
- `docs/api-reference` — 文档更新
- `refactor/db-queries` — 代码重构
- `chore/update-deps` — 构建/工具相关

### 3. 开发与提交

在分支上进行开发，频繁做小而专注的提交：
```bash
git status                    # 检查状态
git diff                      # 审查变更
git add .                     # 暂存变更
git commit -m "<提交信息>"     # 提交
```

**提交信息规范**：
- 使用类型前缀：`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- 第一行限制在 72 个字符以内
- 如需要，空一行后在正文中提供详细说明
- 如适用，引用相关的 issue 编号（如 `closes #42`）

### 4. 推送分支到远程

定期推送到远程，备份工作并为 PR 做准备：
```bash
git push origin <分支名>
```

### 5. 创建 Pull Request

在 GitHub 上创建 PR：
- 填写变更说明和解决的问题
- 关联相关 Issue
- 请求团队成员 Review

### 6. 代码审查与合并

- 审查者提出问题、建议
- 根据反馈继续提交修复到同一分支
- 审批通过后合并到 main

### 7. 删除分支

合并后立即删除远程和本地分支：
```bash
git checkout main
git pull origin main
git branch -d <分支名>
```

## 示例

### 示例 1：功能开发

```bash
git checkout main
git pull origin main
git checkout -b feat/user-auth

# 开发...
git add .
git commit -m "feat: 实现用户认证功能

- 添加登录和注册接口
- 集成数据库进行用户存储
- 包含密码哈希以确保安全
- 添加 JWT 令牌生成用于会话管理"

git push origin feat/user-auth
# → 在 GitHub 上创建 PR → Review → Merge

git checkout main
git pull origin main
git branch -d feat/user-auth
```

### 示例 2：Bug 修复

```bash
git checkout main
git pull origin main
git checkout -b fix/websocket-disconnect

git add .
git commit -m "fix: 修复 WebSocket 连接断开问题

- 添加心跳机制保持连接
- 增加重连逻辑
- 优化错误处理"

git push origin fix/websocket-disconnect
# → 创建 PR → Review → Merge

git checkout main
git pull origin main
git branch -d fix/websocket-disconnect
```

### 示例 3：文档更新

```bash
git checkout main
git pull origin main
git checkout -b docs/update-readme

git add .
git commit -m "docs: 更新 README 和 API 文档"

git push origin docs/update-readme
# → 创建 PR → Merge

git checkout main
git pull origin main
git branch -d docs/update-readme
```

## 最佳实践

1. **原子提交**：每个 commit 包含一个独立完整的变更，便于回滚
2. **短生命周期分支**：分支应尽快合并，避免长期偏离 main
3. **描述性命名**：分支名和提交信息都要清晰表达意图
4. **先拉后推**：推送前先 `git pull origin main` 避免冲突
5. **PR 即文档**：在 PR 中详细描述变更内容，便于追溯

## 故障排除

### 问题：合并冲突

分支落后于 main 时：
```bash
git checkout main
git pull origin main
git checkout <你的分支>
git merge main                # 将 main 合并到你的分支
# 解决冲突后
git add <已解决的文件>
git commit
git push origin <你的分支>
```

### 问题：大文件

如果 git 因大文件而变慢：
1. 检查文件大小：`git ls-files | xargs ls -l | sort -k5 -n -r | head`
2. 考虑将大文件添加到 `.gitignore`
3. 如需要，使用 Git LFS 处理大型二进制文件

### 问题：撤销操作

- 撤销未暂存的修改：`git checkout -- <文件>`
- 撤销已暂存的文件：`git reset HEAD <文件>`
- 撤销最近一次提交（保留修改）：`git reset --soft HEAD~1`

## 常用命令参考

| 命令 | 说明 |
|------|------|
| `git checkout main && git pull` | 同步最新 main |
| `git checkout -b <分支名>` | 从当前分支创建新分支 |
| `git log --oneline -10` | 查看最近 10 条提交历史 |
| `git diff --staged` | 查看已暂存的变更 |
| `git stash` / `git stash pop` | 临时保存/恢复修改 |
| `git branch -d <分支名>` | 删除本地分支 |
| `git push origin --delete <分支名>` | 删除远程分支 |
| `git branch -a` | 查看所有分支 |
| `git remote -v` | 查看远程仓库信息 |
