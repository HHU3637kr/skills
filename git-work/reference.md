# GitHub Flow 命令参考（R&K Flow）

## 分支策略

- `main`：唯一长期分支，始终可部署
- Spec 分支：从 `main` 创建，完成后通过 PR 合并
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
git switch main
git pull --ff-only origin main
git switch -c <branch-name>
git push -u origin <branch-name>
```

## 复用 Spec 分支（spec-update）

```bash
git branch --show-current
git status --short
```

当前分支必须等于 `plan.md` 的 `git_branch`。如果不一致：

```bash
git switch <plan.git_branch>
```

如果分支已合并或不存在，不要默认继续 `spec-update`；新需求应新建 Spec，或让用户明确选择独立 update 分支。

如果没有 `main`，先查看远程默认分支：

```bash
git symbolic-ref refs/remotes/origin/HEAD
```

## 并发 worktree

```bash
git switch main
git pull --ff-only origin main
git worktree add ../<repo>-<spec-slug> -b <branch-name> main
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
gh pr create --base main --head <branch-name> --title "<title>" --body-file <pr-body.md>
```

没有 GitHub CLI 时，打开 compare URL：

```text
https://github.com/<owner>/<repo>/compare/main...<branch-name>
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

再补充提交：

```bash
git add spec/
git commit -m "docs: record PR link for spec"
git push
```

## 同步 main 到工作分支

```bash
git fetch origin
git merge origin/main
```

或使用 rebase：

```bash
git fetch origin
git rebase origin/main
```

团队协作时优先遵循项目约定；没有约定时，merge 更少改写历史。

## 合并后清理

```bash
git switch main
git pull --ff-only origin main
git branch -d <branch-name>
git push origin --delete <branch-name>
```

## 故障处理

| 场景 | 命令/处理 |
|------|-----------|
| 当前分支不明 | `git branch --show-current` |
| 工作区有改动 | `git status --short`，先提交、stash 或确认纳入当前 Spec |
| 错在 main 上开发 | 立即 `git switch -c <branch-name>` 承接改动 |
| 分支落后 main | `git fetch origin` 后 merge/rebase `origin/main` |
| PR 创建失败 | 先 `git push -u origin <branch-name>`，再用 compare URL |
| 需要撤销最近提交但保留改动 | `git reset --soft HEAD~1` |

## 安全规则

- 不提交 API key、密码、私钥、数据库凭证
- `.env`、日志、构建产物应进入 `.gitignore`
- 不在 `main` 上直接提交 Spec 成果
- 不自动合并 PR，除非用户明确要求
