---
disable-model-invocation: true
name: git-work
description: 当 spec-start 需要为新 Spec 创建 GitHub Flow 工作分支，spec-update 需要复用/校验当前 Spec 分支，或 spec-end/spec-update 需要提交、推送、创建 PR、合并后清理分支时使用。也用于发版管理：建立或维护 release 分支、打版本 tag、发补丁版本、把修复 cherry-pick 到多条发布线、核对 tag 与分支是否错位、对齐镜像标签与 git tag、清理带版本号的旧分支。不要用于单次查看 git 状态、普通 diff 查询，或用户明确要求不走 GitHub Flow 的临时操作。
---

# Git 工作流 SOP（GitHub Flow + 发版管理）

详细示例见 [examples.md](examples.md)，命令速查见 [reference.md](reference.md)。

两块正交内容：

- **模式一~五**：Spec 工作分支生命周期（短分支 → PR → 合并即删）
- **模式六**：发版分支与 tag 管理（长期 release 分支 + 版本 tag）

## 核心约定

R&K Flow 默认采用 **GitHub Flow**：

1. 远程默认分支（下文记作 `<base>`）是唯一长期分支，始终保持可部署
2. 每个 Spec 使用一条短生命周期分支
3. 同一活跃 Spec 的 update 默认复用该 Spec 分支
4. 所有开发、测试、文档、归档都在该分支完成
5. 收尾时提交、推送并创建 Pull Request
6. PR 合并后删除本地和远程分支

`<base>` 不写死为 `main`。始终先读远程默认分支：

```bash
git symbolic-ref refs/remotes/origin/HEAD
```

输出形如 `refs/remotes/origin/master`，取最后一段即 `<base>`（常见值为 `main` 或 `master`，也可能是别的名字）。若命令失败（没有远程，或远程未设置 HEAD），退回当前分支作为 `<base>`，并向用户说明这一推断。

## 在 Spec 生命周期中的位置

```text
spec-start
  → git-work：从 `<base>` 创建 Spec 工作分支
  → plan.html 记录 git_branch、base_branch、pr_url

spec-update
  → git-work：确认当前分支与 plan.html 的 git_branch 一致
  → update-xxx.html 继承 plan.html 的 git_branch、base_branch、pr_url

开发与测试阶段
  → 始终留在当前 Spec 分支
  → 必要时推送远程分支，方便团队协作

spec-end / spec-update 收尾
  → git-work：提交、推送当前 Spec 分支
  → spec-end 创建 PR；spec-update 仅在 Spec 准备整体交付时创建/更新 PR
  → 如有 PR，记录 PR URL

PR 合并后
  → git-work：同步 `<base>`，删除本地和远程工作分支
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
- 不要在脏工作区直接切换到 `<base>`

### 2. 同步 base 分支

先读远程默认分支，取得 `<base>`：

```bash
git symbolic-ref refs/remotes/origin/HEAD
```

输出形如 `refs/remotes/origin/master`，取最后一段作为 `<base>`。不要假设它是 `main`。

如果命令报错（没有 `origin`，或远程未设置 HEAD），退回当前分支作为 `<base>`，并明确告知用户：本次 Spec 将以当前分支为 base。

拿到 `<base>` 后再同步。下文所有命令中的 `<base>` 都用这里读到的名字替换：

```bash
git switch <base>
git pull --ff-only origin <base>
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
base_branch: <base>
pr_url:
```

`base_branch` 写第 2 步实际读到的默认分支名，不要写死 `main`。

## 模式二：并发开发使用 worktree

当同一仓库需要同时开发多个 Spec，不要在同一个 working tree 里来回切分支。使用 worktree：

```bash
git switch <base>
git pull --ff-only origin <base>
git worktree add ../<repo>-<spec-slug> -b <branch-name> <base>
```

进入新 worktree 后再运行对应的 Spec 流程。每个并行 Spec 独占一个目录和一条分支。

## 模式三：复用 Spec 分支

由 `spec-update` 在创建 update 文档前调用。

### 1. 读取 plan.html Git 元数据

报告是 HTML，Git 元数据在 `<head>` 的 `<meta name="rk:*">` 里（`.rk-meta` 是同字段的人可读镜像）：

```html
<meta name="rk:git-branch"  content="<branch-name>">
<meta name="rk:base-branch" content="{base_branch}">
<meta name="rk:pr-url"      content="">
```

### 2. 校验当前分支

```bash
git branch --show-current
git status --short
```

规则：
- 当前分支必须等于 plan.html 的 `rk:git-branch`
- 如果当前分支是 `<base>`，停止并切回 Spec 分支
- 如果原分支已合并或不存在，默认不继续 spec-update；应新建 Spec 或让用户明确选择独立 update 分支
- update-xxx.html 继承 plan.html 的 `rk:git-branch` / `rk:base-branch` / `rk:pr-url`

## 模式四：完成 Spec 分支

由 `spec-end` 或 `spec-update` 收尾时调用。

### 1. 确认当前分支

```bash
git branch --show-current
git status --short
```

禁止直接在 `<base>` 上提交 Spec 成果。若当前分支不是 plan/update 文档记录的 `git_branch`，先确认原因。

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
gh pr create --base <base> --head <branch-name> --title "<PR title>" --body-file <pr-body.md>
```

