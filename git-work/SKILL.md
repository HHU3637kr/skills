---
name: git-work
description: 当 spec-start 需要为新 Spec 创建 GitHub Flow 工作分支，spec-update 需要复用/校验当前 Spec 分支，或 spec-end/spec-update 需要提交、推送、创建 PR、合并后清理分支时使用。不要用于单次查看 git 状态、普通 diff 查询，或用户明确要求不走 GitHub Flow 的临时操作。
---

# Git 工作流 SOP（GitHub Flow）

详细示例见 [examples.md](examples.md)，命令速查见 [reference.md](reference.md)。

## 核心约定

R&K Flow 默认采用 **GitHub Flow**：

1. `main` 是唯一长期分支，始终保持可部署
2. 每个 Spec 使用一条短生命周期分支
3. 同一活跃 Spec 的 update 默认复用该 Spec 分支
4. 所有开发、测试、文档、归档都在该分支完成
5. 收尾时提交、推送并创建 Pull Request
6. PR 合并后删除本地和远程分支

## 在 Spec 生命周期中的位置

```text
spec-start
  → git-work：从 main 创建 Spec 工作分支
  → plan.md 记录 git_branch、base_branch、pr_url

spec-update
  → git-work：确认当前分支与 plan.md 的 git_branch 一致
  → update-xxx.md 继承 plan.md 的 git_branch、base_branch、pr_url

开发与测试阶段
  → 始终留在当前 Spec 分支
  → 必要时推送远程分支，方便团队协作

spec-end / spec-update 收尾
  → git-work：提交、推送当前 Spec 分支
  → spec-end 创建 PR；spec-update 仅在 Spec 准备整体交付时创建/更新 PR
  → 如有 PR，记录 PR URL

PR 合并后
  → git-work：同步 main，删除本地和远程工作分支
```

## 分支命名

格式：

```text
<type>/spec-<YYYYMMDD-HHMM>-<ascii-slug>
```

示例：

```text
feat/spec-20260428-1430-user-auth
fix/spec-20260428-1530-login-timeout
docs/spec-20260428-1600-rk-flow-docs
refactor/spec-20260428-1700-db-layer
test/spec-20260428-1800-audit-log
```

类型映射：

| 类型 | 何时使用 |
|------|----------|
| `feat` | 新功能、新接口、新页面、新集成 |
| `fix` | Bug、回归、安全修复 |
| `docs` | 纯文档、规则、Skill 文案 |
| `refactor` | 不改变行为的重构、技术债 |
| `test` | 测试覆盖、测试基础设施、审计证据 |
| `chore` | 构建、依赖、配置、仓库维护 |

规则：
- 分支名必须 ASCII，中文任务名保留在 Spec 目录名
- slug 使用小写短横线，不能包含空格
- 同一个活跃 Spec 的所有提交和 update 留在同一分支
- 如果原 Spec 分支已合并/删除，后续需求默认新建 Spec；只有用户明确要求独立 PR 时才创建新分支承接 update

## 模式一：启动 Spec 分支

由 `spec-start` 在正式写文档前调用。`spec-update` 默认不调用本模式，除非用户明确要求为该 update 创建独立 PR。

### 1. 检查仓库

```bash
git rev-parse --is-inside-work-tree
git remote -v
git status --short
```

如果不是 Git 仓库：向用户说明无法执行 GitHub Flow，询问是否继续无分支模式。

如果工作区不干净：
- 若改动属于当前即将启动的 Spec，先让用户确认是否纳入本分支
- 若改动无关，先提交、stash 或切换到干净工作区
- 不要在脏工作区直接切换到 `main`

### 2. 同步 base 分支

默认 base 分支为 `main`。如果仓库没有 `main`，读取远程默认分支：

```bash
git symbolic-ref refs/remotes/origin/HEAD
```

同步：

```bash
git switch main
git pull --ff-only origin main
```

### 3. 创建工作分支

```bash
git switch -c <branch-name>
```

团队协作或并发开发时，立即推送远程分支：

```bash
git push -u origin <branch-name>
```

### 4. 输出给 Spec 文档

把以下元数据传给 `spec-write`：

```yaml
git_branch: <branch-name>
base_branch: main
pr_url:
```

## 模式二：并发开发使用 worktree

