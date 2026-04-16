# GitHub Flow 工作流参考

## 分支策略

GitHub Flow 只有两种分支：

- **`main`**：唯一的永久分支，始终保持可部署状态
- **工作分支**：从 main 创建的短生命周期分支，完成后通过 PR 合并回 main

**不使用** develop、release、hotfix 等长期分支。所有类型的工作（功能、修复、文档、重构）使用相同的流程。

### 分支命名规范

使用 `类型/简短描述` 格式：
```
feat/user-auth              # 新功能
fix/login-timeout           # Bug 修复
docs/api-reference          # 文档更新
refactor/db-queries         # 代码重构
test/payment-module         # 测试相关
chore/update-deps           # 构建/工具
```

## 提交信息规范

### Conventional Commits

- **结构**：主题行与正文之间用空行分隔
- **主题行**：50 字符以内，首字母大写，不加句号
- **正文**：每行 72 字符，解释做了什么/为什么
- **类型前缀**：feat, fix, docs, style, refactor, test, chore

```bash
git commit -m "feat: 添加用户认证模块

- 实现登录和注册接口
- 集成 JWT 令牌管理
- 添加密码哈希处理

closes #42"
```

## Pull Request 工作流

### 创建 PR

```bash
git push origin feat/my-feature
# 然后在 GitHub 上创建 Pull Request
```

### PR 最佳实践

- 标题简洁明了，描述变更内容
- 正文说明"为什么"以及"如何验证"
- 使用关键词关联 Issue（`closes #42`, `fixes #13`）
- 保持 PR 尽量小，便于审查
- 添加截图或 GIF 说明 UI 变更

### 代码审查

- 审查者关注：逻辑正确性、代码风格、测试覆盖
- 作者根据反馈继续提交到同一分支
- PR 自动更新，无需关闭重建

### 合并策略

| 方式 | 命令/操作 | 适用场景 |
|------|----------|---------|
| **Merge commit** | GitHub 默认 | 保留完整历史 |
| **Squash merge** | "Squash and merge" | 多个小 commit 合并为一个 |
| **Rebase merge** | "Rebase and merge" | 线性历史，无合并节点 |

## 日常操作参考

### 1. 检查状态
```bash
git status
```

### 2. 审查变更
```bash
git diff              # 未暂存的变更
git diff --staged     # 已暂存的变更
```

### 3. 暂存策略

**暂存全部**：
```bash
git add .
```

**暂存指定文件**：
```bash
git add src/components/Button.jsx
git add README.md
```

**按模式暂存**：
```bash
git add *.jsx
git add docs/*.md
```

**交互式暂存**：
```bash
git add -p            # 按代码块选择暂存
```

### 4. 同步分支

```bash
# 将 main 的最新变更合并到工作分支
git checkout main
git pull origin main
git checkout <你的分支>
git merge main

# 或者用 rebase 保持线性历史
git checkout <你的分支>
git pull --rebase origin main
```

## 高级操作

### Cherry-Picking
```bash
git cherry-pick <commit-hash>
```

### Rebase（交互式整理提交）
```bash
git rebase -i HEAD~3          # 合并/编辑最近 3 个 commit
```

### Tagging（可选，按需使用）
```bash
git tag v1.0.0
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin --tags
```

## 故障排除

### 1. 合并冲突

**检测**：
```bash
git merge main
# CONFLICT (content): Merge conflict in <file>
```

**解决**：
1. 编辑冲突文件，查找 `<<<<<<<`, `=======`, `>>>>>>>` 标记
2. 暂存已解决的文件：`git add <已解决的文件>`
3. 完成合并：`git commit`

### 2. 误提交

**撤销最近一次提交（保留修改）**：
```bash
git reset --soft HEAD~1
```

**撤销最近一次提交（丢弃修改）**：
```bash
git reset --hard HEAD~1
```

**修改最近一次提交信息**：
```bash
git commit --amend -m "修正后的提交信息"
```

### 3. 大文件

**检查最大文件**：
```bash
git ls-files | xargs ls -l | sort -k5 -n -r | head
```

**从历史中清理大文件**（谨慎使用）：
```bash
git filter-branch --tree-filter 'rm -f <大文件>' HEAD
```

### 4. 丢失提交

```bash
git fsck --full               # 查找悬挂提交
git merge <commit-hash>       # 恢复提交
```

## 安全规范

### 敏感信息管理

永远不要提交：API 密钥、密码、私钥、数据库凭证。
使用环境变量或密钥管理工具替代。

### .gitignore 模板

```
# Dependencies
node_modules/
venv/

# Environment files
.env
*.env

# Logs
*.log

# OS generated files
.DS_Store
Thumbs.db
```

## 性能优化

```bash
git gc                        # 优化仓库
git fetch --depth=1           # 浅克隆
git log --oneline             # 精简日志
git log --graph --oneline     # 图形化日志
```

## CI/CD 集成

GitHub Flow 天然适合 CI/CD，推荐配置：

### 分支保护规则

在 GitHub 仓库 Settings → Branches 中配置：
- 要求 PR 审查通过才能合并
- 要求 CI 检查通过才能合并
- 禁止直接推送到 main

### GitHub Actions 示例

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npm run lint
```

### Git Hooks（本地）

```bash
# Pre-commit hook
npm test && npm run lint

# Pre-push hook
npm run build