如果没有 `gh`，输出 GitHub compare URL，让用户手动创建 PR：

```text
https://github.com/<owner>/<repo>/compare/<base>...<branch-name>
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

写回后**并入同一次提交**（spec-end / spec-update 收尾的硬要求：全部处理完只提交一次，不产生第二次提交）：

```bash
git add <spec-docs>
git commit --amend --no-edit
git push --force-with-lease origin <branch-name>
```

说明：
- `--amend --no-edit` 把 `pr_url` 写回并进刚才那次提交，git 历史保持一次提交
- `--force-with-lease` 只允许覆盖自己刚推送的引用；若远程分支已被他人改动会拒绝并报错，不会误覆盖别人的提交
- 仅限「本流程刚创建并推送的 Spec 分支」这一场景；其它任何 force push 仍是门禁（见 spec-end 停止条件）

## 模式五：PR 合并后清理

只有在 PR 已合并后执行：

```bash
git switch <base>
git pull --ff-only origin <base>
git branch -d <branch-name>
git push origin --delete <branch-name>
```

如果本地分支无法删除，先确认 PR 是否已合并，避免误删未合并成果。

## 模式六：发版分支与 tag 管理

前五个模式管的是 **Spec 工作分支**（短生命周期、合并即删）。本模式管的是
**发版**，两者正交：Spec 分支进 `<base>`，发版从 `<base>` 取内容打 tag。

### 核心原则

**版本号只存在于 tag，分支名永不含版本号。**

### 分支模型

| 分支 | 生命周期 | 用途 |
|------|----------|------|
| `<base>` | 长期 | 主干。所有修复先进这里 |
| `release/<line>` | 长期 | 每条发布线一条，永不新建替代分支 |
| `<type>/spec-*` | 短期 | Spec 工作分支（模式一~五） |

`<line>` 是发布线标识，不是版本号。多客户/多环境场景例如：

```text
release/official     正式线
release/<customer>    某客户定制线
```

### 为什么禁止版本号进分支名

`release/v1.0.4` 这类命名会产生三种对不上：

1. **分支名与其上的 tag 错位**——分支名停在诞生那天，内容一直往前走。
   实际踩过：`release/tut-v1.0.4` 的 HEAD 是 tag `tut-v1.0.5`，
   而 `tut-v1.0.4` 这个 tag 落在该分支的一个中间提交上，不是任何分支的 HEAD
2. **同一提交有多个名字**——一个提交同时是 `release/tut-v1.0.2`、
   `feat/spec-xxx`、tag `tut-v1.0.2`，看到任一个都不知道另外两个存在
3. **分支数量随版本线性增长**——发到 v1.0.9 就有 9 条僵尸分支

历史版本靠 tag 定位，这本来就是 tag 的职责。用分支留快照是把两种工具混用。

### 版本号规则

| 形态 | 含义 | 例 |
|------|------|-----|
| `vX.Y.Z` | 正式线主版本 | `v1.0.3` |
| `vX.Y.Z.N` | 正式线补丁 | `v1.0.3.1` |
| `<line>-vX.Y.Z` | 定制线主版本 | `tut-v1.0.4` |
| `<line>-vX.Y.Z.N` | 定制线补丁 | `tut-v1.0.4.1` |

同一改动发到多条线时，各线独立编号，tag 说明里写清 cherry-pick 来源。

### 发版流程

```bash
# 1. 修复先进主干
git switch <base> && git commit ... && git push

# 2. cherry-pick 到目标发布线
git switch release/<line>
git cherry-pick <commit>

# 3. 跑测试（定制线注意区分既有失败，见下）
<项目测试命令>

