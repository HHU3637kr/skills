# Git 工作流命令参考（dev + release 发版管理）

## 分支模型

- `<main>`：远程主干分支（由 `git symbolic-ref --short refs/remotes/origin/HEAD | sed 's|^origin/||'` 动态读取，默认为 `master` 或 `main`），始终保持生产可部署与已发布状态，严禁直接在其上实现
- `dev`：日常开发集成线。所有常规 Spec 分支从 `dev` 创建，完工后通过 PR/MR 合入 `dev`
- `release/<version>`：临时版本提测分支（冻结时从 `dev` 切出），全量验收通过后合入 `<main>` 打正式 Tag 并强制反向回流 `dev`，版本归档（`version-end`）后删除
- `support/<line>`：长期维护或客户定制线（如 `support/official`、`support/customer-a`，原 `release/<line>` 重命名），不与提测分支混淆
- `hotfix/*`：线上紧急热修分支（从生产 Tag 切出），验证通过后合入 `<main>` 打 Patch Tag，并强制双向回流 `dev` 与在研 `release/*`

### Spec 工作分支命名
格式：`<category>/spec-<YYYYMMDD-HHMM>-<ascii-slug>`
属性（四类平权）：`feat`（业务功能）/ `tech`（技术基建/AI底座）/ `debt`（技术债/重构）/ `fix`（缺陷修复）。

---

## 1. 启动 Spec 分支

```bash
git rev-parse --is-inside-work-tree
git status --short
git switch dev
git pull --ff-only origin dev
git switch -c <category>/spec-<YYYYMMDD-HHMM>-<ascii-slug>
git push -u origin <category>/spec-<YYYYMMDD-HHMM>-<ascii-slug>
```

输出给 `spec-write` 的元数据：
```yaml
git_branch: <branch-name>
base_branch: dev
pr_url:
```

## 2. 复用 Spec 分支（spec-update）

```bash
git branch --show-current
git status --short
```
确认当前分支等于 `plan.html` 的 `rk:git-branch`。如果不一致：
```bash
git switch <plan 的 rk:git-branch>
```

## 3. 并发开发使用 worktree

```bash
git switch dev
git pull --ff-only origin dev
git worktree add ../<repo>-<spec-slug> -b <branch-name> dev
git worktree list
```
清理 worktree：
```bash
git worktree remove ../<repo>-<spec-slug>
```

## 4. 审查与提交

```bash
git branch --show-current
git status --short
git diff --stat
git diff
git diff --staged

git add .
git commit -m "<category>: <summary>"
```

## 5. 推送与创建 PR/MR（面向 dev）

```bash
git push -u origin <branch-name>
# GitHub PR
gh pr create --base dev --head <branch-name> --title "<title>" --body-file <pr-body.md>
# 或 GitLab MR
glab mr create --target-branch dev --source-branch <branch-name> --title "<title>" --description "<pr-body>"
```
无 CLI 时使用 Web compare URL：
`https://github.com/<owner>/<repo>/compare/dev...<branch-name>`

### 记录 PR/MR URL 并单次提交（amend）
写回文档后，并入同一次提交：
```bash
git add spec/
git commit --amend --no-edit
git push --force-with-lease origin <branch-name>
```

## 6. 同步 `dev` 到工作分支

```bash
git fetch origin
git merge origin/dev
```

## 7. PR/MR 合并后清理

只有在面向 `dev` 的 PR/MR 已合并后执行：
```bash
git switch dev
git pull --ff-only origin dev
git branch -d <branch-name>
git push origin --delete <branch-name>
```

---

## 8. 版本提测与发版（release/<version>）

### 提测冻结（version-release 阶段一）
```bash
git checkout dev
git pull origin dev
git checkout -b release/<version>
git push -u origin release/<version>
```

### 提测期间 Bug 修复
```bash
git switch -c fix/<slug> release/<version>
# 修复并通过测试后
git commit -m "fix: 修复提测缺陷"
git push -u origin fix/<slug>
# PR/MR 目标为 release/<version>
gh pr create --base release/<version> --head fix/<slug>
```