当同一仓库需要同时开发多个 Spec，不要在同一个 working tree 里来回切分支。使用 worktree：

```bash
git switch main
git pull --ff-only origin main
git worktree add ../<repo>-<spec-slug> -b <branch-name> main
```

进入新 worktree 后再运行对应的 Spec 流程。每个并行 Spec 独占一个目录和一条分支。

## 模式三：复用 Spec 分支

由 `spec-update` 在创建 update 文档前调用。

### 1. 读取 plan.md Git 元数据

```yaml
git_branch: <branch-name>
base_branch: main
pr_url:
```

### 2. 校验当前分支

```bash
git branch --show-current
git status --short
```

规则：
- 当前分支必须等于 plan.md 的 `git_branch`
- 如果当前分支是 `main`，停止并切回 Spec 分支
- 如果原分支已合并或不存在，默认不继续 spec-update；应新建 Spec 或让用户明确选择独立 update 分支
- update-xxx.md 继承 plan.md 的 `git_branch` / `base_branch` / `pr_url`

## 模式四：完成 Spec 分支

由 `spec-end` 或 `spec-update` 收尾时调用。

### 1. 确认当前分支

```bash
git branch --show-current
git status --short
```

禁止直接在 `main` 上提交 Spec 成果。若当前分支不是 plan/update 文档记录的 `git_branch`，先确认原因。

### 2. 审查变更

```bash
git diff --stat
git diff
```

确认包含：
- 代码实现
- 测试与日志/审计证据
- Spec 文档、summary/test-report/review/debug/update 文档
- 必要的 `AGENTS.md` / `.agents/rules/` 规范更新
- 归档目录移动（新 Spec 完成时）

### 3. 提交

```bash
git add .
git commit -m "<type>: <summary>"
```

提交信息规则：
- 使用 `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- 第一行不超过 72 字符
- 正文写清 Spec 路径、测试结果、关键决策

### 4. 推送

```bash
git push -u origin <branch-name>
```

### 5. 创建或更新 Pull Request

`spec-end` 默认创建 PR。`spec-update` 默认只提交并推送当前 Spec 分支；如果该 Spec 已准备整体交付，或用户明确要求，则创建/更新 PR。

如果可用，优先使用 GitHub CLI：

```bash
gh pr create --base main --head <branch-name> --title "<PR title>" --body-file <pr-body.md>
```

如果没有 `gh`，输出 GitHub compare URL，让用户手动创建 PR：

```text
https://github.com/<owner>/<repo>/compare/main...<branch-name>
```

PR 内容至少包含：
- Spec 路径
- 实现摘要
- 测试结果
- 风险与回滚方式
- 关联的经验/规范更新

### 6. 记录 PR URL

如果拿到 PR URL，写回对应文档：

```yaml
pr_url: https://github.com/<owner>/<repo>/pull/<number>
```

写回后再补一个轻量提交并推送：

```bash
git add <spec-docs>
git commit -m "docs: record PR link for spec"
git push
```

## 模式五：PR 合并后清理

只有在 PR 已合并后执行：

```bash
git switch main
git pull --ff-only origin main
git branch -d <branch-name>
git push origin --delete <branch-name>
```

如果本地分支无法删除，先确认 PR 是否已合并，避免误删未合并成果。

## 常见阻塞

| 场景 | 处理 |
|------|------|
| 不在 Git 仓库 | 询问是否继续无分支模式，并在 Spec 文档中记录 `git_branch: none` |
| 工作区已有无关改动 | 先提交、stash 或使用 worktree |
| 当前在 `main` 且已有开发改动 | 立即创建分支承接当前改动，不要继续在 `main` 上开发 |
| 分支落后 `main` | 在工作分支中合并或 rebase 最新 `main`，解决冲突后继续 |
| 多个 Spec 并发 | 使用 `git worktree`，每个 Spec 独占分支和目录 |
| 无法创建 PR | 推送分支并给出 compare URL |

## 禁止事项

- 不要在 `main` 上实现 Spec
- 不要在脏工作区切换分支
- 不要把多个无关 Spec 混在同一分支
- 不要在测试失败时创建 PR，除非 PR 明确标记为 Draft
- 不要自动合并 PR，除非用户明确要求
