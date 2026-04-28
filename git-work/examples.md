# GitHub Flow 示例（R&K Flow）

## 示例 1：新功能 Spec

场景：实现用户认证能力。

```bash
# spec-start 阶段
git status --short
git switch main
git pull --ff-only origin main
git switch -c feat/spec-20260428-1430-user-auth
git push -u origin feat/spec-20260428-1430-user-auth
```

`plan.md` frontmatter：

```yaml
git_branch: feat/spec-20260428-1430-user-auth
base_branch: main
pr_url:
```

开发、测试、文档都在该分支完成。

```bash
# spec-end 阶段
git branch --show-current
git diff --stat
git add .
git commit -m "feat: implement user auth spec"
git push
gh pr create --base main --head feat/spec-20260428-1430-user-auth --title "feat: user auth" --body-file pr-body.md
```

拿到 PR URL 后写回 `plan.md` / `summary.md` 的 `pr_url`，再补充提交：

```bash
git add spec/
git commit -m "docs: record PR link for user auth spec"
git push
```

## 示例 2：活跃 Spec 的小更新

场景：用户认证 Spec 还在当前分支开发中，发现需要补一个登录超时处理。

```bash
git branch --show-current
# 输出应为 feat/spec-20260428-1430-user-auth
git status --short
```

在同一个 Spec 目录创建 `update-001.md`，继承 plan.md 的 Git 元数据：

```yaml
type: update
update_number: 1
git_branch: feat/spec-20260428-1430-user-auth
base_branch: main
pr_url:
```

完成 update、回归测试和 review 后，仍提交到同一分支：

```bash
git add .
git commit -m "fix: resolve login timeout update"
git push
```

只有当整个 Spec 准备交付时，才创建或更新 PR。

## 示例 3：多个 Spec 并发

同一仓库并发做两个 Spec 时，不要在同一个目录来回切分支。

```bash
git switch main
git pull --ff-only origin main
git worktree add ../project-user-auth -b feat/spec-20260428-1430-user-auth main
git worktree add ../project-audit-log -b feat/spec-20260428-1500-audit-log main
```

每个 worktree 中独立运行对应的 Spec 流程。

## 示例 4：PR 合并后清理

```bash
git switch main
git pull --ff-only origin main
git branch -d feat/spec-20260428-1430-user-auth
git push origin --delete feat/spec-20260428-1430-user-auth
```

如果分支无法删除，先确认 PR 是否已经合并。