# 4. 打 annotated tag 并推送
git tag -a <version> -m "<说明>"
git push origin release/<line> <version>
```

tag 说明必须写清：改了什么、实测数据、cherry-pick 来源、是否已部署。
**只用 annotated tag**（`-a`），轻量 tag 不带作者、日期和说明。

### tag 指向「发版的代码」，不追 HEAD

release 分支允许存在不产生新版本号的提交：规范、文档、Spec 报告等不改变
运行行为的内容。这类提交后 tag 落后于 HEAD，**属正常状态**。

判断标准：**这笔提交会改变构建出的产物行为吗？**

| 提交内容 | 是否发新 tag |
|----------|--------------|
| 源码、依赖、Dockerfile、数据库迁移 | 是 |
| 规范文件、`AGENTS.md`、Spec 报告 | 否 |
| `.env.example`（仅注释或默认值说明） | 否 |

核对方法：

```bash
git diff --name-only <tag> release/<line>
```

差异只含「否」类文件即正常；混入源码说明**漏打 tag**。

### 镜像标签必须等于 git tag

构建产物（Docker 镜像等）的标签必须与 git tag 同名，不得自行取名：

```bash
git switch --detach <version>
docker build -t <image>:<version> .
# 部署侧 .env: IMAGE_TAG=<version>
```

这样从服务器可直接反查代码：

```bash
ssh <server> "grep '^IMAGE_TAG=' <path>/.env"   # 得到 <version>
git switch --detach <version>                    # 就是线上那份代码
```

实际踩过：生产跑 `IMAGE_TAG=tut-v1.0.5` 但 git 中无此 tag，镜像实际由某个
裸 commit 构建，线上版本与代码彻底失去对应关系，只能靠人工记录。

更强的做法是把 commit 烘进产物：构建时 `--build-arg GIT_COMMIT=$(git rev-parse HEAD)`
写入环境变量，运行时可直接查询，连命名约定都不必依赖。

### 定制线的既有测试失败

定制线常因改了共享文件而让主线的守卫测试恒失败。发版前必须先建立基线：

```bash
# 在 cherry-pick 前的提交上跑一次，记下 failed 数
git switch --detach <cherry-pick 前的 commit>
<测试命令>
```

判据是 **failed 数不增加**，不是「全绿」。把已知恒失败项及其原因记进项目
速查表，否则每次发版都要重新判断哪些失败是无害的。

### 清理带版本号的旧分支

迁移到本模型时，旧的 `release/vX` 分支可以删——但**删前必须逐条验证**每个
分支的 HEAD 提交有 tag 或保留分支覆盖：

```bash
# 该分支是否已被某条保留分支包含
git merge-base --is-ancestor <old-branch> release/<line>

# 独有提交数，必须为 0
git log --oneline <old-branch> --not <base> release/<line> | wc -l
```

两项都通过才能删。删分支不丢提交的前提是**版本点已被 tag 钉住**，
没有 tag 覆盖的分支删掉就是丢代码。

### 每次发版后更新速查表

在项目的 `AGENTS.md` 维护一张表，记录每条线的当前 tag、部署位置、版本历史。
发版即更新一行。没有这张表，过几周就会出现「哪个版本部署在哪、对应哪份代码」
说不清的情况——这正是本模式要解决的问题。

## 常见阻塞

| 场景 | 处理 |
|------|------|
| 不在 Git 仓库 | 询问是否继续无分支模式，并在 Spec 文档中记录 `git_branch: none` |
| 工作区已有无关改动 | 先提交、stash 或使用 worktree |
| 当前在 `<base>` 且已有开发改动 | 立即创建分支承接当前改动，不要继续在 `<base>` 上开发 |
| 分支落后 `<base>` | 在工作分支中合并或 rebase 最新 `<base>`，解决冲突后继续 |
| 多个 Spec 并发 | 使用 `git worktree`，每个 Spec 独占分支和目录 |
| 无法创建 PR | 推送分支并给出 compare URL |
| tag 与 release 分支 HEAD 不一致 | 先 `git diff --name-only <tag> release/<line>`；只含文档即正常，含源码说明漏打 tag |
| 服务器拉不到远程（网络隔离/remote 损坏） | 走文件同步 + md5 逐文件对账，同步后在服务器目录内 git 提交留痕并打同名 tag |
| 定制线测试有失败 | 先在 cherry-pick 前的提交上跑一次建立基线，判据是 failed 数不增加 |
| 想删带版本号的旧分支 | 先验证每条分支 HEAD 有 tag 或保留分支覆盖、独有提交数为 0 |

## 禁止事项

- 不要在 `<base>` 上实现 Spec
- 不要在脏工作区切换分支
- 不要把多个无关 Spec 混在同一分支
- 不要在测试失败时创建 PR，除非 PR 明确标记为 Draft
- 不要自动合并 PR，除非用户明确要求

发版相关（模式六）：

- 不要新建带版本号的分支（`release/v1.0.4`、`release/<line>-v1.0.5`）
- 不要用轻量 tag 发版，必须 `git tag -a`
- 不要为纯文档提交打新版本号 tag
- 不要让产物标签与 git tag 不同名
- 不要在没有 tag 覆盖的情况下删分支
- 不要用「全绿」作为定制线的发版判据，用「failed 数不增加」
- 不要移动或复用已推送的 tag（会改变已发布版本的含义）
