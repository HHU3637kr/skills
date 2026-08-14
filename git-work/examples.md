# GitHub Flow 示例（R&K Flow）

下文示例里的默认分支均写作 `main`，仅为举例。实际使用时必须先跑 `git symbolic-ref refs/remotes/origin/HEAD` 取得真实默认分支名（本仓库实测为 `master`），不要直接把 `main` 拷贴进命令。示例 1 演示了正确的读取写法。

## 示例 1：新功能 Spec

场景：实现用户认证能力。

```bash
# spec-start 阶段
git status --short
base=$(git symbolic-ref --short refs/remotes/origin/HEAD)
base=${base#origin/}
git switch "$base"
git pull --ff-only origin "$base"
git switch -c feat/spec-20260428-1430-user-auth
git push -u origin feat/spec-20260428-1430-user-auth
```

`plan.html` 的 `<head>` Git 元数据（`.rk-meta` 同步镜像同样字段）：

```html
<meta name="rk:git-branch"  content="feat/spec-20260428-1430-user-auth">
<meta name="rk:base-branch" content="master">  <!-- 写实际读到的默认分支名，不要写死 main -->
<meta name="rk:pr-url"      content="">
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

拿到 PR URL 后写回 `plan.html` / `summary.html` 的 `rk:pr-url`（`<meta>` 与 `.rk-meta` 镜像都要更新），再**并入同一次提交**（收尾只提交一次）：

```bash
git add spec/
git commit --amend --no-edit
git push --force-with-lease origin feat/spec-20260428-1430-user-auth
```

## 示例 2：活跃 Spec 的小更新

场景：用户认证 Spec 还在当前分支开发中，发现需要补一个登录超时处理。

```bash
git branch --show-current
# 输出应为 feat/spec-20260428-1430-user-auth
git status --short
```

在同一个 Spec 目录创建 `update-001.html`，继承 plan.html 的 Git 元数据：

```html
<meta name="rk:type"        content="update">
<meta name="rk:update-number" content="1">
<meta name="rk:git-branch"  content="feat/spec-20260428-1430-user-auth">
<meta name="rk:base-branch" content="master">  <!-- 继承 plan.html 实际记录的默认分支名 -->
<meta name="rk:pr-url"      content="">
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
