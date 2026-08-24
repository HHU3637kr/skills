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

## 示例 5：发一个补丁版本

场景：主干修了一个 bug，要发到正式线。

```bash
# 1. 修复已在主干（master）
git log --oneline -1 master
# 3a350f7 fix(评估任务): 建任务与 DAG 读取体系时透传 university_code

# 2. cherry-pick 到发布线
git switch release/official
git cherry-pick 3a350f7

# 3. 跑测试
python -m pytest backend/tests/ -q
# 480 passed, 4 skipped

# 4. 打 tag 并推送
git tag -a v1.0.3.1 -m "v1.0.3.1 正式版补丁

修复：建任务与 DAG 读取体系时透传 university_code。
三个调用点漏传导致白名单分支永不命中，program 层用户建任务恒 404。
新增守卫测试（已反向验证）。本地 480 passed / 4 skipped。"
git push origin release/official v1.0.3.1
```

同一改动要发到定制线时，各线独立编号：

```bash
git switch release/tut
git cherry-pick 3a350f7
# tag 说明里写清 cherry-pick 来源
git tag -a tut-v1.0.4.1 -m "tut-v1.0.4.1（cherry-pick 自正式版 v1.0.3.1）..."
git push origin release/tut tut-v1.0.4.1
```

## 示例 6：诊断 tag 与分支错位

场景：接手仓库后发现「有两个 tut tag，和现行 release 分支对应不上」。

```bash
# 列出 tag 及其指向
git tag --list --format='%(refname:short) %(objectname:short)'

# 逐个核对：tag 是否是某分支的 HEAD
for t in tut-v1.0.4 tut-v1.0.5; do
  c=$(git rev-parse --short "$t^{commit}")
  echo "$t -> $c"
  echo "  是哪些分支的 HEAD: $(git branch --points-at "$t^{commit}")"
done
```

实测发现的错位形态：

```text
release/tut-v1.0.4  HEAD = 985a0e3 = tag tut-v1.0.5   分支名 1.0.4，头部是 1.0.5
tag tut-v1.0.4      -> a784157               不是任何分支的 HEAD（分支中间提交）
release/tut-v1.0.2  HEAD 无对应 tag
release/tut-v1.0.3  HEAD 无对应 tag
```

成因：在 `release/tut-v1.0.4` 上先打 `tut-v1.0.4`，之后又 cherry-pick 了修复
并打 `tut-v1.0.5`。版本号往前跳，分支名留在原地。

修法：删错位 tag，按「每个 release 分支的 HEAD 打同名 tag」重打。

```bash
git tag -d tut-v1.0.4 tut-v1.0.5
git push origin :refs/tags/tut-v1.0.4 :refs/tags/tut-v1.0.5

git tag -a tut-v1.0.2 release/tut-v1.0.2 -m "..."
git tag -a tut-v1.0.3 release/tut-v1.0.3 -m "..."
git tag -a tut-v1.0.4 release/tut-v1.0.4 -m "..."

# 对账：每个 tag 必须等于对应分支 HEAD
for v in 1.0.2 1.0.3 1.0.4; do
  tc=$(git rev-parse --short "tut-v$v^{commit}")
  bc=$(git rev-parse --short "release/tut-v$v")
  [ "$tc" = "$bc" ] && echo "tut-v$v OK" || echo "tut-v$v MISMATCH"
done
```

## 示例 7：迁移到长期 release 分支

场景：仓库有 7 条分支，其中 4 条是带版本号的 release 分支，对应关系混乱。

**顺序很重要：先建新结构，验证可用后再删旧的。**

```bash
# 1. 建两条长期分支，指向各线当前 HEAD
git branch release/official c3dc2a6
git branch release/tut cd2aa48
git push -u origin release/official
git push -u origin release/tut

# 2. 对账新分支与 tag
for pair in "release/official:v1.0.3.2" "release/tut:tut-v1.0.4.1"; do
  b=${pair%%:*}; t=${pair#*:}
  [ "$(git rev-parse --short "$b")" = "$(git rev-parse --short "$t^{commit}")" ] \
    && echo "$b OK" || echo "$b MISMATCH"
done

# 3. 写规范与速查表，提交到主干和两条 release 分支

# 4. 用户确认新结构可用后，才删旧分支
```

删旧分支前逐条验证：

```bash
for b in release/v1.0.3 release/tut-v1.0.2 release/tut-v1.0.3 release/tut-v1.0.4; do
  # 独有提交数必须为 0
  n=$(git log --oneline "$b" --not master release/official release/tut | wc -l)
  echo "$b 独有提交: $n"
done
```

全部为 0 才删：

```bash
git branch -D release/v1.0.3 release/tut-v1.0.2 release/tut-v1.0.3 release/tut-v1.0.4
git push origin --delete release/v1.0.3 release/tut-v1.0.2 release/tut-v1.0.3 release/tut-v1.0.4
git remote prune origin
```

结果：7 条分支压到 3 条，11 个 tag 全部保留可解析。

## 示例 8：服务器拉不到远程时的部署

场景：目标服务器网络隔离，`git fetch` 超时，remote 配置也是坏的。

```bash
# 确认服务器确实拉不到
ssh <server> "timeout 25 git ls-remote <repo-url> HEAD"   # 无输出=超时

# 只同步有差异的代码文件
git diff --name-only v1.0.3 v1.0.3.2

# 逐文件同步（Windows 本地需 LF 归一化）
for f in <差异文件列表>; do
  sed 's/\r$//' "$f" > /tmp/one
  scp -q /tmp/one "<server>:<path>/$f"
done

# md5 逐文件对账（必做）
sed 's/\r$//' <file> | md5sum
ssh <server> "md5sum <path>/<file>"

# 服务器目录内 git 留痕并打同名 tag
ssh <server> "cd <path> && git add . && git commit -m 'release: 升级到 v1.0.3.2' && git tag -a v1.0.3.2 -m '部署点'"
```

部署后做**行为验证**，不只看文件对不对：

```bash
# 静态检查只能证明文件对了
ssh <server> "docker exec <c> grep -c '<关键标识>' <path>"

# 生产镜像通常不含 pytest，写个不依赖测试框架的烟测
ssh <server> "docker exec -e PYTHONPATH=/app <c> python /tmp/smoke.py"
```
