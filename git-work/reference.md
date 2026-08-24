# GitHub Flow 命令参考（R&K Flow）

## 分支策略

远程默认分支（下文记作 `<base>`）不写死为 `main`。始终先读远程默认分支：

```bash
git symbolic-ref refs/remotes/origin/HEAD
```

输出形如 `refs/remotes/origin/master`，取最后一段即 `<base>`（常见值为 `main` 或 `master`，也可能是别的名字）。若命令报错（没有 `origin`，或远程未设置 HEAD），退回当前分支作为 `<base>`，并明确告知用户。

下文所有命令中的 `<base>` 都用这里读到的名字替换。

- `<base>`：唯一长期分支，始终可部署
- Spec 分支：从 `<base>` 创建，完成后通过 PR 合并
- Spec 分支内 update：同一活跃 Spec 的小迭代复用原 Spec 分支，文档写回原 Spec 目录

分支格式：

```text
<type>/spec-<YYYYMMDD-HHMM>-<ascii-slug>
```

类型：`feat` / `fix` / `docs` / `refactor` / `test` / `chore`。

## 启动分支

```bash
git rev-parse --is-inside-work-tree
git status --short
git switch <base>
git pull --ff-only origin <base>
git switch -c <branch-name>
git push -u origin <branch-name>
```

## 复用 Spec 分支（spec-update）

```bash
git branch --show-current
git status --short
```

当前分支必须等于 `plan.html` 的 `rk:git-branch`（`<head>` 里的 `<meta name="rk:git-branch">`）。如果不一致：

```bash
git switch <plan 的 rk:git-branch>
```

如果分支已合并或不存在，不要默认继续 `spec-update`；新需求应新建 Spec，或让用户明确选择独立 update 分支。

## 并发 worktree

```bash
git switch <base>
git pull --ff-only origin <base>
git worktree add ../<repo>-<spec-slug> -b <branch-name> <base>
git worktree list
```

清理 worktree：

```bash
git worktree remove ../<repo>-<spec-slug>
```

## 审查变更

```bash
git branch --show-current
git status --short
git diff --stat
git diff
git diff --staged
```

## 提交

```bash
git add .
git commit -m "<type>: <summary>"
```

提交信息建议：

```text
feat: implement user auth spec
fix: resolve login timeout update
docs: clarify spec workflow
refactor: simplify storage layer
test: add audit log regression coverage
chore: update dependencies
```

## 推送与 PR

```bash
git push -u origin <branch-name>
gh pr create --base <base> --head <branch-name> --title "<title>" --body-file <pr-body.md>
```

没有 GitHub CLI 时，打开 compare URL：

```text
https://github.com/<owner>/<repo>/compare/<base>...<branch-name>
```

查看当前 PR：

```bash
gh pr view --web
gh pr status
```

## 记录 PR URL

PR 创建后写回对应文档：

```yaml
pr_url: https://github.com/<owner>/<repo>/pull/<number>
```

再**并入同一次提交**（收尾只提交一次，不产生第二次提交）：

```bash
git add spec/
git commit --amend --no-edit
git push --force-with-lease origin <branch-name>
```

## 同步 `<base>` 到工作分支

```bash
git fetch origin
git merge origin/<base>
```

或使用 rebase：

```bash
git fetch origin
git rebase origin/<base>
```

团队协作时优先遵循项目约定；没有约定时，merge 更少改写历史。

## 合并后清理

```bash
git switch <base>
git pull --ff-only origin <base>
git branch -d <branch-name>
git push origin --delete <branch-name>
```

## 发版：release 分支与 tag

**版本号只存在于 tag，分支名永不含版本号。**

分支：`release/<line>`（`<line>` 是发布线标识，如 `official`、客户名）。
版本：`vX.Y.Z` / `vX.Y.Z.N`；定制线加前缀 `<line>-vX.Y.Z`。

### 发一个版本

```bash
git switch release/<line>
git cherry-pick <commit>
<项目测试命令>
git tag -a <version> -m "<说明：改了什么、实测数据、cherry-pick 来源>"
git push origin release/<line> <version>
```

### 核对 tag 与分支是否错位

```bash
# tag 指向的 commit
git rev-parse --short <version>^{commit}
# 分支 HEAD
git rev-parse --short release/<line>
# 两者不同时看差异性质：只含文档即正常，含源码说明漏打 tag
git diff --name-only <version> release/<line>
```

### 列出所有 tag 及其 commit

```bash
git tag --list
git rev-parse --short <version>^{commit}
git cat-file -t <version>        # 应为 tag（annotated），不是 commit
```

### 定制线测试基线

```bash
# cherry-pick 前先记下 failed 数
git switch --detach <cherry-pick 前的 commit>
<测试命令>
# 发版判据是 failed 数不增加，不是全绿
```

### 镜像标签对齐

```bash
git switch --detach <version>
docker build -t <image>:<version> .
# 从服务器反查代码
ssh <server> "grep '^IMAGE_TAG=' <path>/.env"
git switch --detach <该值>
```

### 删带版本号的旧分支前验证

```bash
# 是否已被保留分支包含（无输出且退出码 0 = 是）
git merge-base --is-ancestor <old-branch> release/<line>
# 独有提交数，必须为 0
git log --oneline <old-branch> --not <base> release/<line> | wc -l
# 两项都通过才删
git branch -D <old-branch>
git push origin --delete <old-branch>
```

### 删除错位的 tag

```bash
git tag -d <version>
git push origin :refs/tags/<version>
```

含非 ASCII 的分支名用 refspec 全路径删除：

```bash
git push origin ":refs/heads/<branch-name>"
```

### 清理失效的远端跟踪引用

```bash
git remote prune origin
```

## 故障处理

| 场景 | 命令/处理 |
|------|-----------|
| 当前分支不明 | `git branch --show-current` |
| 工作区有改动 | `git status --short`，先提交、stash 或确认纳入当前 Spec |
| 错在 `<base>` 上开发 | 立即 `git switch -c <branch-name>` 承接改动 |
| 分支落后 `<base>` | `git fetch origin` 后 merge/rebase `origin/<base>` |
| PR 创建失败 | 先 `git push -u origin <branch-name>`，再用 compare URL |
| 需要撤销最近提交但保留改动 | `git reset --soft HEAD~1` |

## 安全规则

- 不提交 API key、密码、私钥、数据库凭证
- `.env`、日志、构建产物应进入 `.gitignore`
- 不在 `<base>` 上直接提交 Spec 成果
- 不自动合并 PR，除非用户明确要求