### 发版合入主干与回流 dev（version-release 阶段二）
```bash
# 1. release/<version> 面向主干发起 PR/MR 并合并
gh pr create --base master --head release/<version> --title "release: <version>"

# 2. 合并后打不可变 Tag
git checkout master
git pull origin master
git tag -a <version-tag> -m "release: <version-tag>"
git push origin <version-tag>

# 3. 强制双向回流 dev
git checkout dev
git pull origin dev
git merge release/<version> --no-edit
git push origin dev
```

### 版本收尾与分支清理（version-end）
```bash
git checkout master
git pull origin master
# 归档文档直接提交入主干并回流 dev
git add spec/versions/<version> spec/context
git commit -m "docs(version): 完成 <version> 交付复盘与收尾归档"
git push origin master
git checkout dev && git merge master --no-edit && git push origin dev

# 清理临时提测集成分支
git branch -d release/<version>
git push origin --delete release/<version>
```

---

## 9. 线上紧急热修（Hotfix）与强制回流

```bash
# 1. 确认线上实际运行的 tag 并切出热修分支
git checkout <production-tag>
git switch -c hotfix/<slug>

# 2. 修复、测试验证后提交
git commit -m "fix(hotfix): 修复线上严重缺陷"

# 3. 合入主干 <main> 并打 Patch Tag（如 v1.6.1）
git checkout master
git pull origin master
git merge hotfix/<slug> --no-ff -m "merge: hotfix/<slug> 紧急修复合入"
git tag -a v1.6.1 -m "hotfix: v1.6.1"
git push origin master v1.6.1

# 4. 强制回流开发线 dev（防止下一版本带回同一 Bug）
git checkout dev
git pull origin dev
git merge master --no-edit
git push origin dev

# 5. 若存在活跃的提测分支 release/<v>，同样合流
git checkout release/<v>
git merge master --no-edit
git push origin release/<v>

# 6. 删除热修临时分支
git branch -d hotfix/<slug>
```

---

## 10. 长期维护与定制分支管理（support/<line>）

### 1. 动态获取主干分支名
```bash
MAIN_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
MAIN_BRANCH=${MAIN_BRANCH:-master}
```

### 2. 缺陷修复与发版流程
```bash
# 1. 修复必须先通过 PR/MR 合入主干（禁止直接向主干推送提交）
git switch "$MAIN_BRANCH"
git pull origin "$MAIN_BRANCH"
# 在主干拉取最新已合并的修复提交 <fix-commit>

# 2. cherry-pick 到目标维护线
git switch support/<line>
git pull origin support/<line>
git cherry-pick <fix-commit>

# 3. 跑定制线回归测试（判据为 failed 数不增加）
<测试命令>

# 4. 打 annotated tag 并推送（显式推 tag，禁止 --tags）
git tag -a <version> -m "release: <version>"
git push origin support/<line> <version>
```

### 3. 诊断：核对 tag 是否仅落后文档/规范提交
```bash
git diff --name-only <tag> support/<line>
# 差异仅含文档、AGENTS.md、Spec 报告即属正常；混入源码说明漏打 tag
```

### 4. 安全清理带版本号的旧分支
```bash
# 1. 检查分支是否已被保留分支包含
git merge-base --is-ancestor <old-branch> support/<line>

# 2. 检查独有提交数（必须为 0）
git log --oneline <old-branch> --not "$MAIN_BRANCH" support/<line> | wc -l

# 3. 两项均通过后删除
git branch -d <old-branch>
```

---

## 11. 故障处理

| 场景 | 命令/处理 |
|------|-----------|
| 当前分支不明 | `git branch --show-current` |
| 工作区有改动 | `git status --short`，先提交、stash 或确认纳入当前 Spec |
| 错在 `dev` 或主干上开发 | 立即 `git switch -c <category>/spec-<slug>` 承接改动 |
| 分支落后 `dev` | `git fetch origin` 后 merge `origin/dev` |
| PR/MR 创建失败 | 先 `git push -u origin <branch-name>`，再用 compare URL |
| 需要撤销最近提交但保留改动 | `git reset --soft HEAD~1` |

## 安全规则

- 不提交 API key、密码、私钥、数据库凭证
- `.env`、日志、构建产物应进入 `.gitignore`
- 不直接在主干或未通过 PR/MR 的分支上合流
- 不自动合并 PR/MR，除非用户明确要求
